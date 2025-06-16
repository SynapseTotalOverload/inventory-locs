"use client";

import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { LogOut } from "lucide-react";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";

interface DashboardContentProps {
  user: User;
}

export function DashboardContent({ user }: DashboardContentProps) {
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 rounded-lg">
          <DashboardOverview />
        </div>
      </main>
    </div>
  );
}
