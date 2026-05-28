// Helpers shared by tools that mutate the in-memory parsed YAML document.
//
// All tools that mutate state:
//   1. parse the current YAML (or seed a minimal doc when empty/unparseable),
//   2. perform a structured edit on the JS object,
//   3. stringify back to YAML,
//   4. hand the result to setYaml, which validates + pushes an undo entry,
//   5. return {ok: validation.ok, validation, summary}.

const MINIMAL_DOC = () => ({ name: "untitled_router" });

/**
 * Parse the current YAML state. If empty or unparseable, seed a minimal
 * document so the agent's first edits always succeed.
 *
 * `seededFromInvalid` is true when we replaced an unparseable doc with the
 * minimal one — callers may want to flag this in the tool result so the
 * agent doesn't silently lose user-authored content.
 */
export function loadDocOrSeed(getYaml, parseYaml) {
  const raw = getYaml();
  if (typeof raw !== "string" || raw.trim() === "") {
    return { doc: MINIMAL_DOC(), seededFromInvalid: false, hadContent: false };
  }
  const parsed = parseYaml(raw);
  if (!parsed.ok || parsed.data == null || typeof parsed.data !== "object" || Array.isArray(parsed.data)) {
    return { doc: MINIMAL_DOC(), seededFromInvalid: true, hadContent: true };
  }
  return { doc: parsed.data, seededFromInvalid: false, hadContent: true };
}

/**
 * Ensure the named array exists on the doc, returning a reference to it.
 */
export function ensureArray(doc, key) {
  if (!Array.isArray(doc[key])) doc[key] = [];
  return doc[key];
}

/**
 * Walk every rule-tree leaf under decisions, calling cb(leaf) for each.
 *
 * A leaf is an object with a `name` field (no `operator`). A composite has
 * `operator` and `conditions` (or `condition` for NOT). We tolerate either
 * shape and stop at malformed nodes.
 */
export function walkRuleLeaves(decisions, cb) {
  if (!Array.isArray(decisions)) return;
  for (const decision of decisions) {
    if (!decision || typeof decision !== "object") continue;
    walkNode(decision.rules, cb);
  }
}

function walkNode(node, cb) {
  if (!node || typeof node !== "object") return;
  if (node.operator) {
    const children = Array.isArray(node.conditions)
      ? node.conditions
      : node.condition
        ? [node.condition]
        : [];
    for (const c of children) walkNode(c, cb);
    return;
  }
  // Leaf
  if (typeof node.name === "string") cb(node);
}

/**
 * Collect every leaf name referenced by any decision's rule tree.
 */
export function collectReferencedLeafNames(decisions) {
  const names = new Set();
  walkRuleLeaves(decisions, (leaf) => names.add(leaf.name));
  return names;
}
