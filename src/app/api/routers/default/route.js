import { NextResponse } from "next/server";
import { ensureDefaultRouter } from "@/lib/db/index.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/routers/default — provision (if needed) and return the default router
export async function GET() {
  try {
    const router = await ensureDefaultRouter();
    return NextResponse.json(router);
  } catch (error) {
    console.log("Error ensuring default router:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
