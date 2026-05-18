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
  Settings,
  Settings2,
  Upload,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { isConnectedMode } from "@/lib/supabase/config";

import { CloudSyncPanel } from "./CloudSyncPanel";
import { TEMPLATES } from "./templates";
import { buildRouterYaml, lintRouter, parseRouterYaml } from "./yaml";

import { CanvasShell } from "./components/CanvasShell";
import { Palette } from "./components/NodePalette";
import { TemplatesMenu } from "./components/Toolbar";
import { YamlPreview } from "./components/YamlPreview";
import { PropertiesPanel } from "./components/inspector/Inspector";
import { SettingsDrawer } from "./components/inspector/SettingsDrawer";

import { DRAG_TYPE, STORAGE_KEY, newUid } from "./lib/constants";
import {
  LAYERS,
  LAYER_COLUMN_WIDTH,
  LAYER_PADDING_TOP,
  areAdjacentLayers,
  getRealignedNodes,
} from "./lib/layers";
import {
  addLeafToWhen,
  addNodeFromPayload,
  collectRefs,
  emptyState,
  removeRefsFromWhen,
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

      // Also update router state if needed (e.g., remove model reference if route->model edge is deleted)
      setState((s: any) => {
        let needsUpdate = false;
        const newRoutes = s.routes.map((r: any) => {
          const routeModelEdges = edgesToDelete.filter(
            (d: any) =>
              d.source === r.uid &&
              rfNodes.find((n: any) => n.id === d.target)?.type === "model"
          );
          if (routeModelEdges.length > 0) {
            needsUpdate = true;
            return { ...r, model: "" };
          }
          return r;
        });

        // Remove deleted signal/projection references from when clauses
        const updatedRoutes = newRoutes.map((r: any) => {
          let hasChanges = false;
          const newWhen = removeRefsFromWhen(r.when, (ref: any) => {
            const isDeleted = edgesToDelete.some(
              (d: any) => d.source === ref.id || d.target === ref.id
            );
            if (isDeleted) hasChanges = true;
            return isDeleted;
          });
          return hasChanges ? { ...r, when: newWhen } : r;
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

        return needsUpdate ||
          edgesToDelete.some(
            (d: any) =>
              rfNodes.find((n: any) => n.id === d.target)?.type === "model" ||
              rfNodes.find((n: any) => n.id === d.target)?.type === "plugin"
          )
          ? { ...s, routes: finalRoutes }
          : s;
      });
    },
    [rfNodes, setRfEdges]
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
            const layer = LAYERS.find((l) => l.nodeType === node.type);
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
    const layer = LAYERS.find((l) => l.nodeType === node.type);
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

  // Hydrate / persist to localStorage.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
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
        data: { node: route, kind: "route" },
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
    const sigById: Record<string, string> = {};
    state.signals.forEach((s: any) => {
      if (s.id) sigById[s.id] = s.uid;
    });
    const projById: Record<string, string> = {};
    state.projections.forEach((p: any) => {
      if (p.name) projById[p.name] = p.uid;
    });
    const modelByName: Record<string, string> = {};
    state.models.forEach((m: any) => {
      if (m.name) modelByName[m.name] = m.uid;
    });
    const pluginByName: Record<string, string> = {};
    state.plugins.forEach((p: any) => {
      if (p.name) pluginByName[p.name] = p.uid;
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
      collectRefs(route.when).forEach((ref: any) => {
        const srcUid = ref.kind === "signal" ? sigById[ref.id] : projById[ref.id];
        if (!srcUid) return;
        edges.push({
          id: `e-${srcUid}-${route.uid}`,
          source: srcUid,
          target: route.uid,
          animated: false,
          style: { stroke: "var(--border-strong)", strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--border-strong)" },
        });
      });
      if (route.model && modelByName[route.model]) {
        edges.push({
          id: `e-${route.uid}-model-${route.model}`,
          source: route.uid,
          target: modelByName[route.model],
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

        // Signal -> Route: Add signal reference in when clause
        if (srcSig && tgtRoute) {
          const signalId = srcSig.id;
          return {
            ...s,
            routes: s.routes.map((r: any) =>
              r.uid !== tgtRoute.uid
                ? r
                : { ...r, when: addLeafToWhen(r.when, signalId, undefined, signalId) }
            ),
          };
        }

        // Projection -> Route: Add projection reference in when clause
        if (srcProj && tgtRoute) {
          const projId = srcProj.name;
          return {
            ...s,
            routes: s.routes.map((r: any) =>
              r.uid !== tgtRoute.uid
                ? r
                : { ...r, when: addLeafToWhen(r.when, projId, projId, undefined) }
            ),
          };
        }

        // Route -> Model: Set route model
        if (srcRoute && tgtModel) {
          return {
            ...s,
            routes: s.routes.map((r: any) =>
              r.uid !== srcRoute.uid ? r : { ...r, model: tgtModel.name }
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
  const updatePlugin = useCallback((uid: string, patch: any) => {
    setState((s: any) => ({
      ...s,
      plugins: s.plugins.map((p: any) => (p.uid === uid ? { ...p, ...patch } : p)),
    }));
  }, []);
  const removeNode = useCallback(
    (uid: string) => {
      setState((s: any) => ({
        ...s,
        signals: s.signals.filter((sig: any) => sig.uid !== uid),
        projections: s.projections.filter((p: any) => p.uid !== uid),
        routes: s.routes.filter((r: any) => r.uid !== uid),
        models: s.models.filter((m: any) => m.uid !== uid),
        plugins: s.plugins.filter((p: any) => p.uid !== uid),
      }));
      // Also remove from RF state
      setRfNodes((ns: any[]) => ns.filter((n: any) => n.id !== uid));
      setRfEdges((es: any[]) => es.filter((e: any) => e.source !== uid && e.target !== uid));
      setSelectedId(null);
    },
    [setRfNodes, setRfEdges]
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
    next.signals = (next.signals || []).map((s: any, i: number) => ({
      ...s,
      uid: s.uid || newUid("sig"),
      position: s.position || { x: 60, y: 60 + i * 120 },
    }));
    next.projections = (next.projections || []).map((p: any, i: number) => ({
      ...p,
      uid: p.uid || newUid("proj"),
      position: p.position || { x: 420, y: 60 + i * 120 },
    }));
    next.routes = (next.routes || []).map((r: any, i: number) => ({
      ...r,
      uid: r.uid || newUid("route"),
      position: r.position || { x: 780, y: 60 + i * 140 },
    }));
    next.models = (next.models || []).map((m: any, i: number) => ({
      ...m,
      uid: m.uid || newUid("model"),
      position: m.position || { x: 1100, y: 60 + i * 120 },
    }));
    next.plugins = (next.plugins || []).map((p: any, i: number) => ({
      ...p,
      uid: p.uid || newUid("plugin"),
      position: p.position || { x: 1420, y: 60 + i * 120 },
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
    for (const p of state.plugins) if (p.uid === selectedId) return { kind: "plugin", value: p };
    return null;
  }, [selectedId, state]);

  const signalIds = useMemo(
    () => state.signals.map((s: any) => s.id).filter(Boolean),
    [state.signals]
  );
  const projIds = useMemo(
    () => state.projections.map((p: any) => p.name).filter(Boolean),
    [state.projections]
  );
  const modelNames = useMemo(
    () => state.models.map((m: any) => m.name).filter(Boolean),
    [state.models]
  );
  const pluginNames = useMemo(
    () => state.plugins.map((p: any) => p.name).filter(Boolean),
    [state.plugins]
  );

  const hasNodes = allNodes.length > 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <header className="flex h-14 items-center gap-3 px-4 border-b border-[var(--bg-secondary)] bg-[var(--bg-primary)] shrink-0">
        <Link
          href="/dashboard"
          aria-label="Back"
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
            className="bg-transparent outline-none text-[16px] font-semibold tracking-tight text-[var(--text-primary)] min-w-0 max-w-[280px] truncate focus:bg-[var(--bg-secondary)] rounded px-1.5 -mx-1.5"
          />
          <Settings2 className="h-3.5 w-3.5 text-[var(--text-tertiary)] shrink-0" />
        </div>
        <span className="inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--bg-secondary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[10.5px] tracking-[0.06em] uppercase text-[var(--text-secondary)]">
          Draft
        </span>
        {lint.errors.length > 0 && (
          <span
            title={lint.errors.join("\n")}
            className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--accent-red)]/10 px-1.5 py-0.5 text-[10.5px] text-[var(--accent-red)] cursor-help"
          >
            <FileWarning className="h-3 w-3" />
            {lint.errors.length} error{lint.errors.length === 1 ? "" : "s"}
          </span>
        )}
        {lint.errors.length === 0 && lint.warnings.length > 0 && (
          <span
            title={lint.warnings.join("\n")}
            className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--accent-orange)]/10 px-1.5 py-0.5 text-[10.5px] text-[var(--accent-orange)] cursor-help"
          >
            <AlertTriangle className="h-3 w-3" />
            {lint.warnings.length} warning{lint.warnings.length === 1 ? "" : "s"}
          </span>
        )}
        <div className="flex-1" />
        <input
          ref={fileInputRef}
          type="file"
          accept=".yaml,.yml,.json"
          onChange={onImportFile}
          className="hidden"
        />
        <Button
          variant={showYaml ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setShowYaml((v) => !v)}
          title="Toggle YAML preview"
        >
          <Code2 className="h-3.5 w-3.5 mr-1.5" />
          YAML
        </Button>
        {connectedMode && (
          <Button
            variant={showCloud ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowCloud((v) => !v)}
            title="Save / load routers from your Uniro account"
          >
            <Cloud className="h-3.5 w-3.5 mr-1.5" />
            Cloud
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(true)}
          aria-label="Router settings"
          className="h-8 w-8"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <TemplatesMenu templates={TEMPLATES} onPick={onPickTemplate} />
        <Button variant="ghost" size="sm" onClick={onImportClick}>
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Import
        </Button>
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset
        </Button>
        <Button variant="outline" size="sm" onClick={onCopy}>
          {copied ? (
            <Check className="h-3.5 w-3.5 mr-1.5" />
          ) : (
            <Copy className="h-3.5 w-3.5 mr-1.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button size="sm" onClick={onDownload}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export
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
            modelNames={modelNames}
            pluginNames={pluginNames}
            routes={state.routes}
            onClose={() => setSelectedId(null)}
            onUpdateSignal={updateSignal}
            onUpdateProjection={updateProjection}
            onUpdateRoute={updateRoute}
            onUpdateModel={updateModel}
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

// Re-exports preserved from original page.js so any external import that may
// have referenced these still resolves the same names.
export { LAYERS } from "./lib/layers";
export { getLayerByKey, getLayerByNodeType } from "./lib/layers";
