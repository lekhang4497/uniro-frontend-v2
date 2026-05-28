// Tool: add_signal
//
// Append a signal block to `signals[]`. If the current YAML is empty or
// unparseable, we seed a minimal document (`name: untitled_router`) first so
// the agent's first call always lands a usable state.

import { checkArgsOrError } from "./_argValidate.js";
import { loadDocOrSeed, ensureArray } from "./_docHelpers.js";

export const definition = {
  type: "function",
  function: {
    name: "add_signal",
    description:
      "Append a signal to the router. Use this to introduce a new input the router can route on (language, keyword, complexity, PII, etc.). See the signal-reference skill for the 22 supported types.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Signal name (used to reference it from rules and projections).",
        },
        type: { type: "string", description: "Signal type, e.g. 'language', 'keyword'." },
        config: {
          type: "object",
          description: "Per-type configuration object.",
        },
      },
      required: ["name", "type"],
    },
  },
};

export function makeExecute({ getYaml, setYaml, validate, summarize, parseYaml, stringifyYaml }) {
  return async function execute(args) {
    const bad = checkArgsOrError(args, definition.function.parameters);
    if (bad) return bad;

    const { doc } = loadDocOrSeed(getYaml, parseYaml);
    const signals = ensureArray(doc, "signals");
    const signal = { name: args.name, type: args.type };
    if (args.config && typeof args.config === "object" && !Array.isArray(args.config)) {
      signal.config = args.config;
    }
    signals.push(signal);

    const nextYaml = stringifyYaml(doc);
    setYaml(nextYaml, { actor: "agent", description: `add_signal ${args.name}` });
    const validation = validate(nextYaml);
    return {
      ok: validation.ok,
      validation,
      summary: summarize(nextYaml),
    };
  };
}
