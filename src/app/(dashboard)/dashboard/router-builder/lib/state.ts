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
} from "./layers";
import { newUid } from "./constants";

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
    signals: [],
    projections: [],
    routes: [
      {
        uid: newUid("route"),
        name: "default",
        when: { kind: "always" },
        priority: 0,
        model: "",
        plugins: [],
        position: { x: 0, y: 0 },
      },
    ],
    models: [],
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
    plugins = s.plugins;
  for (const ch of changes) {
    if (ch.type === "position" && ch.position) {
      signals = signals.map((n: any) => (n.uid === ch.id ? { ...n, position: ch.position } : n));
      projections = projections.map((n: any) =>
        n.uid === ch.id ? { ...n, position: ch.position } : n
      );
      routes = routes.map((n: any) => (n.uid === ch.id ? { ...n, position: ch.position } : n));
      models = models.map((n: any) => (n.uid === ch.id ? { ...n, position: ch.position } : n));
      plugins = plugins.map((n: any) => (n.uid === ch.id ? { ...n, position: ch.position } : n));
    } else if (ch.type === "remove") {
      signals = signals.filter((n: any) => n.uid !== ch.id);
      projections = projections.filter((n: any) => n.uid !== ch.id);
      routes = routes.filter((n: any) => n.uid !== ch.id);
      models = models.filter((n: any) => n.uid !== ch.id);
      plugins = plugins.filter((n: any) => n.uid !== ch.id);
    }
  }
  return { ...s, signals, projections, routes, models, plugins };
}

// Get the node type from a payload string
export function getNodeTypeFromPayload(payload: string): string | null {
  if (payload.startsWith("signal:")) return "signal";
  if (payload.startsWith("projection:")) return "projection";
  if (payload === "route") return "route";
  if (payload === "model") return "model";
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
          id: `${type.replace(/_/g, "_")}_${s.signals.length + 1}`,
          type,
          version: 1,
          timeout_ms: 50,
          config: {},
          position: snappedPosition,
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
    return {
      ...s,
      models: [
        ...s.models,
        {
          uid: newUid("model"),
          name: `model_${s.models.length + 1}`,
          model_id: "",
          max_tokens: undefined,
          temperature: 0.7,
          parallel_tool_calls: undefined,
          extra_config: undefined,
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

export function collectRefs(when: any, out: any[] = []): any[] {
  if (!when) return out;
  if (when.kind === "leaf") {
    if (when.signalId) out.push({ kind: "signal", id: when.signalId });
    if (when.projId) out.push({ kind: "projection", id: when.projId });
  } else if (when.kind === "all" || when.kind === "any") {
    (when.children || []).forEach((c: any) => collectRefs(c, out));
  } else if (when.kind === "not") {
    collectRefs(when.child, out);
  }
  return out;
}

export function addLeafToWhen(
  when: any,
  signalId: string,
  projId: string | undefined,
  sigId: string | undefined
): any {
  const newLeaf = projId
    ? { kind: "leaf", projId, op: "equals", value: "" }
    : { kind: "leaf", signalId: sigId, op: "equals", value: "" };
  if (!when || when.kind === "always") return newLeaf;
  if (when.kind === "leaf") return { kind: "all", children: [when, newLeaf] };
  if (when.kind === "all" || when.kind === "any") {
    return { ...when, children: [...(when.children || []), newLeaf] };
  }
  if (when.kind === "not") return { kind: "all", children: [when, newLeaf] };
  return newLeaf;
}

// Remove references from when clause based on a predicate
export function removeRefsFromWhen(
  when: any,
  shouldRemove: (ref: { id: string }) => boolean
): any {
  if (!when) return { kind: "always" };

  if (when.kind === "leaf") {
    const refId = when.signalId || when.projId;
    if (shouldRemove({ id: refId })) {
      return null; // Signal deletion - remove this leaf entirely
    }
    return when;
  }

  if (when.kind === "all" || when.kind === "any") {
    const newChildren = (when.children || [])
      .map((c: any) => removeRefsFromWhen(c, shouldRemove))
      .filter((c: any) => c !== null);

    if (newChildren.length === 0) {
      return { kind: "always" };
    }
    if (newChildren.length === 1) {
      return newChildren[0];
    }
    return { ...when, children: newChildren };
  }

  if (when.kind === "not") {
    const newChild = removeRefsFromWhen(when.child, shouldRemove);
    if (!newChild) return { kind: "always" };
    return { kind: "not", child: newChild };
  }

  return when;
}
