import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const supabase = await createClient();

  // Fetch inventory
  const { data: inventory, error: inventoryError } = await supabase
    .from("inventory")
    .select("*, location:locations(*), product:products(*)");
  if (inventoryError) {
    return NextResponse.json({ error: inventoryError.message }, { status: 500 });
  }

  // Fetch sales
  const { data: sales, error: salesError } = await supabase.from("sales_transactions").select("*");
  if (salesError) {
    return NextResponse.json({ error: salesError.message }, { status: 500 });
  }

  // Calculate summary statistics
  const totalLocations = new Set((inventory || []).map(item => item.location_id)).size;
  const totalProducts = new Set((inventory || []).map(item => item.product_id)).size;
  const lowStockItems = (inventory || []).filter(item => item.quantity <= item.min_stock_level).length;
  const totalSales = (sales || []).reduce((sum, sale) => sum + sale.final_amount, 0);

  return NextResponse.json({
    totalLocations,
    totalProducts,
    lowStockItems,
    totalSales,
  });
}
