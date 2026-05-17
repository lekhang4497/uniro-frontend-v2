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
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  applyNodeChanges,
  useNodesState,
  useEdgesState,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  AlertTriangle,
  Boxes,
  Brain,
  Calculator,
  Check,
  ChevronLeft,
  ChevronDown,
  Clock,
  Code2,
  Cog,
  Copy,
  Cpu,
  Download,
  FileText,
  FileWarning,
  Gauge,
  GraduationCap,
  Hand,
  Image as ImageIcon,
  Languages,
  Layers,
  Library,
  Lock,
  LockKeyhole,
  LayoutGrid,
  MessageCircle,
  MessagesSquare,
  MousePointer2,
  Plus,
  Repeat,
  RotateCcw,
  Ruler,
  Search,
  Settings,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Split,
  Tag,
  ThumbsUp,
  Trash2,
  Upload,
  UserCheck,
  Wand,
  Workflow,
  X,
  Zap,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
  CREATED_BY_METHOD,
  ON_NO_MATCH,
  PLUGIN_BY_TYPE,
  PLUGIN_SUMMARY,
  PLUGINS,
  PROJECTION_CATEGORIES,
  PROJECTION_TYPE_BY_KEY,
  PROJECTION_TYPES,
  SIGNAL_CATEGORIES,
  SIGNAL_TYPES,
  SIGNAL_TYPE_BY_KEY,
} from "./catalog";
import { buildRouterYaml, lintRouter, parseRouterYaml } from "./yaml";
import { WhenEditor, makeDefaultWhen } from "./WhenEditor";
import { TEMPLATES } from "./templates";
import { CloudSyncPanel } from "./CloudSyncPanel";
import { Cloud } from "lucide-react";
import { isConnectedMode } from "@/lib/supabase/config";

const STORAGE_KEY = "uniro:router-builder:v3";

// Drag-and-drop payload types. Six flavors from the palette:
//   "signal:<type>"        — drop creates a signal node
//   "projection:<type>"   — drop creates a projection node
//   "route"               — drop creates a route with `when: always`
//   "model"               — drop creates a model node
//   "plugin:<type>"       — drop creates a plugin node
const DRAG_TYPE = "application/x-uniro-rb";

// lucide icon lookup
const ICONS = {
  Languages, MessagesSquare, Sparkles, GraduationCap, Gauge, Lock, LockKeyhole,
  Ruler, Brain, Image: ImageIcon, Layers, Search, Clock, Tag, MessageCircle,
  RotateCcw, ShieldAlert, ShieldCheck, ThumbsUp, UserCheck, Cog, Check,
  Library, Wand, Workflow, Boxes, Split, Calculator, Repeat, Cpu, Zap,
};

function newUid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

// =====================================================================
// 5 layer definitions
// =====================================================================
export const LAYERS = [
  {
    key: "signal",
    label: "Signal Extraction",
    description: "Extract facts from the request",
    color: "bg-blue-500/5",
    borderColor: "border-blue-300/40 dark:border-blue-700/40",
    headerBg: "bg-blue-50 dark:bg-blue-950/40",
    headerText: "text-blue-700 dark:text-blue-300",
    headerDot: "bg-blue-500",
    xPos: 60, // Canvas x position for this layer's column
    nodeType: "signal",
  },
  {
    key: "projection",
    label: "Projection Coordination",
    description: "Coordinate signals into routing facts",
    color: "bg-violet-500/5",
    borderColor: "border-violet-300/40 dark:border-violet-700/40",
    headerBg: "bg-violet-50 dark:bg-violet-950/40",
    headerText: "text-violet-700 dark:text-violet-300",
    headerDot: "bg-violet-500",
    xPos: 400,
    nodeType: "projection",
  },
  {
    key: "route",
    label: "Decision Making",
    description: "Rules that decide which model to use",
    color: "bg-amber-500/5",
    borderColor: "border-amber-300/40 dark:border-amber-700/40",
    headerBg: "bg-amber-50 dark:bg-amber-950/40",
    headerText: "text-amber-700 dark:text-amber-300",
    headerDot: "bg-amber-500",
    xPos: 740,
    nodeType: "route",
  },
  {
    key: "model",
    label: "Model Selection",
    description: "Models available for dispatch",
    color: "bg-emerald-500/5",
    borderColor: "border-emerald-300/40 dark:border-emerald-700/40",
    headerBg: "bg-emerald-50 dark:bg-emerald-950/40",
    headerText: "text-emerald-700 dark:text-emerald-300",
    headerDot: "bg-emerald-500",
    xPos: 1080,
    nodeType: "model",
  },
  {
    key: "plugin",
    label: "Plugin Chain",
    description: "Pre/post processing for a route",
    color: "bg-rose-500/5",
    borderColor: "border-rose-300/40 dark:border-rose-700/40",
    headerBg: "bg-rose-50 dark:bg-rose-950/40",
    headerText: "text-rose-700 dark:text-rose-300",
    headerDot: "bg-rose-500",
    xPos: 1420,
    nodeType: "plugin",
  },
];

// Width fraction of each column (must sum to 1)
const LAYER_WIDTHS = [0.20, 0.20, 0.22, 0.18, 0.20];

// Canvas column width and spacing for layer zones
const LAYER_COLUMN_WIDTH = 300;
const LAYER_PADDING_TOP = 100; // Space for the header

// Helper to get layer info by key
export function getLayerByKey(key) {
  return LAYERS.find((l) => l.key === key);
}

// Helper to get layer by node type
export function getLayerByNodeType(nodeType) {
  return LAYERS.find((l) => l.nodeType === nodeType);
}

// Get the order index of a layer (0-4)
function getLayerIndex(nodeType) {
  const index = LAYERS.findIndex((l) => l.nodeType === nodeType);
  return index;
}

// Check if two node types are adjacent in the layer order
function areAdjacentLayers(sourceType, targetType) {
  const sourceIndex = getLayerIndex(sourceType);
  const targetIndex = getLayerIndex(targetType);
  // Source should be before target (left to right flow)
  return sourceIndex >= 0 && targetIndex >= 0 && targetIndex === sourceIndex + 1;
}

// Snap a node's x position to its layer's column center
function snapNodeToLayer(nodeType, yPosition, existingNodesInLayer = []) {
  const layer = getLayerByNodeType(nodeType);
  if (!layer) return { x: 100, y: yPosition };

  const nodeHeight = 100;
  const spacing = 20;
  const index = existingNodesInLayer.length;
  const newY = LAYER_PADDING_TOP + index * (nodeHeight + spacing);

  return {
    x: layer.xPos + (LAYER_COLUMN_WIDTH - 180) / 2, // Center node in column (node is ~180px wide)
    y: newY,
  };
}

// Realign all nodes to neat columns based on their layer
function getRealignedNodes(nodes) {
  // Group nodes by type
  const byType = { signal: [], projection: [], route: [], model: [], plugin: [] };
  nodes.forEach((node) => {
    const nodeType = node.type;
    if (byType[nodeType]) {
      byType[nodeType].push(node);
    }
  });

  // Reassign positions for each group
  const updatedNodes = [];
  const nodeHeight = 100;
  const spacing = 20;

  LAYERS.forEach((layer) => {
    const nodesOfType = byType[layer.nodeType] || [];
    nodesOfType.forEach((node, index) => {
      const newY = LAYER_PADDING_TOP + index * (nodeHeight + spacing);
      const newX = layer.xPos + (LAYER_COLUMN_WIDTH - 180) / 2;
      updatedNodes.push({
        ...node,
        position: { x: newX, y: newY },
      });
    });
  });

  return updatedNodes;
}

// =====================================================================
// 5-Layer Header Bar
// Fixed header showing the 5 layers for visual guidance
// =====================================================================

function emptyState() {
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

export default function RouterBuilderPage() {
  return (
    <ReactFlowProvider>
      <Builder />
    </ReactFlowProvider>
  );
}

function Builder() {
  const [state, setState] = useState(emptyState);
  const [selectedId, setSelectedId] = useState(null);
  const [tool, setTool] = useState("select");
  const [showSettings, setShowSettings] = useState(false);
  const [showYaml, setShowYaml] = useState(true);
  const [showCloud, setShowCloud] = useState(false);
  const [cloudActiveId, setCloudActiveId] = useState(null);
  const connectedMode = typeof window !== "undefined" && isConnectedMode();
  const [importError, setImportError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [layerCollapsed, setLayerCollapsed] = useState({});
  const fileInputRef = useRef(null);
  const wrapperRef = useRef(null);
  const initialized = useRef(false);
  const flow = useReactFlow();

  // ReactFlow-managed node/edge state — this is the correct v12 pattern.
  // RF handles position changes internally in its own state (no Error #015).
  // We sync our router state <-> RF state via effects below.
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);

  // Ref so onConnect can read the latest rfEdges without stale closure
  const rfEdgesRef = useRef([]);
  useEffect(() => { rfEdgesRef.current = rfEdges; }, [rfEdges]);

  // Allow deleting edges (defined early so the useEffect below can reference it)
  const onEdgesDelete = useCallback((edgesToDelete) => {
    // Remove edges from rfEdges
    setRfEdges((eds) => eds.filter((e) => !edgesToDelete.some((d) => d.id === e.id)));

    // Also update router state if needed (e.g., remove model reference if route->model edge is deleted)
    setState((s) => {
      let needsUpdate = false;
      const newRoutes = s.routes.map((r) => {
        const routeModelEdges = edgesToDelete.filter(
          (d) => d.source === r.uid && rfNodes.find((n) => n.id === d.target)?.type === "model"
        );
        if (routeModelEdges.length > 0) {
          needsUpdate = true;
          return { ...r, model: "" };
        }
        return r;
      });

      // Remove deleted signal/projection references from when clauses
      const updatedRoutes = newRoutes.map((r) => {
        let hasChanges = false;
        const newWhen = removeRefsFromWhen(r.when, (ref) => {
          const isDeleted = edgesToDelete.some((d) => d.source === ref.id || d.target === ref.id);
          if (isDeleted) hasChanges = true;
          return isDeleted;
        });
        return hasChanges ? { ...r, when: newWhen } : r;
      });

      // Remove deleted plugins from route plugins list
      const finalRoutes = updatedRoutes.map((r) => {
        const deletedPluginEdges = edgesToDelete.filter(
          (d) => d.source === r.uid && rfNodes.find((n) => n.id === d.target)?.type === "plugin"
        );
        if (deletedPluginEdges.length > 0) {
          needsUpdate = true;
          const pluginNames = deletedPluginEdges.map((d) => {
            const pluginNode = rfNodes.find((n) => n.id === d.target);
            return s.plugins.find((p) => p.uid === pluginNode?.id)?.type;
          }).filter(Boolean);
          return {
            ...r,
            plugins: (r.plugins || []).filter((p) => !pluginNames.includes(p)),
          };
        }
        return r;
      });

      return needsUpdate || edgesToDelete.some((d) =>
        rfNodes.find((n) => n.id === d.target)?.type === "model" ||
        rfNodes.find((n) => n.id === d.target)?.type === "plugin"
      ) ? { ...s, routes: finalRoutes } : s;
    });
  }, [rfNodes]);

  // Listen for custom edge deletion events from the deletable edge component
  useEffect(() => {
    const handleDeleteEdge = (e) => {
      const edgeId = e.detail.edgeId;
      const edgeToDelete = rfEdges.find((ed) => ed.id === edgeId);
      if (edgeToDelete) {
        onEdgesDelete([edgeToDelete]);
      }
    };
    window.addEventListener("deleteEdge", handleDeleteEdge);
    return () => window.removeEventListener("deleteEdge", handleDeleteEdge);
  }, [rfEdges, onEdgesDelete]);

  // Custom onNodesChange handler that snaps nodes to their layer columns
  const handleNodesChange = useCallback(
    (changes) => {
      // Process position changes to snap to layer columns
      const processedChanges = changes.map((change) => {
        if (change.type === "position" && change.position && !change.dragging) {
          // Find the node type for this node
          const node = rfNodes.find((n) => n.id === change.id);
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
  const onNodeDragStop = useCallback(
    (_event, node) => {
      const layer = LAYERS.find((l) => l.nodeType === node.type);
      if (!layer) return;

      // Snap x position to layer column
      const nodeWidth = 180;
      const snappedX = layer.xPos + (LAYER_COLUMN_WIDTH - nodeWidth) / 2;

      // Only update if position actually changed
      if (Math.abs(node.position.x - snappedX) > 1) {
        setState((s) => {
          if (node.type === "signal") {
            return {
              ...s,
              signals: s.signals.map((sig) =>
                sig.uid === node.id ? { ...sig, position: { x: snappedX, y: node.position.y } } : sig
              ),
            };
          }
          if (node.type === "projection") {
            return {
              ...s,
              projections: s.projections.map((p) =>
                p.uid === node.id ? { ...p, position: { x: snappedX, y: node.position.y } } : p
              ),
            };
          }
          if (node.type === "route") {
            return {
              ...s,
              routes: s.routes.map((r) =>
                r.uid === node.id ? { ...r, position: { x: snappedX, y: node.position.y } } : r
              ),
            };
          }
          if (node.type === "model") {
            return {
              ...s,
              models: s.models.map((m) =>
                m.uid === node.id ? { ...m, position: { x: snappedX, y: node.position.y } } : m
              ),
            };
          }
          if (node.type === "plugin") {
            return {
              ...s,
              plugins: s.plugins.map((p) =>
                p.uid === node.id ? { ...p, position: { x: snappedX, y: node.position.y } } : p
              ),
            };
          }
          return s;
        });
      }
    },
    []
  );

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
  const allNodes = useMemo(() => [
    ...state.signals.map((s) => ({ ...s, _kind: "signal" })),
    ...state.projections.map((p) => ({ ...p, _kind: "projection" })),
    ...state.routes.map((r) => ({ ...r, _kind: "route" })),
    ...state.models.map((m) => ({ ...m, _kind: "model" })),
    ...state.plugins.map((p) => ({ ...p, _kind: "plugin" })),
  ], [state]);

  // ---- Sync: router state -> ReactFlow nodes ----
  // Push node definitions into RF's state whenever router state changes.
  // RF manages positions in its own state (via onNodesChange below).
  useEffect(() => {
    const rowH = 120;
    const newNodes = [];

    // Helper to get layer x position
    const getLayerX = (nodeType) => {
      const layer = LAYERS.find((l) => l.nodeType === nodeType);
      return layer ? layer.xPos : 60;
    };

    state.signals.forEach((sig, idx) => {
      newNodes.push({
        id: sig.uid, type: "signal",
        position: sig.position ?? { x: getLayerX("signal"), y: LAYER_PADDING_TOP + idx * rowH },
        data: { node: sig, kind: "signal" },
      });
    });
    state.projections.forEach((proj, idx) => {
      newNodes.push({
        id: proj.uid, type: "projection",
        position: proj.position ?? { x: getLayerX("projection"), y: LAYER_PADDING_TOP + idx * rowH },
        data: { node: proj, kind: "projection" },
      });
    });
    state.routes.forEach((route, idx) => {
      newNodes.push({
        id: route.uid, type: "route",
        position: route.position ?? { x: getLayerX("route"), y: LAYER_PADDING_TOP + idx * rowH },
        data: { node: route, kind: "route" },
      });
    });
    state.models.forEach((model, idx) => {
      newNodes.push({
        id: model.uid, type: "model",
        position: model.position ?? { x: getLayerX("model"), y: LAYER_PADDING_TOP + idx * rowH },
        data: { node: model, kind: "model" },
      });
    });
    state.plugins.forEach((plugin, idx) => {
      newNodes.push({
        id: plugin.uid, type: "plugin",
        position: plugin.position ?? { x: getLayerX("plugin"), y: LAYER_PADDING_TOP + idx * rowH },
        data: { node: plugin, kind: "plugin" },
      });
    });
    setRfNodes(newNodes);
  }, [state, setRfNodes]);

  // ---- Sync: router state -> ReactFlow edges ----
  // Note: onConnect also adds edges directly to rfEdges. This effect syncs on
  // router state changes (adding nodes/removing nodes/when clause edits).
  useEffect(() => {
    const edges = [];
    const sigById = {};
    state.signals.forEach((s) => { if (s.id) sigById[s.id] = s.uid; });
    const projById = {};
    state.projections.forEach((p) => { if (p.name) projById[p.name] = p.uid; });
    const modelByName = {};
    state.models.forEach((m) => { if (m.name) modelByName[m.name] = m.uid; });
    const pluginByName = {};
    state.plugins.forEach((p) => { if (p.name) pluginByName[p.name] = p.uid; });

    // Signal -> Projection edges (based on projection's inputs config)
    state.projections.forEach((proj) => {
      const inputs = proj.config?.inputs || [];
      inputs.forEach((input) => {
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

    state.routes.forEach((route) => {
      collectRefs(route.when).forEach((ref) => {
        const srcUid = ref.kind === "signal" ? sigById[ref.id] : projById[ref.id];
        if (!srcUid) return;
        edges.push({
          id: `e-${srcUid}-${route.uid}`, source: srcUid, target: route.uid,
          animated: false,
          style: { stroke: "var(--border-strong)", strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--border-strong)" },
        });
      });
      if (route.model && modelByName[route.model]) {
        edges.push({
          id: `e-${route.uid}-model-${route.model}`, source: route.uid, target: modelByName[route.model],
          animated: false,
          style: { stroke: "#10b981", strokeWidth: 1.5, strokeDasharray: "6 3" },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" },
        });
      }
      (route.plugins || []).forEach((pName) => {
        const pUid = pluginByName[pName];
        if (!pUid) return;
        edges.push({
          id: `e-${route.uid}-plugin-${pName}`, source: route.uid, target: pUid,
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
  const onConnect = useCallback((params) => {
    // Find source and target node types from rfNodes (always up-to-date)
    const srcNode = rfNodes.find((n) => n.id === params.source);
    const tgtNode = rfNodes.find((n) => n.id === params.target);

    if (!srcNode || !tgtNode) return;

    const srcType = srcNode.type;
    const tgtType = tgtNode.type;

    setState((s) => {
      // Find source and target from state
      const srcSig = s.signals.find((n) => n.uid === params.source);
      const srcProj = s.projections.find((n) => n.uid === params.source);
      const srcRoute = s.routes.find((n) => n.uid === params.source);
      const tgtSig = s.signals.find((n) => n.uid === params.target);
      const tgtProj = s.projections.find((n) => n.uid === params.target);
      const tgtRoute = s.routes.find((n) => n.uid === params.target);
      const tgtModel = s.models.find((n) => n.uid === params.target);
      const tgtPlugin = s.plugins.find((n) => n.uid === params.target);

      // Signal -> Projection: Add signal as input to projection
      if (srcSig && tgtProj) {
        const signalId = srcSig.id;
        const signalType = srcSig.type;
        return {
          ...s,
          projections: s.projections.map((p) => {
            if (p.uid !== tgtProj.uid) return p;
            // Add signal as input to the projection's config
            const inputs = p.config?.inputs || [];
            // Check if this signal is already an input
            if (inputs.some((i) => i.name === signalId)) return p;
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
          routes: s.routes.map((r) =>
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
          routes: s.routes.map((r) =>
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
          routes: s.routes.map((r) =>
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
            routes: s.routes.map((r) =>
              r.uid !== srcRoute.uid ? r : { ...r, plugins: [...(r.plugins || []), pluginType] }
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
  }, [rfNodes]);

  const onSelectionChange = useCallback(({ nodes }) => {
    setSelectedId(nodes.length === 1 ? nodes[0].id : null);
  }, []);

  // Realign all nodes to neat columns
  const onRealign = useCallback(() => {
    const realigned = getRealignedNodes(rfNodes);
    setRfNodes(realigned);
  }, [rfNodes, setRfNodes]);

  // ---- palette drag → canvas drop ----
  const onDragOver = useCallback((e) => {
    if (e.dataTransfer.types.includes(DRAG_TYPE)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);
  const onDrop = useCallback(
    (e) => {
      const payload = e.dataTransfer.getData(DRAG_TYPE);
      if (!payload) return;
      e.preventDefault();
      const position = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setState((s) => addNodeFromPayload(s, payload, position));
    },
    [flow]
  );

  // ---- mutations ----
  const updateSignal = useCallback((uid, patch) => {
    setState((s) => ({ ...s, signals: s.signals.map((sig) => (sig.uid === uid ? { ...sig, ...patch } : sig)) }));
  }, []);
  const updateProjection = useCallback((uid, patch) => {
    setState((s) => ({ ...s, projections: s.projections.map((p) => (p.uid === uid ? { ...p, ...patch } : p)) }));
  }, []);
  const updateRoute = useCallback((uid, patch) => {
    setState((s) => ({ ...s, routes: s.routes.map((r) => (r.uid === uid ? { ...r, ...patch } : r)) }));
  }, []);
  const updateModel = useCallback((uid, patch) => {
    setState((s) => ({ ...s, models: s.models.map((m) => (m.uid === uid ? { ...m, ...patch } : m)) }));
  }, []);
  const updatePlugin = useCallback((uid, patch) => {
    setState((s) => ({ ...s, plugins: s.plugins.map((p) => (p.uid === uid ? { ...p, ...patch } : p)) }));
  }, []);
  const removeNode = useCallback((uid) => {
    setState((s) => ({
      ...s,
      signals: s.signals.filter((sig) => sig.uid !== uid),
      projections: s.projections.filter((p) => p.uid !== uid),
      routes: s.routes.filter((r) => r.uid !== uid),
      models: s.models.filter((m) => m.uid !== uid),
      plugins: s.plugins.filter((p) => p.uid !== uid),
    }));
    // Also remove from RF state
    setRfNodes((ns) => ns.filter((n) => n.id !== uid));
    setRfEdges((es) => es.filter((e) => e.source !== uid && e.target !== uid));
    setSelectedId(null);
  }, [setRfNodes, setRfEdges]);

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
  const loadFromYaml = useCallback((text) => {
    const next = parseRouterYaml(text);
    next.signals = (next.signals || []).map((s, i) => ({
      ...s,
      uid: s.uid || newUid("sig"),
      position: s.position || { x: 60, y: 60 + i * 120 },
    }));
    next.projections = (next.projections || []).map((p, i) => ({
      ...p,
      uid: p.uid || newUid("proj"),
      position: p.position || { x: 420, y: 60 + i * 120 },
    }));
    next.routes = (next.routes || []).map((r, i) => ({
      ...r,
      uid: r.uid || newUid("route"),
      position: r.position || { x: 780, y: 60 + i * 140 },
    }));
    next.models = (next.models || []).map((m, i) => ({
      ...m,
      uid: m.uid || newUid("model"),
      position: m.position || { x: 1100, y: 60 + i * 120 },
    }));
    next.plugins = (next.plugins || []).map((p, i) => ({
      ...p,
      uid: p.uid || newUid("plugin"),
      position: p.position || { x: 1420, y: 60 + i * 120 },
    }));
    setState(next);
    setSelectedId(null);
  }, []);
  const onImportClick = () => fileInputRef.current?.click();
  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      loadFromYaml(await file.text());
    } catch (err) {
      setImportError(err?.message || String(err));
    } finally {
      e.target.value = "";
    }
  };
  const hasContent =
    state.signals.length > 0 || state.projections.length > 0 ||
    state.routes.length > 1 || state.models.length > 0 ||
    state.plugins.length > 0 || state.routes[0]?.model;
  const onPickTemplate = (tmpl) => {
    if (hasContent && !window.confirm(`Replace the current router with the "${tmpl.name}" template?`)) return;
    setImportError(null);
    try {
      loadFromYaml(tmpl.yaml);
    } catch (err) {
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
    for (const p of state.projections) if (p.uid === selectedId) return { kind: "projection", value: p };
    for (const r of state.routes) if (r.uid === selectedId) return { kind: "route", value: r };
    for (const m of state.models) if (m.uid === selectedId) return { kind: "model", value: m };
    for (const p of state.plugins) if (p.uid === selectedId) return { kind: "plugin", value: p };
    return null;
  }, [selectedId, state]);

  const signalIds = useMemo(() => state.signals.map((s) => s.id).filter(Boolean), [state.signals]);
  const projIds = useMemo(() => state.projections.map((p) => p.name).filter(Boolean), [state.projections]);
  const modelNames = useMemo(() => state.models.map((m) => m.name).filter(Boolean), [state.models]);
  const pluginNames = useMemo(() => state.plugins.map((p) => p.name).filter(Boolean), [state.plugins]);

  const hasNodes = allNodes.length > 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <header className="flex h-14 items-center gap-3 px-4 border-b border-border bg-card shrink-0">
        <Link
          href="/dashboard"
          aria-label="Back"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2 min-w-0">
          <input
            type="text"
            value={state.name}
            onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
            placeholder="router-name"
            className="bg-transparent outline-none text-[16px] font-semibold tracking-tight min-w-0 max-w-[280px] truncate focus:bg-secondary rounded px-1.5 -mx-1.5"
          />
          <Settings2 className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
        </div>
        <span className="inline-flex items-center rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10.5px] tracking-[0.06em] uppercase text-muted-foreground">
          Draft
        </span>
        {lint.errors.length > 0 && (
          <span
            title={lint.errors.join("\n")}
            className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10.5px] text-destructive cursor-help"
          >
            <FileWarning className="h-3 w-3" />
            {lint.errors.length} error{lint.errors.length === 1 ? "" : "s"}
          </span>
        )}
        {lint.errors.length === 0 && lint.warnings.length > 0 && (
          <span
            title={lint.warnings.join("\n")}
            className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10.5px] text-amber-600 dark:text-amber-400 cursor-help"
          >
            <AlertTriangle className="h-3 w-3" />
            {lint.warnings.length} warning{lint.warnings.length === 1 ? "" : "s"}
          </span>
        )}
        <div className="flex-1" />
        <input ref={fileInputRef} type="file" accept=".yaml,.yml,.json" onChange={onImportFile} className="hidden" />
        <button
          type="button"
          onClick={() => setShowYaml((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 h-8 text-[12.5px] transition-colors",
            showYaml ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
          title="Toggle YAML preview"
        >
          <Code2 className="h-3.5 w-3.5" />
          <span>YAML</span>
        </button>
        {connectedMode && (
          <button
            type="button"
            onClick={() => setShowCloud((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 h-8 text-[12.5px] transition-colors",
              showCloud ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
            title="Save / load routers from your Uniro account"
          >
            <Cloud className="h-3.5 w-3.5" />
            <span>Cloud</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Router settings"
        >
          <Settings className="h-4 w-4" />
        </button>
        <TemplatesMenu templates={TEMPLATES} onPick={onPickTemplate} />
        <Button variant="ghost" size="sm" onClick={onImportClick}>
          <Upload className="h-3.5 w-3.5 mr-1.5" />Import
        </Button>
        <Button variant="ghost" size="sm" onClick={onReset}>Reset</Button>
        <Button variant="outline" size="sm" onClick={onCopy}>
          {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button size="sm" onClick={onDownload}>
          <Download className="h-3.5 w-3.5 mr-1.5" />Export
        </Button>
      </header>

      {importError && (
        <div className="border-b border-destructive/30 bg-destructive/5 text-destructive px-4 py-2 text-[12.5px]">
          Import failed: {importError}
        </div>
      )}

      {/* Body: palette | canvas | properties | yaml */}
      <div className="flex flex-1 min-h-0">
        <Palette />

        <div
          ref={wrapperRef}
          className="relative flex-1 min-w-0 bg-background"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgesDelete={onEdgesDelete}
            onSelectionChange={onSelectionChange}
            onNodeDragStop={onNodeDragStop}
            connectionMode="loose"
            connectionLineStyle={{ stroke: "var(--border-strong)", strokeWidth: 2 }}
            panOnDrag={tool === "pan"}
            selectionOnDrag={tool === "select"}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{
              type: "default",
              style: { stroke: "var(--border-strong)", strokeWidth: 1.5 },
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
            <Controls
              showInteractive={false}
              className="!left-4 !bottom-20 [&_button]:!bg-card [&_button]:!border-border [&_button]:!text-muted-foreground"
            />
            <MiniMap
              pannable
              zoomable
              className="!bg-secondary !border !border-border hidden xl:block"
              nodeColor={(node) => {
                const kind = node.data?.kind;
                if (kind === "signal") return "#60a5fa";
                if (kind === "projection") return "#8b5cf6";
                if (kind === "route") return "#fbbf24";
                if (kind === "model") return "#34d399";
                if (kind === "plugin") return "#f43f5e";
                return "var(--border-strong)";
              }}
              maskColor="rgba(0,0,0,0.05)"
            />
          </ReactFlow>

          {/* Layer legend — horizontal strip below header */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-full border border-border bg-card/95 backdrop-blur-sm px-1.5 py-1 shadow-sm z-10">
            <ToolBtn active={tool === "pan"} onClick={() => setTool("pan")} icon={<Hand className="h-4 w-4" />} label="Pan" />
            <div className="w-px h-5 bg-border mx-0.5" />
            <ToolBtn active={tool === "select"} onClick={() => setTool("select")} icon={<MousePointer2 className="h-4 w-4" />} label="Select" />
            <div className="w-px h-5 bg-border mx-0.5" />
            <ToolBtn onClick={onRealign} icon={<LayoutGrid className="h-4 w-4" />} label="Realign" />
            <div className="w-px h-5 bg-border mx-0.5" />
            {LAYERS.map((l) => (
              <div key={l.key} className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium", l.headerText)}>
                <span className={cn("size-1.5 rounded-full shrink-0", l.headerDot)} />
                <span>{l.label}</span>
              </div>
            ))}
          </div>

          {!hasNodes && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="pointer-events-auto rounded-xl border border-dashed border-border bg-card/90 backdrop-blur px-5 py-4 text-center max-w-md">
                <Workflow className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                <div className="text-[13px] font-medium">Drag components from the left palette</div>
                <div className="text-[11.5px] text-muted-foreground mt-1">
                  Build a Semantic Router across 5 layers: Signal Extraction → Projection Coordination → Decision Making → Model Selection → Plugin Chain
                </div>
              </div>
            </div>
          )}
        </div>

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

        {showYaml && <YamlPreview yaml={yaml} lint={lint} onClose={() => setShowYaml(false)} />}

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
          onPatch={(p) => setState((s) => ({ ...s, ...p }))}
          onPatchPath={(key, p) => setState((s) => ({ ...s, [key]: { ...s[key], ...p } }))}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

// =====================================================================
// State helpers
// =====================================================================

function applyChangesToState(s, changes) {
  let signals = s.signals, projections = s.projections,
      routes = s.routes, models = s.models, plugins = s.plugins;
  for (const ch of changes) {
    if (ch.type === "position" && ch.position) {
      signals = signals.map((n) => n.uid === ch.id ? { ...n, position: ch.position } : n);
      projections = projections.map((n) => n.uid === ch.id ? { ...n, position: ch.position } : n);
      routes = routes.map((n) => n.uid === ch.id ? { ...n, position: ch.position } : n);
      models = models.map((n) => n.uid === ch.id ? { ...n, position: ch.position } : n);
      plugins = plugins.map((n) => n.uid === ch.id ? { ...n, position: ch.position } : n);
    } else if (ch.type === "remove") {
      signals = signals.filter((n) => n.uid !== ch.id);
      projections = projections.filter((n) => n.uid !== ch.id);
      routes = routes.filter((n) => n.uid !== ch.id);
      models = models.filter((n) => n.uid !== ch.id);
      plugins = plugins.filter((n) => n.uid !== ch.id);
    }
  }
  return { ...s, signals, projections, routes, models, plugins };
}

// Get the node type from a payload string
function getNodeTypeFromPayload(payload) {
  if (payload.startsWith("signal:")) return "signal";
  if (payload.startsWith("projection:")) return "projection";
  if (payload === "route") return "route";
  if (payload === "model") return "model";
  if (payload.startsWith("plugin:")) return "plugin";
  return null;
}

// Calculate the snapped position for a new node based on its type
function calculateSnappedPosition(nodeType, position, existingNodes) {
  const layer = getLayerByNodeType(nodeType);
  if (!layer) return position;

  // Get existing nodes of this type to calculate index
  const existingOfType = existingNodes.filter((n) => {
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

function addNodeFromPayload(s, payload, position) {
  const nodeType = getNodeTypeFromPayload(payload);
  const snappedPosition = calculateSnappedPosition(nodeType, position, []);

  if (payload.startsWith("signal:")) {
    const type = payload.slice("signal:".length);
    const spec = SIGNAL_TYPE_BY_KEY[type];
    if (!spec) return s;
    return {
      ...s,
      signals: [...s.signals, {
        uid: newUid("sig"),
        id: `${type.replace(/_/g, "_")}_${s.signals.length + 1}`,
        type,
        version: 1,
        timeout_ms: 50,
        config: {},
        position: snappedPosition,
      }],
    };
  }
  if (payload.startsWith("projection:")) {
    const type = payload.slice("projection:".length);
    const spec = PROJECTION_TYPE_BY_KEY[type];
    if (!spec) return s;
    return {
      ...s,
      projections: [...s.projections, {
        uid: newUid("proj"),
        name: `${type}_${s.projections.length + 1}`,
        type,
        config: {},
        position: snappedPosition,
      }],
    };
  }
  if (payload === "route") {
    return {
      ...s,
      routes: [...s.routes, {
        uid: newUid("route"),
        name: `route_${s.routes.length + 1}`,
        when: { kind: "always" },
        priority: 100,
        model: "",
        plugins: [],
        position: snappedPosition,
      }],
    };
  }
  if (payload === "model") {
    return {
      ...s,
      models: [...s.models, {
        uid: newUid("model"),
        name: `model_${s.models.length + 1}`,
        model_id: "",
        max_tokens: undefined,
        temperature: 0.7,
        parallel_tool_calls: undefined,
        extra_config: undefined,
        position: snappedPosition,
      }],
    };
  }
  if (payload.startsWith("plugin:")) {
    const type = payload.slice("plugin:".length);
    return {
      ...s,
      plugins: [...s.plugins, {
        uid: newUid("plugin"),
        name: `${type}_${s.plugins.length + 1}`,
        type,
        enabled: true,
        config: {},
        position: snappedPosition,
      }],
    };
  }
  return s;
}

function collectRefs(when, out = []) {
  if (!when) return out;
  if (when.kind === "leaf") {
    if (when.signalId) out.push({ kind: "signal", id: when.signalId });
    if (when.projId) out.push({ kind: "projection", id: when.projId });
  } else if (when.kind === "all" || when.kind === "any") {
    (when.children || []).forEach((c) => collectRefs(c, out));
  } else if (when.kind === "not") {
    collectRefs(when.child, out);
  }
  return out;
}

function addLeafToWhen(when, signalId, projId, sigId) {
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
function removeRefsFromWhen(when, shouldRemove) {
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
      .map((c) => removeRefsFromWhen(c, shouldRemove))
      .filter((c) => c !== null);

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

// =====================================================================
// Palette
// =====================================================================

function Palette() {
  const onDragStart = (e, payload) => {
    e.dataTransfer.setData(DRAG_TYPE, payload);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <aside className="hidden md:flex w-[240px] shrink-0 border-r border-border bg-card flex-col overflow-y-auto custom-scrollbar">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="text-[11px] uppercase tracking-[0.08em] text-subtle font-semibold">Palette</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">Drag onto canvas</div>
      </div>
      <div className="flex-1 p-2 space-y-3">

        {/* Signal Extraction */}
        <PaletteSection title="Signal Extraction">
          {SIGNAL_CATEGORIES.map((cat) => {
            const items = SIGNAL_TYPES.filter((s) => s.category === cat.key);
            if (!items.length) return null;
            return (
              <div key={cat.key}>
                <div className="px-2 py-1 text-[9.5px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">{cat.label}</div>
                {items.map((s) => {
                  const Icon = ICONS[s.icon] || Boxes;
                  return (
                    <PaletteItem
                      key={s.type}
                      onDragStart={(e) => onDragStart(e, `signal:${s.type}`)}
                      icon={Icon}
                      label={s.label}
                      description={s.summary}
                    />
                  );
                })}
              </div>
            );
          })}
        </PaletteSection>

        {/* Projection Coordination */}
        <PaletteSection title="Projection Coordination">
          {PROJECTION_CATEGORIES.map((cat) => {
            const items = PROJECTION_TYPES.filter((p) => p.category === cat.key);
            if (!items.length) return null;
            return (
              <div key={cat.key}>
                <div className="px-2 py-1 text-[9.5px] uppercase tracking-[0.08em] text-muted-foreground font-semibold">{cat.label}</div>
                {items.map((p) => (
                  <PaletteItem
                    key={p.type}
                    onDragStart={(e) => onDragStart(e, `projection:${p.type}`)}
                    icon={ICONS[p.icon] || Boxes}
                    label={p.label}
                    description={p.summary}
                  />
                ))}
              </div>
            );
          })}
        </PaletteSection>

        {/* Decision Making */}
        <PaletteSection title="Decision Making">
          <PaletteItem onDragStart={(e) => onDragStart(e, "route")} icon={Workflow} label="Route" description="Routing rule (when \u2192 model)" />
        </PaletteSection>

        {/* Model Selection */}
        <PaletteSection title="Model Selection">
          <PaletteItem onDragStart={(e) => onDragStart(e, "model")} icon={Cpu} label="Model" description="Add a model for dispatch" />
        </PaletteSection>

        {/* Plugin Chain */}
        <PaletteSection title="Plugin Chain">
          {PLUGINS.map((p) => (
            <PaletteItem
              key={p.type}
              onDragStart={(e) => onDragStart(e, `plugin:${p.type}`)}
              icon={ShieldCheck}
              label={p.label}
              description={p.summary}
            />
          ))}
        </PaletteSection>

      </div>
    </aside>
  );
}

function PaletteSection({ title, children }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] uppercase tracking-[0.08em] text-subtle font-semibold hover:bg-muted/50 transition-colors"
      >
        <span>{title}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", !isExpanded && "-rotate-90")} />
      </button>
      {isExpanded && (
        <div className="px-1 pb-2">{children}</div>
      )}
    </div>
  );
}

function PaletteItem({ onDragStart, icon: Icon, label, description }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing hover:bg-secondary mb-px"
      title={description}
    >
      <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[11.5px] font-medium truncate">{label}</div>
        <div className="text-[10px] text-muted-foreground truncate">{description}</div>
      </div>
    </div>
  );
}

function ToolBtn({ active, onClick, icon, label, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
      )}
    >
      {icon}
    </button>
  );
}

// =====================================================================
// Node renderers
// =====================================================================

const CARD_BASE = "rounded-xl border bg-card min-w-[160px] max-w-[200px] transition-colors shadow-sm";

// =====================================================================
// Node type definitions (MUST be outside component per React Flow docs)
// =====================================================================

function NodeBadge({ children, className }) {
  return <span className={cn("rounded-md px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide", className)}>{children}</span>;
}

function NodeHandle({ type, side, color = "var(--primary)" }) {
  return (
    <Handle
      type={side === "source" ? "source" : "target"}
      position={side === "source" ? Position.Right : Position.Left}
      className="!border-card !w-2.5 !h-2.5"
      style={{ background: color, borderColor: color }}
    />
  );
}

function SignalNodeRenderer({ data, selected }) {
  const sig = data.node;
  const spec = SIGNAL_TYPE_BY_KEY[sig.type];
  const Icon = ICONS[spec?.icon] || Boxes;
  return (
    <div className={cn(CARD_BASE, selected ? "border-blue-400 ring-2 ring-blue-400/20" : "border-border")}>
      <NodeHandle type="target" side="target" color="#60a5fa" />
      <div className="px-3 py-2.5 flex items-start gap-2.5">
        <div className="size-8 rounded-lg grid place-items-center shrink-0 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <NodeBadge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 mb-1">Signal</NodeBadge>
          <div className="text-[10px] text-muted-foreground">{spec?.label || sig.type}</div>
          <div className="text-[12px] font-semibold font-mono truncate mt-0.5">{sig.id || "(no id)"}</div>
        </div>
      </div>
      <NodeHandle type="source" side="source" color="#60a5fa" />
    </div>
  );
}

function ProjectionNodeRenderer({ data, selected }) {
  const proj = data.node;
  const spec = PROJECTION_TYPE_BY_KEY[proj.type];
  const Icon = ICONS[spec?.icon] || Boxes;
  return (
    <div className={cn(CARD_BASE, selected ? "border-violet-400 ring-2 ring-violet-400/20" : "border-border")}>
      <NodeHandle type="target" side="target" color="#8b5cf6" />
      <div className="px-3 py-2.5 flex items-start gap-2.5">
        <div className="size-8 rounded-lg grid place-items-center shrink-0 bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-300">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <NodeBadge className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 mb-1">Projection</NodeBadge>
          <div className="text-[10px] text-muted-foreground">{spec?.label || proj.type}</div>
          <div className="text-[12px] font-semibold font-mono truncate mt-0.5">{proj.name || "(no name)"}</div>
        </div>
      </div>
      <NodeHandle type="source" side="source" color="#8b5cf6" />
    </div>
  );
}

function RouteNodeRenderer({ data, selected }) {
  const route = data.node;
  const isAlways = route.when?.kind === "always";
  return (
    <div className={cn(CARD_BASE, selected ? "border-amber-400 ring-2 ring-amber-400/20" : "border-border")}>
      <NodeHandle type="target" side="target" color="#fbbf24" />
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2.5 mb-1.5">
          <div className="size-8 rounded-lg grid place-items-center shrink-0 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-300">
            <Workflow className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <NodeBadge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Route</NodeBadge>
              {isAlways && (
                <NodeBadge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">always</NodeBadge>
              )}
            </div>
            <div className="text-[12px] font-semibold font-mono truncate mt-0.5">{route.name || "(unnamed)"}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">p{route.priority ?? 0}</div>
          </div>
        </div>
        {route.model && (
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono truncate pl-10">
            \u2192 {route.model}
          </div>
        )}
        {route.plugins?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 pl-10">
            {route.plugins.slice(0, 3).map((p) => (
              <span key={p} className="rounded bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-300 px-1 py-px text-[9px] font-mono">{p}</span>
            ))}
            {route.plugins.length > 3 && (
              <span className="text-[9px] text-muted-foreground">+{route.plugins.length - 3}</span>
            )}
          </div>
        )}
      </div>
      <NodeHandle type="source" side="source" color="#fbbf24" />
    </div>
  );
}

function ModelNodeRenderer({ data, selected }) {
  const model = data.node;
  return (
    <div className={cn(CARD_BASE, selected ? "border-emerald-400 ring-2 ring-emerald-400/20" : "border-border")}>
      <NodeHandle type="target" side="target" color="#34d399" />
      <div className="px-3 py-2.5 flex items-start gap-2.5">
        <div className="size-8 rounded-lg grid place-items-center shrink-0 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300">
          <Cpu className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <NodeBadge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 mb-1">Model</NodeBadge>
          <div className="text-[12px] font-semibold font-mono truncate">{model.name || "(no name)"}</div>
          {model.model_id && (
            <div className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">{model.model_id}</div>
          )}
          {(model.max_tokens || model.temperature !== undefined) && (
            <div className="flex gap-2 mt-1">
              {model.max_tokens && <span className="text-[9.5px] text-muted-foreground">max: {model.max_tokens}</span>}
              {model.temperature !== undefined && <span className="text-[9.5px] text-muted-foreground">t: {model.temperature}</span>}
            </div>
          )}
        </div>
      </div>
      <NodeHandle type="source" side="source" color="#34d399" />
    </div>
  );
}

function PluginNodeRenderer({ data, selected }) {
  const plugin = data.node;
  const spec = PLUGIN_BY_TYPE[plugin.type];
  return (
    <div className={cn(CARD_BASE, selected ? "border-rose-400 ring-2 ring-rose-400/20" : "border-border")}>
      <NodeHandle type="target" side="target" color="#f43f5e" />
      <div className="px-3 py-2.5 flex items-start gap-2.5">
        <div className="size-8 rounded-lg grid place-items-center shrink-0 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <NodeBadge className="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">Plugin</NodeBadge>
            {plugin.enabled === false && (
              <NodeBadge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">off</NodeBadge>
            )}
          </div>
          <div className="text-[11px] font-semibold">{spec?.label || plugin.type}</div>
          <div className="text-[10px] text-muted-foreground font-mono truncate">{plugin.name || "(no name)"}</div>
        </div>
      </div>
      <NodeHandle type="source" side="source" color="#f43f5e" />
    </div>
  );
}

// Static nodeTypes object - defined outside component per React Flow recommendations
const nodeTypes = {
  signal: SignalNodeRenderer,
  projection: ProjectionNodeRenderer,
  route: RouteNodeRenderer,
  model: ModelNodeRenderer,
  plugin: PluginNodeRenderer,
};

// =====================================================================
// Custom Edge with delete button
// =====================================================================
function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data,
}) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const [isHovered, setIsHovered] = useState(false);

  const onDelete = () => {
    // Trigger edge deletion through the onEdgesDelete callback
    const event = new CustomEvent("deleteEdge", { detail: { edgeId: id } });
    window.dispatchEvent(event);
  };

  return (
    <>
      {/* Use a transparent wider path for better hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: "pointer" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      {/* Visible edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected || isHovered ? 3 : 1.5,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <button
            onClick={onDelete}
            className={cn(
              "h-5 w-5 rounded-full flex items-center justify-center transition-all",
              "bg-background border border-border shadow-sm",
              "hover:bg-destructive hover:border-destructive hover:text-destructive-foreground",
              (selected || isHovered) ? "opacity-100" : "opacity-0"
            )}
            title="Delete connection"
          >
            <XCircle className="h-3.5 w-3.5" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

// Edge types with the deletable edge
const edgeTypes = {
  default: DeletableEdge,
};

// =====================================================================
// Properties panel
// =====================================================================

function PropertiesPanel({
  node, signalIds, projIds, modelNames, pluginNames, routes,
  onClose, onUpdateSignal, onUpdateProjection, onUpdateRoute,
  onUpdateModel, onUpdatePlugin, onRemove,
}) {
  return (
    <aside className="hidden lg:flex w-[340px] shrink-0 flex-col border-l border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
        <div className="text-sm font-semibold flex-1 capitalize">{node.kind}</div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
        {node.kind === "signal" && (
          <SignalEditor signal={node.value} onUpdate={(p) => onUpdateSignal(node.value.uid, p)} />
        )}
        {node.kind === "projection" && (
          <ProjectionEditor proj={node.value} onUpdate={(p) => onUpdateProjection(node.value.uid, p)} signalIds={signalIds} />
        )}
        {node.kind === "route" && (
          <RouteEditor
            route={node.value}
            signalIds={signalIds}
            projIds={projIds}
            modelNames={modelNames}
            pluginNames={pluginNames}
            routes={routes}
            onUpdate={(p) => onUpdateRoute(node.value.uid, p)}
          />
        )}
        {node.kind === "model" && (
          <ModelEditor model={node.value} onUpdate={(p) => onUpdateModel(node.value.uid, p)} />
        )}
        {node.kind === "plugin" && (
          <PluginEditor plugin={node.value} onUpdate={(p) => onUpdatePlugin(node.value.uid, p)} />
        )}
        <button
          type="button"
          onClick={() => onRemove(node.value.uid)}
          className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg text-[12.5px] text-destructive hover:bg-destructive/10 transition-colors border border-transparent hover:border-destructive/30 mt-2"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete node
        </button>
      </div>
    </aside>
  );
}

function SignalEditor({ signal, onUpdate }) {
  const spec = SIGNAL_TYPE_BY_KEY[signal.type];
  const setConfig = (key, value) =>
    onUpdate({ config: { ...(signal.config || {}), [key]: value } });
  return (
    <>
      <Field label="ID" required>
        <TextInput value={signal.id} onChange={(v) => onUpdate({ id: v })} mono />
      </Field>
      <Field label="Type" required>
        <SelectInput
          value={signal.type}
          onChange={(v) => onUpdate({ type: v, config: {} })}
          options={SIGNAL_TYPES.map((s) => ({ value: s.type, label: s.label }))}
        />
      </Field>
      {spec?.summary && <div className="text-[11.5px] text-muted-foreground -mt-1">{spec.summary}</div>}
      <Field label="Timeout (ms)">
        <TextInput type="number" value={signal.timeout_ms ?? 50} onChange={(v) => onUpdate({ timeout_ms: Number(v) })} />
      </Field>
      {spec?.fields?.length > 0 && (
        <>
          <SectionLabel>Config</SectionLabel>
          {spec.fields.map((field) => (
            <ConfigField key={field.key} field={field} value={signal.config?.[field.key]} onChange={(v) => setConfig(field.key, v)} />
          ))}
        </>
      )}
    </>
  );
}

function ProjectionEditor({ proj, onUpdate, signalIds }) {
  const spec = PROJECTION_TYPE_BY_KEY[proj.type];
  const setConfig = (key, value) =>
    onUpdate({ config: { ...(proj.config || {}), [key]: value } });
  const inputs = proj.config?.inputs || [];
  const availableSignals = signalIds.filter((sid) => !inputs.some((i) => i.name === sid));
  return (
    <>
      <Field label="Name" required>
        <TextInput value={proj.name} onChange={(v) => onUpdate({ name: v })} mono />
      </Field>
      <Field label="Type" required>
        <SelectInput
          value={proj.type}
          onChange={(v) => onUpdate({ type: v, config: {} })}
          options={PROJECTION_TYPES.map((p) => ({ value: p.type, label: p.label }))}
        />
      </Field>
      {spec?.summary && <div className="text-[11.5px] text-muted-foreground -mt-1">{spec.summary}</div>}

      {/* Signal Inputs Section */}
      <SectionLabel>Signal Inputs</SectionLabel>
      {inputs.length === 0 && (
        <div className="text-[11px] text-muted-foreground italic">
          Connect signals from Layer 1 to this projection, or add manually below
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {inputs.map((input, idx) => (
          <div key={idx} className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-700 px-2 py-0.5 text-[11px] text-blue-700 dark:text-blue-300">
            <span className="font-mono">{input.name}</span>
            <button
              type="button"
              onClick={() => {
                const newInputs = inputs.filter((_, i) => i !== idx);
                setConfig("inputs", newInputs);
              }}
              className="ml-0.5 text-blue-500 hover:text-blue-700 dark:hover:text-blue-200"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      {availableSignals.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] text-muted-foreground mb-1">Add connected signal:</div>
          <div className="flex flex-wrap gap-1">
            {availableSignals.map((sid) => (
              <button
                key={sid}
                type="button"
                onClick={() => {
                  const sig = signalIds.includes(sid) && proj; // Find signal type
                  setConfig("inputs", [...inputs, { type: "signal", name: sid }]);
                }}
                className="inline-flex items-center gap-1 rounded border border-dashed border-blue-300 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-700 px-2 py-0.5 text-[10.5px] text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                <Plus className="h-3 w-3" /> {sid}
              </button>
            ))}
          </div>
        </div>
      )}

      {spec?.fields?.length > 0 && (
        <>
          <SectionLabel>Config</SectionLabel>
          {spec.fields.map((field) => (
            <ConfigField key={field.key} field={field} value={proj.config?.[field.key]} onChange={(v) => setConfig(field.key, v)} />
          ))}
        </>
      )}
    </>
  );
}

function RouteEditor({ route, signalIds, projIds, modelNames, pluginNames, routes, onUpdate }) {
  const togglePlugin = (name) => {
    const has = route.plugins?.includes(name);
    onUpdate({ plugins: has ? route.plugins.filter((p) => p !== name) : [...(route.plugins || []), name] });
  };
  return (
    <>
      <Field label="Name" required>
        <TextInput value={route.name} onChange={(v) => onUpdate({ name: v })} mono />
      </Field>
      <FormRow>
        <Field label="Priority" hint="Higher wins">
          <TextInput type="number" value={route.priority ?? 0} onChange={(v) => onUpdate({ priority: Number(v) || 0 })} />
        </Field>
        <Field label="Model">
          <SelectInput
            value={route.model || ""}
            onChange={(v) => onUpdate({ model: v })}
            options={[{ value: "", label: "(none)" }, ...modelNames.map((n) => ({ value: n, label: n }))]}
          />
        </Field>
      </FormRow>
      <SectionLabel>Plugins on this route</SectionLabel>
      <div className="flex flex-wrap gap-1.5 -mt-1">
        {PLUGINS.map((p) => {
          const active = route.plugins?.includes(p.type);
          return (
            <button
              key={p.type}
              type="button"
              onClick={() => togglePlugin(p.type)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition-colors font-medium",
                active ? "border-rose-400 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-300" : "border-border bg-card text-muted-foreground hover:bg-secondary"
              )}
            >
              {active && <Check className="h-3 w-3" />}
              {p.label}
            </button>
          );
        })}
      </div>
      <SectionLabel>When</SectionLabel>
      <WhenEditor
        value={route.when}
        signalIds={signalIds}
        projIds={projIds}
        onChange={(when) => onUpdate({ when })}
      />
    </>
  );
}

function ModelEditor({ model, onUpdate }) {
  return (
    <>
      <Field label="Name" required>
        <TextInput value={model.name} onChange={(v) => onUpdate({ name: v })} mono />
      </Field>
      <Field label="Model ID">
        <TextInput value={model.model_id} onChange={(v) => onUpdate({ model_id: v })} placeholder="claude-sonnet-4-6" mono />
      </Field>
      <FormRow>
        <Field label="Max tokens">
          <TextInput type="number" value={model.max_tokens ?? ""} onChange={(v) => onUpdate({ max_tokens: v === "" ? undefined : Number(v) })} placeholder="4096" />
        </Field>
        <Field label="Temperature">
          <TextInput type="number" step="0.1" value={model.temperature ?? 0.7} onChange={(v) => onUpdate({ temperature: v === "" ? 0.7 : Number(v) })} placeholder="0.7" />
        </Field>
      </FormRow>
      <Field label="Parallel tool calls">
        <SelectInput
          value={String(model.parallel_tool_calls ?? "")}
          onChange={(v) => onUpdate({ parallel_tool_calls: v === "" ? undefined : v === "true" })}
          options={[{ value: "", label: "(default)" }, { value: "true", label: "true" }, { value: "false", label: "false" }]}
        />
      </Field>
      <SectionLabel>Extra config (YAML)</SectionLabel>
      <textarea
        value={model.extra_config || ""}
        onChange={(e) => onUpdate({ extra_config: e.target.value })}
        rows={4}
        placeholder="top_p: 0.9\npresence_penalty: 0.1"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px] font-mono resize-y"
      />
    </>
  );
}

function PluginEditor({ plugin, onUpdate }) {
  return (
    <>
      <Field label="Name" required>
        <TextInput value={plugin.name} onChange={(v) => onUpdate({ name: v })} mono />
      </Field>
      <Field label="Type" required>
        <SelectInput
          value={plugin.type}
          onChange={(v) => onUpdate({ type: v })}
          options={PLUGINS.map((p) => ({ value: p.type, label: p.label }))}
        />
      </Field>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
        <input
          type="checkbox"
          checked={plugin.enabled !== false}
          onChange={(e) => onUpdate({ enabled: e.target.checked })}
          className="h-4 w-4"
        />
        <div>
          <div className="text-[13px] font-medium">Enabled</div>
          <div className="text-[11px] text-muted-foreground">Disable to bypass this plugin</div>
        </div>
      </div>
      <SectionLabel>Plugin config (YAML)</SectionLabel>
      <textarea
        value={plugin.config ? JSON.stringify(plugin.config, null, 2) : ""}
        onChange={(e) => {
          try {
            onUpdate({ config: e.target.value ? JSON.parse(e.target.value) : {} });
          } catch {
            // ignore invalid JSON while typing
          }
        }}
        rows={4}
        placeholder="{}"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px] font-mono resize-y"
      />
    </>
  );
}

function ConfigField({ field, value, onChange }) {
  switch (field.kind) {
    case "bool":
      return (
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
          <span className="text-[12.5px]">{field.label}</span>
        </label>
      );
    case "number":
      return (
        <Field label={field.label} hint={field.help}>
          <TextInput type="number" value={value ?? ""} onChange={(v) => onChange(v === "" ? "" : Number(v))} placeholder={field.default !== undefined ? String(field.default) : undefined} />
        </Field>
      );
    case "select":
      return (
        <Field label={field.label} hint={field.help}>
          <SelectInput value={value ?? field.default ?? ""} onChange={onChange} options={field.options} />
        </Field>
      );
    case "string-list":
      return (
        <Field label={field.label} hint={field.help || "Comma- or newline-separated."}>
          <TextInput value={Array.isArray(value) ? value.join(", ") : value ?? ""} onChange={onChange} placeholder={field.placeholder} mono />
        </Field>
      );
    case "yaml":
      return (
        <Field label={field.label} hint={field.help || "Raw YAML."}>
          <textarea
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            rows={5}
            placeholder={field.placeholder}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px] font-mono resize-y"
          />
        </Field>
      );
    case "string":
    default:
      return (
        <Field label={field.label} hint={field.help}>
          <TextInput value={value ?? ""} onChange={onChange} placeholder={field.placeholder || (field.default ? String(field.default) : "")} mono={field.key !== "language"} />
        </Field>
      );
  }
}

// =====================================================================
// YAML preview drawer
// =====================================================================

function YamlPreview({ yaml, lint, onClose }) {
  return (
    <aside className="hidden md:flex w-[380px] xl:w-[440px] shrink-0 flex-col bg-secondary/30 border-l border-border">
      <div className="px-3 py-2.5 border-b border-border flex items-center gap-2 bg-card shrink-0">
        <Code2 className="h-4 w-4 text-muted-foreground" />
        <div className="text-[12px] font-semibold">router.yaml</div>
        <span className="text-[11px] text-muted-foreground">live preview</span>
        <div className="flex-1" />
        <button type="button" onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <pre className="flex-1 overflow-auto custom-scrollbar p-4 m-0 text-[12px] leading-[1.55] font-mono whitespace-pre">{yaml}</pre>
      {(lint.errors.length > 0 || lint.warnings.length > 0) && (
        <div className="border-t border-border bg-card px-3 py-2 text-[11.5px] space-y-0.5 max-h-[180px] overflow-auto custom-scrollbar shrink-0">
          {lint.errors.map((e, i) => (
            <div key={`e-${i}`} className="text-destructive flex items-start gap-1.5">
              <FileWarning className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{e}</span>
            </div>
          ))}
          {lint.warnings.map((w, i) => (
            <div key={`w-${i}`} className="text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

// =====================================================================
// Settings drawer
// =====================================================================

function SettingsDrawer({ state, onPatch, onPatchPath, onClose }) {
  const setFallback = (text) => {
    const arr = text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    onPatchPath("defaults", { fallback_chain: arr });
  };
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <aside className="w-full max-w-md bg-card border-l border-border flex flex-col overflow-hidden">
        <div className="px-4 h-14 shrink-0 flex items-center gap-2 border-b border-border">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm font-semibold flex-1">Router settings</div>
          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
          <SectionLabel>Metadata</SectionLabel>
          <Field label="Name" required>
            <TextInput value={state.name} onChange={(v) => onPatch({ name: v })} mono />
          </Field>
          <Field label="Description">
            <textarea
              value={state.description}
              onChange={(e) => onPatch({ description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-y"
            />
          </Field>
          <FormRow>
            <Field label="Version">
              <TextInput type="number" value={state.version} onChange={(v) => onPatch({ version: Number(v) || 1 })} />
            </Field>
            <Field label="Schema version">
              <TextInput type="number" value={state.schema_version} onChange={(v) => onPatch({ schema_version: Number(v) || 1 })} />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="Created at">
              <TextInput value={state.created_at} onChange={(v) => onPatch({ created_at: v })} placeholder="2026-05-12T00:00:00Z" mono />
            </Field>
            <Field label="Created by method">
              <SelectInput value={state.created_by_method} onChange={(v) => onPatch({ created_by_method: v })} options={CREATED_BY_METHOD} />
            </Field>
          </FormRow>
          <Field label="Created by">
            <TextInput value={state.created_by} onChange={(v) => onPatch({ created_by: v })} placeholder="alice@example.com" />
          </Field>

          <SectionLabel>Defaults</SectionLabel>
          <FormRow>
            <Field label="Alpha">
              <TextInput type="number" value={state.defaults.alpha} onChange={(v) => onPatchPath("defaults", { alpha: Number(v) })} />
            </Field>
            <Field label="On no match">
              <SelectInput value={state.defaults.on_no_match} onChange={(v) => onPatchPath("defaults", { on_no_match: v })} options={ON_NO_MATCH} />
            </Field>
          </FormRow>
          <Field label="Fallback chain" hint="Comma-separated list of model IDs.">
            <TextInput value={state.defaults.fallback_chain.join(", ")} onChange={setFallback} placeholder="claude-haiku-4-5, gemini-2.5-flash" mono />
          </Field>

          <SectionLabel>Guardrails</SectionLabel>
          <FormRow>
            <Field label="Daily cost cap (USD)" hint="Attaches cost_cap to every route.">
              <TextInput type="number" value={state.guardrails.daily_cost_cap_usd ?? ""} onChange={(v) => onPatchPath("guardrails", { daily_cost_cap_usd: v === "" ? null : Number(v) })} placeholder="50" />
            </Field>
            <Field label="Max model cost ($/M)" hint="Validate-time cap.">
              <TextInput type="number" value={state.guardrails.max_model_cost_usd_per_m ?? ""} onChange={(v) => onPatchPath("guardrails", { max_model_cost_usd_per_m: v === "" ? null : Number(v) })} placeholder="30" />
            </Field>
          </FormRow>
          <Field label="Forbidden models" hint="Comma-separated.">
            <TextInput value={(state.guardrails.forbidden_models || []).join(", ")} onChange={(v) => onPatchPath("guardrails", { forbidden_models: v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean) })} mono />
          </Field>
          <BoolField label="Block outbound PII" hint="Validator errors if a route lacks pii_redact." value={state.guardrails.pii_block_outbound} onChange={(v) => onPatchPath("guardrails", { pii_block_outbound: v })} />

          <SectionLabel>Observability</SectionLabel>
          <BoolField label="Log decisions" hint="Write every decision to audit.jsonl." value={state.observability.log_decisions} onChange={(v) => onPatchPath("observability", { log_decisions: v })} />
          <BoolField label="Shadow mode" hint="Run parallel to the operator default for A/B." value={state.observability.shadow} onChange={(v) => onPatchPath("observability", { shadow: v })} />
        </div>
      </aside>
    </div>
  );
}

// =====================================================================
// Primitives
// =====================================================================

function SectionLabel({ children }) {
  return (
    <div className="text-[10.5px] uppercase tracking-[0.08em] text-subtle font-semibold border-t border-border pt-3 mt-1">
      {children}
    </div>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[10.5px] uppercase tracking-[0.08em] text-subtle font-semibold flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </span>
      {children}
      {hint && <span className="text-[10.5px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

function FormRow({ children }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function TextInput({ value, onChange, placeholder, type = "text", mono = false }) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn("w-full h-9 rounded-lg border border-border bg-background px-3 text-sm", mono && "font-mono")}
    />
  );
}

function SelectInput({ value, onChange, options }) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-sm">
      {opts.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function BoolField({ label, hint, value, onChange }) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 cursor-pointer">
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium">{label}</div>
        {hint && <div className="text-[11.5px] text-muted-foreground mt-0.5">{hint}</div>}
      </div>
    </label>
  );
}

function TemplatesMenu({ templates, onPick }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDocClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
        <FileText className="h-3.5 w-3.5 mr-1.5" />Templates
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-[320px] rounded-lg border border-border bg-card shadow-lg p-1">
          <div className="px-2.5 py-1.5 text-[10.5px] uppercase tracking-[0.08em] text-subtle font-semibold">
            Start from a template
          </div>
          {templates.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => { setOpen(false); onPick(t); }}
              className="w-full text-left rounded-md px-2.5 py-2 hover:bg-secondary transition-colors"
            >
              <div className="text-[12.5px] font-medium">{t.name}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-3">{t.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
