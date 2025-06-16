import { createClient } from "@/utils/supabase/client";
import type { SalesTransaction } from "@/types/inventory";
import {
  parseCSV,
  detectVendorFormat,
  normalizeVendorAData,
  normalizeVendorBData,
  validateTransactionData,
} from "@/utils/csv-processor";

export interface CSVPreview {
  vendor: string;
  headers: string[];
  sampleRows: string[][];
  totalRows: number;
}

export interface ValidationResults {
  valid: number;
  invalid: { row: number; errors: string[] }[];
}

export class CSVService {
  private supabase = createClient();

  async processFile(file: File): Promise<{
    preview: CSVPreview;
    validationResults: ValidationResults;
  }> {
    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      throw new Error("CSV file must have at least a header row and one data row.");
    }

    const headers = rows[0];
    const vendor = detectVendorFormat(headers);

    const preview: CSVPreview = {
      vendor:
        vendor === "vendor_a" ? "Vendor A Vending" : vendor === "vendor_b" ? "Vendor B Systems" : "Unknown Format",
      headers,
      sampleRows: rows.slice(1, 4),
      totalRows: rows.length - 1,
    };

    let normalizedData: Partial<SalesTransaction>[] = [];
    if (vendor === "vendor_a") {
      normalizedData = normalizeVendorAData(rows, headers);
    } else if (vendor === "vendor_b") {
      normalizedData = normalizeVendorBData(rows, headers);
    }

    const validationResults: ValidationResults = {
      valid: 0,
      invalid: [],
    };

    if (normalizedData.length > 0) {
      const { valid, invalid } = validateTransactionData(normalizedData);
      validationResults.valid = valid.length;
      validationResults.invalid = invalid.map(item => ({ row: item.row, errors: item.errors }));
    }

    return { preview, validationResults };
  }

  async uploadFile(file: File, onProgress: (progress: number) => void): Promise<void> {
    const text = await file.text();
    const rows = parseCSV(text);
    const headers = rows[0];
    const vendor = detectVendorFormat(headers);

    if (vendor === "unknown") {
      throw new Error("Unsupported CSV format");
    }

    // Create upload record
    const { data: uploadRecord, error: uploadError } = await this.supabase
      .from("csv_uploads")
      .insert({
        filename: file.name,
        vendor,
        status: "processing",
      })
      .select()
      .single();

    if (uploadError) throw uploadError;

    onProgress(25);

    // Normalize data
    let normalizedData: Partial<SalesTransaction>[] = [];
    if (vendor === "vendor_a") {
      normalizedData = normalizeVendorAData(rows, headers);
    } else if (vendor === "vendor_b") {
      normalizedData = normalizeVendorBData(rows, headers);
    }

    onProgress(50);

    // Validate and filter valid records
    const { valid, invalid } = validateTransactionData(normalizedData);

    if (valid.length === 0) {
      throw new Error("No valid records found in CSV");
    }

    onProgress(75);

    // Insert valid transactions
    const transactionsToInsert = valid.map(item => ({
      ...item,
      csv_upload_id: uploadRecord.id,
    }));

    const { error: insertError } = await this.supabase.from("sales_transactions").insert(transactionsToInsert);

    if (insertError) throw insertError;

    // Update upload record
    await this.supabase
      .from("csv_uploads")
      .update({
        status: "completed",
        processed_at: new Date().toISOString(),
        records_processed: valid.length,
        errors_count: invalid.length,
        error_log: invalid.length > 0 ? JSON.stringify(invalid) : null,
      })
      .eq("id", uploadRecord.id);

    onProgress(100);
  }
}
