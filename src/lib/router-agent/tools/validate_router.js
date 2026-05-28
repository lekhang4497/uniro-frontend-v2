// Tool: validate_router
//
// Run the JS shape validator. If `yaml` is supplied, validates that text
// (the agent can dry-run a candidate before writing it). Otherwise validates
// the current state.
//
// Returns the canonical {ok, errors, warnings} from the validator.

import { checkArgsOrError } from "./_argValidate.js";

export const definition = {
  type: "function",
  function: {
    name: "validate_router",
    description:
      "Validate router YAML against the shape validator. Pass a yaml string to dry-run a candidate; omit to validate the current router state.",
    parameters: {
      type: "object",
      properties: {
        yaml: {
          type: "string",
          description: "Optional candidate YAML to validate. Omit to validate current state.",
        },
      },
      required: [],
    },
  },
};

export function makeExecute({ getYaml, validate }) {
  return async function execute(args) {
    const bad = checkArgsOrError(args || {}, definition.function.parameters);
    if (bad) return bad;
    const target = typeof args?.yaml === "string" ? args.yaml : getYaml() || "";
    return validate(target);
  };
}
