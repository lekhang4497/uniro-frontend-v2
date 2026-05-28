import { NextResponse } from "next/server";
import {
  getRouterAgentThread,
  saveRouterAgentThread,
  deleteRouterAgentThread,
} from "@/lib/db/index.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/router-agent/threads/[routerId]
export async function GET(_request, { params }) {
  try {
    const { routerId } = await params;
    if (!routerId) {
      return NextResponse.json({ error: "routerId required" }, { status: 400 });
    }
    const thread = await getRouterAgentThread(routerId);
    if (!thread) {
      return NextResponse.json({ routerId, messages: [], updatedAt: null });
    }
    return NextResponse.json(thread);
  } catch (error) {
    console.log("Error fetching router agent thread:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/router-agent/threads/[routerId] — body {messages: Array}
export async function PUT(request, { params }) {
  try {
    const { routerId } = await params;
    if (!routerId) {
      return NextResponse.json({ error: "routerId required" }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const { messages } = body || {};
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "messages must be an array" }, { status: 400 });
    }
    await saveRouterAgentThread(routerId, messages);
    const thread = await getRouterAgentThread(routerId);
    return NextResponse.json(thread);
  } catch (error) {
    console.log("Error saving router agent thread:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/router-agent/threads/[routerId]
export async function DELETE(_request, { params }) {
  try {
    const { routerId } = await params;
    if (!routerId) {
      return NextResponse.json({ error: "routerId required" }, { status: 400 });
    }
    await deleteRouterAgentThread(routerId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("Error deleting router agent thread:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
