import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearTables() {
  try {
    // List of tables to clear (excluding auth.users)
    const tables = [
      "csv_uploads",
      "sales_transactions",
      "locations",
      "products",
      "inventory_items",
      "inventory_transactions",
    ];

    console.log("Starting table cleanup...");

    for (const table of tables) {
      console.log(`Clearing table: ${table}`);
      const { error } = await supabase.from(table).delete().neq("id", 0); // This ensures we delete all rows

      if (error) {
        console.error(`Error clearing ${table}:`, error);
      } else {
        console.log(`Successfully cleared ${table}`);
      }
    }

    // Reset sequences if they exist
    const sequences = [
      "csv_uploads_id_seq",
      "sales_transactions_id_seq",
      "locations_id_seq",
      "products_id_seq",
      "inventory_items_id_seq",
      "inventory_transactions_id_seq",
    ];

    for (const seq of sequences) {
      console.log(`Resetting sequence: ${seq}`);
      const { error } = await supabase.rpc("reset_sequence", { sequence_name: seq });

      if (error) {
        console.error(`Error resetting sequence ${seq}:`, error);
      } else {
        console.log(`Successfully reset sequence ${seq}`);
      }
    }

    console.log("Table cleanup completed successfully");
  } catch (error) {
    console.error("Error during table cleanup:", error);
  }
}

// Execute the cleanup
clearTables();
