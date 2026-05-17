"use client";

// xyflow ReactFlow canvas shell + the layer-legend strip + empty-state.
// Extracted from page.js with no behavior change.

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
} from "@xyflow/react";
import { Hand, LayoutGrid, MousePointer2, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { LAYERS } from "../lib/layers";
import { nodeTypes } from "./nodes";
import { edgeTypes } from "./edges/RouterEdge";
import { ToolBtn } from "./Toolbar";

export interface CanvasShellProps {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  rfNodes: any[];
  rfEdges: any[];
  handleNodesChange: any;
  onEdgesChange: any;
  onConnect: any;
  onEdgesDelete: any;
  onSelectionChange: any;
  onNodeDragStop: any;
  tool: string;
  setTool: (t: string) => void;
  onRealign: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  hasNodes: boolean;
}

export function CanvasShell({
  wrapperRef,
  rfNodes,
  rfEdges,
  handleNodesChange,
  onEdgesChange,
  onConnect,
  onEdgesDelete,
  onSelectionChange,
  onNodeDragStop,
  tool,
  setTool,
  onRealign,
  onDragOver,
  onDrop,
  hasNodes,
}: CanvasShellProps) {
  return (
    <div
      ref={wrapperRef}
      className="relative flex-1 min-w-0 bg-background"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes as any}
        edgeTypes={edgeTypes as any}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onSelectionChange={onSelectionChange}
        onNodeDragStop={onNodeDragStop}
        connectionMode={"loose" as any}
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
          nodeColor={(node: any) => {
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
        <ToolBtn
          active={tool === "pan"}
          onClick={() => setTool("pan")}
          icon={<Hand className="h-4 w-4" />}
          label="Pan"
        />
        <div className="w-px h-5 bg-border mx-0.5" />
        <ToolBtn
          active={tool === "select"}
          onClick={() => setTool("select")}
          icon={<MousePointer2 className="h-4 w-4" />}
          label="Select"
        />
        <div className="w-px h-5 bg-border mx-0.5" />
        <ToolBtn
          onClick={onRealign}
          icon={<LayoutGrid className="h-4 w-4" />}
          label="Realign"
        />
        <div className="w-px h-5 bg-border mx-0.5" />
        {LAYERS.map((l) => (
          <div
            key={l.key}
            className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium",
              l.headerText
            )}
          >
            <span className={cn("size-1.5 rounded-full shrink-0", l.headerDot)} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>

      {!hasNodes && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto rounded-xl border border-dashed border-border bg-card/90 backdrop-blur px-5 py-4 text-center max-w-md">
            <Workflow className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
            <div className="text-[13px] font-medium">
              Drag components from the left palette
            </div>
            <div className="text-[11.5px] text-muted-foreground mt-1">
              Build a Semantic Router across 5 layers: Signal Extraction → Projection
              Coordination → Decision Making → Model Selection → Plugin Chain
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
