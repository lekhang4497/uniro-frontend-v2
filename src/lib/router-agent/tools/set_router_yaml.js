// Tool: set_router_yaml
//
// Replace the whole router YAML. Spec §6.1 (item 2):
//   - validate after writing
//   - on validation FAILURE the YAML is still committed so undo can recover
//     the failed state; the agent is expected to iterate
//
// Returns {ok, validation, summary}.

import { checkArgsOrError } from "./_argValidate.js";

export const definition = {
  type: "function",
  function: {
    name: "set_router_yaml",
    description:
      "Replace the entire router YAML document. Use this for from-scratch authoring or wholesale rewrites. The document is committed even if validation fails so you can iterate; check the returned validation object.",
    parameters: {
      type: "object",
      properties: {
        yaml: {
          type: "string",
          description: "The complete YAML document to set as the new router.",
        },
      },
      required: ["yaml"],
    },
  },
};

export function makeExecute({ setYaml, validate, summarize }) {
  return async function execute(args) {
    const bad = checkArgsOrError(args, definition.function.parameters);
    if (bad) return bad;

    setYaml(args.yaml, { actor: "agent", description: "set_router_yaml" });
    const validation = validate(args.yaml);
    return {
      ok: validation.ok,
      validation,
      summary: summarize(args.yaml),
    };
  };
}
