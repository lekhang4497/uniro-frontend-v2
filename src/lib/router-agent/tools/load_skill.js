// Tool: load_skill
//
// Fetch a skill body by name. Skill bodies are markdown files served via
// /api/router-agent/skills/[name]. The hook layer provides a `loadSkill`
// function that memoises within a page lifetime.

import { checkArgsOrError } from "./_argValidate.js";

export const definition = {
  type: "function",
  function: {
    name: "load_skill",
    description:
      "Fetch the markdown body of a skill by name. Skill bodies are reference docs (signal-reference, plugin-reference, rule-trees, etc.). Load before authoring something you don't recognize.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Skill name from the manifest, e.g. 'signal-reference'." },
      },
      required: ["name"],
    },
  },
};

export function makeExecute({ loadSkill }) {
  return async function execute(args) {
    const bad = checkArgsOrError(args, definition.function.parameters);
    if (bad) return bad;
    const result = await loadSkill(args.name);
    if (result && typeof result === "object" && typeof result.body === "string") {
      return { body: result.body };
    }
    const msg =
      result && typeof result.error === "string" ? result.error : `Skill '${args.name}' not found.`;
    return { error: msg };
  };
}
