// Tool: get_router
//
// No args. Returns the current YAML, a short structural summary, and the
// latest validation result. The agent calls this whenever it needs to
// inspect state (the system prompt only ships counts).

export const definition = {
  type: "function",
  function: {
    name: "get_router",
    description:
      "Return the current router YAML, a short structural summary, and the latest validation status. Call this when you need to inspect the current router state.",
    parameters: { type: "object", properties: {}, required: [] },
  },
};

export function makeExecute({ getYaml, validate, summarize }) {
  return async function execute() {
    const yaml = getYaml() || "";
    const validation = validate(yaml);
    const summary = summarize(yaml);
    return { yaml, summary, validation };
  };
}
