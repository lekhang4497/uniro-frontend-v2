// Tool: add_decision
//
// Append a decision block to `decisions[]`. Decisions hold a rule tree
// (AND/OR/NOT composites with leaf references) and either `model` or
// `modelRefs` (xor). The validator enforces the xor; this tool does not
// pre-check it so the agent can author either form and learn from the
// validation result.

import { checkArgsOrError } from "./_argValidate.js";
import { loadDocOrSeed, ensureArray } from "./_docHelpers.js";

export const definition = {
  type: "function",
  function: {
    name: "add_decision",
    description:
      "Append a decision to the router. A decision binds a rule tree (over signals/projections) to a target model or weighted model set. Provide either `model` or `modelRefs`, not both.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Decision name." },
        priority: {
          type: "number",
          description: "Optional priority. Higher fires first when multiple decisions match.",
        },
        rules: {
          type: "object",
          description:
            "Rule tree. Leaf: {name, type}. Composite: {operator: 'AND'|'OR'|'NOT', conditions: [...]}.",
        },
        model: { type: "string", description: "Single target model alias." },
        modelRefs: {
          type: "array",
          description: "Weighted model set: [{model, weight}, ...].",
        },
        plugins: { type: "array", description: "Plugins to attach to this decision." },
      },
      required: ["name", "rules"],
    },
  },
};

export function makeExecute({ getYaml, setYaml, validate, summarize, parseYaml, stringifyYaml }) {
  return async function execute(args) {
    const bad = checkArgsOrError(args, definition.function.parameters);
    if (bad) return bad;

    const { doc } = loadDocOrSeed(getYaml, parseYaml);
    const decisions = ensureArray(doc, "decisions");

    const decision = { name: args.name, rules: args.rules };
    if (typeof args.priority === "number") decision.priority = args.priority;
    if (typeof args.model === "string") decision.model = args.model;
    if (Array.isArray(args.modelRefs)) decision.modelRefs = args.modelRefs;
    if (Array.isArray(args.plugins)) decision.plugins = args.plugins;

    decisions.push(decision);

    const nextYaml = stringifyYaml(doc);
    setYaml(nextYaml, { actor: "agent", description: `add_decision ${args.name}` });
    const validation = validate(nextYaml);
    return {
      ok: validation.ok,
      validation,
      summary: summarize(nextYaml),
    };
  };
}
