// GET /api/router-agent/skills/[name]
//
// Returns the raw markdown body (including frontmatter) of one skill as
// text/markdown.
//
// Path-traversal guard: `name` must be pure [a-z0-9-]+ (no dots, no
// slashes, no parent refs). Anything else -> 400.
//
// 404 if the file doesn't exist; 500 on any other read error.

import { NextResponse } from "next/server";
import { isValidSkillName, readSkill } from "@/lib/router-agent/skills";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req, { params }) {
  const { name } = await params;
  if (!isValidSkillName(name)) {
    return NextResponse.json(
      { error: "Skill name must match [a-z0-9-]+" },
      { status: 400 }
    );
  }
  try {
    const skill = await readSkill(name);
    if (!skill) {
      return NextResponse.json({ error: `Skill not found: ${name}` }, { status: 404 });
    }
    return new NextResponse(skill.raw, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.log(`Error reading router-agent skill '${name}':`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
