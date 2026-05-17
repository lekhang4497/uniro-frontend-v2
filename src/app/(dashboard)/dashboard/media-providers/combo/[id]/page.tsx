"use client";

import { useParams, notFound, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Layers,
  Trash2,
  Plus,
  Play,
  Download,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";
import {
  Card,
  Button,
  Input,
  Toggle,
  ModelSelectModal,
} from "@/shared/components";
import ProviderIcon from "@/shared/components/ProviderIcon";
import {
  AI_PROVIDERS,
  MEDIA_PROVIDER_KINDS,
} from "@/shared/constants/providers";

// Parse "providerId/model" or just "providerId" → { providerId, model }
function parseModelEntry(entry: string) {
  if (typeof entry !== "string") return { providerId: "", model: "" };
  const idx = entry.indexOf("/");
  if (idx < 0) return { providerId: entry, model: "" };
  return { providerId: entry.slice(0, idx), model: entry.slice(idx + 1) };
}

const VALID_NAME_REGEX = /^[a-zA-Z0-9_.\-]+$/;

const KIND_LABELS: Record<string, string> = {
  webSearch: "Web Search",
  webFetch: "Web Fetch",
  image: "Text to Image",
  tts: "Text To Speech",
};

const EXAMPLE_PATHS: Record<string, string> = {
  webSearch: "/v1/search",
  webFetch: "/v1/web/fetch",
  image: "/v1/images/generations",
  tts: "/v1/audio/speech",
};

const EXAMPLE_BODIES: Record<string, (n: string) => Record<string, unknown>> = {
  webSearch: (n: string) => ({
    model: n,
    query: "What is the latest news about AI?",
    search_type: "web",
    max_results: 5,
  }),
  webFetch: (n: string) => ({
    model: n,
    url: "https://example.com",
    format: "markdown",
  }),
  image: (n: string) => ({
    model: n,
    prompt: "A cute cat playing piano",
    n: 1,
    size: "1024x1024",
  }),
  tts: (n: string) => ({
    model: n,
    input: "Hello, this is a test.",
    voice: "alloy",
  }),
};

// Map combo.kind → listing route to go back to
function getListingHref(kind: string | undefined) {
  if (kind === "webSearch" || kind === "webFetch")
    return "/dashboard/media-providers/web";
  return `/dashboard/media-providers/${kind}`;
}

type Combo = {
  id: string;
  name: string;
  models: string[];
  kind?: string;
};

type ProviderConnection = {
  id: string;
  provider: string;
  [k: string]: unknown;
};

type TestResult = {
  json?: string;
  audioUrl?: string;
  imageUrl?: string;
  latencyMs?: number;
};

 
function maskB64(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(maskB64);
   
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] =
      k === "b64_json" && typeof v === "string" && v.length > 100
        ? `<${v.length} chars base64>`
        : maskB64(v);
  }
  return out;
}

export default function ComboDetailPage() {
  const params = useParams();
  const id = (params?.id as string) || "";
  const router = useRouter();
  const [combo, setCombo] = useState<Combo | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [providers, setProviders] = useState<string[]>([]);
  const [roundRobin, setRoundRobin] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testError, setTestError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [modelAliases, setModelAliases] = useState<Record<string, string>>({});

  const fetchAll = async () => {
    try {
      const [comboRes, settingsRes, logsRes, keysRes, connsRes, aliasesRes] =
        await Promise.all([
          fetch(`/api/combos/${id}`, { cache: "no-store" }),
          fetch("/api/settings", { cache: "no-store" }),
          fetch("/api/usage/logs", { cache: "no-store" }),
          fetch("/api/keys", { cache: "no-store" }),
          fetch("/api/providers", { cache: "no-store" }),
          fetch("/api/models/alias", { cache: "no-store" }),
        ]);
      if (aliasesRes.ok)
        setModelAliases((await aliasesRes.json()).aliases || {});
      if (keysRes.ok) {
        const k = await keysRes.json();
        setApiKey(
           
          (k.keys || []).find((x: any) => x.isActive !== false)?.key || ""
        );
      }
      if (connsRes.ok)
        setConnections((await connsRes.json()).connections || []);
      if (!comboRes.ok) {
        setCombo(null);
        setLoading(false);
        return;
      }
      const c = await comboRes.json();
      setCombo(c);
      setName(c.name);
      setProviders(c.models || []);
      const s = settingsRes.ok ? await settingsRes.json() : {};
      setRoundRobin(
        s.comboStrategies?.[c.name]?.fallbackStrategy === "round-robin"
      );
      const allLogs = logsRes.ok ? await logsRes.json() : [];
      setLogs(
        allLogs
          .filter((l: unknown) => typeof l === "string" && l.includes(c.name))
          .slice(0, 50)
      );
    } catch {
      /* noop */
    }
    setLoading(false);
  };

   
  useEffect(() => {
    fetchAll();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const validateName = (v: string) => {
    if (!v.trim()) {
      setNameError("Name is required");
      return false;
    }
    if (!VALID_NAME_REGEX.test(v)) {
      setNameError("Only letters, numbers, -, _ and .");
      return false;
    }
    setNameError("");
    return true;
  };

  const saveCombo = async (patch: Partial<Combo>) => {
    const res = await fetch(`/api/combos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Failed to save");
      return false;
    }
    return true;
  };

  const handleSaveName = async () => {
    if (!validateName(name)) return;
    if (!combo || name === combo.name) return;
    const ok = await saveCombo({ name });
    if (ok) await fetchAll();
  };

   
  const handleAddModel = async (model: any) => {
    const value = (model?.value || model) as string;
    if (!value || providers.includes(value)) return;
    const next = [...providers, value];
    setProviders(next);
    await saveCombo({ models: next });
  };

   
  const handleDeselectModel = async (model: any) => {
    const value = (model?.value || model) as string;
    if (!value || !providers.includes(value)) return;
    const next = providers.filter((p) => p !== value);
    setProviders(next);
    await saveCombo({ models: next });
  };

  const handleRemoveProvider = async (idx: number) => {
    const next = providers.filter((_, i) => i !== idx);
    setProviders(next);
    await saveCombo({ models: next });
  };

  const handleMove = async (idx: number, dir: number) => {
    const next = [...providers];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap]!, next[idx]!];
    setProviders(next);
    await saveCombo({ models: next });
  };

  const handleToggleRoundRobin = async (enabled: boolean) => {
    if (!combo) return;
    setRoundRobin(enabled);
    const settingsRes = await fetch("/api/settings", { cache: "no-store" });
    const s = settingsRes.ok ? await settingsRes.json() : {};
    const updated = { ...(s.comboStrategies || {}) };
    if (enabled) updated[combo.name] = { fallbackStrategy: "round-robin" };
    else delete updated[combo.name];
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comboStrategies: updated }),
    });
  };

  const handleDelete = async () => {
    if (!combo) return;
    if (!confirm(`Delete combo "${combo.name}"?`)) return;
    const res = await fetch(`/api/combos/${id}`, { method: "DELETE" });
    if (res.ok) router.push(getListingHref(combo.kind));
  };

  const handleTest = async () => {
    if (!combo) return;
    setTesting(true);
    setTestResult(null);
    setTestError("");
    if (testResult?.audioUrl) {
      try {
        URL.revokeObjectURL(testResult.audioUrl);
      } catch {
        /* ignore */
      }
    }
    if (testResult?.imageUrl?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(testResult.imageUrl);
      } catch {
        /* ignore */
      }
    }
    const start = Date.now();
    try {
      const path = combo.kind ? EXAMPLE_PATHS[combo.kind] : undefined;
      const bodyFn = combo.kind ? EXAMPLE_BODIES[combo.kind] : undefined;
      if (!path || !bodyFn) {
        setTestError("Unsupported kind");
        setTesting(false);
        return;
      }
      const body = bodyFn(combo.name);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
      const res = await fetch(`/api${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const latencyMs = Date.now() - start;
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setTestError(
          d?.error?.message || d?.error || `HTTP ${res.status}`
        );
        setTestResult({ json: JSON.stringify(d, null, 2), latencyMs });
        return;
      }
      const ctype = res.headers.get("content-type") || "";
      // Binary image
      if (ctype.startsWith("image/")) {
        const blob = await res.blob();
        setTestResult({ imageUrl: URL.createObjectURL(blob), latencyMs });
        return;
      }
      // Binary audio
      if (
        ctype.startsWith("audio/") ||
        ctype === "application/octet-stream"
      ) {
        const blob = await res.blob();
        setTestResult({ audioUrl: URL.createObjectURL(blob), latencyMs });
        return;
      }
      // JSON — could be image (data[0].b64_json/url) or generic
      const data = await res.json();
      const first = data?.data?.[0];
      const imageUrl = first?.b64_json
        ? `data:image/png;base64,${first.b64_json}`
        : first?.url || "";
      setTestResult({
        json: JSON.stringify(maskB64(data), null, 2),
        imageUrl,
        latencyMs,
      });
    } catch (e) {
      const err = e as Error;
      setTestError(err.message || "Network error");
    }
    setTesting(false);
  };

  if (loading)
    return (
      <div className="px-8 py-7 text-[var(--text-secondary)] text-sm">
        Loading...
      </div>
    );
  if (!combo) return notFound();

  const kindLabel =
    (combo.kind && KIND_LABELS[combo.kind]) ||
     
    (MEDIA_PROVIDER_KINDS as any[]).find((k) => k.id === combo.kind)?.label ||
    "Combo";
  const examplePath = combo.kind ? EXAMPLE_PATHS[combo.kind] : undefined;
  const exampleBody =
    combo.kind && EXAMPLE_BODIES[combo.kind]
      ? EXAMPLE_BODIES[combo.kind]!(combo.name)
      : null;
  const curlExample = examplePath
    ? `curl -X POST http://localhost:20128${examplePath} \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer ${apiKey || "YOUR_KEY"}" \\\n  -d '${JSON.stringify(exampleBody)}'`
    : "";
  const backHref = getListingHref(combo.kind);

  return (
    <div className="px-8 py-7 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={backHref}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div
            className="size-10 rounded-lg flex items-center justify-center"
            style={{ background: "var(--bg-secondary)" }}
          >
            <Layers size={20} className="text-[var(--accent-blue)]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[var(--text-secondary)]">
              {kindLabel} Combo
            </p>
            <code className="text-[26px] font-semibold tracking-[-0.01em] font-mono text-[var(--text-primary)]">
              {combo.name}
            </code>
          </div>
        </div>
        <Button
          variant="outline"
          icon={Trash2}
          onClick={handleDelete}
          className="text-[var(--accent-red)] border-[var(--accent-red)]/30 hover:bg-[var(--accent-red)]/10"
        >
          Delete
        </Button>
      </div>

      {/* Settings Card */}
      <Card>
        <h2 className="text-lg font-semibold mb-3 text-[var(--text-primary)]">
          Settings
        </h2>
        <div className="flex flex-col gap-4">
          <div>
            <Input
              label="Combo Name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setName(e.target.value);
                validateName(e.target.value);
              }}
              onBlur={handleSaveName}
              error={nameError}
            />
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              Only letters, numbers, -, _ and .
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Round Robin
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Rotate providers across requests instead of strict fallback order.
              </p>
            </div>
            <Toggle checked={roundRobin} onChange={handleToggleRoundRobin} />
          </div>
        </div>
      </Card>

      {/* Providers Card */}
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Providers
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Tried in order (top-down) or rotated when round-robin is on.
            </p>
          </div>
          <Button size="sm" icon={Plus} onClick={() => setShowPicker(true)}>
            Add Provider
          </Button>
        </div>
        {providers.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-[var(--bg-secondary)] rounded-lg text-[var(--text-secondary)] text-sm">
            No providers yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {providers.map((entry, idx) => {
              const { providerId, model } = parseModelEntry(entry);
               
              const p = (AI_PROVIDERS as any)[providerId];
              return (
                <div
                  key={`${entry}-${idx}`}
                  className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-secondary)]/40"
                >
                  <span className="text-xs text-[var(--text-secondary)] w-5 text-center">
                    {idx + 1}
                  </span>
                  <ProviderIcon
                    src={`/providers/${providerId}.png`}
                    alt={p?.name || providerId}
                    size={24}
                    className="object-contain rounded shrink-0"
                    fallbackText={
                      p?.textIcon || providerId.slice(0, 2).toUpperCase()
                    }
                    fallbackColor={p?.color}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate text-[var(--text-primary)]">
                      {p?.name || providerId}
                    </div>
                    {model && (
                      <code className="text-[10px] text-[var(--text-secondary)] font-mono truncate block">
                        {model}
                      </code>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleMove(idx, -1)}
                      disabled={idx === 0}
                      className={`p-1 rounded ${idx === 0 ? "text-[var(--text-tertiary)]/30" : "text-[var(--text-secondary)] hover:text-[var(--accent-blue)] hover:bg-[var(--bg-secondary)]"}`}
                      title="Move up"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      onClick={() => handleMove(idx, 1)}
                      disabled={idx === providers.length - 1}
                      className={`p-1 rounded ${idx === providers.length - 1 ? "text-[var(--text-tertiary)]/30" : "text-[var(--text-secondary)] hover:text-[var(--accent-blue)] hover:bg-[var(--bg-secondary)]"}`}
                      title="Move down"
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      onClick={() => handleRemoveProvider(idx)}
                      className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10"
                      title="Remove"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Test Example Card */}
      {combo.kind && examplePath && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Test Example
            </h2>
            <Button
              size="sm"
              icon={Play}
              onClick={handleTest}
              disabled={testing || providers.length === 0}
            >
              {testing ? "Running..." : "Run"}
            </Button>
          </div>
          <pre className="text-xs font-mono bg-[var(--bg-secondary)]/60 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all text-[var(--text-primary)]">
            {curlExample}
          </pre>
          {testError && (
            <p className="mt-3 text-xs text-[var(--accent-red)] break-words">
              {testError}
            </p>
          )}
          {testResult && (
            <div className="mt-3 flex flex-col gap-3">
              {testResult.latencyMs != null && (
                <span className="text-[11px] text-[var(--text-secondary)]">
                  {testResult.latencyMs}ms
                </span>
              )}
              {testResult.imageUrl && (
                <div>
                  <div className="flex items-center justify-end mb-1.5">
                    <a
                      href={testResult.imageUrl}
                      download="image.png"
                      className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors"
                    >
                      <Download size={14} />
                      Download
                    </a>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={testResult.imageUrl}
                    alt="Generated"
                    className="max-w-full rounded-lg border border-[var(--bg-secondary)]"
                  />
                </div>
              )}
              {testResult.audioUrl && (
                <div>
                  <div className="flex items-center justify-end mb-1.5">
                    <a
                      href={testResult.audioUrl}
                      download="speech.mp3"
                      className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors"
                    >
                      <Download size={14} />
                      Download
                    </a>
                  </div>
                  <audio controls src={testResult.audioUrl} className="w-full" />
                </div>
              )}
              {testResult.json && (
                <pre className="text-xs font-mono bg-[var(--bg-secondary)]/60 p-3 rounded-lg overflow-auto max-h-[300px] whitespace-pre-wrap break-all text-[var(--text-primary)]">
                  {testResult.json}
                </pre>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Usage Logs Card */}
      <Card>
        <h2 className="text-lg font-semibold mb-3 text-[var(--text-primary)]">
          Usage Logs
        </h2>
        {logs.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] italic">
            No usage yet.
          </p>
        ) : (
          <pre className="text-[11px] font-mono bg-[var(--bg-secondary)]/60 p-3 rounded-lg overflow-auto max-h-[400px] whitespace-pre-wrap text-[var(--text-primary)]">
            {logs.join("\n")}
          </pre>
        )}
      </Card>

      <ModelSelectModal
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleAddModel}
        onDeselect={handleDeselectModel}
        activeProviders={connections}
        modelAliases={modelAliases}
        title={`Add ${kindLabel} Model`}
        kindFilter={combo.kind}
        addedModelValues={providers}
        closeOnSelect={false}
      />
    </div>
  );
}
