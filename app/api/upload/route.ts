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
    const missingLocations = uniqueLocationCodes.filter(code => !locationMap.has(code));
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
        return NextResponse.json(
          {
            error: "Failed to create locations in batch",
            details: batchCreateError,
          },
          { status: 500 },
        );
      }

      // Update location map with new locations
      createdLocations.forEach(loc => locationMap.set(loc.name, loc.id));
    }

    // Step 4: Attach location_id to transactions
    const transactionsWithLocationIds = transactionsToInsert.map(transaction => {
      const locationId = locationMap.get(transaction.location_code);
      return {
        ...transaction,
        location_id: locationId,
      };
    });

    // Insert transactions in batches of 1000
    const BATCH_SIZE = 1000;
    for (let i = 0; i < transactionsWithLocationIds.length; i += BATCH_SIZE) {
      const batch = transactionsWithLocationIds.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase.from("sales_transactions").insert(batch);

      if (insertError) {
        // Update upload record with error
        await supabase
          .from("csv_uploads")
          .update({
            status: "failed",
            processed_at: new Date().toISOString(),
            records_processed: i,
            errors_count: invalid.length,
            error_log: JSON.stringify({ insertError, validationErrors: invalid }),
          })
          .eq("id", uploadRecord.id);

        return NextResponse.json({ error: "Failed to insert transactions", details: insertError }, { status: 500 });
      }
    }

    // After successful sales transaction insert
    // Group transactions by location and product
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

    // Get all unique UPC codes
    const uniqueUpcCodes = [...new Set(valid.map(tx => tx.upc_code))];

    // Fetch existing products in batch
    const { data: existingProducts, error: productsError } = await supabase
      .from("products")
      .select("id, sku")
      .in("sku", uniqueUpcCodes);

    if (productsError) {
      console.error("Failed to fetch existing products:", productsError);
      return NextResponse.json({ error: "Failed to fetch products", details: productsError }, { status: 500 });
    }

    const productMap = new Map(existingProducts.map(p => [p.sku, p.id]));

    // Create missing products in batch
    const missingProducts = uniqueUpcCodes.filter(upc => !productMap.has(upc));
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

      createdProducts.forEach(p => productMap.set(p.sku, p.id));
    }

    // Fetch existing inventory records in batch
    const inventoryKeys = Array.from(inventoryUpdatesMap.keys());
    const existingInventoryRecords = new Map();

    for (let i = 0; i < inventoryKeys.length; i += BATCH_SIZE) {
      const batch = inventoryKeys.slice(i, i + BATCH_SIZE);
      const locationProductPairs = batch.map(key => {
        const [locationCode, upcCode] = key.split("_");
        return {
          location_id: locationMap.get(locationCode),
          product_id: productMap.get(upcCode),
        };
      });

      const { data: inventoryBatch, error: inventoryError } = await supabase
        .from("inventory")
        .select("id, location_id, product_id, quantity")
        .or(
          locationProductPairs
            .map(pair => `and(location_id.eq.${pair.location_id},product_id.eq.${pair.product_id})`)
            .join(","),
        );

      if (inventoryError) {
        console.error("Failed to fetch inventory batch:", inventoryError);
        continue;
      }

      inventoryBatch.forEach(record => {
        const key = `${record.location_id}_${record.product_id}`;
        existingInventoryRecords.set(key, record);
      });
    }

    // Prepare batch updates and inserts
    const inventoryUpdatesList: Array<{
      id: string;
      quantity: number;
      last_updated: string;
      updated_by: string;
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
      const [locationCode, upcCode] = key.split("_");
      const locationId = locationMap.get(locationCode);
      const productId = productMap.get(upcCode);
      const existingRecord = existingInventoryRecords.get(`${locationId}_${productId}`);

      if (existingRecord) {
        const newQuantity = Math.max(0, (existingRecord.quantity || 0) - update.quantity);
        inventoryUpdatesList.push({
          id: existingRecord.id,
          quantity: newQuantity,
          last_updated: new Date().toISOString(),
          updated_by: session.user.id,
        });
      } else {
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

    // Execute batch updates
    if (inventoryUpdatesList.length > 0) {
      for (let i = 0; i < inventoryUpdatesList.length; i += BATCH_SIZE) {
        const batch = inventoryUpdatesList.slice(i, i + BATCH_SIZE);
        const { error: updateError } = await supabase.from("inventory").upsert(batch);
        if (updateError) {
          console.error("Failed to update inventory batch:", updateError);
        }
      }
    }

    // Execute batch inserts
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
