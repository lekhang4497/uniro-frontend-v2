// Pure converter from a router YAML string to React Flow {nodes, edges}.
//
// Spec §5.2 / §9.1: the canvas is structurally read-only. It renders whatever
// the YAML declares; nodes that we don't have a renderer for fall back to a
// generic "placeholder" card showing the kind + name.
//
// Layout: simple LTR grid. Signals column, then projections, then decisions.
// Each node id is namespaced ("signal:lang" / "decision:route" / etc.) so
// edges can reference them stably across re-renders.

import { parseYAML } from "confbox/yaml";

const COL_W = 240;
const ROW_H = 110;
const ORIGIN_X = 40;
const ORIGIN_Y = 40;

const COL = {
  signal: 0,
  projection: 1,
  decision: 2,
};

function safeParse(text) {
  if (typeof text !== "string" || text.trim() === "") return null;
  try {
    const parsed = parseYAML(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function signalNode(signal, row) {
  if (!signal || typeof signal !== "object") return null;
  const name = typeof signal.name === "string" ? signal.name : "(unnamed)";
  const type = typeof signal.type === "string" ? signal.type : "?";
  return {
    id: `signal:${name}`,
    type: "uniroSignal",
    position: { x: ORIGIN_X + COL.signal * COL_W, y: ORIGIN_Y + row * ROW_H },
    data: { kind: "signal", name, signalType: type },
  };
}

function projectionNode(kind, p, row) {
  if (!p || typeof p !== "object") return null;
  const name = typeof p.name === "string" ? p.name : "(unnamed)";
  return {
    id: `projection:${kind}:${name}`,
    type: "uniroProjection",
    position: {
      x: ORIGIN_X + COL.projection * COL_W,
      y: ORIGIN_Y + row * ROW_H,
    },
    data: { kind: "projection", name, projectionKind: kind },
  };
}

function decisionNode(decision, row) {
  if (!decision || typeof decision !== "object") return null;
  const name = typeof decision.name === "string" ? decision.name : "(unnamed)";
  const priority = decision.priority;
  let modelLabel = "(no model)";
  if (typeof decision.model === "string" && decision.model.trim()) {
    modelLabel = decision.model;
  } else if (Array.isArray(decision.modelRefs) && decision.modelRefs.length > 0) {
    modelLabel = `(${decision.modelRefs.length} modelRefs)`;
  }
  return {
    id: `decision:${name}`,
    type: "uniroDecision",
    position: {
      x: ORIGIN_X + COL.decision * COL_W,
      y: ORIGIN_Y + row * ROW_H,
    },
    data: {
      kind: "decision",
      name,
      priority: Number.isFinite(priority) ? priority : undefined,
      modelLabel,
    },
  };
}

// Walk a rule tree, collecting all leaf `name` references.
function collectLeafNames(rules, out) {
  if (!rules || typeof rules !== "object") return;
  if (typeof rules.operator === "string") {
    const conditions = Array.isArray(rules.conditions) ? rules.conditions : [];
    for (const child of conditions) collectLeafNames(child, out);
    return;
  }
  if (typeof rules.name === "string") {
    out.push(rules.name);
  }
}

function findReferencedNodeId(leafName, nodeIndex) {
  // Try signal first, then projection (partition/score/mapping share the
  // namespace by member name; we accept the first match).
  if (nodeIndex.signals.has(leafName)) {
    return `signal:${leafName}`;
  }
  if (nodeIndex.projections.has(leafName)) {
    return nodeIndex.projections.get(leafName);
  }
  return null;
}

/**
 * Convert a router YAML string to React Flow nodes + edges.
 *
 * Always returns arrays even on parse failure (no exceptions). Unknown YAML
 * shapes degrade to placeholder cards labelled with their kind.
 *
 * @param {string} text
 * @returns {{nodes: Array, edges: Array}}
 */
export function yamlToCanvas(text) {
  const doc = safeParse(text);
  if (!doc) {
    return { nodes: [], edges: [] };
  }

  const nodes = [];
  const edges = [];

  // Index for edge resolution.
  const nodeIndex = {
    signals: new Set(),
    projections: new Map(), // member name -> node id
  };

  // Signals column
  if (Array.isArray(doc.signals)) {
    let row = 0;
    for (const sig of doc.signals) {
      const node = signalNode(sig, row++);
      if (!node) continue;
      nodes.push(node);
      nodeIndex.signals.add(node.data.name);
    }
  }

  // Projections column - partitions/scores/mappings rendered as same kind
  if (doc.projections && typeof doc.projections === "object") {
    let row = 0;
    const buckets = [
      ["partition", doc.projections.partitions],
      ["score", doc.projections.scores],
      ["mapping", doc.projections.mappings],
    ];
    for (const [kind, list] of buckets) {
      if (!Array.isArray(list)) continue;
      for (const p of list) {
        const node = projectionNode(kind, p, row++);
        if (!node) continue;
        nodes.push(node);
        // The projection block name itself is the primary leaf reference.
        nodeIndex.projections.set(node.data.name, node.id);
        // Per spec §8.1.5/6: partition member names and mapping output
        // band names are ALSO valid leaf references — they resolve to
        // the parent projection node for layout purposes.
        if (kind === "partition" && Array.isArray(p.members)) {
          for (const m of p.members) {
            const memberName = typeof m === "string" ? m : m?.name;
            if (memberName && !nodeIndex.projections.has(memberName)) {
              nodeIndex.projections.set(memberName, node.id);
            }
          }
        }
        if (kind === "mapping" && Array.isArray(p.outputs)) {
          for (const o of p.outputs) {
            const memberName = o?.name;
            if (memberName && !nodeIndex.projections.has(memberName)) {
              nodeIndex.projections.set(memberName, node.id);
            }
          }
        }
      }
    }
  }

  // Decisions column
  if (Array.isArray(doc.decisions)) {
    let row = 0;
    for (const d of doc.decisions) {
      const node = decisionNode(d, row++);
      if (!node) continue;
      nodes.push(node);

      // Edges: decision -> referenced signal/projection
      const leafNames = [];
      collectLeafNames(d.rules, leafNames);
      const seen = new Set();
      for (const leaf of leafNames) {
        if (seen.has(leaf)) continue;
        seen.add(leaf);
        const targetId = findReferencedNodeId(leaf, nodeIndex);
        if (targetId) {
          edges.push({
            id: `e:${targetId}->${node.id}`,
            source: targetId,
            target: node.id,
          });
        }
      }
    }
  }

  // Unrecognised top-level keys we know about but don't render structurally
  // (guardrails, observability, defaults) get represented as placeholder
  // nodes in a fourth column so the user knows they're present.
  const extras = [];
  if (doc.guardrails && typeof doc.guardrails === "object") {
    extras.push({ kind: "guardrails", name: "guardrails" });
  }
  if (doc.observability && typeof doc.observability === "object") {
    extras.push({ kind: "observability", name: "observability" });
  }
  if (doc.defaults && typeof doc.defaults === "object") {
    extras.push({ kind: "defaults", name: "defaults" });
  }
  extras.forEach((e, idx) => {
    nodes.push({
      id: `placeholder:${e.kind}:${e.name}`,
      type: "uniroPlaceholder",
      position: {
        x: ORIGIN_X + (COL.decision + 1) * COL_W,
        y: ORIGIN_Y + idx * ROW_H,
      },
      data: { kind: e.kind, name: e.name },
    });
  });

  return { nodes, edges };
}
