# Inventory Management System

A modern, full-stack inventory management system built with Next.js, Supabase, and TypeScript. This application helps businesses manage their inventory, track sales, and handle CSV data imports from multiple vendors.

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

## ✨ Features

- 🔐 **Authentication** - Secure user authentication with Supabase Auth
- 📊 **Dashboard** - Real-time inventory and sales overview
- 📈 **Sales Tracking** - Monitor sales transactions and revenue
- 📦 **Inventory Management** - Track stock levels across multiple locations
- 📤 **CSV Import** - Support for multiple vendor CSV formats
- 📥 **Data Export** - Export inventory and sales data to CSV
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 🎨 **Modern UI** - Beautiful interface built with Tailwind CSS and shadcn/ui

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Supabase account

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/inventory-management.git
   cd inventory-management
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory with the following variables:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase**

   - Create a new Supabase project
   - Run the following SQL in your Supabase SQL editor:

   ```sql
   -- Enable RLS
   alter table public.locations enable row level security;
   alter table public.products enable row level security;
   alter table public.inventory enable row level security;
   alter table public.sales_transactions enable row level security;
   alter table public.csv_uploads enable row level security;

   -- Create policies
   create policy "Enable read access for authenticated users" on public.locations
     for select using (auth.role() = 'authenticated');

   create policy "Enable read access for authenticated users" on public.products
     for select using (auth.role() = 'authenticated');

   create policy "Enable read access for authenticated users" on public.inventory
     for select using (auth.role() = 'authenticated');

   create policy "Enable read access for authenticated users" on public.sales_transactions
     for select using (auth.role() = 'authenticated');

   create policy "Enable read access for authenticated users" on public.csv_uploads
     for select using (auth.role() = 'authenticated');
   ```

5. **Start the development server**

   ```bash
   pnpm dev
   ```

6. **Open your browser**
   Visit `http://localhost:3000`

## 📁 Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   └── (pages)/           # Main application pages
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── dashboard/        # Dashboard-specific components
│   └── csv/              # CSV-related components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
├── store/                # State management
├── types/                # TypeScript type definitions
└── utils/                # Helper functions
```

## 🗄️ Database Architecture

### Schema Overview

```sql
-- Locations table
create table public.locations (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Products table
create table public.products (
  id uuid default gen_random_uuid() primary key,
  sku text not null unique,
  name text not null,
  unit_price decimal(10,2) not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Inventory table
create table public.inventory (
  id uuid default gen_random_uuid() primary key,
  location_id uuid references public.locations(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  quantity integer not null default 0,
  min_stock_level integer not null default 0,
  max_stock_level integer not null default 1000,
  last_updated timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_by uuid references auth.users(id),
  unique(location_id, product_id)
);

-- Sales transactions table
create table public.sales_transactions (
  id uuid default gen_random_uuid() primary key,
  location_id uuid references public.locations(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  transaction_date timestamp with time zone not null,
  quantity integer not null,
  unit_price decimal(10,2) not null,
  final_amount decimal(10,2) not null,
  vendor text not null,
  csv_upload_id uuid references public.csv_uploads(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- CSV uploads table
create table public.csv_uploads (
  id uuid default gen_random_uuid() primary key,
  filename text not null,
  vendor text not null,
  status text not null default 'processing',
  uploaded_by uuid references auth.users(id),
  processed_at timestamp with time zone,
  records_processed integer default 0,
  errors_count integer default 0,
  error_log jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### Design Decisions

1. **UUID Primary Keys**

   - Using UUIDs instead of sequential IDs for better security and distribution
   - Prevents enumeration attacks and makes data migration easier
   - Enables better horizontal scaling

2. **Timestamps**

   - All tables include `created_at` and `updated_at` fields
   - Helps with auditing and tracking data changes
   - Uses UTC timezone for consistency across regions

3. **Foreign Key Constraints**

   - Enforces referential integrity between tables
   - `on delete cascade` for locations and products to automatically clean up related records
   - `on delete set null` for csv_uploads to preserve transaction history

4. **Unique Constraints**

   - `locations.name` - Ensures unique location codes
   - `products.sku` - Ensures unique product identifiers
   - `inventory(location_id, product_id)` - Prevents duplicate inventory records

5. **Decimal Precision**

   - Using `decimal(10,2)` for monetary values
   - Ensures accurate financial calculations
   - Prevents floating-point rounding errors

6. **JSONB for Error Logs**

   - Using JSONB type for `error_log` in csv_uploads
   - Flexible schema for storing various error types
   - Efficient querying and indexing capabilities

7. **Status Tracking**

   - CSV uploads include status tracking
   - Helps monitor import progress
   - Enables error handling and retry mechanisms

8. **Audit Fields**
   - `updated_by` in inventory table
   - Tracks who made the last change
   - Useful for accountability and debugging

### Indexes

```sql
-- Performance optimization indexes
create index idx_inventory_location_product on public.inventory(location_id, product_id);
create index idx_sales_transactions_date on public.sales_transactions(transaction_date);
create index idx_sales_transactions_location on public.sales_transactions(location_id);
create index idx_csv_uploads_status on public.csv_uploads(status);
create index idx_csv_uploads_uploaded_by on public.csv_uploads(uploaded_by);
```

### Row Level Security (RLS)

All tables have RLS enabled with policies that:

- Allow read access to authenticated users
- Prevent unauthorized modifications
- Ensure data isolation between users

## 🔧 Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier

## 📝 CSV Format Support

The system supports two vendor CSV formats:

### Vendor A Format

```
Date,Location,Product,UPC,Price,Quantity
```

### Vendor B Format

```
TransactionDate,StoreCode,ItemName,ItemCode,UnitPrice,UnitsSold
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
