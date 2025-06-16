"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { inventoryColumns } from "./inventory-columns";
import { salesColumns } from "./sales-columns";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Download, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useDashboardStore } from "@/store/dashboard-store";
import Link from "next/link";
import { InventorySummaryCards } from "@/modules/inventory-summary-cards";
import { AddItemDialog } from "./add-item-dialog";
import { exportSalesToCSV, exportInventoryToCSV } from "@/utils/export-utils";

export function DashboardOverview() {
  const { inventory, sales, summary, loading, error, initializeData } = useDashboardStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  const handleExport = () => {
    exportSalesToCSV(sales);
    exportInventoryToCSV(inventory);
  };

  return (
    <div className="space-y-6 p-6  rounded-lg shadow-sm">
      {/* Summary Cards */}
      <InventorySummaryCards
        totalLocations={summary?.totalLocations || 0}
        totalProducts={summary?.totalProducts || 0}
        lowStockItems={summary?.lowStockItems || 0}
        totalSales={summary?.totalSales || 0}
      />

      {/* Main Content */}
      <Tabs defaultValue="sales" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="shadow-sm">
            <TabsTrigger value="sales">Sales Transactions</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>
          <div className="flex items-center space-x-2">
            <Button onClick={initializeData} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link href="/csv">
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        <TabsContent value="inventory" className="space-y-4   rounded-lg p-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Management</CardTitle>
              <CardDescription>View and manage inventory levels across all locations</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={inventoryColumns}
                data={inventory}
                searchKey="product.name"
                searchPlaceholder="Search products..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4   rounded-lg p-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Transactions</CardTitle>
              <CardDescription>Recent sales data from CSV uploads</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={salesColumns}
                data={sales}
                searchKey="product_name"
                searchPlaceholder="Search transactions..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <AddItemDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={() => {
          setIsAddDialogOpen(false);
          initializeData();
        }}
      />
    </div>
  );
}
