// Tool: update_decision
//
// Shallow-merge `patch` onto the named decision. `rules` and `plugins` in
// the patch are *replaced* wholesale (they're trees / arrays — deep-
// merging them would silently corrupt the structure). All other keys are
// overwritten.
//
// If no matching decision exists, returns a structured error with
// `code: decision_not_found` so the agent can recover (likely by listing
// decisions via get_router).

import { checkArgsOrError } from "./_argValidate.js";

const REPLACE_WHOLESALE = new Set(["rules", "plugins"]);

export const definition = {
  type: "function",
  function: {
    name: "update_decision",
    description:
      "Update an existing decision by name. `patch` is shallow-merged onto the decision; `rules` and `plugins` are replaced wholesale rather than deep-merged.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the decision to update." },
        patch: {
          type: "object",
          description: "Object of fields to update on the decision.",
        },
      },
      required: ["name", "patch"],
    },
  },
};

export function makeExecute({ getYaml, setYaml, validate, summarize, parseYaml, stringifyYaml }) {
  return async function execute(args) {
    const bad = checkArgsOrError(args, definition.function.parameters);
    if (bad) return bad;

    const raw = getYaml() || "";
    const parsed = parseYaml(raw);
    if (!parsed.ok || parsed.data == null || typeof parsed.data !== "object" || Array.isArray(parsed.data)) {
      return {
        ok: false,
        error: {
          code: "decision_not_found",
          message: `Cannot update decisions: current router YAML is empty or unparseable.`,
        },
      };
    }
    const doc = parsed.data;
    const decisions = Array.isArray(doc.decisions) ? doc.decisions : [];
    const idx = decisions.findIndex((d) => d && d.name === args.name);
    if (idx === -1) {
      return {
        ok: false,
        error: {
          code: "decision_not_found",
          message: `No decision named '${args.name}' exists. Call get_router to see the current decisions.`,
        },
      };
    }

    const original = decisions[idx];
    const merged = { ...original };
    for (const [k, v] of Object.entries(args.patch || {})) {
      if (REPLACE_WHOLESALE.has(k)) {
        merged[k] = v;
      } else {
        merged[k] = v;
      }
    }
    decisions[idx] = merged;

    const nextYaml = stringifyYaml(doc);
    setYaml(nextYaml, { actor: "agent", description: `update_decision ${args.name}` });
    const validation = validate(nextYaml);
    return {
      ok: validation.ok,
      validation,
      summary: summarize(nextYaml),
    };
  };
}
