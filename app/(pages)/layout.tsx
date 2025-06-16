import { LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <header className="bg-primary text-primary-foreground shadow border-b border-accent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold">Inventory Dashboard</h1>
              <p className="text-sm text-secondary-foreground opacity-80">Welcome back, {user?.email}</p>
            </div>
            <Link
              href="/auth/logout"
              className="border-accent flex flex-row items-center border border-white rounded-md p-2 text-primary-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
