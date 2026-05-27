// YAML helpers for the router-agent loop.
//
// - parseYaml(text)      -> {ok: true, data} | {ok: false, error}
// - stringifyYaml(value) -> string (throws on cycles)
// - summarizeYaml(text)  -> short one-line structural summary
//
// summarizeYaml is used in the system prompt to give the agent a cheap
// at-a-glance view of the router without injecting the whole YAML.

import { parseYAML, stringifyYAML } from "confbox/yaml";

export function parseYaml(text) {
  if (typeof text !== "string") {
    return { ok: false, error: "Input must be a YAML string." };
  }
  if (text.trim() === "") {
    return { ok: true, data: null };
  }
  try {
    const data = parseYAML(text);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

export function stringifyYaml(value) {
  return stringifyYAML(value);
}

/**
 * One-line structural summary of a YAML router.
 *
 * Examples:
 *   "3 signals, 2 decisions, 1 plugin, 0 projections"
 *   "Empty router"
 *   "Invalid YAML (parse error)"
 *
 * `plugin` counts all `plugins[]` entries across decisions.
 * `projection` counts partitions + scores + mappings.
 */
export function summarizeYaml(text) {
  if (typeof text !== "string" || text.trim() === "") {
    return "Empty router";
  }
  const parsed = parseYaml(text);
  if (!parsed.ok) {
    return `Invalid YAML (${parsed.error.split("\n")[0]})`;
  }
  const doc = parsed.data;
  if (doc == null || typeof doc !== "object" || Array.isArray(doc)) {
    return "Empty router";
  }
  const signals = Array.isArray(doc.signals) ? doc.signals.length : 0;
  const decisions = Array.isArray(doc.decisions) ? doc.decisions.length : 0;

  let plugins = 0;
  if (Array.isArray(doc.decisions)) {
    for (const d of doc.decisions) {
      if (d && Array.isArray(d.plugins)) plugins += d.plugins.length;
    }
  }

  let projections = 0;
  if (doc.projections && typeof doc.projections === "object") {
    const p = doc.projections;
    if (Array.isArray(p.partitions)) projections += p.partitions.length;
    if (Array.isArray(p.scores)) projections += p.scores.length;
    if (Array.isArray(p.mappings)) projections += p.mappings.length;
  }

  const pluralize = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  return [
    pluralize(signals, "signal"),
    pluralize(decisions, "decision"),
    pluralize(plugins, "plugin"),
    pluralize(projections, "projection"),
  ].join(", ");
}
