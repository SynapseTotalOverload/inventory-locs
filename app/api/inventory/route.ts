import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory")
    .select(`*, location:locations(*), product:products(*)`)
    .order("last_updated", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { data, error } = await supabase.from("inventory").insert([body]).select();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}
