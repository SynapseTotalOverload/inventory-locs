export interface Location {
  id: string;
  name: string;
  address?: string;
  manager_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit_price?: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  location_id: string;
  product_id: string;
  quantity: number;
  min_stock_level: number;
  max_stock_level: number;
  last_updated: string;
  updated_by?: string;
  location?: Location;
  product?: Product;
}

export interface SalesTransaction {
  id?: string;
  location_code: string;
  location_id?: string;
  product_name: string;
  upc_code: string;
  transaction_date: string;
  unit_price: number;
  final_amount: number;
  vendor: "vendor_a" | "vendor_b";
  category?: string;
  csv_upload_id?: string;
  created_at?: string;
}

export interface CSVUpload {
  id: string;
  filename: string;
  vendor: "vendor_a" | "vendor_b";
  status: "processing" | "completed" | "failed";
  processed_at?: string;
  records_processed?: number;
  errors_count?: number;
  error_log?: string;
  created_at: string;
}
