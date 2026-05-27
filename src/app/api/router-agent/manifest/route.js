// GET /api/router-agent/manifest
//
// Walks src/lib/router-agent/skills/, parses each .md file's frontmatter
// (via the shared `_frontmatter.js` helper), and returns:
//
//   {
//     "version": "<12-char sha256 of sorted frontmatter blocks>",
//     "skills":  [{name, description, version}, ...]
//   }
//
// Skill bodies are NOT included — fetch each via
// /api/router-agent/skills/[name].
//
// The skills directory is read at request time. No bundling; no caching
// beyond Node's filesystem. `dynamic = "force-dynamic"` so Next never
// memoises this route.

import { NextResponse } from "next/server";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { parseFrontmatter } from "@/lib/router-agent/skills/_frontmatter.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SKILLS_DIR = path.join(process.cwd(), "src", "lib", "router-agent", "skills");

async function listSkillFiles() {
  const entries = await readdir(SKILLS_DIR);
  // Only files matching <name>.md where <name> is kebab-case ASCII.
  return entries
    .filter((f) => f.endsWith(".md"))
    .filter((f) => /^[a-z0-9-]+\.md$/.test(f))
    .sort();
}

async function readSkillMeta(filename) {
  const full = path.join(SKILLS_DIR, filename);
  const raw = await readFile(full, "utf8");
  const { meta } = parseFrontmatter(raw);
  return { raw, meta };
}

export async function GET() {
  try {
    const files = await listSkillFiles();
    const skills = [];
    const fmConcat = [];
    for (const filename of files) {
      const { raw, meta } = await readSkillMeta(filename);
      // We use the frontmatter block (the leading `---\n...\n---\n`) for
      // the hash so it changes when any skill's metadata changes. The
      // body intentionally doesn't contribute — body changes don't
      // invalidate the manifest, only metadata does.
      const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
      const fmText = fmMatch ? fmMatch[1] : "";
      fmConcat.push(`${filename}\n${fmText}`);
      skills.push({
        name: typeof meta?.name === "string" ? meta.name : filename.replace(/\.md$/, ""),
        description: typeof meta?.description === "string" ? meta.description : "",
        version: Number.isInteger(meta?.version) ? meta.version : 1,
      });
    }
    const version = crypto
      .createHash("sha256")
      .update(fmConcat.join("\n---FILE---\n"))
      .digest("hex")
      .slice(0, 12);
    return NextResponse.json(
      { version, skills },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.log("Error building router-agent manifest:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
