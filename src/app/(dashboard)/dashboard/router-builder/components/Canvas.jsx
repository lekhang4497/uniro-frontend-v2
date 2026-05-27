"use client";

// React Flow canvas. Renders nodes/edges derived from the YAML store via
// `yamlToCanvas`. Spec §9.1: structurally read-only - no drag-to-add, no
// connection editing, no delete via canvas. The only interaction is
// selection (which switches the right dock to Properties).
//
// We memoize the nodes/edges output by yaml-string so React Flow doesn't
// re-render endlessly between unrelated state changes.

import { useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
} from "@xyflow/react";

import { cn } from "@/lib/utils";
import {
  Activity,
  AlertOctagon,
  Boxes,
  HelpCircle,
  Layers,
  Network,
  ShieldCheck,
  Workflow,
} from "lucide-react";

import { yamlToCanvas } from "./yamlToCanvas.js";

// Lookup is stable across renders so each value the table returns is the
// same component reference, which keeps the React "Cannot create components
// during render" rule happy.
const SIGNAL_ICON_BY_TYPE = {
  language: Workflow,
  domain: Workflow,
  keyword: Workflow,
  pii: ShieldCheck,
  jailbreak: ShieldCheck,
  complexity: Layers,
  context: Layers,
  token_estimator: Layers,
  embedding: Activity,
};

function SignalNode({ data, selected }) {
  const Icon = SIGNAL_ICON_BY_TYPE[data.signalType] || AlertOctagon;
  return (
    <div
      className={cn(
        "rounded-lg border bg-card min-w-[180px] transition-colors",
        selected ? "border-primary" : "border-border"
      )}
    >
      <div className="px-3 py-2 flex items-center gap-2">
        <div
          className="size-7 rounded-md grid place-items-center shrink-0"
          style={{ background: "var(--color-brand-50)", color: "var(--primary)" }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.08em] text-subtle font-semibold">
            Signal {data.signalType}
          </div>
          <div className="text-[12.5px] font-medium truncate">{data.name}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-primary !border-card !w-2.5 !h-2.5" />
    </div>
  );
}

function ProjectionNode({ data, selected }) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card min-w-[180px] transition-colors",
        selected ? "border-primary" : "border-border"
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-primary !border-card !w-2.5 !h-2.5" />
      <div className="px-3 py-2 flex items-center gap-2">
        <div
          className="size-7 rounded-md grid place-items-center shrink-0"
          style={{ background: "var(--color-brand-50)", color: "var(--primary)" }}
        >
          <Layers className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.08em] text-subtle font-semibold">
            Projection {data.projectionKind}
          </div>
          <div className="text-[12.5px] font-medium truncate">{data.name}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-primary !border-card !w-2.5 !h-2.5" />
    </div>
  );
}

function DecisionNode({ data, selected }) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card min-w-[200px] transition-colors",
        selected ? "border-primary" : "border-border"
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-primary !border-card !w-2.5 !h-2.5" />
      <div className="px-3 py-2 flex items-center gap-2">
        <div
          className="size-7 rounded-md grid place-items-center shrink-0"
          style={{ background: "var(--color-brand-50)", color: "var(--primary)" }}
        >
          {data.priority !== undefined ? <Network className="h-4 w-4" /> : <Boxes className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.08em] text-subtle font-semibold flex items-center gap-1.5">
            <span>Decision</span>
            {data.priority !== undefined && (
              <span className="text-muted-foreground normal-case tracking-normal">
                p{data.priority}
              </span>
            )}
          </div>
          <div className="text-[12.5px] font-medium truncate">{data.name}</div>
          <div className="text-[10.5px] mono text-muted-foreground truncate">{data.modelLabel}</div>
        </div>
      </div>
    </div>
  );
}

function PlaceholderNode({ data, selected }) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card min-w-[160px] transition-colors border-dashed",
        selected ? "border-primary" : "border-border"
      )}
    >
      <div className="px-3 py-2 flex items-center gap-2">
        <div className="size-7 rounded-md grid place-items-center shrink-0 bg-secondary text-muted-foreground">
          <HelpCircle className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.08em] text-subtle font-semibold">
            {data.kind}
          </div>
          <div className="text-[12.5px] font-medium truncate">{data.name}</div>
        </div>
      </div>
    </div>
  );
}

const NODE_TYPES = {
  uniroSignal: SignalNode,
  uniroProjection: ProjectionNode,
  uniroDecision: DecisionNode,
  uniroPlaceholder: PlaceholderNode,
};

export function Canvas({ yaml, tool, selectedId, onSelect }) {
  // Compute nodes/edges from YAML. Memoize so React Flow sees stable refs
  // when YAML hasn't changed.
  const { nodes: baseNodes, edges } = useMemo(() => yamlToCanvas(yaml), [yaml]);

  // Layer selection state onto the memoized nodes. We don't memoize the
  // selection-tagged array because selection changes are local; React Flow
  // handles that gracefully.
  const nodes = useMemo(
    () =>
      baseNodes.map((n) =>
        n.id === selectedId ? { ...n, selected: true } : { ...n, selected: false }
      ),
    [baseNodes, selectedId]
  );

  // If the previously selected node disappears (YAML changed), clear it.
  useEffect(() => {
    if (!selectedId) return;
    if (!baseNodes.some((n) => n.id === selectedId)) {
      onSelect(null);
    }
  }, [baseNodes, selectedId, onSelect]);

  const empty = baseNodes.length === 0;

  return (
    <div className="relative flex-1 min-w-0 bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        onSelectionChange={({ nodes: sel }) =>
          onSelect(sel.length === 1 ? sel[0].id : null)
        }
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

      {empty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-xl border border-dashed border-border bg-card/60 px-6 py-4 text-center text-sm text-muted-foreground max-w-md">
            <div className="font-medium text-foreground mb-1">Empty router</div>
            <div>Describe what you want to build in the Chat tab, or paste YAML in the YAML tab.</div>
          </div>
        </div>
      )}
    </div>
  );
}
