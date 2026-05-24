"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudUpload, RefreshCw, Star, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  listRouters,
  getRouter,
  createRouter,
  updateRouter,
  deleteRouter,
  setDefaultRouter,
} from "@/lib/routing/routersApi";

// Cloud Save / Load panel for the router-builder canvas. Lives next to the
// existing localStorage flow so users can opt in to cloud sync.
//
// Props:
//   getYaml()         — () => string ; returns the canvas's current YAML
//   loadYaml(yaml)    — (string) => void ; loads a YAML payload into the canvas
//   activeName        — string | undefined
//   onActiveIdChange  — (id) => void
interface CloudSyncPanelProps {
  getYaml: () => string;
  loadYaml: (yaml: string) => void;
  activeName?: string;
  onActiveIdChange?: (id: string | null) => void;
}

export function CloudSyncPanel({ getYaml, loadYaml, activeName, onActiveIdChange }: CloudSyncPanelProps) {
  const [routers, setRouters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Default to remote: the local-engine branch in the coordinator is a
  // passthrough that ignores the YAML, so saving a router with engine=local
  // means "use the request's model verbatim" — that almost never matches
  // what someone building a router on this canvas actually wants.
  const [engine, setEngine] = useState("remote");
  const [fallbackModel, setFallbackModel] = useState("gpt-4o-mini");
  const [name, setName] = useState(activeName || "");

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const rows = await listRouters();
      setRouters(rows);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const yaml = getYaml();
      if (activeId) {
        const updated = await updateRouter(activeId, {
          name,
          engine,
          fallback_model: fallbackModel,
          config_yaml: yaml,
        });
        setActiveId(updated.id);
      } else {
        const created = await createRouter({
          name: name || "Untitled router",
          engine,
          fallbackModel,
          configYaml: yaml,
        } as any);
        setActiveId(created.id);
        onActiveIdChange?.(created.id);
      }
      await refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLoad(id: string) {
    setError(null);
    try {
      const r = await getRouter(id);
      loadYaml(r.config_yaml);
      setActiveId(r.id);
      setEngine(r.engine);
      setFallbackModel(r.fallback_model);
      setName(r.name);
      onActiveIdChange?.(r.id);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this router from the cloud?")) return;
    setError(null);
    try {
      await deleteRouter(id);
      if (activeId === id) setActiveId(null);
      await refresh();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleMakeDefault(id: string) {
    setError(null);
    try {
      await setDefaultRouter(id);
      await refresh();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-5 border-l border-[var(--bg-secondary)] bg-[var(--bg-primary)] w-[340px] overflow-y-auto">
      {/* Header */}
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
          <Cloud className="size-4 text-[var(--text-secondary)]" />
          Cloud routers
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          aria-label="Refresh"
          className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-1"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Save form — grouped into a soft card */}
      <div className="rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] p-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10.5px] uppercase tracking-[0.08em] font-semibold text-[var(--text-tertiary)]">
            Name
          </label>
          <input
            className="h-8 px-2.5 rounded-[var(--radius)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[13px] outline-none focus:border-[var(--accent-blue)]"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-router"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[10.5px] uppercase tracking-[0.08em] font-semibold text-[var(--text-tertiary)]"
              title="remote = router-service runs your YAML. local = passthrough; YAML ignored."
            >
              Engine
            </label>
            <select
              className="h-8 px-2 rounded-[var(--radius)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[12.5px]"
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
            >
              <option value="remote">Remote</option>
              <option value="local">Local (passthrough)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10.5px] uppercase tracking-[0.08em] font-semibold text-[var(--text-tertiary)]">
              Fallback
            </label>
            <input
              className="h-8 px-2.5 rounded-[var(--radius)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[12.5px] font-mono outline-none focus:border-[var(--accent-blue)]"
              value={fallbackModel}
              onChange={(e) => setFallbackModel(e.target.value)}
              placeholder="gpt-4o-mini"
            />
          </div>
        </div>

        <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 mt-0.5">
          <CloudUpload className="size-3.5 mr-1.5" />
          {saving ? "Saving…" : activeId ? "Save changes" : "Save as new"}
        </Button>

        {error && <p className="text-[11.5px] text-[var(--accent-red)] break-words">{error}</p>}
      </div>

      {/* Router list */}
      <div className="flex flex-col gap-0.5">
        <div className="px-1 text-[10.5px] uppercase tracking-[0.08em] font-semibold text-[var(--text-tertiary)] mb-1">
          Your routers
        </div>
        {loading && <div className="text-[12px] text-[var(--text-tertiary)] px-2 py-3">Loading…</div>}
        {!loading && routers.length === 0 && (
          <div className="text-[12px] text-[var(--text-tertiary)] px-2 py-3">No routers saved yet.</div>
        )}
        {routers.map((r) => {
          const isActive = activeId === r.id;
          return (
            <div
              key={r.id}
              className={`group flex items-start gap-2 rounded-[var(--radius)] p-2 transition-colors cursor-pointer ${
                isActive
                  ? "bg-[var(--bg-tertiary)]"
                  : "hover:bg-[var(--bg-tertiary)]"
              }`}
              onClick={() => handleLoad(r.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[13px] text-[var(--text-primary)] font-medium truncate">
                  {r.is_default && (
                    <Star className="size-3 text-[var(--accent-orange)] shrink-0 fill-current" />
                  )}
                  <span className="truncate">{r.name}</span>
                </div>
                <div className="text-[10.5px] text-[var(--text-tertiary)] mt-0.5">
                  {r.engine} · v{r.version}
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity shrink-0">
                {!r.is_default && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMakeDefault(r.id); }}
                    title="Set as default"
                    className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--accent-orange)] hover:bg-[var(--bg-secondary)]"
                  >
                    <Star className="size-3.5" />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                  title="Delete"
                  className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--accent-red)] hover:bg-[var(--bg-secondary)]"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
