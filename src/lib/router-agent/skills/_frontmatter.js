// Parse a markdown file with a leading YAML frontmatter block.
//
// Frontmatter format:
//   ---
//   key: value
//   key2: value
//   ---
//   <body>
//
// We delegate the YAML parse to confbox/yaml (already in node_modules — no new
// dependency). The frontmatter block is small, ASCII-only, and only contains
// scalar `key: value` pairs in the skills here, but using a real YAML parser
// keeps us honest if a description ever contains a colon, quote, etc.
//
// Returns { meta, body }. If the file has no frontmatter, meta is an empty
// object and body is the full input.

import { parseYAML } from "confbox/yaml";

const OPEN = /^---\r?\n/;
const CLOSE_RE = /\r?\n---\r?\n/;

export function parseFrontmatter(text) {
  if (typeof text !== "string" || text.length === 0) {
    return { meta: {}, body: typeof text === "string" ? text : "" };
  }
  if (!OPEN.test(text)) {
    return { meta: {}, body: text };
  }
  // Strip the opening "---\n" and look for the closing fence.
  const afterOpen = text.replace(OPEN, "");
  const closeMatch = afterOpen.match(CLOSE_RE);
  if (!closeMatch) {
    // No closing fence — treat the whole file as body.
    return { meta: {}, body: text };
  }
  const fmText = afterOpen.slice(0, closeMatch.index);
  const body = afterOpen.slice(closeMatch.index + closeMatch[0].length);
  let meta = {};
  try {
    const parsed = parseYAML(fmText);
    if (parsed && typeof parsed === "object") meta = parsed;
  } catch {
    // Bad YAML in frontmatter — return empty meta but keep the body.
    meta = {};
  }
  return { meta, body };
}
