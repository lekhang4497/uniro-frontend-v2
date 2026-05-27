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
import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SKILLS_DIR = path.join(process.cwd(), "src", "lib", "router-agent", "skills");
const NAME_RE = /^[a-z0-9-]+$/;

export async function GET(_request, { params }) {
  try {
    const { name } = await params;
    if (typeof name !== "string" || !NAME_RE.test(name)) {
      return NextResponse.json(
        { error: "invalid skill name; must match /^[a-z0-9-]+$/" },
        { status: 400 }
      );
    }
    const full = path.join(SKILLS_DIR, `${name}.md`);
    let body;
    try {
      body = await readFile(full, "utf8");
    } catch (err) {
      if (err && (err.code === "ENOENT" || err.code === "ENOTDIR")) {
        return NextResponse.json({ error: "skill not found" }, { status: 404 });
      }
      throw err;
    }
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.log("Error reading router-agent skill:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
