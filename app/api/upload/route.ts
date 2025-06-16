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

    // Add debug logging for rows
    console.log("Raw CSV rows:", rows);
    console.log("Number of rows:", rows.length);
    console.log("First row:", rows[0]);

    if (!Array.isArray(rows) || rows.length < 2) {
      console.error("Invalid rows structure:", rows);
      return NextResponse.json(
        { error: "CSV file must have at least a header row and one data row." },
        { status: 400 },
      );
    }

    const headers = rows[0];
    console.log("CSV Headers:", headers);

    const vendor = detectVendorFormat(headers);
    console.log("Detected vendor:", vendor);

    if (vendor === "unknown") {
      return NextResponse.json(
        {
          error: "Unsupported CSV format",
          details: {
            headers: headers,
            expectedVendorA: ["expected", "vendor_a", "headers"],
            expectedVendorB: ["expected", "vendor_b", "headers"],
          },
        },
        { status: 400 },
      );
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

    // Normalize data with debug logging
    let normalizedData: any[] = [];
    if (vendor === "vendor_a") {
      normalizedData = normalizeVendorAData(rows, headers);
      console.log("Normalized Vendor A data:", normalizedData);
    } else if (vendor === "vendor_b") {
      normalizedData = normalizeVendorBData(rows, headers);
      console.log("Normalized Vendor B data:", normalizedData);
    }

    // Validate data with detailed error checking
    const { valid, invalid } = validateTransactionData(normalizedData);
    console.log("Validation results:", {
      validCount: valid.length,
      invalidCount: invalid.length,
      sampleValid: valid.slice(0, 2),
      sampleInvalid: invalid.slice(0, 2),
    });

    if (!Array.isArray(valid) || valid.length === 0) {
      // Update upload record with error
      await supabase
        .from("csv_uploads")
        .update({
          status: "failed",
          processed_at: new Date().toISOString(),
          records_processed: 0,
          errors_count: invalid.length,
          error_log: JSON.stringify({
            invalid,
            normalizedDataSample: normalizedData.slice(0, 5),
            validationError: "No valid records found",
          }),
        })
        .eq("id", uploadRecord.id);

      return NextResponse.json(
        {
          error: "No valid records found in CSV",
          details: {
            invalid,
            normalizedDataSample: normalizedData.slice(0, 5),
          },
        },
        { status: 400 },
      );
    }

    // Rest of the code remains the same...
    // (keeping all the existing location, product, and inventory processing logic)

    // Insert valid transactions
    const transactionsToInsert = valid.map(item => ({
      ...item,
      csv_upload_id: uploadRecord.id,
    }));

    // Step 1: Get all unique location codes from valid transactions
    const uniqueLocationCodes = [...new Set(valid.map(tx => tx.location_code))];
    console.log("Unique location codes:", uniqueLocationCodes);

    // Step 2: Fetch existing locations
    const { data: existingLocations, error: fetchError } = await supabase
      .from("locations")
      .select("id, name")
      .in("name", uniqueLocationCodes);

    if (fetchError) {
      console.error("Error fetching locations:", fetchError);
      return NextResponse.json({ error: "Failed to fetch locations", details: fetchError }, { status: 500 });
    }

    console.log("Existing locations:", existingLocations);
    const locationMap = new Map(existingLocations.map(loc => [loc.name, loc.id]));
    console.log("Location map:", Array.from(locationMap.entries()));

    // Step 3: Create missing locations
    const missingLocations = uniqueLocationCodes.filter(code => !locationMap.has(code));
    console.log("Missing locations:", missingLocations);

    if (missingLocations.length > 0) {
      const newLocations = missingLocations.map(code => ({
        name: code,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { data: createdLocations, error: batchCreateError } = await supabase
        .from("locations")
        .insert(newLocations)
        .select("id, name");

      if (batchCreateError) {
        console.error("Error creating locations:", batchCreateError);
        return NextResponse.json(
          {
            error: "Failed to create locations in batch",
            details: batchCreateError,
          },
          { status: 500 },
        );
      }

      console.log("Created locations:", createdLocations);
      // Update location map with new locations
      createdLocations.forEach(loc => locationMap.set(loc.name, loc.id));
      console.log("Updated location map:", Array.from(locationMap.entries()));
    }

    // Get all unique UPC codes
    const uniqueUpcCodes = [...new Set(valid.map(tx => tx.upc_code))];
    console.log("Unique UPC codes:", uniqueUpcCodes);

    // Fetch existing products in batch
    const { data: existingProducts, error: productsError } = await supabase
      .from("products")
      .select("id, sku")
      .in("sku", uniqueUpcCodes);

    if (productsError) {
      console.error("Failed to fetch existing products:", productsError);
      return NextResponse.json({ error: "Failed to fetch products", details: productsError }, { status: 500 });
    }

    console.log("Existing products:", existingProducts);
    const productMap = new Map(existingProducts.map(p => [p.sku, p.id]));
    console.log("Product map:", Array.from(productMap.entries()));

    // Create missing products in batch
    const missingProducts = uniqueUpcCodes.filter(upc => !productMap.has(upc));
    console.log("Missing products:", missingProducts);

    if (missingProducts.length > 0) {
      const newProducts = missingProducts.map(upc => ({
        sku: upc,
        name: `Product ${upc}`,
        unit_price: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { data: createdProducts, error: createProductsError } = await supabase
        .from("products")
        .insert(newProducts)
        .select("id, sku");

      if (createProductsError) {
        console.error("Failed to create products in batch:", createProductsError);
        return NextResponse.json({ error: "Failed to create products", details: createProductsError }, { status: 500 });
      }

      console.log("Created products:", createdProducts);
      createdProducts.forEach(p => productMap.set(p.sku, p.id));
      console.log("Updated product map:", Array.from(productMap.entries()));
    }

    // After successful sales transaction insert
    // Group transactions by location and product
    const BATCH_SIZE = 1000;
    const inventoryUpdatesMap = new Map<string, { location_code: string; upc_code: string; quantity: number }>();

    valid.forEach(transaction => {
      const key = `${transaction.location_code}_${transaction.upc_code}`;
      const current = inventoryUpdatesMap.get(key) || {
        location_code: transaction.location_code,
        upc_code: transaction.upc_code,
        quantity: 0,
      };
      current.quantity += 1; // Each transaction represents one unit sold
      inventoryUpdatesMap.set(key, current);
    });

    console.log("Inventory updates map:", Array.from(inventoryUpdatesMap.entries()));

    // Prepare batch updates and inserts
    const inventoryUpdatesList: Array<{
      id: string;
      quantity: number;
      last_updated: string;
      updated_by: string;
      location_id: string;
      product_id: string;
    }> = [];
    const inventoryInsertsList: Array<{
      location_id: string;
      product_id: string;
      quantity: number;
      min_stock_level: number;
      max_stock_level: number;
      last_updated: string;
      updated_by: string;
    }> = [];

    for (const [key, update] of inventoryUpdatesMap.entries()) {
      const locationId = locationMap.get(update.location_code);
      const productId = productMap.get(update.upc_code);

      console.log(`Processing key ${key}:`, {
        locationCode: update.location_code,
        upcCode: update.upc_code,
        locationId,
        productId,
        locationMapHas: locationMap.has(update.location_code),
        productMapHas: productMap.has(update.upc_code),
      });

      if (!locationId || !productId) {
        console.error(`Missing location_id or product_id for key ${key}`, {
          locationCode: update.location_code,
          upcCode: update.upc_code,
          locationId,
          productId,
          locationMapEntries: Array.from(locationMap.entries()),
          productMapEntries: Array.from(productMap.entries()),
        });
        continue;
      }

      // Check if there's already an inventory record for this location/product pair
      const { data: existingInventory, error: inventoryError } = await supabase
        .from("inventory")
        .select("id, quantity")
        .eq("location_id", locationId)
        .eq("product_id", productId)
        .maybeSingle();

      if (inventoryError) {
        console.error(`Failed to check inventory:`, inventoryError);
        continue;
      }

      if (existingInventory) {
        // Update existing inventory - subtract sold quantity
        const newQuantity = Math.max(0, (existingInventory.quantity || 0) - update.quantity);
        inventoryUpdatesList.push({
          id: existingInventory.id,
          quantity: newQuantity,
          last_updated: new Date().toISOString(),
          updated_by: session.user.id,
          location_id: locationId,
          product_id: productId,
        });
      } else {
        // Create new inventory record
        inventoryInsertsList.push({
          location_id: locationId,
          product_id: productId,
          quantity: 0,
          min_stock_level: 0,
          max_stock_level: 1000,
          last_updated: new Date().toISOString(),
          updated_by: session.user.id,
        });
      }
    }

    console.log("Inventory updates to process:", inventoryUpdatesList);
    console.log("Inventory inserts to process:", inventoryInsertsList);

    // Execute batch updates with proper relationships
    if (inventoryUpdatesList.length > 0) {
      for (let i = 0; i < inventoryUpdatesList.length; i += BATCH_SIZE) {
        const batch = inventoryUpdatesList.slice(i, i + BATCH_SIZE);
        const { error: updateError } = await supabase.from("inventory").upsert(batch);
        if (updateError) {
          console.error("Failed to update inventory batch:", updateError);
        }
      }
    }

    // Execute batch inserts with proper relationships
    if (inventoryInsertsList.length > 0) {
      for (let i = 0; i < inventoryInsertsList.length; i += BATCH_SIZE) {
        const batch = inventoryInsertsList.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase.from("inventory").insert(batch);
        if (insertError) {
          console.error("Failed to insert inventory batch:", insertError);
        }
      }
    }

    // Update upload record with success
    await supabase
      .from("csv_uploads")
      .update({
        status: "succeeded",
        processed_at: new Date().toISOString(),
        records_processed: valid.length,
        errors_count: invalid.length,
        error_log: JSON.stringify({ valid, invalid }),
      })
      .eq("id", uploadRecord.id);

    return NextResponse.json(
      {
        message: "CSV processing succeeded",
        stats: {
          totalRows: rows.length,
          validRecords: valid.length,
          invalidRecords: invalid.length,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error processing CSV:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
