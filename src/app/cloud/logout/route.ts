import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await getServerSupabase();
  if (supabase) {
    await supabase.auth.signOut();
  }
  const url = new URL(request.url);
  return NextResponse.redirect(new URL("/cloud/login", url.origin), { status: 303 });
}
