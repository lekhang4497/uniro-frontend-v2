"use client";

// Router builder — 5-layer drag-and-drop canvas for Semantic Router design.
//
// The 5 layers (left → right pipeline):
//   Layer 1 — Signal Extraction     Extracts facts from each request
//   Layer 2 — Projection Coordination  Coordinates signals into reusable routing facts
//   Layer 3 — Decision Making       Logical rules that combine signals + projections
//   Layer 4 — Model Selection       Model dispatch after a route matches
//   Layer 5 — Plugin Chain          Pre/post processing plugins for a route
//
// Node types on canvas: SignalNode, ProjectionNode, RouteNode, ModelNode, PluginNode
//
// Edges: derived from the `when` clause references + explicit model/plugin connections.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  MarkerType,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  Cloud,
  Code2,
  Copy,
  Download,
  FileWarning,
  MoreHorizontal,
  Settings,
  Settings2,
  Upload,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { isConnectedMode } from "@/lib/supabase/config";

import { CloudSyncPanel } from "./CloudSyncPanel";
import { TEMPLATES } from "./templates";
import { buildRouterYaml, lintRouter, parseRouterYaml } from "./yaml";

import { CanvasShell } from "./components/CanvasShell";
import { Palette } from "./components/NodePalette";
import { YamlPreview } from "./components/YamlPreview";
import { PropertiesPanel } from "./components/inspector/Inspector";
import { SettingsDrawer } from "./components/inspector/SettingsDrawer";

import {
  DRAG_TYPE,
  LEGACY_STORAGE_KEYS,
  STORAGE_KEY,
  USER_QUERY_NODE_ID,
  newUid,
} from "./lib/constants";
import {
  LAYERS,
  LAYER_COLUMN_WIDTH,
  LAYER_PADDING_TOP,
  areAdjacentLayers,
  getLayerByNodeType,
  getRealignedNodes,
} from "./lib/layers";
import {
  addLeafToRules,
  addNodeFromPayload,
  collectRefs,
  emptyState,
  migrateLegacyState,
  removeRefsFromRules,
} from "./lib/state";

export default function RouterBuilderPage() {
  return (
    <ReactFlowProvider>
      <Builder />
    </ReactFlowProvider>
  );
}

function Builder() {
  const [state, setState] = useState<any>(emptyState);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState("pan");
  const [showSettings, setShowSettings] = useState(false);
  const [showYaml, setShowYaml] = useState(true);
  const [showCloud, setShowCloud] = useState(false);
  const [, setCloudActiveId] = useState<string | null>(null);
  const connectedMode = typeof window !== "undefined" && isConnectedMode();
  const [importError, setImportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);
  const flow = useReactFlow();

  // ReactFlow-managed node/edge state — this is the correct v12 pattern.
  // RF handles position changes internally in its own state (no Error #015).
  // We sync our router state <-> RF state via effects below.
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<any>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<any>([]);

  // Ref so onConnect can read the latest rfEdges without stale closure
  const rfEdgesRef = useRef<any[]>([]);
  useEffect(() => {
    rfEdgesRef.current = rfEdges;
  }, [rfEdges]);

  // Allow deleting edges (defined early so the useEffect below can reference it)
  const onEdgesDelete = useCallback(
    (edgesToDelete: any[]) => {
      // Remove edges from rfEdges
      setRfEdges((eds: any[]) =>
        eds.filter((e: any) => !edgesToDelete.some((d: any) => d.id === e.id))
      );

      // Deleting a UserQuery → Signal edge marks the signal as disconnected.
      const disconnectedSigUids = new Set(
        edgesToDelete
          .filter((d: any) => d.source === USER_QUERY_NODE_ID)
          .map((d: any) => d.target as string)
      );
      if (disconnectedSigUids.size > 0) {
        setState((s: any) => ({
          ...s,
          signals: s.signals.map((sig: any) =>
            disconnectedSigUids.has(sig.uid)
              ? { ...sig, userQueryConnected: false }
              : sig
          ),
        }));
      }

      // Also update router state if needed (e.g., remove model reference if route->model edge is deleted)
      setState((s: any) => {
        let needsUpdate = false;
        const newRoutes = s.routes.map((r: any) => {
          const routeModelEdges = edgesToDelete.filter((d: any) => {
            if (d.source !== r.uid) return false;
            const t = rfNodes.find((n: any) => n.id === d.target)?.type;
            return t === "model" || t === "modelGroup";
          });
          if (routeModelEdges.length > 0) {
            needsUpdate = true;
            return { ...r, model: "" };
          }
          return r;
        });

        // Remove deleted signal/projection references from when clauses
        const updatedRoutes = newRoutes.map((r: any) => {
          let hasChanges = false;
          const newRules = removeRefsFromRules(r.rules, (ref: any) => {
            // ref.id here is a signal NAME (not uid). Look up the matching
            // uid in the snapshot and compare against the deleted edges.
            const sigUid = state.signals.find((s: any) => s.name === ref.id)?.uid;
            const isDeleted = edgesToDelete.some(
              (d: any) => d.source === sigUid || d.target === sigUid
            );
            if (isDeleted) hasChanges = true;
            return isDeleted;
          });
          return hasChanges ? { ...r, rules: newRules || { kind: "leaf", signalName: "any" } } : r;
        });

        // Remove deleted plugins from route plugins list
        const finalRoutes = updatedRoutes.map((r: any) => {
          const deletedPluginEdges = edgesToDelete.filter(
            (d: any) =>
              d.source === r.uid &&
              rfNodes.find((n: any) => n.id === d.target)?.type === "plugin"
          );
          if (deletedPluginEdges.length > 0) {
            needsUpdate = true;
            const pluginNames = deletedPluginEdges
              .map((d: any) => {
                const pluginNode = rfNodes.find((n: any) => n.id === d.target);
                return s.plugins.find((p: any) => p.uid === pluginNode?.id)?.type;
              })
              .filter(Boolean);
            return {
              ...r,
              plugins: (r.plugins || []).filter((p: string) => !pluginNames.includes(p)),
            };
          }
          return r;
        });

        // Signal → Projection edge deletion: strip the matching entry from
        // projection.config.inputs. Without this the edge re-derives from
        // state on the next render and visually pops back.
        const sigUidToName: Record<string, string> = {};
        for (const sig of s.signals) {
          if (sig?.uid && sig?.name) sigUidToName[sig.uid] = sig.name;
        }
        const newProjections = s.projections.map((p: any) => {
          // Find deleted edges that end at THIS projection coming from a signal.
          const affectingDeletes = edgesToDelete.filter(
            (d: any) =>
              d.target === p.uid &&
              rfNodes.find((n: any) => n.id === d.source)?.type === "signal"
          );
          if (affectingDeletes.length === 0) return p;
          const removedSignalNames = new Set(
            affectingDeletes
              .map((d: any) => sigUidToName[d.source])
              .filter(Boolean)
          );
          const inputs = (p.config?.inputs || []).filter(
            (i: any) => !removedSignalNames.has(i.name)
          );
          return { ...p, config: { ...p.config, inputs } };
        });

        const projectionsChanged = newProjections.some(
          (p: any, i: number) => p !== s.projections[i]
        );

        return needsUpdate ||
          projectionsChanged ||
          edgesToDelete.some((d: any) => {
            const t = rfNodes.find((n: any) => n.id === d.target)?.type;
            return t === "model" || t === "modelGroup" || t === "plugin";
          })
          ? { ...s, routes: finalRoutes, projections: newProjections }
          : s;
      });
    },
    [rfNodes, setRfEdges, state.signals]
  );

  // Listen for custom edge deletion events from the deletable edge component
  useEffect(() => {
    const handleDeleteEdge = (e: any) => {
      const edgeId = e.detail.edgeId;
      const edgeToDelete = rfEdges.find((ed: any) => ed.id === edgeId);
      if (edgeToDelete) {
        onEdgesDelete([edgeToDelete]);
      }
    };
    window.addEventListener("deleteEdge", handleDeleteEdge as EventListener);
    return () =>
      window.removeEventListener("deleteEdge", handleDeleteEdge as EventListener);
  }, [rfEdges, onEdgesDelete]);

  // Custom onNodesChange handler that snaps nodes to their layer columns
  const handleNodesChange = useCallback(
    (changes: any[]) => {
      // Process position changes to snap to layer columns
      const processedChanges = changes.map((change: any) => {
        if (change.type === "position" && change.position && !change.dragging) {
          // Find the node type for this node
          const node = rfNodes.find((n: any) => n.id === change.id);
          if (node) {
            const layer = getLayerByNodeType(node.type);
            if (layer) {
              // Snap x position to layer column, keep y position free
              const nodeWidth = 180;
              const snappedX = layer.xPos + (LAYER_COLUMN_WIDTH - nodeWidth) / 2;
              return {
                ...change,
                position: {
                  x: snappedX,
                  y: change.position.y,
                },
              };
            }
          }
        }
        return change;
      });

      onNodesChange(processedChanges);
    },
    [rfNodes, onNodesChange]
  );

  // Also save node positions back to state when nodes are moved (on drag stop)
  const onNodeDragStop = useCallback((_event: any, node: any) => {
    const layer = getLayerByNodeType(node.type);
    if (!layer) return;

    // Snap x position to layer column
    const nodeWidth = 180;
    const snappedX = layer.xPos + (LAYER_COLUMN_WIDTH - nodeWidth) / 2;

    // Only update if position actually changed
    if (Math.abs(node.position.x - snappedX) > 1) {
      setState((s: any) => {
        if (node.type === "signal") {
          return {
            ...s,
            signals: s.signals.map((sig: any) =>
              sig.uid === node.id
                ? { ...sig, position: { x: snappedX, y: node.position.y } }
                : sig
            ),
          };
        }
        if (node.type === "projection") {
          return {
            ...s,
            projections: s.projections.map((p: any) =>
              p.uid === node.id
                ? { ...p, position: { x: snappedX, y: node.position.y } }
                : p
            ),
          };
        }
        if (node.type === "route") {
          return {
            ...s,
            routes: s.routes.map((r: any) =>
              r.uid === node.id
                ? { ...r, position: { x: snappedX, y: node.position.y } }
                : r
            ),
          };
        }
        if (node.type === "model") {
          return {
            ...s,
            models: s.models.map((m: any) =>
              m.uid === node.id
                ? { ...m, position: { x: snappedX, y: node.position.y } }
                : m
            ),
          };
        }
        if (node.type === "modelGroup") {
          return {
            ...s,
            modelGroups: (s.modelGroups || []).map((g: any) =>
              g.uid === node.id
                ? { ...g, position: { x: snappedX, y: node.position.y } }
                : g
            ),
          };
        }
        if (node.type === "plugin") {
          return {
            ...s,
            plugins: s.plugins.map((p: any) =>
              p.uid === node.id
                ? { ...p, position: { x: snappedX, y: node.position.y } }
                : p
            ),
          };
        }
        return s;
      });
    }
  }, []);

  // Hydrate / persist to localStorage. Falls back to a legacy (v3) key,
  // migrating its shape on load — see migrateLegacyState.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setState(JSON.parse(raw));
      } else {
        for (const key of LEGACY_STORAGE_KEYS) {
          const legacy = window.localStorage.getItem(key);
          if (legacy) {
            setState(migrateLegacyState(JSON.parse(legacy)));
            break;
          }
        }
      }
    } catch {
      // ignore
    }
    initialized.current = true;
  }, []);
  useEffect(() => {
    if (!initialized.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  const yaml = useMemo(() => buildRouterYaml(state), [state]);
  const lint = useMemo(() => lintRouter(state), [state]);

  // ---- helpers for node collection ----
  const allNodes = useMemo(
    () => [
      ...state.signals.map((s: any) => ({ ...s, _kind: "signal" })),
      ...state.projections.map((p: any) => ({ ...p, _kind: "projection" })),
      ...state.routes.map((r: any) => ({ ...r, _kind: "route" })),
      ...state.models.map((m: any) => ({ ...m, _kind: "model" })),
      ...(state.modelGroups || []).map((g: any) => ({ ...g, _kind: "modelGroup" })),
      ...state.plugins.map((p: any) => ({ ...p, _kind: "plugin" })),
    ],
    [state]
  );

  // ---- Sync: router state -> ReactFlow nodes ----
  // Push node definitions into RF's state whenever router state changes.
  // RF manages positions in its own state (via onNodesChange below).
  useEffect(() => {
    const rowH = 120;
    const newNodes: any[] = [];

    // Helper to get layer x position
    const getLayerX = (nodeType: string) => {
      const layer = LAYERS.find((l) => l.nodeType === nodeType);
      return layer ? layer.xPos : 60;
    };

    // User Query singleton — always present, fixed left of signals.
    newNodes.push({
      id: USER_QUERY_NODE_ID,
      type: "userQuery",
      position: { x: getLayerX("signal") - 240, y: LAYER_PADDING_TOP },
      data: {},
      draggable: false,
      deletable: false,
      selectable: false,
    });

    state.signals.forEach((sig: any, idx: number) => {
      newNodes.push({
        id: sig.uid,
        type: "signal",
        position:
          sig.position ?? { x: getLayerX("signal"), y: LAYER_PADDING_TOP + idx * rowH },
        data: { node: sig, kind: "signal" },
      });
    });
    state.projections.forEach((proj: any, idx: number) => {
      newNodes.push({
        id: proj.uid,
        type: "projection",
        position:
          proj.position ?? {
            x: getLayerX("projection"),
            y: LAYER_PADDING_TOP + idx * rowH,
          },
        data: { node: proj, kind: "projection" },
      });
    });
    state.routes.forEach((route: any, idx: number) => {
      newNodes.push({
        id: route.uid,
        type: "route",
        position:
          route.position ?? { x: getLayerX("route"), y: LAYER_PADDING_TOP + idx * rowH },
        // allSignals lets the renderer resolve the rules leaf's signal type,
        // so the "always" badge fires on catch-all decisions.
        data: { node: route, kind: "route", allSignals: state.signals },
      });
    });
    state.models.forEach((model: any, idx: number) => {
      newNodes.push({
        id: model.uid,
        type: "model",
        position:
          model.position ?? { x: getLayerX("model"), y: LAYER_PADDING_TOP + idx * rowH },
        data: { node: model, kind: "model" },
      });
    });
    // Model Group nodes share the Model Selection column — stack them below
    // the single Model nodes so a fresh layout doesn't overlap them.
    (state.modelGroups || []).forEach((group: any, idx: number) => {
      newNodes.push({
        id: group.uid,
        type: "modelGroup",
        position:
          group.position ?? {
            x: getLayerX("model"),
            y: LAYER_PADDING_TOP + (state.models.length + idx) * rowH,
          },
        data: { node: group, kind: "modelGroup" },
      });
    });
    state.plugins.forEach((plugin: any, idx: number) => {
      newNodes.push({
        id: plugin.uid,
        type: "plugin",
        position:
          plugin.position ?? {
            x: getLayerX("plugin"),
            y: LAYER_PADDING_TOP + idx * rowH,
          },
        data: { node: plugin, kind: "plugin" },
      });
    });
    setRfNodes(newNodes);
  }, [state, setRfNodes]);

  // ---- Sync: router state -> ReactFlow edges ----
  // Note: onConnect also adds edges directly to rfEdges. This effect syncs on
  // router state changes (adding nodes/removing nodes/when clause edits).
  useEffect(() => {
    const edges: any[] = [];
    // Maps signal NAME -> uid (was .id in old schema; signal.name is the
    // schema field now).
    const sigById: Record<string, string> = {};
    state.signals.forEach((s: any) => {
      if (s.name) sigById[s.name] = s.uid;
    });
    const projById: Record<string, string> = {};
    state.projections.forEach((p: any) => {
      if (p.name) projById[p.name] = p.uid;
    });
    // `route.model` holds the uid of the connected Layer-4 node (a Model or a
    // Model Group). Collect both so the route → model edge can be derived.
    const modelNodeUids = new Set<string>();
    state.models.forEach((m: any) => modelNodeUids.add(m.uid));
    (state.modelGroups || []).forEach((g: any) => modelNodeUids.add(g.uid));
    const pluginByName: Record<string, string> = {};
    state.plugins.forEach((p: any) => {
      if (p.name) pluginByName[p.name] = p.uid;
    });

    // User Query -> Signal edges. A signal is "active" iff this edge exists.
    // Default is true for newly-created signals; YAML import sets it true for
    // every imported signal too. Users opt out by deleting the edge.
    state.signals.forEach((sig: any) => {
      if (sig.userQueryConnected === false) return;
      edges.push({
        id: `e-userquery-${sig.uid}`,
        source: USER_QUERY_NODE_ID,
        target: sig.uid,
        animated: false,
        style: { stroke: "var(--accent-blue)", strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "var(--accent-blue)" },
      });
    });

    // Signal -> Projection edges (based on projection's inputs config)
    state.projections.forEach((proj: any) => {
      const inputs = proj.config?.inputs || [];
      inputs.forEach((input: any) => {
        if (input.type && input.name) {
          const srcUid = sigById[input.name];
          if (srcUid) {
            edges.push({
              id: `e-${srcUid}-proj-${proj.uid}`,
              source: srcUid,
              target: proj.uid,
              animated: false,
              style: { stroke: "#8b5cf6", strokeWidth: 1.5, strokeDasharray: "6 3" },
              markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6" },
            });
          }
        }
      });
    });

    state.routes.forEach((route: any) => {
      collectRefs(route.rules).forEach((ref: any) => {
        const srcUid = ref.kind === "signal" ? sigById[ref.id] : projById[ref.id];
        if (!srcUid) return;
        edges.push({
          id: `e-${srcUid}-${route.uid}`,
          source: srcUid,
          target: route.uid,
          animated: false,
          style: { stroke: "#fbbf24", strokeWidth: 1.5, strokeDasharray: "6 3" },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#fbbf24" },
        });
      });
      if (route.model && modelNodeUids.has(route.model)) {
        edges.push({
          id: `e-${route.uid}-model-${route.model}`,
          source: route.uid,
          target: route.model,
          animated: false,
          style: { stroke: "#10b981", strokeWidth: 1.5, strokeDasharray: "6 3" },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
        });
      }
      (route.plugins || []).forEach((pName: string) => {
        const pUid = pluginByName[pName];
        if (!pUid) return;
        edges.push({
          id: `e-${route.uid}-plugin-${pName}`,
          source: route.uid,
          target: pUid,
          animated: false,
          style: { stroke: "#f43f5e", strokeWidth: 1.5, strokeDasharray: "6 3" },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#f43f5e" },
        });
      });
    });
    setRfEdges(edges);
  }, [state, setRfEdges]);

  // ---- canvas interactions ----
  // onNodesChange / onEdgesChange are provided by useNodesState/useEdgesState
  // and handle position/edge changes internally in RF's state.

  // Connecting a node to a route appends a leaf clause.
  // Connecting route -> model sets the route's model field.
  // Connecting route -> plugin adds plugin to the route's plugins list.
  const onConnect = useCallback(
    (params: any) => {
      // User Query -> Signal: just flip the signal's userQueryConnected flag.
      // The edges effect re-derives the visible edge from state.
      if (params.source === USER_QUERY_NODE_ID) {
        setState((s: any) => ({
          ...s,
          signals: s.signals.map((sig: any) =>
            sig.uid === params.target ? { ...sig, userQueryConnected: true } : sig
          ),
        }));
        return;
      }

      // Find source and target node types from rfNodes (always up-to-date)
      const srcNode = rfNodes.find((n: any) => n.id === params.source);
      const tgtNode = rfNodes.find((n: any) => n.id === params.target);

      if (!srcNode || !tgtNode) return;

      const srcType = srcNode.type;
      const tgtType = tgtNode.type;

      setState((s: any) => {
        // Find source and target from state
        const srcSig = s.signals.find((n: any) => n.uid === params.source);
        const srcProj = s.projections.find((n: any) => n.uid === params.source);
        const srcRoute = s.routes.find((n: any) => n.uid === params.source);
        const tgtProj = s.projections.find((n: any) => n.uid === params.target);
        const tgtRoute = s.routes.find((n: any) => n.uid === params.target);
        const tgtModel = s.models.find((n: any) => n.uid === params.target);
        const tgtModelGroup = (s.modelGroups || []).find(
          (n: any) => n.uid === params.target
        );
        const tgtPlugin = s.plugins.find((n: any) => n.uid === params.target);

        // Signal -> Projection: Add signal as input to projection
        if (srcSig && tgtProj) {
          const signalId = srcSig.id;
          const signalType = srcSig.type;
          return {
            ...s,
            projections: s.projections.map((p: any) => {
              if (p.uid !== tgtProj.uid) return p;
              // Add signal as input to the projection's config
              const inputs = p.config?.inputs || [];
              // Check if this signal is already an input
              if (inputs.some((i: any) => i.name === signalId)) return p;
              return {
                ...p,
                config: {
                  ...(p.config || {}),
                  inputs: [...inputs, { type: signalType, name: signalId }],
                },
              };
            }),
          };
        }

        // Signal -> Decision: add a leaf referencing the signal's name to
        // the decision's rules tree.
        if (srcSig && tgtRoute) {
          const signalName = srcSig.name;
          if (!signalName) return s;
          return {
            ...s,
            routes: s.routes.map((r: any) =>
              r.uid !== tgtRoute.uid
                ? r
                : { ...r, rules: addLeafToRules(r.rules, signalName) }
            ),
          };
        }

        // Projection -> Decision: projections aren't first-class in the new
        // RuleNode schema (the engine treats projection outputs as boolean
        // signals named after the projection). Same treatment: add a leaf
        // whose signalName is the projection's name.
        if (srcProj && tgtRoute) {
          const projName = srcProj.name;
          if (!projName) return s;
          return {
            ...s,
            routes: s.routes.map((r: any) =>
              r.uid !== tgtRoute.uid
                ? r
                : { ...r, rules: addLeafToRules(r.rules, projName) }
            ),
          };
        }

        // Route -> Model / Model Group: point the route at the node's uid.
        if (srcRoute && (tgtModel || tgtModelGroup)) {
          return {
            ...s,
            routes: s.routes.map((r: any) =>
              r.uid !== srcRoute.uid ? r : { ...r, model: params.target }
            ),
          };
        }

        // Route -> Plugin: Add plugin to route
        if (srcRoute && tgtPlugin) {
          const pluginType = tgtPlugin.type;
          if (!srcRoute.plugins?.includes(pluginType)) {
            return {
              ...s,
              routes: s.routes.map((r: any) =>
                r.uid !== srcRoute.uid
                  ? r
                  : { ...r, plugins: [...(r.plugins || []), pluginType] }
              ),
            };
          }
          return s;
        }

        // Generic: allow any edge between adjacent layers
        if (areAdjacentLayers(srcType, tgtType)) {
          return s;
        }

        return s;
      });
    },
    [rfNodes]
  );

  const onSelectionChange = useCallback(({ nodes }: any) => {
    setSelectedId(nodes.length === 1 ? nodes[0].id : null);
  }, []);

  // Realign all nodes to neat columns
  const onRealign = useCallback(() => {
    const realigned = getRealignedNodes(rfNodes);
    setRfNodes(realigned);
  }, [rfNodes, setRfNodes]);

  // ---- palette drag → canvas drop ----
  const onDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(DRAG_TYPE)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      const payload = e.dataTransfer.getData(DRAG_TYPE);
      if (!payload) return;
      e.preventDefault();
      const position = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setState((s: any) => addNodeFromPayload(s, payload, position));
    },
    [flow]
  );

  // ---- mutations ----
  const updateSignal = useCallback((uid: string, patch: any) => {
    setState((s: any) => ({
      ...s,
      signals: s.signals.map((sig: any) => (sig.uid === uid ? { ...sig, ...patch } : sig)),
    }));
  }, []);
  const updateProjection = useCallback((uid: string, patch: any) => {
    setState((s: any) => ({
      ...s,
      projections: s.projections.map((p: any) =>
        p.uid === uid ? { ...p, ...patch } : p
      ),
    }));
  }, []);
  const updateRoute = useCallback((uid: string, patch: any) => {
    setState((s: any) => ({
      ...s,
      routes: s.routes.map((r: any) => (r.uid === uid ? { ...r, ...patch } : r)),
    }));
  }, []);
  const updateModel = useCallback((uid: string, patch: any) => {
    setState((s: any) => ({
      ...s,
      models: s.models.map((m: any) => (m.uid === uid ? { ...m, ...patch } : m)),
    }));
  }, []);
  const updateModelGroup = useCallback((uid: string, patch: any) => {
    setState((s: any) => ({
      ...s,
      modelGroups: (s.modelGroups || []).map((g: any) =>
        g.uid === uid ? { ...g, ...patch } : g
      ),
    }));
  }, []);
  const updatePlugin = useCallback((uid: string, patch: any) => {
    setState((s: any) => ({
      ...s,
      plugins: s.plugins.map((p: any) => (p.uid === uid ? { ...p, ...patch } : p)),
    }));
  }, []);
  const removeNode = useCallback(
    (uid: string) => {
      // The User Query node is a singleton — silently no-op if someone tries
      // to delete it (e.g. selecting it + pressing Delete).
      if (uid === USER_QUERY_NODE_ID) return;
      setState((s: any) => {
        // Wipe the node from every state array.
        const signals = s.signals.filter((sig: any) => sig.uid !== uid);
        const projections = s.projections.filter((p: any) => p.uid !== uid);
        const routes = s.routes.filter((r: any) => r.uid !== uid);
        const models = s.models.filter((m: any) => m.uid !== uid);
        const modelGroups = (s.modelGroups || []).filter((g: any) => g.uid !== uid);
        const plugins = s.plugins.filter((p: any) => p.uid !== uid);

        // Garbage-collect references that pointed at this node, so the YAML
        // doesn't re-emit dangling names that would just re-create the node
        // visually (e.g. a route still naming the deleted signal in its
        // rules tree, which the edges-from-state effect would re-derive).
        const deletedSignalName = s.signals.find((sig: any) => sig.uid === uid)?.name;
        const deletedProjName   = s.projections.find((p: any) => p.uid === uid)?.name;
        const deletedPluginName = s.plugins.find((p: any) => p.uid === uid)?.name;
        const deletedPluginType = s.plugins.find((p: any) => p.uid === uid)?.type;

        const cleanedRoutes = routes.map((r: any) => {
          let rules = r.rules;
          if (deletedSignalName || deletedProjName) {
            rules = removeRefsFromRules(r.rules, (ref: any) =>
              ref.id === deletedSignalName || ref.id === deletedProjName
            ) || { kind: "leaf", signalName: "any" };
          }
          // `route.model` holds a node uid — clear it if that node was deleted.
          let model = r.model;
          if (model && model === uid) model = "";
          let plugins = r.plugins || [];
          if (deletedPluginName || deletedPluginType) {
            plugins = plugins.filter((p: string) =>
              p !== deletedPluginName && p !== deletedPluginType
            );
          }
          return { ...r, rules, model, plugins };
        });

        // Also strip references from projection inputs.
        const cleanedProjections = projections.map((p: any) => {
          if (!deletedSignalName) return p;
          const inputs = p.config?.inputs || [];
          if (!inputs.some((i: any) => i.name === deletedSignalName)) return p;
          return {
            ...p,
            config: {
              ...p.config,
              inputs: inputs.filter((i: any) => i.name !== deletedSignalName),
            },
          };
        });

        return {
          ...s,
          signals,
          projections: cleanedProjections,
          routes: cleanedRoutes,
          models,
          modelGroups,
          plugins,
        };
      });
      // RF state is regenerated from `state` by the next render's effect,
      // so we don't need to splice rfNodes/rfEdges manually.
      setSelectedId(null);
    },
    []
  );

  // Wire keyboard-Delete / multi-select-delete from React Flow. The handler
  // gets an array of {id, ...} for the deleted nodes; we run removeNode on
  // each. Without this, RF removes nodes from its OWN state but state.signals
  // etc. still has them — the state→rfNodes effect re-adds them on the next
  // render and the user sees the nodes pop back.
  const onNodesDelete = useCallback(
    (deleted: any[]) => {
      for (const n of deleted) {
        if (n?.id) removeNode(n.id);
      }
    },
    [removeNode]
  );

  // ---- export / import ----
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(yaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };
  const onDownload = () => {
    const blob = new Blob([yaml], { type: "application/x-yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.name || "router"}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const loadFromYaml = useCallback((text: string) => {
    const next = parseRouterYaml(text);
    // Use the per-layer snapped position so YAML-loaded nodes land inside
    // their column, not somewhere left of it.
    const colX = (k: string) => {
      const layer = LAYERS.find((l) => l.nodeType === k);
      const nodeWidth = 180;
      return layer ? layer.xPos + (LAYER_COLUMN_WIDTH - nodeWidth) / 2 : 60;
    };
    const rowY = (i: number) => LAYER_PADDING_TOP + i * 120;
    next.signals = (next.signals || []).map((s: any, i: number) => ({
      ...s,
      uid: s.uid || newUid("sig"),
      position: s.position || { x: colX("signal"), y: rowY(i) },
      // Imported signals are assumed wired to User Query; user can detach
      // them by removing the edge after load.
      userQueryConnected: s.userQueryConnected !== false,
    }));
    next.projections = (next.projections || []).map((p: any, i: number) => ({
      ...p,
      uid: p.uid || newUid("proj"),
      position: p.position || { x: colX("projection"), y: rowY(i) },
    }));
    next.routes = (next.routes || []).map((r: any, i: number) => ({
      ...r,
      uid: r.uid || newUid("route"),
      position: r.position || { x: colX("route"), y: rowY(i) },
    }));
    next.models = (next.models || []).map((m: any, i: number) => ({
      ...m,
      uid: m.uid || newUid("model"),
      position: m.position || { x: colX("model"), y: rowY(i) },
    }));
    next.modelGroups = (next.modelGroups || []).map((g: any, i: number) => ({
      ...g,
      uid: g.uid || newUid("mgroup"),
      // Model Group nodes share the model column — stack below the models.
      position:
        g.position || { x: colX("model"), y: rowY((next.models || []).length + i) },
    }));
    next.plugins = (next.plugins || []).map((p: any, i: number) => ({
      ...p,
      uid: p.uid || newUid("plugin"),
      position: p.position || { x: colX("plugin"), y: rowY(i) },
    }));
    setState(next);
    setSelectedId(null);
  }, []);
  const onImportClick = () => fileInputRef.current?.click();
  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      loadFromYaml(await file.text());
    } catch (err: any) {
      setImportError(err?.message || String(err));
    } finally {
      e.target.value = "";
    }
  };
  const hasContent =
    state.signals.length > 0 ||
    state.projections.length > 0 ||
    state.routes.length > 1 ||
    state.models.length > 0 ||
    (state.modelGroups || []).length > 0 ||
    state.plugins.length > 0 ||
    state.routes[0]?.model;
  const onPickTemplate = (tmpl: any) => {
    if (
      hasContent &&
      !window.confirm(`Replace the current router with the "${tmpl.name}" template?`)
    )
      return;
    setImportError(null);
    try {
      loadFromYaml(tmpl.yaml);
    } catch (err: any) {
      setImportError(err?.message || String(err));
    }
  };
  const onReset = () => {
    if (window.confirm("Reset router to a blank template?")) {
      setState(emptyState());
      setSelectedId(null);
    }
  };

  const selectedNode = useMemo(() => {
    if (!selectedId) return null;
    for (const s of state.signals) if (s.uid === selectedId) return { kind: "signal", value: s };
    for (const p of state.projections)
      if (p.uid === selectedId) return { kind: "projection", value: p };
    for (const r of state.routes) if (r.uid === selectedId) return { kind: "route", value: r };
    for (const m of state.models) if (m.uid === selectedId) return { kind: "model", value: m };
    for (const g of state.modelGroups)
      if (g.uid === selectedId) return { kind: "modelGroup", value: g };
    for (const p of state.plugins) if (p.uid === selectedId) return { kind: "plugin", value: p };
    return null;
  }, [selectedId, state]);

  const signalIds = useMemo(
    () => state.signals.map((s: any) => s.name).filter(Boolean),
    [state.signals]
  );
  const projIds = useMemo(
    () => state.projections.map((p: any) => p.name).filter(Boolean),
    [state.projections]
  );
  // Layer-4 node picker options for the Route inspector. `route.model` stores
  // the node uid; the label is a human-readable model summary.
  const modelOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (const m of state.models || []) {
      opts.push({ value: m.uid, label: m.model_id || "(empty model)" });
    }
    for (const g of state.modelGroups || []) {
      const names = (g.refs || [])
        .map((r: any) => r?.model)
        .filter(Boolean);
      const summary = names.length ? names.join(", ") : "(empty)";
      opts.push({ value: g.uid, label: `Group · ${summary}` });
    }
    return opts;
  }, [state.models, state.modelGroups]);
  const pluginNames = useMemo(
    () => state.plugins.map((p: any) => p.name).filter(Boolean),
    [state.plugins]
  );

  const hasNodes = allNodes.length > 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header — OpenAI-dashboard-style: title left, status chips, view-mode
          toggle group center-right, single primary CTA on the far right, all
          secondary actions tucked into an overflow menu. */}
      <header className="flex h-14 items-center gap-2 px-4 border-b border-[var(--bg-secondary)] bg-[var(--bg-primary)] shrink-0">
        <Link
          href="/dashboard"
          aria-label="Back to dashboard"
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>

        <div className="flex items-center gap-2 min-w-0">
          <input
            type="text"
            value={state.name}
            onChange={(e) => setState((s: any) => ({ ...s, name: e.target.value }))}
            placeholder="router-name"
            className="bg-transparent outline-none text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)] min-w-0 max-w-[280px] truncate focus:bg-[var(--bg-tertiary)] rounded-[var(--radius)] px-1.5 -mx-1.5 py-0.5"
          />
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            title="Router settings"
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-0.5 rounded"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <span className="inline-flex items-center rounded-full bg-[var(--bg-tertiary)] px-2 py-0.5 text-[10.5px] tracking-[0.04em] uppercase text-[var(--text-secondary)] font-medium ml-0.5">
          Draft
        </span>

        {lint.errors.length > 0 && (
          <span
            title={lint.errors.join("\n")}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-red)]/10 px-2 py-0.5 text-[10.5px] font-medium text-[var(--accent-red)] cursor-help"
          >
            <FileWarning className="h-3 w-3" />
            {lint.errors.length} error{lint.errors.length === 1 ? "" : "s"}
          </span>
        )}
        {lint.errors.length === 0 && lint.warnings.length > 0 && (
          <span
            title={lint.warnings.join("\n")}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-orange)]/10 px-2 py-0.5 text-[10.5px] font-medium text-[var(--accent-orange)] cursor-help"
          >
            <AlertTriangle className="h-3 w-3" />
            {lint.warnings.length} warning{lint.warnings.length === 1 ? "" : "s"}
          </span>
        )}

        <div className="flex-1" />

        {/* View-mode toggle group — Canvas / YAML / Cloud, styled like the
            OpenAI "24h / 7d / 30d / 90d" range pill */}
        <div className="inline-flex items-center rounded-full border border-[var(--bg-secondary)] bg-[var(--bg-primary)] p-0.5 mr-1">
          <ViewToggle
            active={!showYaml && !showCloud}
            onClick={() => { setShowYaml(false); setShowCloud(false); }}
            label="Canvas"
          />
          <ViewToggle
            active={showYaml}
            onClick={() => { setShowYaml(true); setShowCloud(false); }}
            label="YAML"
            icon={<Code2 className="h-3 w-3" />}
          />
          {connectedMode && (
            <ViewToggle
              active={showCloud}
              onClick={() => { setShowCloud(true); setShowYaml(false); }}
              label="Cloud"
              icon={<Cloud className="h-3 w-3" />}
            />
          )}
        </div>

        {/* Overflow menu — Templates / Import / Copy YAML / Reset */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".yaml,.yml,.json"
          onChange={onImportFile}
          className="hidden"
        />
        <OverflowMenu
          templates={TEMPLATES}
          onPickTemplate={onPickTemplate}
          onImport={onImportClick}
          onCopy={onCopy}
          onReset={onReset}
          copied={copied}
        />

        {/* Primary CTA — single dark button, OpenAI-style. */}
        <Button size="sm" onClick={onDownload} className="h-8 px-3 ml-1">
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export YAML
        </Button>
      </header>

      {importError && (
        <div className="border-b border-[var(--accent-red)]/30 bg-[var(--accent-red)]/5 text-[var(--accent-red)] px-4 py-2 text-[12.5px]">
          Import failed: {importError}
        </div>
      )}

      {/* Body: palette | canvas | properties | yaml */}
      <div className="flex flex-1 min-h-0">
        <Palette />

        <CanvasShell
          wrapperRef={wrapperRef}
          rfNodes={rfNodes}
          rfEdges={rfEdges}
          handleNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          onNodesDelete={onNodesDelete}
          onSelectionChange={onSelectionChange}
          onNodeDragStop={onNodeDragStop}
          tool={tool}
          setTool={setTool}
          onRealign={onRealign}
          onDragOver={onDragOver}
          onDrop={onDrop}
          hasNodes={hasNodes}
        />

        {selectedNode && (
          <PropertiesPanel
            node={selectedNode}
            signalIds={signalIds}
            projIds={projIds}
            modelOptions={modelOptions}
            pluginNames={pluginNames}
            routes={state.routes}
            onClose={() => setSelectedId(null)}
            onUpdateSignal={updateSignal}
            onUpdateProjection={updateProjection}
            onUpdateRoute={updateRoute}
            onUpdateModel={updateModel}
            onUpdateModelGroup={updateModelGroup}
            onUpdatePlugin={updatePlugin}
            onRemove={removeNode}
          />
        )}

        {showYaml && (
          <YamlPreview yaml={yaml} lint={lint} onClose={() => setShowYaml(false)} />
        )}

        {showCloud && connectedMode && (
          <CloudSyncPanel
            getYaml={() => yaml}
            loadYaml={loadFromYaml}
            activeName={state.name}
            onActiveIdChange={setCloudActiveId}
          />
        )}
      </div>

      {showSettings && (
        <SettingsDrawer
          state={state}
          onPatch={(p: any) => setState((s: any) => ({ ...s, ...p }))}
          onPatchPath={(key: string, p: any) =>
            setState((s: any) => ({ ...s, [key]: { ...s[key], ...p } }))
          }
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar helpers — the segmented "Canvas / YAML / Cloud" toggle and the
// overflow menu for secondary actions. Mirrors the OpenAI dashboard pattern
// of a tight time-range pill plus a kebab for everything that isn't the
// single primary action.
// ---------------------------------------------------------------------------

function ViewToggle({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11.5px] font-medium transition-colors",
        active
          ? "bg-[var(--text-primary)] text-[var(--text-inverted)]"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function OverflowMenu({
  templates,
  onPickTemplate,
  onImport,
  onCopy,
  onReset,
  copied,
}: {
  templates: any[];
  onPickTemplate: (tmpl: any) => void;
  onImport: () => void;
  onCopy: () => void;
  onReset: () => void;
  copied: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const Row = ({ icon, label, onSelect, danger }: any) => (
    <button
      type="button"
      onClick={() => { onSelect(); setOpen(false); }}
      className={cn(
        "w-full text-left inline-flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-[12.5px] hover:bg-[var(--bg-secondary)]",
        danger ? "text-[var(--accent-red)]" : "text-[var(--text-primary)]"
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="More actions"
        className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-30 w-[280px] rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] shadow-[var(--shadow-popover)] p-1">
          <div className="px-2.5 pt-1 pb-1 text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] font-semibold">
            Start from a template
          </div>
          {templates.map((t: any) => (
            <button
              key={t.key}
              type="button"
              onClick={() => { onPickTemplate(t); setOpen(false); }}
              className="w-full text-left rounded-[var(--radius-sm)] px-2.5 py-1.5 hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <div className="text-[12.5px] font-medium text-[var(--text-primary)]">{t.name}</div>
              <div className="text-[10.5px] text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                {t.description}
              </div>
            </button>
          ))}
          <div className="h-px bg-[var(--bg-secondary)] my-1 mx-1" />
          <Row icon={<Upload className="h-3.5 w-3.5" />} label="Import YAML…" onSelect={onImport} />
          <Row
            icon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            label={copied ? "Copied!" : "Copy YAML to clipboard"}
            onSelect={onCopy}
          />
          <div className="h-px bg-[var(--bg-secondary)] my-1 mx-1" />
          <Row icon={null} label="Reset to empty router" onSelect={onReset} danger />
        </div>
      )}
    </div>
  );
}

// Re-exports preserved from original page.js so any external import that may
// have referenced these still resolves the same names.
export { LAYERS } from "./lib/layers";
export { getLayerByKey, getLayerByNodeType } from "./lib/layers";
