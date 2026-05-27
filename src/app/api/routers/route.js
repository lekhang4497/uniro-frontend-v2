import { NextResponse } from "next/server";
import { listRouters, createRouter } from "@/lib/db/index.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/routers — list (omit yaml field to keep payload small)
export async function GET() {
  try {
    const routers = await listRouters();
    const list = routers.map(({ id, name, updatedAt, createdAt }) => ({
      id, name, updatedAt, createdAt,
    }));
    return NextResponse.json({ routers: list });
  } catch (error) {
    console.log("Error listing routers:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/routers — body {name?, yaml?}
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { name, yaml } = body || {};
    if (name !== undefined && typeof name !== "string") {
      return NextResponse.json({ error: "name must be a string" }, { status: 400 });
    }
    if (yaml !== undefined && typeof yaml !== "string") {
      return NextResponse.json({ error: "yaml must be a string" }, { status: 400 });
    }
    const router = await createRouter({ name, yaml });
    return NextResponse.json(router, { status: 201 });
  } catch (error) {
    console.log("Error creating router:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
