"use client";

import { useEffect, useState } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { listApiKeys, createApiKey, revokeApiKey } from "@/lib/routing/apiKeysApi";
import { listRouters } from "@/lib/routing/routersApi";

export default function SettingsPage() {
  const [keys, setKeys] = useState([]);
  const [routers, setRouters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newDefaultRouter, setNewDefaultRouter] = useState("");
  const [maxTokens, setMaxTokens] = useState("");
  const [justCreated, setJustCreated] = useState(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [k, r] = await Promise.all([listApiKeys(), listRouters().catch(() => [])]);
      setKeys(k);
      setRouters(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const scopes = [];
      if (maxTokens) {
        scopes.push({ scope_type: "max_tokens_per_request", scope_value: String(parseInt(maxTokens, 10)) });
      }
      const { plaintext } = await createApiKey({
        name: newKeyName || "Unnamed key",
        defaultRouterId: newDefaultRouter || null,
        scopes,
      });
      setJustCreated(plaintext);
      setNewKeyName("");
      setNewDefaultRouter("");
      setMaxTokens("");
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id) {
    if (!confirm("Revoke this key? Apps using it will stop working immediately.")) return;
    setError(null);
    try {
      await revokeApiKey(id);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  function copyKey(value) {
    navigator.clipboard.writeText(value);
  }

  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-text-muted text-sm mt-1">
          Manage API keys for your Uniro account.
        </p>
      </header>

      {error && (
        <div className="rounded border border-red-500/40 bg-red-500/10 text-red-500 text-sm p-3">
          {error}
        </div>
      )}

      {justCreated && (
        <div className="rounded border border-emerald-500/40 bg-emerald-500/10 p-4 flex flex-col gap-2">
          <div className="text-sm font-medium">Your new API key — copy it now, you won&apos;t see it again:</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded bg-bg-muted text-sm break-all">
              {justCreated}
            </code>
            <Button size="sm" variant="outline" onClick={() => copyKey(justCreated)}>
              <Copy className="size-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setJustCreated(null)}>
              Done
            </Button>
          </div>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <KeyRound className="size-4" />
          API Keys
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end p-4 border border-border rounded">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Name</label>
            <input
              className="px-2 py-1.5 rounded border border-border bg-bg text-sm"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. Claude Code laptop"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Default router</label>
            <select
              className="px-2 py-1.5 rounded border border-border bg-bg text-sm"
              value={newDefaultRouter}
              onChange={(e) => setNewDefaultRouter(e.target.value)}
            >
              <option value="">(use account default)</option>
              {routers.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Max tokens / request</label>
            <input
              className="px-2 py-1.5 rounded border border-border bg-bg text-sm"
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
              placeholder="(no limit)"
              type="number"
            />
          </div>
          <Button onClick={handleCreate} disabled={creating}>
            <Plus className="size-4 mr-1" />
            {creating ? "Creating…" : "Create"}
          </Button>
        </div>

        <div className="border border-border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-muted text-left">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Prefix</th>
                <th className="px-3 py-2">Scopes</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Last used</th>
                <th className="px-3 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-text-muted">Loading…</td></tr>
              )}
              {!loading && keys.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-text-muted">No keys yet.</td></tr>
              )}
              {keys.map((k) => (
                <tr key={k.id} className="border-t border-border">
                  <td className="px-3 py-2">{k.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{k.key_prefix}…</td>
                  <td className="px-3 py-2 text-xs text-text-muted">
                    {(k.api_key_scopes || []).length === 0
                      ? "(unrestricted)"
                      : k.api_key_scopes.map((s) => `${s.scope_type}=${s.scope_value}`).join(", ")}
                  </td>
                  <td className="px-3 py-2 text-xs text-text-muted">
                    {new Date(k.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-xs text-text-muted">
                    {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleRevoke(k.id)}
                      className="text-text-muted hover:text-red-500"
                      title="Revoke"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
