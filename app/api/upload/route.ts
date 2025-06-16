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

    const { error: insertError } = await supabase.from("sales_transactions").insert(transactionsToInsert);

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
