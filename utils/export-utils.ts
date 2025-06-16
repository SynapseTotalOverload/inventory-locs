import type { SalesTransaction, InventoryItem } from "@/types/inventory";

export function exportToCSV(data: any[], headers: string[], filename: string) {
  const csvContent = [headers.join(","), ...data.map(row => row.map((cell: any) => `"${cell}"`).join(","))].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSalesToCSV(sales: SalesTransaction[]) {
  const headers = ["Date", "Location", "Product", "Price", "Total Amount", "Vendor", "Category"];
  const rows = sales.map(sale => [
    new Date(sale.transaction_date).toLocaleDateString(),
    sale.location_id,
    sale.product_name,
    sale.price,
    sale.total_amount,
    sale.vendor === "vendor_a" ? "Vendor A" : "Vendor B",
    sale.category,
  ]);

  const filename = `sales-export-${new Date().toISOString().split("T")[0]}.csv`;
  exportToCSV(rows, headers, filename);
}

export function exportInventoryToCSV(inventory: InventoryItem[]) {
  const headers = ["Location", "Product", "SKU", "Quantity", "Min Stock", "Max Stock", "Last Updated"];
  const rows = inventory.map(item => [
    item.location?.name || "Unknown",
    item.product?.name || "Unknown",
    item.product?.sku || "Unknown",
    item.quantity,
    item.min_stock_level,
    item.max_stock_level,
    new Date(item.last_updated).toLocaleDateString(),
  ]);

  const filename = `inventory-export-${new Date().toISOString().split("T")[0]}.csv`;
  exportToCSV(rows, headers, filename);
}
