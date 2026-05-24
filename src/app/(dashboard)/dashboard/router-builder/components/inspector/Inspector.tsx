"use client";

// Right-rail container for the currently-selected node's inspector.

import { Trash2, X } from "lucide-react";
import { ModelEditor } from "./ModelInspector";
import { ModelGroupEditor } from "./ModelGroupInspector";
import { PluginEditor } from "./PluginInspector";
import { ProjectionEditor } from "./ProjectionInspector";
import { RouteEditor } from "./RouteInspector";
import { SignalEditor } from "./SignalInspector";

// Human-readable panel titles for each node kind.
const KIND_LABEL: Record<string, string> = {
  signal: "Signal",
  projection: "Projection",
  route: "Route",
  model: "Model",
  modelGroup: "Model Group",
  plugin: "Plugin",
};

export function PropertiesPanel({
  node,
  signalIds,
  projIds,
  modelOptions,
  pluginNames,
  routes,
  onClose,
  onUpdateSignal,
  onUpdateProjection,
  onUpdateRoute,
  onUpdateModel,
  onUpdateModelGroup,
  onUpdatePlugin,
  onRemove,
}: {
  node: { kind: string; value: any };
  signalIds: string[];
  projIds: string[];
  modelOptions: { value: string; label: string }[];
  pluginNames: string[];
  routes: any[];
  onClose: () => void;
  onUpdateSignal: (uid: string, patch: any) => void;
  onUpdateProjection: (uid: string, patch: any) => void;
  onUpdateRoute: (uid: string, patch: any) => void;
  onUpdateModel: (uid: string, patch: any) => void;
  onUpdateModelGroup: (uid: string, patch: any) => void;
  onUpdatePlugin: (uid: string, patch: any) => void;
  onRemove: (uid: string) => void;
}) {
  return (
    <aside className="hidden lg:flex w-[340px] shrink-0 flex-col border-l border-[var(--bg-secondary)] bg-[var(--bg-primary)]">
      <div className="px-4 py-3 border-b border-[var(--bg-secondary)] flex items-center gap-2 shrink-0">
        <div className="text-sm font-semibold flex-1 text-[var(--text-primary)]">
          {KIND_LABEL[node.kind] || node.kind}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
        {node.kind === "signal" && (
          <SignalEditor
            signal={node.value}
            onUpdate={(p: any) => onUpdateSignal(node.value.uid, p)}
          />
        )}
        {node.kind === "projection" && (
          <ProjectionEditor
            proj={node.value}
            onUpdate={(p: any) => onUpdateProjection(node.value.uid, p)}
            signalIds={signalIds}
          />
        )}
        {node.kind === "route" && (
          <RouteEditor
            route={node.value}
            signalIds={signalIds}
            projIds={projIds}
            modelOptions={modelOptions}
            pluginNames={pluginNames}
            routes={routes}
            onUpdate={(p: any) => onUpdateRoute(node.value.uid, p)}
          />
        )}
        {node.kind === "model" && (
          <ModelEditor
            model={node.value}
            onUpdate={(p: any) => onUpdateModel(node.value.uid, p)}
          />
        )}
        {node.kind === "modelGroup" && (
          <ModelGroupEditor
            group={node.value}
            onUpdate={(p: any) => onUpdateModelGroup(node.value.uid, p)}
          />
        )}
        {node.kind === "plugin" && (
          <PluginEditor
            plugin={node.value}
            onUpdate={(p: any) => onUpdatePlugin(node.value.uid, p)}
          />
        )}
        <button
          type="button"
          onClick={() => onRemove(node.value.uid)}
          className="inline-flex items-center justify-center gap-1.5 h-9 rounded-[var(--radius)] text-[12.5px] text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition-colors border border-transparent hover:border-[var(--accent-red)]/30 mt-2"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete node
        </button>
      </div>
    </aside>
  );
}
