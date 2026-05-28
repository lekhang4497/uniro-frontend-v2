// Build the system prompt for the router-builder agent.
//
// Spec §6.4. The prompt structure is reproduced verbatim from the spec and
// the dynamic bits (router id, yaml char count, validation, skill catalog)
// are filled in per turn.
//
// Design constraints (per spec):
//   - Keep under ~1000 tokens.
//   - Do NOT embed the full YAML. The agent calls get_router() when it
//     needs the current document.
//   - The structural summary is precomputed by the caller (see yaml.js
//     summarizeYaml) and passed in as `summary`.

const TOOL_NAMES = [
  "get_router",
  "set_router_yaml",
  "validate_router",
  "add_signal",
  "add_decision",
  "update_decision",
  "delete_node",
  "load_skill",
];

const RULES = [
  "Validate the YAML before claiming the router is ready.",
  "Ask clarifying questions when intent is unclear. Examples: default model? target languages? failure behavior? cost ceiling?",
  "Prefer minimal additions — only add complexity (projections, plugins, guardrails) when the user describes a need that requires it.",
  "Load the relevant skill before authoring something you don't recognize.",
  "When you change the router, summarize what changed in one short sentence.",
];

function formatValidation(validation) {
  if (!validation || typeof validation !== "object") return "unknown";
  if (validation.ok) return "ok";
  const errors = Array.isArray(validation.errors) ? validation.errors.length : 0;
  return errors === 1 ? "1 error" : `${errors} errors`;
}

function formatSkillCatalog(skills) {
  if (!Array.isArray(skills) || skills.length === 0) {
    return "  (no skills available)";
  }
  return skills
    .map((s) => {
      const name = s && typeof s.name === "string" ? s.name : "(unnamed)";
      const desc = s && typeof s.description === "string" ? s.description : "";
      return desc ? `  - ${name} — ${desc}` : `  - ${name}`;
    })
    .join("\n");
}

/**
 * @param {object} args
 * @param {string} args.routerId
 * @param {string} args.yaml                  Full YAML document (used only for char count)
 * @param {object} args.validation            {ok, errors, warnings}
 * @param {string} args.summary               Precomputed structural summary
 * @param {Array<{name, description, version?}>} args.skills
 * @returns {string}
 */
export function buildSystemPrompt({ routerId, yaml, validation, summary, skills }) {
  const yamlChars = typeof yaml === "string" ? yaml.length : 0;
  const validationLine = formatValidation(validation);
  const skillCatalog = formatSkillCatalog(skills);

  const tools = TOOL_NAMES.join(", ");
  const rules = RULES.map((r, i) => `  ${i + 1}. ${r}`).join("\n");

  return [
    "You are the UniRo Router Builder agent. You help users design routers from",
    "plain-English descriptions of their routing needs.",
    "",
    "CURRENT ROUTER STATE:",
    `  router_id: ${routerId || "(unset)"}`,
    `  yaml_chars: ${yamlChars}                       — full YAML available via get_router()`,
    `  yaml_summary: ${summary || "Empty router"}`,
    `  validation: ${validationLine}`,
    "",
    "AVAILABLE SKILLS (call load_skill(name) for the body):",
    skillCatalog,
    "",
    `TOOLS: ${tools}.`,
    "",
    "RULES:",
    rules,
  ].join("\n");
}
