// Tool: delete_node
//
// Remove a node (signal | decision | projection) by name.
//
// Refusal contract (per spec §6.1 item 6): if removing a signal or
// projection would orphan any decision rule leaf currently referencing it,
// we refuse with `code: would_orphan` and name the first dependent
// decision. The agent is expected to either drop the dependent rule first
// or pick a different node to delete.
//
// `projection` deletion searches partitions, scores, and mappings for a
// matching `name` and removes the first match. Deletions of decisions never
// orphan (nothing points to a decision by name).

import { checkArgsOrError } from "./_argValidate.js";
import { walkRuleLeaves } from "./_docHelpers.js";

export const definition = {
  type: "function",
  function: {
    name: "delete_node",
    description:
      "Remove a signal, decision, or projection by name. Refuses with would_orphan if deleting the node would leave any decision rule referencing a missing name.",
    parameters: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          description: "Node kind to remove.",
          enum: ["signal", "decision", "projection"],
        },
        name: { type: "string", description: "Node name to remove." },
      },
      required: ["kind", "name"],
    },
  },
};

function findDependentDecision(decisions, name) {
  let found = null;
  walkRuleLeaves(decisions, (leaf) => {
    if (found) return;
    if (leaf.name === name) found = leaf;
  });
  if (!found) return null;
  // Walk again to find which decision owned the leaf.
  if (!Array.isArray(decisions)) return null;
  for (const d of decisions) {
    let hit = false;
    walkRuleLeaves([d], (leaf) => {
      if (leaf.name === name) hit = true;
    });
    if (hit) return d.name || "(unnamed decision)";
  }
  return null;
}

function deleteFromProjections(projections, name) {
  if (!projections || typeof projections !== "object") return false;
  for (const key of ["partitions", "scores", "mappings"]) {
    const arr = projections[key];
    if (!Array.isArray(arr)) continue;
    const idx = arr.findIndex((p) => p && p.name === name);
    if (idx !== -1) {
      arr.splice(idx, 1);
      return true;
    }
  }
  return false;
}

export function makeExecute({ getYaml, setYaml, validate, summarize, parseYaml, stringifyYaml }) {
  return async function execute(args) {
    const bad = checkArgsOrError(args, definition.function.parameters);
    if (bad) return bad;

    if (!["signal", "decision", "projection"].includes(args.kind)) {
      return {
        ok: false,
        error: { code: "bad_args", message: `kind must be signal|decision|projection.` },
      };
    }

    const raw = getYaml() || "";
    const parsed = parseYaml(raw);
    if (!parsed.ok || parsed.data == null || typeof parsed.data !== "object" || Array.isArray(parsed.data)) {
      return {
        ok: false,
        error: {
          code: "not_found",
          message: `Cannot delete: current router YAML is empty or unparseable.`,
        },
      };
    }
    const doc = parsed.data;
    const decisions = Array.isArray(doc.decisions) ? doc.decisions : [];

    if (args.kind === "signal" || args.kind === "projection") {
      const dependent = findDependentDecision(decisions, args.name);
      if (dependent) {
        return {
          ok: false,
          error: {
            code: "would_orphan",
            message: `Cannot delete ${args.kind} '${args.name}' — it's referenced by decision '${dependent}'.`,
          },
        };
      }
    }

    let removed = false;
    if (args.kind === "signal") {
      const signals = Array.isArray(doc.signals) ? doc.signals : [];
      const idx = signals.findIndex((s) => s && s.name === args.name);
      if (idx !== -1) {
        signals.splice(idx, 1);
        removed = true;
      }
    } else if (args.kind === "decision") {
      const idx = decisions.findIndex((d) => d && d.name === args.name);
      if (idx !== -1) {
        decisions.splice(idx, 1);
        removed = true;
      }
    } else if (args.kind === "projection") {
      removed = deleteFromProjections(doc.projections, args.name);
    }

    if (!removed) {
      return {
        ok: false,
        error: {
          code: "not_found",
          message: `No ${args.kind} named '${args.name}' exists.`,
        },
      };
    }

    const nextYaml = stringifyYaml(doc);
    setYaml(nextYaml, {
      actor: "agent",
      description: `delete_node ${args.kind} ${args.name}`,
    });
    const validation = validate(nextYaml);
    return {
      ok: true,
      validation,
      summary: summarize(nextYaml),
    };
  };
}
