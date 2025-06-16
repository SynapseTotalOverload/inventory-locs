import type { SalesTransaction } from "@/types/inventory";

export interface VendorARow {
  Location_ID: string;
  Product_Name: string;
  Scancode: string;
  Trans_Date: string;
  Price: string;
  Total_Amount: string;
}

export interface VendorBRow {
  Site_Code: string;
  Item_Description: string;
  UPC: string;
  Sale_Date: string;
  Unit_Price: string;
  Final_Total: string;
}

export type VendorFormat = "vendor_a" | "vendor_b" | "unknown";

interface ValidationError {
  row: number;
  errors: string[];
}

interface ValidationResult {
  valid: SalesTransaction[];
  invalid: ValidationError[];
}

export function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  return lines.map(line => {
    // Handle quoted fields with commas
    const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
    return matches.map(field => field.replace(/^"|"$/g, "").trim());
  });
}

export function detectVendorFormat(headers: string[]): VendorFormat {
  const vendorAHeaders = ["Location_ID", "Product_Name", "Scancode", "Trans_Date", "Price", "Total_Amount"];
  const vendorBHeaders = ["Site_Code", "Item_Description", "UPC", "Sale_Date", "Unit_Price", "Final_Total"];

  const normalizedHeaders = headers.map(h => h.trim());

  const isVendorA = vendorAHeaders.every(h => normalizedHeaders.includes(h));
  const isVendorB = vendorBHeaders.every(h => normalizedHeaders.includes(h));

  if (isVendorA) return "vendor_a";
  if (isVendorB) return "vendor_b";
  return "unknown";
}

function normalizeLocationId(locationId: string, vendor: VendorFormat): { location_code: string } {
  // Remove any non-alphanumeric characters except underscores and dots
  const cleaned = locationId.replace(/[^a-zA-Z0-9._]/g, "");

  // Convert to lowercase
  const normalized = cleaned.toLowerCase();

  // Handle vendor-specific patterns
  if (vendor === "vendor_a") {
    // Vendor A format: 2.0_SW_02 -> sw_02
    return {
      location_code: normalized.replace(/^\d+\.\d+_/, ""),
    };
  } else if (vendor === "vendor_b") {
    // Vendor B format: SW_02 -> sw_02
    return {
      location_code: normalized,
    };
  }

  return {
    location_code: normalized,
  };
}

export function normalizeVendorAData(rows: string[][], headers: string[]): Partial<SalesTransaction>[] {
  const headerMap = new Map(headers.map((h, i) => [h, i]));

  return rows.slice(1).map((row, index) => {
    const locationId = row[headerMap.get("Location_ID")!];
    const productName = row[headerMap.get("Product_Name")!];
    const upcCode = row[headerMap.get("Scancode")!];
    const transDate = row[headerMap.get("Trans_Date")!];
    const unitPrice = parseFloat(row[headerMap.get("Price")!]);
    const finalAmount = parseFloat(row[headerMap.get("Total_Amount")!]);

    const { location_code } = normalizeLocationId(locationId, "vendor_a");

    return {
      location_code: location_code,

      product_name: productName,
      upc_code: upcCode,
      transaction_date: new Date(transDate).toISOString(),
      unit_price: unitPrice,
      final_amount: finalAmount,
      vendor: "vendor_a",
    };
  });
}

export function normalizeVendorBData(rows: string[][], headers: string[]): Partial<SalesTransaction>[] {
  const headerMap = new Map(headers.map((h, i) => [h, i]));

  return rows.slice(1).map((row, index) => {
    const siteCode = row[headerMap.get("Site_Code")!];
    const itemDescription = row[headerMap.get("Item_Description")!];
    const upcCode = row[headerMap.get("UPC")!];
    const saleDate = row[headerMap.get("Sale_Date")!];
    const unitPrice = parseFloat(row[headerMap.get("Unit_Price")!]);
    const finalAmount = parseFloat(row[headerMap.get("Final_Total")!]);

    const { location_code } = normalizeLocationId(siteCode, "vendor_b");

    return {
      location_code: location_code,

      product_name: itemDescription,
      upc_code: upcCode,
      transaction_date: new Date(saleDate).toISOString(),
      unit_price: unitPrice,
      final_amount: finalAmount,
      vendor: "vendor_b",
    };
  });
}

function formatDate(dateStr: string): string {
  // Handle MM/DD/YYYY format (Vendor A)
  if (dateStr.includes("/")) {
    const [month, day, year] = dateStr.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Handle YYYY-MM-DD format (Vendor B) - already correct
  return dateStr;
}

export function validateTransactionData(transactions: Partial<SalesTransaction>[]): ValidationResult {
  const valid: SalesTransaction[] = [];
  const invalid: ValidationError[] = [];

  transactions.forEach((transaction, index) => {
    const errors: string[] = [];

    // Required fields validation
    if (!transaction.location_code) errors.push("Location code is required");
    if (!transaction.product_name) errors.push("Product name is required");
    if (!transaction.upc_code) errors.push("UPC code is required");
    if (!transaction.transaction_date) errors.push("Transaction date is required");

    // Data type validation
    if (isNaN(transaction.unit_price!)) errors.push("Unit price must be a valid number");
    if (isNaN(transaction.final_amount!)) errors.push("Final amount must be a valid number");

    // Value range validation
    if (transaction.unit_price! <= 0) errors.push("Unit price must be greater than 0");
    if (transaction.final_amount! <= 0) errors.push("Final amount must be greater than 0");

    // Date validation
    const transactionDate = new Date(transaction.transaction_date!);
    if (isNaN(transactionDate.getTime())) {
      errors.push("Invalid transaction date format");
    }

    // UPC code format validation
    if (!/^\d{9,12}$/.test(transaction.upc_code!)) {
      errors.push("UPC code must be 9-12 digits");
    }

    if (errors.length > 0) {
      invalid.push({ row: index + 2, errors }); // +2 because of 0-based index and header row
    } else {
      valid.push(transaction as SalesTransaction);
    }
  });

  return { valid, invalid };
}
