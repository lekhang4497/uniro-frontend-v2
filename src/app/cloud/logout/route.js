import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(request) {
  const supabase = await getServerSupabase();
  if (supabase) {
    await supabase.auth.signOut();
  }
  const url = new URL(request.url);
  return NextResponse.redirect(new URL("/cloud/login", url.origin), { status: 303 });
}
