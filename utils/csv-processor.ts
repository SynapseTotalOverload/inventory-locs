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

export function normalizeVendorAData(rows: string[][], headers: string[]): Partial<SalesTransaction>[] {
  const headerMap = new Map(headers.map((h, i) => [h, i]));

  return rows.slice(1).map((row, index) => {
    const locationId = row[headerMap.get("Location_ID")!];
    const productName = row[headerMap.get("Product_Name")!];
    const scancode = row[headerMap.get("Scancode")!];
    const transDate = row[headerMap.get("Trans_Date")!];
    const price = parseFloat(row[headerMap.get("Price")!]);
    const totalAmount = parseFloat(row[headerMap.get("Total_Amount")!]);

    return {
      location_id: locationId,
      product_name: productName,
      scancode,
      transaction_date: new Date(transDate).toISOString(),
      price,
      total_amount: totalAmount,
      vendor: "vendor_a",
      raw_data: row,
    };
  });
}

export function normalizeVendorBData(rows: string[][], headers: string[]): Partial<SalesTransaction>[] {
  const headerMap = new Map(headers.map((h, i) => [h, i]));

  return rows.slice(1).map((row, index) => {
    const siteCode = row[headerMap.get("Site_Code")!];
    const itemDescription = row[headerMap.get("Item_Description")!];
    const upc = row[headerMap.get("UPC")!];
    const saleDate = row[headerMap.get("Sale_Date")!];
    const unitPrice = parseFloat(row[headerMap.get("Unit_Price")!]);
    const finalTotal = parseFloat(row[headerMap.get("Final_Total")!]);

    return {
      location_id: siteCode,
      product_name: itemDescription,
      scancode: upc,
      transaction_date: new Date(saleDate).toISOString(),
      price: unitPrice,
      total_amount: finalTotal,
      vendor: "vendor_b",
      raw_data: row,
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
    if (!transaction.location_id) errors.push("Location ID is required");
    if (!transaction.product_name) errors.push("Product name is required");
    if (!transaction.scancode) errors.push("Scancode is required");
    if (!transaction.transaction_date) errors.push("Transaction date is required");

    // Data type validation
    if (isNaN(transaction.price!)) errors.push("Price must be a valid number");
    if (isNaN(transaction.total_amount!)) errors.push("Total amount must be a valid number");

    // Value range validation
    if (transaction.price! <= 0) errors.push("Price must be greater than 0");
    if (transaction.total_amount! <= 0) errors.push("Total amount must be greater than 0");

    // Date validation
    const transactionDate = new Date(transaction.transaction_date!);
    if (isNaN(transactionDate.getTime())) {
      errors.push("Invalid transaction date format");
    } else {
      const now = new Date();
      if (transactionDate > now) {
        errors.push("Transaction date cannot be in the future");
      }
    }

    // Scancode format validation
    if (!/^\d{9,12}$/.test(transaction.scancode!)) {
      errors.push("Scancode must be 9-12 digits");
    }

    if (errors.length > 0) {
      invalid.push({ row: index + 2, errors }); // +2 because of 0-based index and header row
    } else {
      valid.push(transaction as SalesTransaction);
    }
  });

  return { valid, invalid };
}
