import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { CSVManagement } from "@/components/csv/csv-management"

export default async function CSVPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return <CSVManagement user={user} />
}
