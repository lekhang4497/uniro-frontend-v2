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
export function CloudSyncPanel({ getYaml, loadYaml, activeName, onActiveIdChange }) {
  const [routers, setRouters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);
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
    } catch (e) {
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
        });
        setActiveId(created.id);
        onActiveIdChange?.(created.id);
      }
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLoad(id) {
    setError(null);
    try {
      const r = await getRouter(id);
      loadYaml(r.config_yaml);
      setActiveId(r.id);
      setEngine(r.engine);
      setFallbackModel(r.fallback_model);
      setName(r.name);
      onActiveIdChange?.(r.id);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this router from the cloud?")) return;
    setError(null);
    try {
      await deleteRouter(id);
      if (activeId === id) setActiveId(null);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleMakeDefault(id) {
    setError(null);
    try {
      await setDefaultRouter(id);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4 border-l border-border bg-bg-muted/40 w-80">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Cloud className="size-4" />
        Cloud Routers
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-text-muted">Name</label>
        <input
          className="px-2 py-1.5 rounded border border-border bg-bg text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My router"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted">Engine</label>
          <select
            className="px-2 py-1.5 rounded border border-border bg-bg text-sm"
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
          >
            <option value="local">Local (open-sse)</option>
            <option value="remote">Remote (advanced)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-muted">Fallback model</label>
          <input
            className="px-2 py-1.5 rounded border border-border bg-bg text-sm"
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

      {error && (
        <p className="text-xs text-red-500 break-words">{error}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-text-muted">Your routers</span>
        <button
          className="text-xs text-text-muted hover:text-text"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
        {loading && <div className="text-xs text-text-muted">Loading…</div>}
        {!loading && routers.length === 0 && (
          <div className="text-xs text-text-muted">No routers saved yet.</div>
        )}
        {routers.map((r) => (
          <div
            key={r.id}
            className={`group flex items-center justify-between gap-2 px-2 py-1.5 rounded text-sm hover:bg-bg-muted cursor-pointer ${
              activeId === r.id ? "bg-bg-muted" : ""
            }`}
          >
            <button
              className="flex-1 text-left truncate"
              onClick={() => handleLoad(r.id)}
              title={r.description || r.name}
            >
              {r.is_default && <Star className="inline size-3 mr-1 text-amber-500" />}
              {r.name}
              <span className="ml-1 text-xs text-text-muted">v{r.version}</span>
            </button>
            <div className="opacity-0 group-hover:opacity-100 flex gap-1">
              {!r.is_default && (
                <button
                  onClick={() => handleMakeDefault(r.id)}
                  title="Set as default"
                  className="text-text-muted hover:text-amber-500"
                >
                  <Star className="size-3" />
                </button>
              )}
              <button
                onClick={() => handleDelete(r.id)}
                title="Delete"
                className="text-text-muted hover:text-red-500"
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
