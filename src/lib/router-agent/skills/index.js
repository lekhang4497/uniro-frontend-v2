// Skill catalog access. Resolves the on-disk path relative to this module
// (NOT process.cwd) so it works in both dev and Next.js standalone builds.
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "./_frontmatter.js";

// __dirname-equivalent for ESM
const SKILLS_DIR = path.dirname(fileURLToPath(import.meta.url));

const NAME_RE = /^[a-z0-9-]+$/;

export function isValidSkillName(name) {
  return typeof name === "string" && NAME_RE.test(name);
}

export async function listSkillNames() {
  const entries = await fs.readdir(SKILLS_DIR);
  return entries
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.slice(0, -3))
    .sort();
}

// Returns { name, raw, meta, body } for one skill, or null if missing.
export async function readSkill(name) {
  if (!isValidSkillName(name)) return null;
  const file = path.join(SKILLS_DIR, `${name}.md`);
  let raw;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (err) {
    if (err.code === "ENOENT" || err.code === "ENOTDIR") return null;
    throw err;
  }
  const { meta, body } = parseFrontmatter(raw);
  return { name, raw, meta, body };
}

export async function readAllSkillMeta() {
  const names = await listSkillNames();
  const out = [];
  for (const name of names) {
    const s = await readSkill(name);
    if (!s) continue;
    out.push({ name, meta: s.meta, frontmatterSource: extractFrontmatterSource(s.raw) });
  }
  return out;
}

// Single canonical regex for the frontmatter fence. Used by readAllSkillMeta
// for the manifest version hash.
const FENCE_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
function extractFrontmatterSource(raw) {
  const m = raw.match(FENCE_RE);
  return m ? m[1] : "";
}
