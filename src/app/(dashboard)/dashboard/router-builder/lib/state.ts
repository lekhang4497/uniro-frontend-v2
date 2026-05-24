// Pure state-shaping helpers for the router builder.
// Extracted from page.js with no behavior change.

import {
  SIGNAL_TYPE_BY_KEY,
  PROJECTION_TYPE_BY_KEY,
} from "../catalog";
import {
  getLayerByNodeType,
  LAYER_COLUMN_WIDTH,
  LAYER_PADDING_TOP,
  LAYERS,
} from "./layers";
import { newUid } from "./constants";

// Default position used when seeding nodes that don't carry one yet. Centers
// the node inside its layer column instead of dumping it at {0,0}.
function defaultPositionFor(nodeType: string, index = 0): { x: number; y: number } {
  const layer = LAYERS.find((l) => l.nodeType === nodeType);
  const nodeWidth = 180;
  const nodeHeight = 100;
  const spacing = 20;
  if (!layer) return { x: 60, y: LAYER_PADDING_TOP + index * (nodeHeight + spacing) };
  return {
    x: layer.xPos + (LAYER_COLUMN_WIDTH - nodeWidth) / 2,
    y: LAYER_PADDING_TOP + index * (nodeHeight + spacing),
  };
}

export function emptyState(): any {
  return {
    name: "my-router",
    description: "",
    version: 1,
    schema_version: 1,
    created_at: "",
    created_by: "",
    created_by_method: "direct",
    defaults: { alpha: 0.5, fallback_chain: [], on_no_match: "route_to_default" },
    signals: [
      {
        // Catch-all signal: the new schema has no `always: true` rule, so a
        // default decision needs a leaf pointing at a signal that's always
        // true. We seed one named "any" of type "always" so the fallback
        // decision below has something to reference.
        uid: "sig-default-any",
        name: "any",
        type: "always",
        version: 1,
        timeout_ms: 50,
        config: {},
        position: defaultPositionFor("signal"),
        userQueryConnected: true,
      },
    ],
    projections: [],
    routes: [
      {
        uid: newUid("route"),
        name: "default",
        rules: { kind: "leaf", signalName: "any" },
        priority: 0,
        model: "",
        plugins: [],
        position: defaultPositionFor("route"),
      },
    ],
    models: [],
    modelGroups: [],
    plugins: [],
    guardrails: {
      daily_cost_cap_usd: null,
      forbidden_models: [],
      pii_block_outbound: false,
      max_model_cost_usd_per_m: null,
    },
    observability: { log_decisions: false, shadow: false },
  };
}

export function applyChangesToState(s: any, changes: any[]): any {
  let signals = s.signals,
    projections = s.projections,
    routes = s.routes,
    models = s.models,
    modelGroups = s.modelGroups || [],
    plugins = s.plugins;
  for (const ch of changes) {
    if (ch.type === "position" && ch.position) {
      signals = signals.map((n: any) => (n.uid === ch.id ? { ...n, position: ch.position } : n));
      projections = projections.map((n: any) =>
        n.uid === ch.id ? { ...n, position: ch.position } : n
      );
      routes = routes.map((n: any) => (n.uid === ch.id ? { ...n, position: ch.position } : n));
      models = models.map((n: any) => (n.uid === ch.id ? { ...n, position: ch.position } : n));
      modelGroups = modelGroups.map((n: any) =>
        n.uid === ch.id ? { ...n, position: ch.position } : n
      );
      plugins = plugins.map((n: any) => (n.uid === ch.id ? { ...n, position: ch.position } : n));
    } else if (ch.type === "remove") {
      signals = signals.filter((n: any) => n.uid !== ch.id);
      projections = projections.filter((n: any) => n.uid !== ch.id);
      routes = routes.filter((n: any) => n.uid !== ch.id);
      models = models.filter((n: any) => n.uid !== ch.id);
      modelGroups = modelGroups.filter((n: any) => n.uid !== ch.id);
      plugins = plugins.filter((n: any) => n.uid !== ch.id);
    }
  }
  return { ...s, signals, projections, routes, models, modelGroups, plugins };
}

// Get the node type from a payload string
export function getNodeTypeFromPayload(payload: string): string | null {
  if (payload.startsWith("signal:")) return "signal";
  if (payload.startsWith("projection:")) return "projection";
  if (payload === "route") return "route";
  if (payload === "model") return "model";
  if (payload === "modelGroup") return "modelGroup";
  if (payload.startsWith("plugin:")) return "plugin";
  return null;
}

// Calculate the snapped position for a new node based on its type
export function calculateSnappedPosition(
  nodeType: string | null,
  position: { x: number; y: number },
  existingNodes: any[]
): { x: number; y: number } {
  if (!nodeType) return position;
  const layer = getLayerByNodeType(nodeType);
  if (!layer) return position;

  // Get existing nodes of this type to calculate index
  const existingOfType = existingNodes.filter((n: any) => {
    if (nodeType === "signal") return n._kind === "signal";
    if (nodeType === "projection") return n._kind === "projection";
    if (nodeType === "route") return n._kind === "route";
    if (nodeType === "model") return n._kind === "model";
    if (nodeType === "modelGroup") return n._kind === "modelGroup";
    if (nodeType === "plugin") return n._kind === "plugin";
    return false;
  });

  const nodeHeight = 100;
  const spacing = 20;
  const nodeWidth = 180;
  const index = existingOfType.length;
  const y = LAYER_PADDING_TOP + index * (nodeHeight + spacing);

  // Snap x to the center of the layer column
  const x = layer.xPos + (LAYER_COLUMN_WIDTH - nodeWidth) / 2;

  return { x, y };
}

export function addNodeFromPayload(
  s: any,
  payload: string,
  position: { x: number; y: number }
): any {
  const nodeType = getNodeTypeFromPayload(payload);
  const snappedPosition = calculateSnappedPosition(nodeType, position, []);

  if (payload.startsWith("signal:")) {
    const type = payload.slice("signal:".length);
    const spec = (SIGNAL_TYPE_BY_KEY as any)[type];
    if (!spec) return s;
    return {
      ...s,
      signals: [
        ...s.signals,
        {
          uid: newUid("sig"),
          // New-schema field is `name` (was `id`). The default name uses the
          // type + index so the user always gets a unique starting point.
          name: `${type}_${s.signals.length + 1}`,
          type,
          version: 1,
          timeout_ms: 50,
          config: {},
          position: snappedPosition,
          // New signals are wired to User Query by default — toggle by
          // deleting the userQuery→signal edge in the canvas.
          userQueryConnected: true,
        },
      ],
    };
  }
  if (payload.startsWith("projection:")) {
    const type = payload.slice("projection:".length);
    const spec = (PROJECTION_TYPE_BY_KEY as any)[type];
    if (!spec) return s;
    return {
      ...s,
      projections: [
        ...s.projections,
        {
          uid: newUid("proj"),
          name: `${type}_${s.projections.length + 1}`,
          type,
          config: {},
          position: snappedPosition,
        },
      ],
    };
  }
  if (payload === "route") {
    return {
      ...s,
      routes: [
        ...s.routes,
        {
          uid: newUid("route"),
          name: `route_${s.routes.length + 1}`,
          when: { kind: "always" },
          priority: 100,
          model: "",
          plugins: [],
          position: snappedPosition,
        },
      ],
    };
  }
  if (payload === "model") {
    // A Model node is just the YAML `model:` string — no canvas-only alias.
    return {
      ...s,
      models: [
        ...s.models,
        {
          uid: newUid("model"),
          model_id: "",
          position: snappedPosition,
        },
      ],
    };
  }
  if (payload === "modelGroup") {
    // A Model Group node is the `modelRefs` form — a weighted list of models
    // plus a selection algorithm. Seeds with one empty ref.
    return {
      ...s,
      modelGroups: [
        ...(s.modelGroups || []),
        {
          uid: newUid("mgroup"),
          refs: [emptyModelRef()],
          algorithm: "static",
          position: snappedPosition,
        },
      ],
    };
  }
  if (payload.startsWith("plugin:")) {
    const type = payload.slice("plugin:".length);
    return {
      ...s,
      plugins: [
        ...s.plugins,
        {
          uid: newUid("plugin"),
          name: `${type}_${s.plugins.length + 1}`,
          type,
          enabled: true,
          config: {},
          position: snappedPosition,
        },
      ],
    };
  }
  return s;
}

// New-schema rules helpers. The canvas state uses:
//   leaf: { kind: 'leaf', signalName }
//   composite: { kind: 'and'|'or', children: [] } | { kind: 'not', child }
//
// `signalName` is the schema field that points at a signal. For drawing edges
// we still want to translate that name back to a uid, so callers (page.tsx)
// look the uid up via the sigByName map.

export function collectRefs(rules: any, out: any[] = []): any[] {
  if (!rules) return out;
  if (rules.kind === "leaf") {
    if (rules.signalName) out.push({ kind: "signal", id: rules.signalName });
  } else if (rules.kind === "and" || rules.kind === "or") {
    (rules.children || []).forEach((c: any) => collectRefs(c, out));
  } else if (rules.kind === "not") {
    collectRefs(rules.child, out);
  }
  return out;
}

export function addLeafToRules(rules: any, signalName: string): any {
  const newLeaf = { kind: "leaf", signalName };
  if (!rules || (rules.kind === "leaf" && !rules.signalName)) return newLeaf;
  if (rules.kind === "leaf") return { kind: "and", children: [rules, newLeaf] };
  if (rules.kind === "and" || rules.kind === "or") {
    return { ...rules, children: [...(rules.children || []), newLeaf] };
  }
  if (rules.kind === "not") return { kind: "and", children: [rules, newLeaf] };
  return newLeaf;
}

// Remove references from rules tree based on a predicate. Returns null when
// the leaf should be dropped (caller folds it out). Composites that go to
// zero children collapse to null too.
export function removeRefsFromRules(
  rules: any,
  shouldRemove: (ref: { id: string }) => boolean
): any {
  if (!rules) return null;

  if (rules.kind === "leaf") {
    return shouldRemove({ id: rules.signalName }) ? null : rules;
  }

  if (rules.kind === "and" || rules.kind === "or") {
    const newChildren = (rules.children || [])
      .map((c: any) => removeRefsFromRules(c, shouldRemove))
      .filter((c: any) => c !== null);

    if (newChildren.length === 0) return null;
    if (newChildren.length === 1) return newChildren[0];
    return { ...rules, children: newChildren };
  }

  if (rules.kind === "not") {
    const newChild = removeRefsFromRules(rules.child, shouldRemove);
    if (!newChild) return null;
    return { kind: "not", child: newChild };
  }

  return rules;
}

// ---------- model-group helpers ----------
//
// A Model Group node holds the YAML `modelRefs` form. Each entry mirrors
// router_service's `ModelRef`: { model, weight, lora_name?, use_reasoning,
// reasoning_description?, reasoning_effort? }. Optional fields are only kept
// when set so import → export → import stays byte-stable.

export function emptyModelRef(): any {
  return { model: "", weight: 1, use_reasoning: false };
}

// Normalize a raw `modelRefs` entry (from YAML or legacy state) into the
// canvas ref shape. `weight` defaults to 1, `use_reasoning` to false; the
// three optional string fields are dropped when empty.
export function normalizeModelRef(raw: any): any {
  const r = raw && typeof raw === "object" ? raw : {};
  const out: any = {
    model: typeof r.model === "string" ? r.model : "",
    weight: typeof r.weight === "number" ? r.weight : 1,
    use_reasoning: !!r.use_reasoning,
  };
  if (r.lora_name) out.lora_name = r.lora_name;
  if (r.reasoning_description) out.reasoning_description = r.reasoning_description;
  if (r.reasoning_effort) out.reasoning_effort = r.reasoning_effort;
  return out;
}

// Migrate persisted v3 builder state to the v4 shape:
//   - Model nodes lose the canvas-only `name` (+ the unmodelled config fields
//     max_tokens / temperature / parallel_tool_calls / extra_config); they
//     keep only `{ uid, model_id, position }`.
//   - `route.model` switches from a model alias name to the connected node's
//     `uid` (Model or Model Group node).
//   - Decisions imported in the `modelRefs` form carried a hidden
//     `route._modelRefs` / `route._algorithm`; these become real Model Group
//     nodes. Idempotent: re-running on already-v4 state is a no-op.
export function migrateLegacyState(s: any): any {
  if (!s || typeof s !== "object") return s;

  const modelGroups: any[] = Array.isArray(s.modelGroups) ? [...s.modelGroups] : [];

  // Old Model nodes → bare { uid, model_id, position }; remember name → uid.
  const uidByAlias: Record<string, string> = {};
  const models = (s.models || []).map((m: any) => {
    if (m && m.name) uidByAlias[m.name] = m.uid;
    return { uid: m?.uid || newUid("model"), model_id: m?.model_id || "", position: m?.position };
  });

  const routes = (s.routes || []).map((r: any) => {
    const { _modelRefs, _algorithm, ...rest } = r || {};
    let model = rest.model;
    if (Array.isArray(_modelRefs) && _modelRefs.length > 0) {
      const uid = newUid("mgroup");
      const group: any = {
        uid,
        refs: _modelRefs.map(normalizeModelRef),
        algorithm: (_algorithm && _algorithm.type) || "static",
        position: rest.position
          ? { x: rest.position.x, y: rest.position.y }
          : undefined,
      };
      if (_algorithm) group._rawAlgorithm = _algorithm;
      modelGroups.push(group);
      model = uid;
    } else if (model && uidByAlias[model]) {
      // Plain `model:` decision — point at the model node's uid.
      model = uidByAlias[model];
    }
    return { ...rest, model };
  });

  return { ...s, models, modelGroups, routes };
}
