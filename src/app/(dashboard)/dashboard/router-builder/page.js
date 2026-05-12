"use client";

// Router builder prototype. Drag nodes from the left palette onto the
// canvas, wire them up with React Flow, edit properties on the right.
// This is a UI prototype — there's no save/publish backend yet; the
// "Publish" button just resets the canvas for now.

import { useCallback, useMemo, useRef, useState } from "react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Boxes,
  Check,
  ChevronLeft,
  Hand,
  MoreHorizontal,
  MousePointer2,
  Network,
  Pencil,
  Play,
  Redo2,
  Settings,
  ShieldCheck,
  Trash2,
  Undo2,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";

const DRAG_TYPE = "application/x-uniro-node";

// Catalog of node kinds the builder knows about.
const CATALOG = [
  {
    section: "Inputs",
    items: [
      { kind: "start",   label: "Start",   icon: Play,        description: "Entry point" },
    ],
  },
  {
    section: "Routing",
    items: [
      { kind: "model",     label: "Model",     icon: Boxes,     description: "Single provider call" },
      { kind: "combo",     label: "Combo",     icon: Network,   description: "Weighted fallback chain" },
      { kind: "condition", label: "Condition", icon: Workflow,  description: "Branch on prompt content" },
    ],
  },
  {
    section: "Guards",
    items: [
      { kind: "rate-limit", label: "Rate limit",  icon: ShieldCheck, description: "Per-user request cap" },
      { kind: "moderation", label: "Moderation",  icon: ShieldCheck, description: "Block flagged prompts" },
    ],
  },
  {
    section: "Outputs",
    items: [
      { kind: "respond",   label: "Respond",   icon: Check, description: "Return reply to caller" },
    ],
  },
];
const CATALOG_BY_KIND = Object.fromEntries(
  CATALOG.flatMap((s) => s.items).map((it) => [it.kind, it])
);

const FLOW_NODE_TYPE = "uniroNode";

// Default seed: a single Start node.
const SEED_NODES = [
  {
    id: "start",
    type: FLOW_NODE_TYPE,
    position: { x: 80, y: 220 },
    data: { kind: "start", name: "Entry" },
    deletable: false,
  },
];

export default function RouterBuilderPage() {
  return (
    <ReactFlowProvider>
      <Builder />
    </ReactFlowProvider>
  );
}

function Builder() {
  const [title, setTitle] = useState("Untitled router");
  const [nodes, setNodes] = useState(SEED_NODES);
  const [edges, setEdges] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [tool, setTool] = useState("select");
  const wrapperRef = useRef(null);
  const idRef = useRef(1);
  const flow = useReactFlow();

  const onNodesChange = useCallback(
    (changes) => setNodes((ns) => applyNodeChanges(changes, ns)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((es) => applyEdgeChanges(changes, es)),
    []
  );
  const onConnect = useCallback(
    (params) => setEdges((es) => addEdge({ ...params, animated: false }, es)),
    []
  );
  const onSelectionChange = useCallback(
    ({ nodes: sel }) => setSelectedId(sel.length === 1 ? sel[0].id : null),
    []
  );

  // ---- palette drag -> canvas drop ----
  const onDragOver = useCallback((e) => {
    if (e.dataTransfer.types.includes(DRAG_TYPE)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  }, []);
  const onDrop = useCallback(
    (e) => {
      const kind = e.dataTransfer.getData(DRAG_TYPE);
      if (!kind || !CATALOG_BY_KIND[kind]) return;
      e.preventDefault();
      const position = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const id = `n-${idRef.current++}`;
      setNodes((ns) => [
        ...ns,
        {
          id,
          type: FLOW_NODE_TYPE,
          position,
          data: { kind, name: CATALOG_BY_KIND[kind].label },
        },
      ]);
    },
    [flow]
  );

  // ---- properties panel writes ----
  const onNodePatch = useCallback((id, patch) => {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
  }, []);
  const onNodeDelete = useCallback((id) => {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    setSelectedId(null);
  }, []);

  const selectedNode = useMemo(
    () => (selectedId ? nodes.find((n) => n.id === selectedId) ?? null : null),
    [nodes, selectedId]
  );

  const nodeTypes = useMemo(() => ({ [FLOW_NODE_TYPE]: UniroNode }), []);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <header className="flex h-14 items-center gap-3 px-4 border-b border-border bg-card">
        <Link
          href="/dashboard"
          aria-label="Back"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-transparent outline-none text-[16px] font-semibold tracking-tight min-w-0 max-w-[280px] truncate focus:bg-secondary rounded px-1.5 -mx-1.5 brand-mark"
        />
        <span className="ml-1 inline-flex items-center rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10.5px] tracking-[0.06em] uppercase text-muted-foreground">
          Draft
        </span>
        <div className="flex-1" />
        <button type="button" aria-label="More" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <MoreHorizontal className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Settings" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <Settings className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-1.5 rounded-lg px-3 h-8 text-[12.5px] text-muted-foreground cursor-not-allowed"
          title="Evaluate (coming soon)"
        >
          <Play className="h-3.5 w-3.5" />
          <span>Evaluate</span>
        </button>
        <Button size="sm">Publish</Button>
      </header>

      {/* Body: palette | canvas | properties */}
      <div className="flex flex-1 min-h-0">
        <Palette />

        <div
          ref={wrapperRef}
          className="relative flex-1 min-w-0 bg-background"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            panOnDrag={tool === "pan"}
            selectionOnDrag={tool === "select"}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{
              type: "smoothstep",
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
              className="!bg-secondary !border !border-border hidden lg:block"
              nodeColor="var(--border-strong)"
              maskColor="rgba(0,0,0,0.05)"
            />
          </ReactFlow>

          {/* Floating bottom toolbar */}
          <div className="absolute left-1/2 bottom-5 -translate-x-1/2 flex items-center gap-0.5 rounded-full border border-border bg-card px-1.5 py-1">
            <ToolBtn active={tool === "pan"} onClick={() => setTool("pan")} icon={<Hand className="h-4 w-4" />} label="Pan" />
            <ToolBtn active={tool === "select"} onClick={() => setTool("select")} icon={<MousePointer2 className="h-4 w-4" />} label="Select" />
            <span className="w-px h-5 bg-border mx-1" />
            <ToolBtn disabled icon={<Undo2 className="h-4 w-4" />} label="Undo" />
            <ToolBtn disabled icon={<Redo2 className="h-4 w-4" />} label="Redo" />
          </div>
        </div>

        {selectedNode && (
          <PropertiesPanel
            node={selectedNode}
            onClose={() => setSelectedId(null)}
            onChange={onNodePatch}
            onDelete={onNodeDelete}
          />
        )}
      </div>
    </div>
  );
}

function Palette() {
  const onDragStart = (e, kind) => {
    e.dataTransfer.setData(DRAG_TYPE, kind);
    e.dataTransfer.effectAllowed = "move";
  };
  return (
    <aside className="hidden md:flex w-[208px] shrink-0 border-r border-border bg-card flex-col">
      <div className="px-4 py-3 border-b border-border">
        <div className="text-[11px] uppercase tracking-[0.08em] text-subtle font-semibold">Nodes</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">Drag onto canvas</div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {CATALOG.map((section) => (
          <div key={section.section} className="mb-3">
            <div className="px-2 pb-1 text-[10px] uppercase tracking-[0.08em] text-subtle font-semibold">
              {section.section}
            </div>
            {section.items.map((it) => {
              const Icon = it.icon;
              return (
                <div
                  key={it.kind}
                  draggable
                  onDragStart={(e) => onDragStart(e, it.kind)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-secondary mb-px"
                  title={it.description}
                >
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium truncate">{it.label}</div>
                    <div className="text-[10.5px] text-muted-foreground truncate">{it.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
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
        active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
      )}
    >
      {icon}
    </button>
  );
}

// Node renderer used by React Flow.
function UniroNode({ data, selected, id }) {
  const entry = CATALOG_BY_KIND[data.kind];
  const Icon = entry?.icon || Boxes;
  const isStart = data.kind === "start";
  const isRespond = data.kind === "respond";

  return (
    <div
      className={cn(
        "rounded-lg border bg-card min-w-[180px] transition-colors",
        selected ? "border-primary" : "border-border"
      )}
    >
      {!isStart && <Handle type="target" position={Position.Left} className="!bg-primary !border-card !w-2.5 !h-2.5" />}
      <div className="px-3 py-2 flex items-center gap-2">
        <div
          className="size-7 rounded-md grid place-items-center shrink-0"
          style={{ background: "var(--color-brand-50)", color: "var(--primary)" }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.08em] text-subtle font-semibold">{entry?.label || data.kind}</div>
          <div className="text-[12.5px] font-medium truncate">{data.name || entry?.label || "Node"}</div>
        </div>
      </div>
      {!isRespond && <Handle type="source" position={Position.Right} className="!bg-primary !border-card !w-2.5 !h-2.5" />}
    </div>
  );
}

function PropertiesPanel({ node, onClose, onChange, onDelete }) {
  const entry = CATALOG_BY_KIND[node.data.kind];
  const Icon = entry?.icon || Pencil;

  return (
    <aside className="hidden lg:flex w-[280px] shrink-0 flex-col border-l border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <div className="text-sm font-semibold flex-1">{entry?.label || node.data.kind}</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close properties"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
        >
          <ChevronLeft className="h-4 w-4 rotate-180" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
        <Field label="Name">
          <input
            type="text"
            value={node.data.name || ""}
            onChange={(e) => onChange(node.id, { name: e.target.value })}
            placeholder={entry?.label || "Node name"}
            className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
          />
        </Field>

        {node.data.kind === "model" && (
          <Field label="Model">
            <input
              type="text"
              value={node.data.model || ""}
              onChange={(e) => onChange(node.id, { model: e.target.value })}
              placeholder="gemini-2.5-flash"
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm mono"
            />
          </Field>
        )}

        {node.data.kind === "combo" && (
          <Field label="Combo name">
            <input
              type="text"
              value={node.data.combo || ""}
              onChange={(e) => onChange(node.id, { combo: e.target.value })}
              placeholder="my-fallback-chain"
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm mono"
            />
          </Field>
        )}

        {node.data.kind === "condition" && (
          <Field label="Match prompt contains">
            <input
              type="text"
              value={node.data.match || ""}
              onChange={(e) => onChange(node.id, { match: e.target.value })}
              placeholder="e.g. ```code"
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
        )}

        {node.data.kind === "rate-limit" && (
          <Field label="Requests / min per user">
            <input
              type="number"
              value={node.data.rpm ?? 60}
              onChange={(e) => onChange(node.id, { rpm: Number(e.target.value) })}
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
        )}

        <Field label="Notes">
          <textarea
            value={node.data.note || ""}
            onChange={(e) => onChange(node.id, { note: e.target.value })}
            placeholder="Anything to remember about this step"
            rows={4}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
          />
        </Field>

        {node.deletable !== false && (
          <button
            type="button"
            onClick={() => onDelete(node.id)}
            className="inline-flex items-center justify-center gap-1.5 h-9 rounded-lg text-[12.5px] text-destructive hover:bg-[color-mix(in_srgb,var(--destructive)_12%,transparent)] transition-colors border border-transparent hover:border-destructive/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete node
          </button>
        )}
      </div>
    </aside>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.08em] text-subtle font-semibold">{label}</span>
      {children}
    </label>
  );
}
