// GET /api/router-agent/manifest
//
// Returns a list of every skill in src/lib/router-agent/skills/ plus a
// 12-char sha256 of the concatenated frontmatter blocks so clients can
// cache-bust when any skill's metadata changes.
//
// Returns:
//   {
//     "version": "<12-char sha256>",
//     "skills":  [{name, description, version}, ...]
//   }
//
// Skill bodies are NOT included -- fetch each via
// /api/router-agent/skills/[name]. The skills directory is read at
// request time. `dynamic = "force-dynamic"` so Next never memoises.

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { readAllSkillMeta } from "@/lib/router-agent/skills";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const entries = await readAllSkillMeta();
    const skills = entries.map(({ name, meta }) => ({
      name: typeof meta?.name === "string" ? meta.name : name,
      description: typeof meta?.description === "string" ? meta.description : "",
      version: Number.isInteger(meta?.version) ? meta.version : 1,
    }));
    const hashInput = entries.map((e) => `${e.name}\n${e.frontmatterSource}`).join("\n---\n");
    const version = crypto.createHash("sha256").update(hashInput).digest("hex").slice(0, 12);
    return NextResponse.json(
      { version, skills },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.log("Error building router-agent manifest:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
