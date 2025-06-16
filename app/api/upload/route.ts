import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  parseCSV,
  detectVendorFormat,
  normalizeVendorAData,
  normalizeVendorBData,
  validateTransactionData,
} from "@/utils/csv-processor";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ error: "Invalid file type. Please upload a CSV file." }, { status: 400 });
    }

    // Read and parse CSV
    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      return NextResponse.json(
        { error: "CSV file must have at least a header row and one data row." },
        { status: 400 },
      );
    }

    const headers = rows[0];
    const vendor = detectVendorFormat(headers);

    if (vendor === "unknown") {
      return NextResponse.json({ error: "Unsupported CSV format" }, { status: 400 });
    }

    // Create upload record
    const { data: uploadRecord, error: uploadError } = await supabase
      .from("csv_uploads")
      .insert({
        filename: file.name,
        vendor,
        status: "processing",
        uploaded_by: session.user.id,
      })
      .select()
      .single();

    if (uploadError) {
      return NextResponse.json({ error: "Failed to create upload record", details: uploadError }, { status: 500 });
    }

    // Normalize data
    let normalizedData: any[] = [];
    if (vendor === "vendor_a") {
      normalizedData = normalizeVendorAData(rows, headers);
    } else if (vendor === "vendor_b") {
      normalizedData = normalizeVendorBData(rows, headers);
    }

    // Validate data
    const { valid, invalid } = validateTransactionData(normalizedData);

    if (valid.length === 0) {
      // Update upload record with error
      await supabase
        .from("csv_uploads")
        .update({
          status: "failed",
          processed_at: new Date().toISOString(),
          records_processed: 0,
          errors_count: invalid.length,
          error_log: JSON.stringify(invalid),
        })
        .eq("id", uploadRecord.id);

      return NextResponse.json({ error: "No valid records found in CSV", details: invalid }, { status: 400 });
    }

    // Insert valid transactions
    const transactionsToInsert = valid.map(item => ({
      ...item,
      csv_upload_id: uploadRecord.id,
    }));

    // Step 1: Get all unique location codes from valid transactions
    const uniqueLocationCodes = [...new Set(valid.map(tx => tx.location_code))];

    // Step 2: Fetch existing locations
    const { data: existingLocations, error: fetchError } = await supabase
      .from("locations")
      .select("id, name")
      .in("name", uniqueLocationCodes);

    if (fetchError) {
      return NextResponse.json({ error: "Failed to fetch locations", details: fetchError }, { status: 500 });
    }

    const locationMap = new Map(existingLocations.map(loc => [loc.name, loc.id]));

    // Step 3: Create missing locations
    for (const code of uniqueLocationCodes) {
      if (!locationMap.has(code)) {
        const { data: newLoc, error: createError } = await supabase
          .from("locations")
          .insert({
            name: code,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (createError) {
          return NextResponse.json(
            {
              error: `Failed to create location for code ${code}`,
              details: createError,
            },
            { status: 500 },
          );
        }

        locationMap.set(code, newLoc.id);
      }
    }

    // Step 4: Attach location_id to transactions
    const transactionsWithLocationIds = transactionsToInsert.map(transaction => {
      const locationId = locationMap.get(transaction.location_code);
      return {
        ...transaction,
        location_id: locationId,
      };
    });

    const { error: insertError } = await supabase.from("sales_transactions").insert(transactionsWithLocationIds);

    if (insertError) {
      // Update upload record with error
      await supabase
        .from("csv_uploads")
        .update({
          status: "failed",
          processed_at: new Date().toISOString(),
          records_processed: 0,
          errors_count: invalid.length,
          error_log: JSON.stringify({ insertError, validationErrors: invalid }),
        })
        .eq("id", uploadRecord.id);

      return NextResponse.json({ error: "Failed to insert transactions", details: insertError }, { status: 500 });
    }

    // After successful sales transaction insert
    // Group transactions by location and product
    const inventoryUpdates = new Map<string, { location_code: string; upc_code: string; quantity: number }>();

    valid.forEach(transaction => {
      const key = `${transaction.location_code}_${transaction.upc_code}`;
      const current = inventoryUpdates.get(key) || {
        location_code: transaction.location_code,
        upc_code: transaction.upc_code,
        quantity: 0,
      };
      current.quantity += 1; // Each transaction represents one unit sold
      inventoryUpdates.set(key, current);
    });

    // Update inventory for each location/product combination
    for (const update of inventoryUpdates.values()) {
      // First, get or create the location
      let location;
      const { data: existingLocation, error: locationError } = await supabase
        .from("locations")
        .select("id")
        .eq("name", update.location_code)
        .single();

      if (locationError) {
        if (locationError.code === "PGRST116") {
          // Location doesn't exist, create it
          const { data: newLocation, error: createError } = await supabase
            .from("locations")
            .insert({
              name: update.location_code,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (createError) {
            console.error(`Failed to create location for code ${update.location_code}:`, createError);
            continue;
          }
          location = newLocation;
        } else {
          console.error(`Failed to find location for code ${update.location_code}:`, locationError);
          continue;
        }
      } else {
        location = existingLocation;
      }

      // Then, get or create the product
      let product;
      const { data: existingProduct, error: productError } = await supabase
        .from("products")
        .select("id")
        .eq("sku", update.upc_code)
        .single();

      if (productError) {
        if (productError.code === "PGRST116") {
          // Product doesn't exist, create it
          const { data: newProduct, error: createError } = await supabase
            .from("products")
            .insert({
              sku: update.upc_code,
              name: `Product ${update.upc_code}`, // Default name based on UPC
              unit_price: 0, // Default unit price
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (createError) {
            console.error(`Failed to create product for UPC ${update.upc_code}:`, createError);
            continue;
          }
          product = newProduct;
        } else {
          console.error(`Failed to find product for UPC ${update.upc_code}:`, productError);
          continue;
        }
      } else {
        product = existingProduct;
      }

      // Check if inventory record exists
      const { data: existingInventory, error: inventoryCheckError } = await supabase
        .from("inventory")
        .select("id, quantity")
        .eq("location_id", location.id)
        .eq("product_id", product.id)
        .single();

      if (inventoryCheckError && inventoryCheckError.code !== "PGRST116") {
        console.error(`Failed to check inventory:`, inventoryCheckError);
        continue;
      }

      if (existingInventory) {
        // Update existing inventory - subtract sold quantity
        const newQuantity = Math.max(0, (existingInventory.quantity || 0) - update.quantity);
        const { error: updateError } = await supabase
          .from("inventory")
          .update({
            quantity: newQuantity,
            last_updated: new Date().toISOString(),
            updated_by: session.user.id,
          })
          .eq("id", existingInventory.id);

        if (updateError) {
          console.error(`Failed to update inventory:`, updateError);
        }
      } else {
        // Check for any existing inventory record with the same location_id and product_id
        const { data: duplicateCheck, error: duplicateError } = await supabase
          .from("inventory")
          .select("id")
          .eq("location_id", location.id)
          .eq("product_id", product.id)
          .maybeSingle();

        if (duplicateError) {
          console.error(`Failed to check for duplicate inventory:`, duplicateError);
          continue;
        }

        if (duplicateCheck) {
          console.error(`Duplicate inventory record found for location ${location.id} and product ${product.id}`);
          continue;
        }

        // Create new inventory record with initial quantity
        const { error: insertError } = await supabase.from("inventory").insert({
          location_id: location.id,
          product_id: product.id,
          quantity: 0, // Start with 0 since we're subtracting sold items
          min_stock_level: 0,
          max_stock_level: 1000,
          last_updated: new Date().toISOString(),
          updated_by: session.user.id,
        });

        if (insertError) {
          console.error(`Failed to create inventory record:`, insertError);
        }
      }
    }

    // Update upload record with success
    await supabase
      .from("csv_uploads")
      .update({
        status: "completed",
        processed_at: new Date().toISOString(),
        records_processed: valid.length,
        errors_count: invalid.length,
        error_log: invalid.length > 0 ? JSON.stringify(invalid) : null,
      })
      .eq("id", uploadRecord.id);

    // Return success response
    return NextResponse.json({
      success: true,
      uploadId: uploadRecord.id,
      stats: {
        totalRecords: rows.length - 1,
        validRecords: valid.length,
        invalidRecords: invalid.length,
      },
      preview: {
        vendor: vendor === "vendor_a" ? "Vendor A Vending" : "Vendor B Systems",
        headers,
        sampleRows: rows.slice(1, 4),
      },
    });
  } catch (error) {
    console.error("CSV upload error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// Optional: Add GET method to check upload status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get("uploadId");

    if (!uploadId) {
      return NextResponse.json({ error: "Upload ID is required" }, { status: 400 });
    }

    const { data: upload, error } = await supabase.from("csv_uploads").select("*").eq("id", uploadId).single();

    if (error) {
      return NextResponse.json({ error: "Failed to fetch upload status", details: error }, { status: 500 });
    }

    return NextResponse.json({ upload });
  } catch (error) {
    console.error("Error fetching upload status:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
