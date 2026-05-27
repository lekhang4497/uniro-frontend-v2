"use client";

// Left palette. Spec §9.1 footnote: items are NOT draggable in this MVP.
// The palette is an inventory of what the agent or YAML view can introduce.
// Once the canvas extension follow-up ships, items become draggable.

import {
  Activity,
  AlertOctagon,
  Binary,
  Boxes,
  Brain,
  Filter,
  GitBranch,
  Globe,
  Hash,
  Layers,
  Network,
  ShieldCheck,
  Workflow,
} from "lucide-react";

// Catalog of inventory items. Grouped by the YAML layer they belong to
// (signals / projections / decisions / plugins). Items map roughly to the
// most common entries in the router schema (see ROUTER_YAML.md).
const CATALOG = [
  {
    section: "Signals",
    items: [
      { kind: "signal:language", label: "Language", icon: Globe, description: "Detect language" },
      { kind: "signal:keyword", label: "Keyword", icon: Hash, description: "Match keywords" },
      { kind: "signal:complexity", label: "Complexity", icon: Layers, description: "Estimate prompt complexity" },
      { kind: "signal:embedding", label: "Embedding", icon: Brain, description: "Semantic similarity" },
      { kind: "signal:pii", label: "PII", icon: ShieldCheck, description: "Detect PII content" },
      { kind: "signal:jailbreak", label: "Jailbreak", icon: AlertOctagon, description: "Flag jailbreak attempts" },
    ],
  },
  {
    section: "Projections",
    items: [
      { kind: "projection:partition", label: "Partition", icon: Filter, description: "Split signals into bins" },
      { kind: "projection:score", label: "Score", icon: Activity, description: "Weighted sum of signals" },
      { kind: "projection:mapping", label: "Mapping", icon: Binary, description: "Score -> band" },
    ],
  },
  {
    section: "Decisions",
    items: [
      { kind: "decision:model", label: "Model", icon: Boxes, description: "Route to a single model" },
      { kind: "decision:modelRefs", label: "ModelRefs", icon: Network, description: "Weighted fallback chain" },
      { kind: "decision:rules", label: "Rules", icon: Workflow, description: "AND / OR / NOT tree" },
    ],
  },
  {
    section: "Plugins",
    items: [
      { kind: "plugin:semantic_cache", label: "Semantic cache", icon: GitBranch, description: "Cache by similarity" },
      { kind: "plugin:rag", label: "RAG", icon: Layers, description: "Inject retrieved context" },
      { kind: "plugin:pii_redact", label: "PII redact", icon: ShieldCheck, description: "Strip PII before upstream" },
    ],
  },
];

export function Palette() {
  return (
    <aside className="hidden md:flex w-[208px] shrink-0 border-r border-border bg-card flex-col">
      <div className="px-4 py-3 border-b border-border">
        <div className="text-[11px] uppercase tracking-[0.08em] text-subtle font-semibold">Nodes</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          Use the chat to add
        </div>
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
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-secondary mb-px cursor-default"
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
