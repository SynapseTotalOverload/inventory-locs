"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { LogOut, ArrowLeft } from "lucide-react";
import { CSVUpload } from "./csv-upload";
import { CSVUploadHistory } from "./csv-upload-history";
import Link from "next/link";

interface CSVManagementProps {
  user: User;
}

export function CSVManagement({ user }: CSVManagementProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Button variant="outline" asChild className="flex items-center gap-2 mb-6">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-8 flex flex-col gap-4 items-center">
          <CSVUpload onUploadComplete={handleUploadComplete} />
          <CSVUploadHistory refreshTrigger={refreshTrigger} />
        </div>
      </main>
    </div>
  );
}
