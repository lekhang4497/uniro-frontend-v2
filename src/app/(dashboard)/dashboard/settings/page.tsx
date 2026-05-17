"use client";

// API key management — list / create / revoke. Plaintext keys are shown
// exactly once on creation (the database only stores their SHA-256 hash).
// Business logic untouched from the original .js — only the surface
// (cards, tokens, shadcn primitives) is reskinned.

import { useEffect, useState } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card } from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { listApiKeys, createApiKey, revokeApiKey } from "@/lib/routing/apiKeysApi";
import { listRouters } from "@/lib/routing/routersApi";

type Scope = { scope_type: string; scope_value: string };

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at?: string | null;
  api_key_scopes?: Scope[];
};

type Router = { id: string; name: string };

const ROUTER_NONE = "__none__";

export default function SettingsPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [routers, setRouters] = useState<Router[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newDefaultRouter, setNewDefaultRouter] = useState<string>(ROUTER_NONE);
  const [maxTokens, setMaxTokens] = useState("");
  const [justCreated, setJustCreated] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [k, r] = await Promise.all([
        listApiKeys() as Promise<ApiKey[]>,
        (listRouters() as Promise<Router[]>).catch(() => [] as Router[]),
      ]);
      setKeys(k);
      setRouters(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const scopes: Scope[] = [];
      if (maxTokens) {
        scopes.push({ scope_type: "max_tokens_per_request", scope_value: String(parseInt(maxTokens, 10)) });
      }
      // createApiKey is JS and infers `scopes` as never[]; cast its arg.
      const { plaintext } = (await createApiKey({
        name: newKeyName || "Unnamed key",
        defaultRouterId: newDefaultRouter === ROUTER_NONE ? null : newDefaultRouter,
        scopes,
      } as never)) as { plaintext: string };
      setJustCreated(plaintext);
      setNewKeyName("");
      setNewDefaultRouter(ROUTER_NONE);
      setMaxTokens("");
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this key? Apps using it will stop working immediately.")) return;
    setError(null);
    try {
      await revokeApiKey(id);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function copyKey(value: string) {
    navigator.clipboard.writeText(value);
  }

  return (
    <div className="px-8 py-7">
      <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
        Settings
      </h1>
      <p className="mt-1 text-[14px] text-[var(--text-secondary)] max-w-[540px]">
        Manage API keys for your Uniro account. Each key shows up here once
        on creation — copy it then; we only keep its hash.
      </p>

      <div className="mt-6 max-w-4xl flex flex-col gap-6">
        {error && (
          <div className="rounded-[var(--radius)] border border-[var(--accent-red)]/40 bg-[var(--accent-red)]/10 text-[var(--accent-red)] text-[13px] p-3">
            {error}
          </div>
        )}

        {justCreated && (
          <Card className="p-4 border-[var(--accent-green)]/40 bg-[var(--accent-green)]/10 flex flex-col gap-2">
            <div className="text-[13px] font-medium text-[var(--text-primary)]">
              Your new API key — copy it now, you won&apos;t see it again:
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded-[var(--radius)] bg-[var(--bg-secondary)] text-[12px] break-all text-[var(--text-primary)] font-mono">
                {justCreated}
              </code>
              <Button size="sm" variant="outline" onClick={() => copyKey(justCreated)}>
                <Copy className="size-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setJustCreated(null)}>
                Done
              </Button>
            </div>
          </Card>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold flex items-center gap-2 text-[var(--text-primary)]">
            <KeyRound className="size-4" />
            API Keys
          </h2>

          <Card className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[var(--text-secondary)]">Name</Label>
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. Claude Code laptop"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[var(--text-secondary)]">Default router</Label>
              <Select value={newDefaultRouter} onValueChange={setNewDefaultRouter}>
                <SelectTrigger>
                  <SelectValue placeholder="(use account default)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROUTER_NONE}>(use account default)</SelectItem>
                  {routers.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12px] text-[var(--text-secondary)]">Max tokens / request</Label>
              <Input
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
                placeholder="(no limit)"
                type="number"
              />
            </div>
            <Button onClick={handleCreate} disabled={creating}>
              <Plus className="size-4" />
              {creating ? "Creating…" : "Create"}
            </Button>
          </Card>

          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-[var(--text-secondary)]">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!loading && keys.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-[var(--text-secondary)]">
                      No keys yet.
                    </TableCell>
                  </TableRow>
                )}
                {keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="text-[var(--text-primary)]">{k.name}</TableCell>
                    <TableCell className="font-mono text-[11px] text-[var(--text-primary)]">
                      {k.key_prefix}…
                    </TableCell>
                    <TableCell className="text-[11px] text-[var(--text-secondary)]">
                      {(k.api_key_scopes || []).length === 0
                        ? "(unrestricted)"
                        : (k.api_key_scopes ?? [])
                            .map((s) => `${s.scope_type}=${s.scope_value}`)
                            .join(", ")}
                    </TableCell>
                    <TableCell className="text-[11px] text-[var(--text-secondary)]">
                      {new Date(k.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-[11px] text-[var(--text-secondary)]">
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleRevoke(k.id)}
                        className="text-[var(--text-secondary)] hover:text-[var(--accent-red)] transition-colors"
                        title="Revoke"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>
      </div>
    </div>
  );
}
