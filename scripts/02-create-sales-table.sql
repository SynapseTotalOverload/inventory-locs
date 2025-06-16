-- Create sales_transactions table to handle both vendor formats
CREATE TABLE IF NOT EXISTS sales_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Location information (normalized from both formats)
  location_code VARCHAR(100) NOT NULL, -- Maps to Location_ID or Site_Code
  location_id UUID REFERENCES locations(id), -- Will be populated after location matching
  
  -- Product information (normalized from both formats)
  product_name VARCHAR(255) NOT NULL, -- Maps to Product_Name or Item_Description
  upc_code VARCHAR(50), -- Maps to Scancode or UPC
  product_id UUID REFERENCES products(id), -- Will be populated after product matching
  
  -- Transaction details
  transaction_date DATE NOT NULL, -- Normalized from Trans_Date or Sale_Date
  unit_price DECIMAL(10,2) NOT NULL, -- Maps to Price or Unit_Price
  final_amount DECIMAL(10,2) NOT NULL, -- Maps to Total_Amount or Final_Total
  
  -- Processing metadata
  vendor VARCHAR(50) NOT NULL, -- 'vendor_a' or 'vendor_b'
  csv_upload_id UUID REFERENCES csv_uploads(id),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add indexes for better query performance
  CONSTRAINT unique_transaction UNIQUE(location_code, upc_code, transaction_date, unit_price, vendor, csv_upload_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_location_code ON sales_transactions(location_code);
CREATE INDEX IF NOT EXISTS idx_sales_upc_code ON sales_transactions(upc_code);
CREATE INDEX IF NOT EXISTS idx_sales_transaction_date ON sales_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_sales_vendor ON sales_transactions(vendor);
CREATE INDEX IF NOT EXISTS idx_sales_csv_upload ON sales_transactions(csv_upload_id);
