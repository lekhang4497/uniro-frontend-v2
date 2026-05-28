// Tool: update_decision
//
// Shallow merge -- top-level patch keys replace target keys wholesale. Use
// `set_router_yaml` for deep restructuring (replacing a subtree under a
// specific key without touching its siblings, for example).
//
// If no matching decision exists, returns a structured error with
// `code: decision_not_found` so the agent can recover (likely by listing
// decisions via get_router).

import { checkArgsOrError } from "./_argValidate.js";

export const definition = {
  type: "function",
  function: {
    name: "update_decision",
    description:
      "Update an existing decision by name. `patch` is shallow-merged onto the decision: top-level patch keys replace target keys wholesale (no deep merge). Use `set_router_yaml` for deep restructuring.",
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
    const merged = { ...original, ...(args.patch || {}) };
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
