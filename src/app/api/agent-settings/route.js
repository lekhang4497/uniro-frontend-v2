import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/db/index.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/agent-settings — { reasoningModel: string }
export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({
      reasoningModel: settings.agentReasoningModel || "",
    });
  } catch (error) {
    console.log("Error fetching agent settings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/agent-settings — body { reasoningModel?: string }
export async function PATCH(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { reasoningModel } = body || {};
    const patch = {};
    if (reasoningModel !== undefined) {
      if (typeof reasoningModel !== "string") {
        return NextResponse.json({ error: "reasoningModel must be a string" }, { status: 400 });
      }
      patch.agentReasoningModel = reasoningModel;
    }
    const settings = await updateSettings(patch);
    return NextResponse.json({
      reasoningModel: settings.agentReasoningModel || "",
    });
  } catch (error) {
    console.log("Error updating agent settings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
