import { NextResponse } from "next/server";
import { getRouter, updateRouter, deleteRouter } from "@/lib/db/index.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/routers/[id]
export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const router = await getRouter(id);
    if (!router) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 });
    }
    return NextResponse.json(router);
  } catch (error) {
    console.log("Error fetching router:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/routers/[id] — body {name?, yaml?}
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { name, yaml } = body || {};

    if (name !== undefined && typeof name !== "string") {
      return NextResponse.json({ error: "name must be a string" }, { status: 400 });
    }
    if (yaml !== undefined && typeof yaml !== "string") {
      return NextResponse.json({ error: "yaml must be a string" }, { status: 400 });
    }

    const updated = await updateRouter(id, {
      ...(name !== undefined ? { name } : {}),
      ...(yaml !== undefined ? { yaml } : {}),
    });
    if (!updated) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.log("Error updating router:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/routers/[id]
export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const ok = await deleteRouter(id);
    if (!ok) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("Error deleting router:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
