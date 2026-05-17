"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { ReactFlow, Handle, Position, Controls } from "@xyflow/react";
import type { Node, Edge, ReactFlowInstance } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AI_PROVIDERS } from "@/shared/constants/providers";

// Force-stop FE animation if a provider stays active longer than this
const FE_ACTIVE_TIMEOUT_MS = 60000;
const FE_ACTIVE_TICK_MS = 1000;

type ProviderConfig = { color: string; name: string; textIcon?: string };

function getProviderConfig(providerId: string): ProviderConfig {
  return (
    ((AI_PROVIDERS as Record<string, ProviderConfig>)[providerId]) || {
      color: "#6b7280",
      name: providerId,
    }
  );
}

// Use local provider images from /public/providers/
function getProviderImageUrl(providerId: string): string {
  return `/providers/${providerId}.png`;
}

type ProviderNodeData = {
  label: string;
  color: string;
  imageUrl: string;
  textIcon: string;
  active: boolean;
};

// Custom provider node — Anthropic-handoff: subtle border, accent on active
function ProviderNode({ data }: { data: ProviderNodeData }) {
  const { label, color, imageUrl, textIcon, active } = data;
  const [imgError, setImgError] = useState(false);
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-[var(--radius-md)] border transition-all duration-300 bg-[var(--bg-primary)]"
      style={{
        borderColor: active ? color : "var(--bg-secondary)",
        boxShadow: active ? `0 0 16px ${color}40` : "none",
        minWidth: "150px",
      }}
    >
      <Handle type="target" position={Position.Top} id="top" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Bottom} id="bottom" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Right} id="right" className="!bg-transparent !border-0 !w-0 !h-0" />

      {/* Provider icon */}
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}15` }}
      >
        {!imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={label}
            className="w-6 h-6 rounded-sm object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-sm font-bold" style={{ color }}>
            {textIcon}
          </span>
        )}
      </div>

      {/* Provider name */}
      <span
        className="text-base font-medium truncate"
        style={{ color: active ? color : "var(--text-primary)" }}
      >
        {label}
      </span>

      {/* Active indicator */}
      {active && (
        <span className="relative flex h-2 w-2 shrink-0">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: color }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: color }}
          />
        </span>
      )}
    </div>
  );
}

type RouterNodeData = { activeCount: number };

// Center Uniro node — accent-blue ring when active
function RouterNode({ data }: { data: RouterNodeData }) {
  return (
    <div className="flex items-center justify-center px-5 py-3 rounded-[var(--radius-md)] border-2 border-[var(--accent-blue)] bg-[var(--accent-blue)]/5 shadow-sm min-w-[130px]">
      <Handle type="source" position={Position.Top} id="top" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Left} id="left" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-transparent !border-0 !w-0 !h-0" />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/favicon.svg" alt="Uniro" className="w-6 h-6 mr-2" />
      <span className="text-sm font-bold text-[var(--accent-blue)]">Uniro</span>
      {data.activeCount > 0 && (
        <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[var(--accent-blue)] text-[var(--text-inverted)] text-xs font-bold">
          {data.activeCount}
        </span>
      )}
    </div>
  );
}

const nodeTypes = { provider: ProviderNode, router: RouterNode } as const;

type ProviderEntry = {
  id?: string;
  provider: string;
  name?: string;
};

// Place N nodes evenly along an ellipse around the router center.
function buildLayout(
  providers: ProviderEntry[],
  activeSet: Set<string>,
  lastSet: Set<string>,
  errorSet: Set<string>,
): { nodes: Node[]; edges: Edge[] } {
  const nodeW = 180;
  const nodeH = 30;
  const routerW = 120;
  const routerH = 44;
  const nodeGap = 24;

  const count = providers.length;

  const minRx = ((nodeW + nodeGap) * count) / (2 * Math.PI);
  const rx = Math.max(320, minRx);
  const ry = Math.max(200, rx * 0.55);
  if (count === 0) {
    return {
      nodes: [
        {
          id: "router",
          type: "router",
          position: { x: 0, y: 0 },
          data: { activeCount: 0 },
          draggable: false,
        },
      ],
      edges: [],
    };
  }

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  nodes.push({
    id: "router",
    type: "router",
    position: { x: -routerW / 2, y: -routerH / 2 },
    data: { activeCount: activeSet.size },
    draggable: false,
  });

  const edgeStyle = (active: boolean, last: boolean, error: boolean) => {
    if (error) return { stroke: "var(--accent-red)", strokeWidth: 2.5, opacity: 0.9 };
    if (active) return { stroke: "var(--accent-green)", strokeWidth: 2.5, opacity: 0.9 };
    if (last) return { stroke: "var(--accent-orange)", strokeWidth: 2, opacity: 0.7 };
    return { stroke: "var(--bg-secondary)", strokeWidth: 1, opacity: 0.4 };
  };

  providers.forEach((p, i) => {
    const config = getProviderConfig(p.provider);
    const active = activeSet.has(p.provider?.toLowerCase());
    const last = !active && lastSet.has(p.provider?.toLowerCase());
    const error = !active && errorSet.has(p.provider?.toLowerCase());
    const nodeId = `provider-${p.provider}`;
    const data: ProviderNodeData = {
      label: (config.name !== p.provider ? config.name : null) || p.name || p.provider,
      color: config.color || "#6b7280",
      imageUrl: getProviderImageUrl(p.provider),
      textIcon: config.textIcon || (p.provider || "?").slice(0, 2).toUpperCase(),
      active,
    };

    // Distribute evenly starting from top (−π/2), clockwise
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    const cx = rx * Math.cos(angle);
    const cy = ry * Math.sin(angle);

    let sourceHandle: string;
    let targetHandle: string;
    if (
      Math.abs(angle + Math.PI / 2) < Math.PI / 4 ||
      Math.abs(angle - 3 * Math.PI / 2) < Math.PI / 4
    ) {
      sourceHandle = "top";
      targetHandle = "bottom";
    } else if (Math.abs(angle - Math.PI / 2) < Math.PI / 4) {
      sourceHandle = "bottom";
      targetHandle = "top";
    } else if (cx > 0) {
      sourceHandle = "right";
      targetHandle = "left";
    } else {
      sourceHandle = "left";
      targetHandle = "right";
    }

    nodes.push({
      id: nodeId,
      type: "provider",
      position: { x: cx - nodeW / 2, y: cy - nodeH / 2 },
      data,
      draggable: false,
    });

    edges.push({
      id: `e-${nodeId}`,
      source: "router",
      sourceHandle,
      target: nodeId,
      targetHandle,
      animated: active,
      style: edgeStyle(active, last, error),
    });
  });

  return { nodes, edges };
}

export interface ProviderTopologyProps {
  providers?: ProviderEntry[];
  activeRequests?: Array<{ provider?: string; model?: string; account?: string }>;
  lastProvider?: string;
  errorProvider?: string;
}

export default function ProviderTopology({
  providers = [],
  activeRequests = [],
  lastProvider = "",
  errorProvider = "",
}: ProviderTopologyProps) {
  // Serialize to stable string keys so useMemo only re-runs when values actually change
  const activeKey = useMemo(
    () =>
      activeRequests
        .map((r) => r.provider?.toLowerCase())
        .filter(Boolean)
        .sort()
        .join(","),
    [activeRequests],
  );
  const lastKey = lastProvider?.toLowerCase() || "";
  const errorKey = errorProvider?.toLowerCase() || "";

  const rawActiveSet = useMemo(
    () => new Set(activeKey ? activeKey.split(",") : []),
    [activeKey],
  );
  const lastSet = useMemo(() => new Set(lastKey ? [lastKey] : []), [lastKey]);
  const errorSet = useMemo(() => new Set(errorKey ? [errorKey] : []), [errorKey]);

  // Track firstSeen per active provider; drop provider if running too long (BE stuck)
  const firstSeenRef = useRef<Record<string, number>>({});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const seen = firstSeenRef.current;
    const now = Date.now();
    for (const p of rawActiveSet) {
      if (!seen[p]) seen[p] = now;
    }
    for (const p of Object.keys(seen)) {
      if (!rawActiveSet.has(p)) delete seen[p];
    }
  }, [rawActiveSet]);

  useEffect(() => {
    if (rawActiveSet.size === 0) return;
    const id = setInterval(() => setTick((t) => t + 1), FE_ACTIVE_TICK_MS);
    return () => clearInterval(id);
  }, [rawActiveSet]);

  const activeSet = useMemo(() => {
    const now = Date.now();
    const filtered = new Set<string>();
    for (const p of rawActiveSet) {
      const ts = firstSeenRef.current[p];
      if (!ts || now - ts < FE_ACTIVE_TIMEOUT_MS) filtered.add(p);
    }
    return filtered;
  }, [rawActiveSet, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const { nodes, edges } = useMemo(
    () => buildLayout(providers, activeSet, lastSet, errorSet),
    [providers, activeSet, lastSet, errorSet],
  );

  // Stable key — only remount when provider list changes
  const providersKey = useMemo(
    () =>
      providers
        .map((p) => p.provider)
        .sort()
        .join(","),
    [providers],
  );

  const rfInstance = useRef<ReactFlowInstance | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fitOpts = { padding: 0.2, duration: 200 } as const;
  const onInit = useCallback((instance: ReactFlowInstance) => {
    rfInstance.current = instance;
    setTimeout(() => instance.fitView(fitOpts), 50);
  }, []);

  // Re-fit on container resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (rfInstance.current) rfInstance.current.fitView(fitOpts);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Re-fit when node count/layout changes
  useEffect(() => {
    if (rfInstance.current) {
      const id = setTimeout(() => rfInstance.current?.fitView(fitOpts), 50);
      return () => clearTimeout(id);
    }
  }, [nodes.length]);

  return (
    <div
      ref={containerRef}
      className="h-[320px] w-full min-w-0 rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-secondary)]/30 sm:h-[480px]"
    >
      {providers.length === 0 ? (
        <div className="h-full flex items-center justify-center text-[var(--text-secondary)] text-sm">
          No providers connected
        </div>
      ) : (
        <ReactFlow
          key={providersKey}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={fitOpts}
          minZoom={0.1}
          maxZoom={2}
          onInit={onInit}
          proOptions={{ hideAttribution: true }}
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          zoomOnDoubleClick
          preventScrolling={false}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Controls showInteractive={false} />
        </ReactFlow>
      )}
    </div>
  );
}
