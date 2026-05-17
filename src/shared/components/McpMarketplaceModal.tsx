"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "./Modal";

const REGISTRY_ENDPOINT = "/api/cli-tools/cowork-mcp-registry";
const TOOLS_ENDPOINT = "/api/cli-tools/cowork-mcp-tools";

interface McpServer {
  url: string;
  name?: string;
  slug?: string;
  title?: string;
  description?: string;
  iconUrl?: string;
  oauth?: boolean;
  toolCount?: number;
  toolNames?: string[];
  transport?: string;
}

interface McpTool {
  name: string;
  description?: string;
}

interface ToolsCacheEntry {
  tools: McpTool[];
  requiresAuth?: boolean;
  error?: string;
}

export interface AddedMcpServer {
  name: string;
  title?: string;
  description?: string;
  url: string;
  transport?: string;
  oauth?: boolean;
  toolNames: string[];
}

export interface McpMarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd?: (server: AddedMcpServer) => void;
  addedNames?: string[];
}

export default function McpMarketplaceModal({
  isOpen,
  onClose,
  onAdd,
  addedNames = [],
}: McpMarketplaceModalProps) {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "authless" | "oauth">("all");
  const [error, setError] = useState<string | null>(null);
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);
  const [toolsCache, setToolsCache] = useState<Record<string, ToolsCacheEntry>>({});
  const [toolsLoading, setToolsLoading] = useState<Record<string, boolean>>({});
  const [toolSelection, setToolSelection] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    if (!isOpen) return;
    if (servers.length > 0) return;
    setLoading(true);
    fetch(REGISTRY_ENDPOINT)
      .then((r) => r.json() as Promise<{ servers?: McpServer[]; error?: string }>)
      .then((d) => {
        if (d.error) setError(d.error);
        else setServers(d.servers || []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isOpen, servers.length]);

  const addedSet = useMemo(() => new Set(addedNames), [addedNames]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return servers.filter((s) => {
      if (filter === "authless" && s.oauth) return false;
      if (filter === "oauth" && !s.oauth) return false;
      if (!q) return true;
      return (
        (s.title || "").toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q) ||
        (s.name || "").toLowerCase().includes(q)
      );
    });
  }, [servers, search, filter]);

  const fetchTools = async (server: McpServer) => {
    if (toolsCache[server.url]) return;
    setToolsLoading((p) => ({ ...p, [server.url]: true }));
    try {
      const r = await fetch(TOOLS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: server.url }),
      });
      const d = (await r.json()) as { tools?: McpTool[]; requiresAuth?: boolean; error?: string };
      const tools: McpTool[] = d.tools || [];
      const fallback = Array.isArray(server.toolNames) ? server.toolNames : [];
      const toolNames = tools.length > 0 ? tools.map((t) => t.name) : fallback;
      setToolsCache((p) => ({
        ...p,
        [server.url]: { tools, requiresAuth: !!d.requiresAuth, error: d.error },
      }));
      setToolSelection((p) => ({
        ...p,
        [server.url]: Object.fromEntries(toolNames.map((t) => [t, true])),
      }));
    } catch (e) {
      setToolsCache((p) => ({
        ...p,
        [server.url]: { tools: [], error: (e as Error).message },
      }));
    } finally {
      setToolsLoading((p) => ({ ...p, [server.url]: false }));
    }
  };

  const expandServer = (server: McpServer) => {
    if (expandedUrl === server.url) {
      setExpandedUrl(null);
      return;
    }
    setExpandedUrl(server.url);
    fetchTools(server);
  };

  const toggleTool = (url: string, tool: string) => {
    setToolSelection((prev) => ({
      ...prev,
      [url]: { ...prev[url], [tool]: !prev[url]?.[tool] },
    }));
  };

  const setAllTools = (url: string, value: boolean) => {
    const sel = toolSelection[url] || {};
    setToolSelection((prev) => ({
      ...prev,
      [url]: Object.fromEntries(Object.keys(sel).map((t) => [t, value])),
    }));
  };

  const confirmAdd = (server: McpServer) => {
    const sel = toolSelection[server.url] || {};
    const enabled = Object.keys(sel).filter((t) => sel[t]);
    onAdd?.({
      name: server.slug || server.name || "",
      title: server.title,
      description: server.description,
      url: server.url,
      transport: server.transport,
      oauth: server.oauth,
      toolNames: enabled,
    });
    setExpandedUrl(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Browse MCP Marketplace" size="lg">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or description..."
            className="flex-1 px-2 py-1.5 bg-[var(--bg-primary)] rounded text-xs border border-[var(--bg-secondary)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--accent-blue)]"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as "all" | "authless" | "oauth")}
            className="px-2 py-1.5 bg-[var(--bg-primary)] rounded text-xs border border-[var(--bg-secondary)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--accent-blue)]"
          >
            <option value="all">All</option>
            <option value="authless">Authless</option>
            <option value="oauth">OAuth</option>
          </select>
        </div>

        {error && (
          <div className="px-2 py-1.5 rounded text-xs bg-[var(--accent-red)]/10 text-[var(--accent-red)]">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs py-4 justify-center">
            <Loader2 className="animate-spin h-4 w-4" />
            <span>Loading registry...</span>
          </div>
        )}

        {!loading && (
          <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
            {filtered.length === 0 && (
              <div className="text-center text-xs text-[var(--text-secondary)] py-6">
                No servers match filter
              </div>
            )}
            {filtered.map((s) => {
              const added = addedSet.has(s.slug || s.name || "");
              const expanded = expandedUrl === s.url;
              const cache = toolsCache[s.url];
              const isLoadingTools = toolsLoading[s.url];
              const sel = toolSelection[s.url] || {};
              const toolKeys = Object.keys(sel);
              const selectedCount = Object.values(sel).filter(Boolean).length;
              return (
                <div
                  key={s.url}
                  className="rounded border border-transparent hover:border-[var(--bg-secondary)]"
                >
                  <div className="flex items-start gap-2 px-2 py-2 hover:bg-[var(--bg-secondary)]/50">
                    {s.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.iconUrl}
                        alt=""
                        className="size-7 rounded shrink-0 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="size-7 rounded bg-[var(--bg-secondary)] shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-xs">{s.title}</span>
                        {s.oauth ? (
                          <span className="px-1 py-0.5 text-[9px] rounded bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]">
                            OAuth
                          </span>
                        ) : (
                          <span className="px-1 py-0.5 text-[9px] rounded bg-[var(--accent-green)]/10 text-[var(--accent-green)]">
                            Authless
                          </span>
                        )}
                        {s.toolCount && s.toolCount > 0 && (
                          <span className="text-[10px] text-[var(--text-secondary)]">
                            {s.toolCount} tools
                          </span>
                        )}
                      </div>
                      {s.description && (
                        <p className="text-[10px] text-[var(--text-secondary)] line-clamp-2 mt-0.5">
                          {s.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => (added ? null : expandServer(s))}
                      disabled={added}
                      className={`shrink-0 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                        added
                          ? "bg-[var(--accent-green)]/10 text-[var(--accent-green)] cursor-default"
                          : expanded
                            ? "bg-[var(--bg-primary)] border border-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                            : "bg-[var(--accent-blue)]/10 border border-[var(--accent-blue)]/40 text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/20"
                      }`}
                    >
                      {added ? "Added" : expanded ? "Cancel" : "+ Add"}
                    </button>
                  </div>
                  {expanded && (
                    <div className="px-3 py-2 bg-[var(--bg-secondary)]/40 border-t border-[var(--bg-secondary)] flex flex-col gap-2">
                      {isLoadingTools && (
                        <div className="flex items-center gap-2 text-[var(--text-secondary)] text-[10px] py-1">
                          <Loader2 className="animate-spin h-3.5 w-3.5" />
                          <span>Probing server for tools...</span>
                        </div>
                      )}
                      {!isLoadingTools && cache?.requiresAuth && (
                        <p className="text-[10px] text-[var(--accent-orange)] bg-[var(--accent-orange)]/10 px-2 py-1 rounded">
                          🔐 OAuth required. Add now and authenticate after Apply; tool list will be discovered after first connect.
                        </p>
                      )}
                      {!isLoadingTools && cache?.error && !cache?.requiresAuth && (
                        <p className="text-[10px] text-[var(--accent-red)] bg-[var(--accent-red)]/10 px-2 py-1 rounded">
                          Probe failed: {cache.error}
                        </p>
                      )}
                      {!isLoadingTools && toolKeys.length === 0 && !cache?.requiresAuth && !cache?.error && (
                        <p className="text-[10px] text-[var(--text-secondary)]">
                          No tools advertised by server.
                        </p>
                      )}
                      {!isLoadingTools && toolKeys.length > 0 && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[var(--text-secondary)]">
                              {selectedCount}/{toolKeys.length} tools enabled
                            </span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => setAllTools(s.url, true)}
                                className="text-[10px] text-[var(--accent-blue)] hover:underline"
                              >
                                All
                              </button>
                              <span className="text-[10px] text-[var(--text-secondary)]">·</span>
                              <button
                                type="button"
                                onClick={() => setAllTools(s.url, false)}
                                className="text-[10px] text-[var(--accent-blue)] hover:underline"
                              >
                                None
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                            {toolKeys.map((t) => (
                              <label
                                key={t}
                                className="flex items-center gap-1.5 text-[10px] cursor-pointer hover:bg-[var(--bg-secondary)] px-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={!!sel[t]}
                                  onChange={() => toggleTool(s.url, t)}
                                  className="size-3"
                                />
                                <span className="truncate">{t}</span>
                              </label>
                            ))}
                          </div>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => confirmAdd(s)}
                        className="self-end px-2 py-1 rounded text-[10px] font-medium bg-[var(--accent-blue)] text-[var(--text-inverted)] hover:brightness-95"
                      >
                        ✓ Confirm Add
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="text-[10px] text-[var(--text-secondary)] text-right">
          {filtered.length} of {servers.length} servers
        </div>
      </div>
    </Modal>
  );
}
