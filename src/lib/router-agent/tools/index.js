// Tool registry for the router-agent.
//
// Each tool module exports `definition` (OpenAI function tool definition)
// and `makeExecute(ctx)` (returns the async `execute(args)` closure).
//
// `createTools(ctx)` wires them up against the live context (`getYaml`,
// `setYaml`, `validate`, `summarize`, `loadSkill`, `parseYaml`,
// `stringifyYaml`) and returns an array of `{definition, execute}` entries.
//
// The agent loop converts definitions to the OpenAI tool array via
// `toOpenAiDefinitions()` and resolves names back to executors via
// `findTool()`.

import * as get_router from "./get_router.js";
import * as set_router_yaml from "./set_router_yaml.js";
import * as add_signal from "./add_signal.js";
import * as add_decision from "./add_decision.js";
import * as update_decision from "./update_decision.js";
import * as delete_node from "./delete_node.js";
import * as validate_router from "./validate_router.js";
import * as load_skill from "./load_skill.js";

const TOOL_MODULES = [
  get_router,
  set_router_yaml,
  add_signal,
  add_decision,
  update_decision,
  delete_node,
  validate_router,
  load_skill,
];

/**
 * @param {object} ctx
 * @param {() => string} ctx.getYaml
 * @param {(yaml: string, meta: {actor, description}) => void} ctx.setYaml
 * @param {(yaml: string) => {ok, errors, warnings}} ctx.validate
 * @param {(yaml: string) => string} ctx.summarize
 * @param {(name: string) => Promise<{body?: string, error?: string}>} ctx.loadSkill
 * @param {(text: string) => {ok: boolean, data?: any, error?: string}} ctx.parseYaml
 * @param {(value: any) => string} ctx.stringifyYaml
 */
export function createTools(ctx) {
  return TOOL_MODULES.map((mod) => ({
    definition: mod.definition,
    execute: mod.makeExecute(ctx),
  }));
}

export function toOpenAiDefinitions(tools) {
  return tools.map((t) => t.definition);
}

export function findTool(tools, name) {
  return tools.find((t) => t.definition.function.name === name) || null;
}
