// Safe YAML parsing wrapper. Returns a structured success/error object so the
// validator can fold parse failures into its normal Issue stream without
// throwing.

import { parseYAML } from "confbox/yaml";

export function parse(text) {
  if (typeof text !== "string") {
    return { ok: false, error: "Input must be a YAML string." };
  }
  try {
    const data = parseYAML(text);
    if (data == null) {
      return { ok: false, error: "Empty YAML document." };
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}
