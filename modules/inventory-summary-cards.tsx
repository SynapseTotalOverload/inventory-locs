import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InventorySummaryCardsProps {
  totalLocations: number;
  totalProducts: number;
  lowStockItems: number;
  totalSales: number;
}

export function InventorySummaryCards({
  totalLocations,
  totalProducts,
  lowStockItems,
  totalSales,
}: InventorySummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalLocations}</div>
          <p className="text-xs text-muted-foreground">Active locations</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalProducts}</div>
          <p className="text-xs text-muted-foreground">Unique products</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{lowStockItems}</div>
          <p className="text-xs text-muted-foreground">Need restocking</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(totalSales)}
          </div>
          <p className="text-xs text-muted-foreground">Recent transactions</p>
        </CardContent>
      </Card>
    </div>
  );
}
