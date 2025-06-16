import { createClient } from "@/utils/supabase/server";
import { DashboardContent } from "@/components/dashboard-content";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

import { redirect } from "next/navigation";

export default async function HomePage() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.log(user);

    if (!user) {
      redirect("/auth/login");
    }

    return <DashboardContent user={user} />;
  } catch (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>An error occurred while loading the page. Please try again later.</AlertDescription>
        </Alert>
      </div>
    );
  }
}
