import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // List of tables to clear in order (child tables first, then parent tables)
    const tables = [
      "sales_transactions", // Child table (depends on csv_uploads)
      "csv_uploads", // Parent table
      "inventory", // Independent table
      "locations", // Independent table
      "products", // Independent table
    ];

    const results = [];

    // Clear each table
    for (const table of tables) {
      console.log(`Attempting to clear table: ${table}`);

      // First check if table exists and has data
      const { count, error: countError } = await supabase.from(table).select("*", { count: "exact", head: true });

      if (countError) {
        console.error(`Error checking table ${table}:`, countError);
        results.push({ table, status: "error", message: countError.message });
        continue;
      }

      console.log(`Table ${table} has ${count} rows`);

      // Delete all rows with a WHERE clause that matches everything
      const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000"); // This will match all valid UUIDs

      if (error) {
        console.error(`Error clearing table ${table}:`, error);
        results.push({ table, status: "error", message: error.message });
      } else {
        console.log(`Successfully cleared table ${table}`);
        results.push({ table, status: "success", rowsCleared: count });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Tables cleared successfully",
      results,
    });
  } catch (error) {
    console.error("Error clearing tables:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
