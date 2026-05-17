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
  const [engine, setEngine] = useState("local");
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
    <div className="flex flex-col gap-3 p-4 border-l border-[var(--bg-secondary)] bg-[var(--bg-primary)] w-80">
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
        <Cloud className="size-4" />
        Cloud Routers
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-[var(--text-tertiary)]">Name</label>
        <input
          className="px-2 py-1.5 rounded-[var(--radius)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My router"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-tertiary)]">Engine</label>
          <select
            className="px-2 py-1.5 rounded-[var(--radius)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
          >
            <option value="local">Local (open-sse)</option>
            <option value="remote">Remote (advanced)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-tertiary)]">Fallback model</label>
          <input
            className="px-2 py-1.5 rounded-[var(--radius)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm"
            value={fallbackModel}
            onChange={(e) => setFallbackModel(e.target.value)}
            placeholder="gpt-4o-mini"
          />
        </div>
      </div>

      <Button size="sm" onClick={handleSave} disabled={saving}>
        <CloudUpload className="size-4 mr-1" />
        {activeId ? "Save changes" : "Save as new"}
      </Button>

      {error && <p className="text-xs text-[var(--accent-red)] break-words">{error}</p>}

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-[var(--text-tertiary)]">Your routers</span>
        <button
          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
        {loading && <div className="text-xs text-[var(--text-tertiary)]">Loading…</div>}
        {!loading && routers.length === 0 && (
          <div className="text-xs text-[var(--text-tertiary)]">No routers saved yet.</div>
        )}
        {routers.map((r) => (
          <div
            key={r.id}
            className={`group flex items-center justify-between gap-2 px-2 py-1.5 rounded-[var(--radius)] text-sm hover:bg-[var(--bg-tertiary)] cursor-pointer ${
              activeId === r.id ? "bg-[var(--bg-tertiary)]" : ""
            }`}
          >
            <button
              className="flex-1 text-left truncate text-[var(--text-primary)]"
              onClick={() => handleLoad(r.id)}
              title={r.description || r.name}
            >
              {r.is_default && (
                <Star className="inline size-3 mr-1 text-[var(--accent-orange)]" />
              )}
              {r.name}
              <span className="ml-1 text-xs text-[var(--text-tertiary)]">v{r.version}</span>
            </button>
            <div className="opacity-0 group-hover:opacity-100 flex gap-1">
              {!r.is_default && (
                <button
                  onClick={() => handleMakeDefault(r.id)}
                  title="Set as default"
                  className="text-[var(--text-tertiary)] hover:text-[var(--accent-orange)]"
                >
                  <Star className="size-3" />
                </button>
              )}
              <button
                onClick={() => handleDelete(r.id)}
                title="Delete"
                className="text-[var(--text-tertiary)] hover:text-[var(--accent-red)]"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
