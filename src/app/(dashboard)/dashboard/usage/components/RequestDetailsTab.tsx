"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import {
  ChevronRight,
  Loader2,
  ArrowDownToLine,
  Languages,
  Braces,
  ArrowUpFromLine,
  Brain,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Card from "@/shared/components/Card";
import Button from "@/shared/components/Button";
import Drawer from "@/shared/components/Drawer";
import Pagination from "@/shared/components/Pagination";
import { cn } from "@/lib/utils";
import { AI_PROVIDERS, getProviderByAlias } from "@/shared/constants/providers";

type ProviderCacheValue = string | { name?: string };
type ProviderCache = Record<string, ProviderCacheValue>;

let providerNameCache: ProviderCache | null = null;
let providerNodesCache: Record<string, string> | null = null;

async function fetchProviderNames(): Promise<{
  providerNameCache: ProviderCache;
  providerNodesCache: Record<string, string>;
}> {
  if (providerNameCache && providerNodesCache) {
    return { providerNameCache, providerNodesCache };
  }

  const nodesRes = await fetch("/api/provider-nodes");
  const nodesData = await nodesRes.json();
  const nodes: Array<{ id: string; name: string }> = nodesData.nodes || [];
  providerNodesCache = {};

  for (const node of nodes) {
    providerNodesCache[node.id] = node.name;
  }

  providerNameCache = {
    ...(AI_PROVIDERS as ProviderCache),
    ...providerNodesCache,
  };

  return { providerNameCache, providerNodesCache };
}

function getProviderName(providerId: string | undefined, cache: ProviderCache | null): string {
  if (!providerId) return providerId || "";
  if (!cache) return providerId;

  const cached = cache[providerId];

  if (typeof cached === "string") {
    return cached;
  }

  if (cached?.name) {
    return cached.name;
  }

  const providerConfig =
    (getProviderByAlias?.(providerId) as { name?: string } | undefined) ||
    ((AI_PROVIDERS as Record<string, { name?: string }>)[providerId]);
  return providerConfig?.name || providerId;
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  icon: IconComp = null,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: LucideIcon | null;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-[var(--bg-secondary)] rounded-[var(--radius-md)] overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-[var(--bg-secondary)]/30 hover:bg-[var(--bg-secondary)]/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          {IconComp && <IconComp size={18} className="text-[var(--text-secondary)]" />}
          <span className="font-semibold text-sm text-[var(--text-primary)]">{title}</span>
        </div>
        <ChevronRight
          size={20}
          className={cn(
            "text-[var(--text-secondary)] transition-transform duration-200",
            isOpen ? "rotate-90" : "",
          )}
        />
      </button>

      {isOpen && (
        <div className="p-4 border-t border-[var(--bg-secondary)]">{children}</div>
      )}
    </div>
  );
}

function getInputTokens(tokens: Record<string, number> | null | undefined): number {
  const prompt = tokens?.prompt_tokens || tokens?.input_tokens || 0;
  const cache = tokens?.cached_tokens || tokens?.cache_read_input_tokens || 0;
  return prompt < cache ? cache : prompt;
}

type RequestDetail = {
  id: string;
  timestamp: string;
  model: string;
  provider: string;
  status?: string;
  tokens?: Record<string, number>;
  latency?: { ttft?: number; total?: number };
  request?: unknown;
  providerRequest?: unknown;
  providerResponse?: unknown;
  response?: { thinking?: string; content?: string };
};

type Provider = { id: string; name: string };

type Pagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export default function RequestDetailsTab() {
  const [details, setDetails] = useState<RequestDetail[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<RequestDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerNameCacheState, setProviderNameCacheState] = useState<ProviderCache | null>(null);
  const [filters, setFilters] = useState({
    provider: "",
    startDate: "",
    endDate: "",
  });

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/usage/providers");
      const data = await res.json();
      setProviders(data.providers || []);

      const cache = await fetchProviderNames();
      setProviderNameCacheState(cache.providerNameCache);
    } catch (error) {
      console.error("Failed to fetch providers:", error);
    }
  }, []);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });
      if (filters.provider) params.append("provider", filters.provider);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await fetch(`/api/usage/request-details?${params}`);
      const data = await res.json();

      setDetails(data.details || []);
      setPagination((prev) => ({ ...prev, ...data.pagination }));
    } catch (error) {
      console.error("Failed to fetch request details:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, filters]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleViewDetail = (detail: RequestDetail) => {
    setSelectedDetail(detail);
    setIsDrawerOpen(true);
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize: newPageSize, page: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({ provider: "", startDate: "", endDate: "" });
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card padding="md">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="provider-filter" className="text-sm font-medium text-[var(--text-primary)]">
              Provider
            </label>
            <select
              id="provider-filter"
              value={filters.provider}
              onChange={(e) => setFilters({ ...filters, provider: e.target.value })}
              className={cn(
                "h-9 px-3 rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)]",
                "text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/20",
                "w-full min-w-0 cursor-pointer",
              )}
              style={{ colorScheme: "auto" }}
            >
              <option value="">All Providers</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="start-date-filter" className="text-sm font-medium text-[var(--text-primary)]">
              Start Date
            </label>
            <input
              id="start-date-filter"
              type="datetime-local"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className={cn(
                "h-9 px-3 rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)]",
                "w-full min-w-0 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/20",
              )}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="end-date-filter" className="text-sm font-medium text-[var(--text-primary)]">
              End Date
            </label>
            <input
              id="end-date-filter"
              type="datetime-local"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className={cn(
                "h-9 px-3 rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)]",
                "w-full min-w-0 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/20",
              )}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-2 sm:col-span-2 lg:col-span-1">
            <span className="hidden text-sm font-medium text-[var(--text-primary)] opacity-0 lg:block" aria-hidden="true">
              Clear
            </span>
            <Button
              variant="ghost"
              onClick={handleClearFilters}
              disabled={!filters.provider && !filters.startDate && !filters.endDate}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px]">
            <thead>
              <tr className="border-b border-[var(--bg-secondary)]">
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Timestamp</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Model</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Provider</th>
                <th className="text-right p-4 text-sm font-semibold text-[var(--text-primary)]">Input Tokens</th>
                <th className="text-right p-4 text-sm font-semibold text-[var(--text-primary)]">Output Tokens</th>
                <th className="text-left p-4 text-sm font-semibold text-[var(--text-primary)]">Latency</th>
                <th className="text-center p-4 text-sm font-semibold text-[var(--text-primary)]">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[var(--text-secondary)]">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={20} className="animate-spin" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : details.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[var(--text-secondary)]">
                    No request details found
                  </td>
                </tr>
              ) : (
                details.map((detail, index) => (
                  <tr
                    key={`${detail.id}-${index}`}
                    className="border-b border-[var(--bg-secondary)] last:border-b-0 hover:bg-[var(--bg-secondary)]/30 transition-colors"
                  >
                    <td className="whitespace-nowrap p-4 text-sm text-[var(--text-primary)]">
                      {new Date(detail.timestamp).toLocaleString()}
                    </td>
                    <td className="max-w-[260px] truncate p-4 font-mono text-sm text-[var(--text-primary)]">
                      {detail.model}
                    </td>
                    <td className="max-w-[180px] truncate p-4 text-sm text-[var(--text-primary)]">
                      <span className="font-medium">
                        {getProviderName(detail.provider, providerNameCacheState)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-[var(--text-primary)] text-right font-mono">
                      {getInputTokens(detail.tokens).toLocaleString()}
                    </td>
                    <td className="p-4 text-sm text-[var(--text-primary)] text-right font-mono">
                      {detail.tokens?.completion_tokens?.toLocaleString() || 0}
                    </td>
                    <td className="p-4 text-sm text-[var(--text-secondary)]">
                      <div className="flex flex-col gap-0.5">
                        <div>
                          TTFT: <span className="font-mono">{detail.latency?.ttft || 0}ms</span>
                        </div>
                        <div>
                          Total: <span className="font-mono">{detail.latency?.total || 0}ms</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetail(detail)}
                      >
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && details.length > 0 && (
          <div className="border-t border-[var(--bg-secondary)]">
            <Pagination
              currentPage={pagination.page}
              pageSize={pagination.pageSize}
              totalItems={pagination.totalItems}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </Card>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Request Details"
        width="lg"
      >
        {selectedDetail && (
          <div className="space-y-6">
            <div className="grid min-w-0 grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <span className="text-[var(--text-secondary)]">ID:</span>{" "}
                <span className="break-all font-mono text-[var(--text-primary)]">{selectedDetail.id}</span>
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">Timestamp:</span>{" "}
                <span className="text-[var(--text-primary)]">
                  {new Date(selectedDetail.timestamp).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">Provider:</span>{" "}
                <span className="text-[var(--text-primary)] font-medium">
                  {getProviderName(selectedDetail.provider, providerNameCacheState)}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">Model:</span>{" "}
                <span className="text-[var(--text-primary)] font-mono">{selectedDetail.model}</span>
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">Status:</span>{" "}
                <span
                  className={cn(
                    "font-medium",
                    selectedDetail.status === "success"
                      ? "text-[var(--accent-green)]"
                      : "text-[var(--accent-red)]",
                  )}
                >
                  {selectedDetail.status}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">Latency:</span>{" "}
                <span className="text-[var(--text-primary)] font-mono">
                  TTFT {selectedDetail.latency?.ttft || 0}ms / Total{" "}
                  {selectedDetail.latency?.total || 0}ms
                </span>
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">Input Tokens:</span>{" "}
                <span className="text-[var(--text-primary)] font-mono">
                  {getInputTokens(selectedDetail.tokens).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-secondary)]">Output Tokens:</span>{" "}
                <span className="text-[var(--text-primary)] font-mono">
                  {selectedDetail.tokens?.completion_tokens?.toLocaleString() || 0}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <CollapsibleSection title="1. Client Request (Input)" defaultOpen icon={ArrowDownToLine}>
                <pre className="max-h-[300px] max-w-full overflow-auto rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-secondary)]/40 p-3 font-mono text-xs text-[var(--text-primary)] sm:p-4">
                  {JSON.stringify(selectedDetail.request, null, 2)}
                </pre>
              </CollapsibleSection>

              {selectedDetail.providerRequest != null && (
                <CollapsibleSection title="2. Provider Request (Translated)" icon={Languages}>
                  <pre className="max-h-[300px] max-w-full overflow-auto rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-secondary)]/40 p-3 font-mono text-xs text-[var(--text-primary)] sm:p-4">
                    {JSON.stringify(selectedDetail.providerRequest, null, 2)}
                  </pre>
                </CollapsibleSection>
              )}

              {selectedDetail.providerResponse != null && (
                <CollapsibleSection title="3. Provider Response (Raw)" icon={Braces}>
                  <pre className="max-h-[300px] max-w-full overflow-auto rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-secondary)]/40 p-3 font-mono text-xs text-[var(--text-primary)] sm:p-4">
                    {typeof selectedDetail.providerResponse === "object"
                      ? JSON.stringify(selectedDetail.providerResponse, null, 2)
                      : String(selectedDetail.providerResponse)}
                  </pre>
                </CollapsibleSection>
              )}

              <CollapsibleSection title="4. Client Response (Final)" defaultOpen icon={ArrowUpFromLine}>
                {selectedDetail.response?.thinking && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2 text-xs uppercase tracking-wide opacity-70">
                      <Brain size={16} />
                      Thinking Process
                    </h4>
                    <pre className="max-h-[200px] max-w-full overflow-auto rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 p-3 font-mono text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100 sm:p-4">
                      {selectedDetail.response.thinking}
                    </pre>
                  </div>
                )}

                <h4 className="font-semibold text-[var(--text-primary)] mb-2 text-xs uppercase tracking-wide opacity-70">
                  Content
                </h4>
                <pre className="max-h-[300px] max-w-full overflow-auto rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-secondary)]/40 p-3 font-mono text-xs text-[var(--text-primary)] sm:p-4">
                  {selectedDetail.response?.content || "[No content]"}
                </pre>
              </CollapsibleSection>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
