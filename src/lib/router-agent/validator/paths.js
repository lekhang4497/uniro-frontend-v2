// Build JSON-pointer-ish paths for validator messages.
//
// The output uses bracket notation for array indices so the same string is a
// valid lodash-get path:
//
//   pathJoin("", "decisions")         → "decisions"
//   pathJoin("decisions", 2)          → "decisions[2]"
//   pathJoin("decisions[2]", "rules") → "decisions[2].rules"

export function pathJoin(parent, key) {
  if (typeof key === "number") return `${parent}[${key}]`;
  return parent ? `${parent}.${key}` : key;
}

// Convenience for the root-level path.
export const ROOT = "$";
