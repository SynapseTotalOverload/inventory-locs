import { create } from "zustand";
import type { InventoryItem, SalesTransaction } from "@/types/inventory";

interface Summary {
  totalLocations: number;
  totalProducts: number;
  lowStockItems: number;
  totalSales: number;
}

interface DashboardState {
  inventory: InventoryItem[];
  sales: SalesTransaction[];
  summary: Summary | null;
  loading: boolean;
  error: string | null;
  initializeData: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>(set => ({
  inventory: [],
  sales: [],
  summary: null,
  loading: false,
  error: null,
  initializeData: async () => {
    set({ loading: true, error: null });
    try {
      const [inventoryRes, salesRes, summaryRes] = await Promise.all([
        fetch("/api/inventory"),
        fetch("/api/sales"),
        fetch("/api/summary"),
      ]);
      const inventoryData = await inventoryRes.json();
      const salesData = await salesRes.json();
      const summaryData = await summaryRes.json();
      set({
        inventory: inventoryData.data || [],
        sales: salesData.data || [],
        summary: summaryData || null,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      set({ loading: false, error: err.message || "Failed to fetch dashboard data" });
    }
  },
}));
