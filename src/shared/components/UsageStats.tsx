"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { FREE_PROVIDERS, AI_PROVIDERS } from "@/shared/constants/providers";
import Badge from "./Badge";
import Card from "./Card";
// These dashboard sub-components are still JS; cast to `any` to bypass JSDoc-inferred
// prop signatures until they're converted in a later page-group task (T12).
import OverviewCardsImpl from "@/app/(dashboard)/dashboard/usage/components/OverviewCards";
import UsageTableImpl, {
  fmt,
  fmtTime,
} from "@/app/(dashboard)/dashboard/usage/components/UsageTable";
import ProviderTopologyImpl from "@/app/(dashboard)/dashboard/usage/components/ProviderTopology";
import UsageChartImpl from "@/app/(dashboard)/dashboard/usage/components/UsageChart";

 
const OverviewCards = OverviewCardsImpl as unknown as React.ComponentType<any>;
const UsageTable = UsageTableImpl as unknown as React.ComponentType<any>;
const ProviderTopology = ProviderTopologyImpl as unknown as React.ComponentType<any>;
const UsageChart = UsageChartImpl as unknown as React.ComponentType<any>;
 

 
function isLLMProvider(id: string): boolean {
   
  const p = (AI_PROVIDERS as Record<string, any>)[id];
  if (!p?.serviceKinds) return true;
  return p.serviceKinds.includes("llm");
}

function timeAgo(timestamp: string | number | Date): string {
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function TimeAgo({ timestamp }: { timestamp: string | number | Date }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return <>{timeAgo(timestamp)}</>;
}

interface RecentRequest {
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  timestamp: string | number | Date;
  status?: string;
  provider?: string;
}

function RecentRequests({ requests = [] }: { requests?: RecentRequest[] }) {
  return (
    <Card className="flex min-w-0 flex-col overflow-hidden" padding="sm" style={{ height: 480 }}>
      <div className="px-1 py-2 border-b border-[var(--bg-secondary)] shrink-0">
        <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          Recent Requests
        </span>
      </div>

      {!requests.length ? (
        <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)] text-sm">
          No requests yet.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <table className="w-full min-w-[300px] border-collapse text-xs">
            <thead className="sticky top-0 bg-[var(--bg-primary)] z-10">
              <tr className="border-b border-[var(--bg-secondary)]">
                <th className="py-1.5 text-left font-semibold text-[var(--text-secondary)] w-2"></th>
                <th className="py-1.5 text-left font-semibold text-[var(--text-secondary)]">
                  Model
                </th>
                <th className="py-1.5 text-right font-semibold text-[var(--text-secondary)] whitespace-nowrap">
                  In / Out
                </th>
                <th className="py-1.5 text-right font-semibold text-[var(--text-secondary)]">
                  When
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--bg-secondary)]/50">
              {requests.map((r, i) => {
                const ok = !r.status || r.status === "ok" || r.status === "success";
                return (
                  <tr key={i} className="hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="py-1.5">
                      <span
                        className={`block w-1.5 h-1.5 rounded-full ${
                          ok ? "bg-[var(--accent-green)]" : "bg-[var(--accent-red)]"
                        }`}
                      />
                    </td>
                    <td
                      className="py-1.5 font-mono truncate max-w-[120px]"
                      title={r.model}
                    >
                      {r.model}
                    </td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      <span className="text-[var(--accent-blue)]">{fmt(r.promptTokens)}↑</span>{" "}
                      <span className="text-[var(--accent-green)]">{fmt(r.completionTokens)}↓</span>
                    </td>
                    <td className="py-1.5 text-right text-[var(--text-secondary)] whitespace-nowrap">
                      <TimeAgo timestamp={r.timestamp} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

interface UsageDatum {
  key?: string;
  promptTokens?: number;
  completionTokens?: number;
  cost?: number;
  requests?: number;
  rawModel?: string;
  accountName?: string;
  keyName?: string;
  endpoint?: string;
  provider?: string;
  connectionId?: string;
  lastUsed?: string | number | Date | null;
   
  [key: string]: any;
}

interface EnrichedDatum extends UsageDatum {
  totalTokens: number;
  totalCost: number;
  inputCost: number;
  outputCost: number;
  pending: number;
}

function sortData(
  dataMap: Record<string, UsageDatum> = {},
  pendingMap: Record<string, number> = {},
  sortBy: string,
  sortOrder: string
): EnrichedDatum[] {
  return Object.entries(dataMap)
    .map(([key, data]): EnrichedDatum => {
      const totalTokens = (data.promptTokens || 0) + (data.completionTokens || 0);
      const totalCost = data.cost || 0;
      const inputCost = totalTokens > 0 ? (data.promptTokens || 0) * (totalCost / totalTokens) : 0;
      const outputCost =
        totalTokens > 0 ? (data.completionTokens || 0) * (totalCost / totalTokens) : 0;
      return {
        ...data,
        key,
        totalTokens,
        totalCost,
        inputCost,
        outputCost,
        pending: pendingMap[key] || 0,
      };
    })
    .sort((a, b) => {
       
      let valA: any = a[sortBy];
       
      let valB: any = b[sortBy];
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
}

function getGroupKey(item: UsageDatum, keyField: string): string {
  switch (keyField) {
    case "rawModel":
      return item.rawModel || "Unknown Model";
    case "accountName":
      return (
        item.accountName ||
        `Account ${item.connectionId?.slice(0, 8)}...` ||
        "Unknown Account"
      );
    case "keyName":
      return item.keyName || "Unknown Key";
    case "endpoint":
      return item.endpoint || "Unknown Endpoint";
    default:
      return String(item[keyField] ?? "Unknown");
  }
}

interface GroupSummary {
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  inputCost: number;
  outputCost: number;
  lastUsed: string | number | Date | null;
  pending: number;
}

interface GroupedData {
  groupKey: string;
  summary: GroupSummary;
  items: EnrichedDatum[];
}

function groupDataByKey(data: EnrichedDatum[], keyField: string): GroupedData[] {
  if (!Array.isArray(data)) return [];
  const groups: Record<string, GroupedData> = {};
  data.forEach((item) => {
    const gk = getGroupKey(item, keyField);
    if (!groups[gk]) {
      groups[gk] = {
        groupKey: gk,
        summary: {
          requests: 0,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          cost: 0,
          inputCost: 0,
          outputCost: 0,
          lastUsed: null,
          pending: 0,
        },
        items: [],
      };
    }
    const s = groups[gk].summary;
    s.requests += item.requests || 0;
    s.promptTokens += item.promptTokens || 0;
    s.completionTokens += item.completionTokens || 0;
    s.totalTokens += item.totalTokens || 0;
    s.cost += item.cost || 0;
    s.inputCost += item.inputCost || 0;
    s.outputCost += item.outputCost || 0;
    s.pending += item.pending || 0;
    if (item.lastUsed && (!s.lastUsed || new Date(item.lastUsed) > new Date(s.lastUsed))) {
      s.lastUsed = item.lastUsed;
    }
    groups[gk].items.push(item);
  });
  return Object.values(groups);
}

interface ColumnDef {
  field: string;
  label: string;
  align?: "left" | "right";
}

const MODEL_COLUMNS: ColumnDef[] = [
  { field: "rawModel", label: "Model" },
  { field: "provider", label: "Provider" },
  { field: "requests", label: "Requests", align: "right" },
  { field: "lastUsed", label: "Last Used", align: "right" },
];

const ACCOUNT_COLUMNS: ColumnDef[] = [
  { field: "rawModel", label: "Model" },
  { field: "provider", label: "Provider" },
  { field: "accountName", label: "Account" },
  { field: "requests", label: "Requests", align: "right" },
  { field: "lastUsed", label: "Last Used", align: "right" },
];

const API_KEY_COLUMNS: ColumnDef[] = [
  { field: "keyName", label: "API Key Name" },
  { field: "rawModel", label: "Model" },
  { field: "provider", label: "Provider" },
  { field: "requests", label: "Requests", align: "right" },
  { field: "lastUsed", label: "Last Used", align: "right" },
];

const ENDPOINT_COLUMNS: ColumnDef[] = [
  { field: "endpoint", label: "Endpoint" },
  { field: "rawModel", label: "Model" },
  { field: "provider", label: "Provider" },
  { field: "requests", label: "Requests", align: "right" },
  { field: "lastUsed", label: "Last Used", align: "right" },
];

const TABLE_OPTIONS = [
  { value: "model", label: "Usage by Model" },
  { value: "account", label: "Usage by Account" },
  { value: "apiKey", label: "Usage by API Key" },
  { value: "endpoint", label: "Usage by Endpoint" },
];

const PERIODS = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "60d", label: "60D" },
];

type TableView = "model" | "account" | "apiKey" | "endpoint";

interface Stats {
  byModel?: Record<string, UsageDatum>;
  byAccount?: Record<string, UsageDatum>;
  byApiKey?: Record<string, UsageDatum>;
  byEndpoint?: Record<string, UsageDatum>;
  activeRequests?: unknown[];
  recentRequests?: RecentRequest[];
  errorProvider?: string;
  pending?: {
    byModel?: Record<string, number>;
     
    byAccount?: Record<string, any>;
  };
}

interface ProviderRef {
  provider: string;
  name?: string;
}

export interface UsageStatsProps {
  period?: string;
  setPeriod?: (period: string) => void;
  hidePeriodSelector?: boolean;
}

export default function UsageStats({
  period: periodProp,
  setPeriod: setPeriodProp,
  hidePeriodSelector = false,
}: UsageStatsProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sortBy = searchParams?.get("sortBy") || "rawModel";
  const sortOrder = searchParams?.get("sortOrder") || "asc";

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [tableView, setTableView] = useState<TableView>("model");
  const [viewMode, setViewMode] = useState<"costs" | "tokens">("costs");
  const [providers, setProviders] = useState<ProviderRef[]>([]);
  const [periodLocal, setPeriodLocal] = useState("7d");
  const period = periodProp ?? periodLocal;
  const setPeriod = setPeriodProp ?? setPeriodLocal;

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const seen = new Set<string>();
         
        const unique = ((d?.connections || []) as any[]).filter((c) => {
          if (c.isActive === false) return false;
          if (!isLLMProvider(c.provider)) return false;
          if (seen.has(c.provider)) return false;
          seen.add(c.provider);
          return true;
        });
         
        const noAuthProviders = (Object.values(FREE_PROVIDERS) as any[])
          .filter((p) => p.noAuth && !seen.has(p.id) && isLLMProvider(p.id))
          .map((p) => ({ provider: p.id, name: p.name }));
        setProviders([...unique, ...noAuthProviders]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!stats) setLoading(true);
    else setFetching(true);

    fetch(`/api/usage/stats?period=${period}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStats((prev) => ({ ...(prev || {}), ...data }));
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setFetching(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  useEffect(() => {
    const es = new EventSource("/api/usage/stream");

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setStats((prev) => ({
          ...(prev || {}),
          activeRequests: data.activeRequests,
          recentRequests: data.recentRequests,
          errorProvider: data.errorProvider,
          pending: data.pending,
        }));
        setLoading(false);
      } catch (err) {
        console.error("[SSE CLIENT] parse error:", err);
      }
    };

    es.onerror = () => setLoading(false);

    return () => es.close();
  }, []);

  const toggleSort = useCallback(
    (_tableType: TableView, field: string) => {
      const params = new URLSearchParams(searchParams?.toString());
      if (params.get("sortBy") === field) {
        params.set("sortOrder", params.get("sortOrder") === "asc" ? "desc" : "asc");
      } else {
        params.set("sortBy", field);
        params.set("sortOrder", "asc");
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

   
  const activeTableConfig: any = useMemo(() => {
    if (!stats) return null;
    switch (tableView) {
      case "model": {
        const pendingMap = stats.pending?.byModel || {};
        return {
          columns: MODEL_COLUMNS,
          groupedData: groupDataByKey(
            sortData(stats.byModel, pendingMap, sortBy, sortOrder),
            "rawModel"
          ),
          storageKey: "usage-stats:expanded-models",
          emptyMessage: "No usage recorded yet.",
          renderSummaryCells: (group: GroupedData) => (
            <>
              <td className="px-6 py-3 text-[var(--text-secondary)]">—</td>
              <td className="px-6 py-3 text-right">{fmt(group.summary.requests)}</td>
              <td className="px-6 py-3 text-right text-[var(--text-secondary)] whitespace-nowrap">
                {fmtTime(group.summary.lastUsed)}
              </td>
            </>
          ),
          renderDetailCells: (item: EnrichedDatum) => (
            <>
              <td
                className={`px-6 py-3 font-medium transition-colors ${
                  item.pending > 0 ? "text-[var(--accent-blue)]" : ""
                }`}
              >
                {item.rawModel}
              </td>
              <td className="px-6 py-3">
                <Badge variant={item.pending > 0 ? "primary" : "neutral"} size="sm">
                  {item.provider}
                </Badge>
              </td>
              <td className="px-6 py-3 text-right">{fmt(item.requests)}</td>
              <td className="px-6 py-3 text-right text-[var(--text-secondary)] whitespace-nowrap">
                {fmtTime(item.lastUsed)}
              </td>
            </>
          ),
        };
      }
      case "account": {
        const pendingMap: Record<string, number> = {};
        if (stats?.pending?.byAccount) {
          Object.entries(stats.byAccount || {}).forEach(([accountKey, data]) => {
            const connPending = stats.pending?.byAccount?.[data.connectionId ?? ""];
            if (connPending) {
              const modelKey = data.provider
                ? `${data.rawModel} (${data.provider})`
                : data.rawModel ?? "";
              pendingMap[accountKey] = connPending[modelKey] || 0;
            }
          });
        }
        return {
          columns: ACCOUNT_COLUMNS,
          groupedData: groupDataByKey(
            sortData(stats.byAccount, pendingMap, sortBy, sortOrder),
            "accountName"
          ),
          storageKey: "usage-stats:expanded-accounts",
          emptyMessage: "No account-specific usage recorded yet.",
          renderSummaryCells: (group: GroupedData) => (
            <>
              <td className="px-6 py-3 text-[var(--text-secondary)]">—</td>
              <td className="px-6 py-3 text-[var(--text-secondary)]">—</td>
              <td className="px-6 py-3 text-right">{fmt(group.summary.requests)}</td>
              <td className="px-6 py-3 text-right text-[var(--text-secondary)] whitespace-nowrap">
                {fmtTime(group.summary.lastUsed)}
              </td>
            </>
          ),
          renderDetailCells: (item: EnrichedDatum) => (
            <>
              <td
                className={`px-6 py-3 font-medium transition-colors ${
                  item.pending > 0 ? "text-[var(--accent-blue)]" : ""
                }`}
              >
                {item.accountName || `Account ${item.connectionId?.slice(0, 8)}...`}
              </td>
              <td
                className={`px-6 py-3 font-medium transition-colors ${
                  item.pending > 0 ? "text-[var(--accent-blue)]" : ""
                }`}
              >
                {item.rawModel}
              </td>
              <td className="px-6 py-3">
                <Badge variant={item.pending > 0 ? "primary" : "neutral"} size="sm">
                  {item.provider}
                </Badge>
              </td>
              <td className="px-6 py-3 text-right">{fmt(item.requests)}</td>
              <td className="px-6 py-3 text-right text-[var(--text-secondary)] whitespace-nowrap">
                {fmtTime(item.lastUsed)}
              </td>
            </>
          ),
        };
      }
      case "apiKey": {
        return {
          columns: API_KEY_COLUMNS,
          groupedData: groupDataByKey(
            sortData(stats.byApiKey, {}, sortBy, sortOrder),
            "keyName"
          ),
          storageKey: "usage-stats:expanded-apikeys",
          emptyMessage: "No API key usage recorded yet.",
          renderSummaryCells: (group: GroupedData) => (
            <>
              <td className="px-6 py-3 text-[var(--text-secondary)]">—</td>
              <td className="px-6 py-3 text-[var(--text-secondary)]">—</td>
              <td className="px-6 py-3 text-right">{fmt(group.summary.requests)}</td>
              <td className="px-6 py-3 text-right text-[var(--text-secondary)] whitespace-nowrap">
                {fmtTime(group.summary.lastUsed)}
              </td>
            </>
          ),
          renderDetailCells: (item: EnrichedDatum) => (
            <>
              <td className="px-6 py-3 font-medium">{item.keyName}</td>
              <td className="px-6 py-3">{item.rawModel}</td>
              <td className="px-6 py-3">
                <Badge variant="neutral" size="sm">
                  {item.provider}
                </Badge>
              </td>
              <td className="px-6 py-3 text-right">{fmt(item.requests)}</td>
              <td className="px-6 py-3 text-right text-[var(--text-secondary)] whitespace-nowrap">
                {fmtTime(item.lastUsed)}
              </td>
            </>
          ),
        };
      }
      case "endpoint":
      default: {
        return {
          columns: ENDPOINT_COLUMNS,
          groupedData: groupDataByKey(
            sortData(stats.byEndpoint, {}, sortBy, sortOrder),
            "endpoint"
          ),
          storageKey: "usage-stats:expanded-endpoints",
          emptyMessage: "No endpoint usage recorded yet.",
          renderSummaryCells: (group: GroupedData) => (
            <>
              <td className="px-6 py-3 text-[var(--text-secondary)]">—</td>
              <td className="px-6 py-3 text-[var(--text-secondary)]">—</td>
              <td className="px-6 py-3 text-right">{fmt(group.summary.requests)}</td>
              <td className="px-6 py-3 text-right text-[var(--text-secondary)] whitespace-nowrap">
                {fmtTime(group.summary.lastUsed)}
              </td>
            </>
          ),
          renderDetailCells: (item: EnrichedDatum) => (
            <>
              <td className="px-6 py-3 font-medium font-mono text-sm">{item.endpoint}</td>
              <td className="px-6 py-3">{item.rawModel}</td>
              <td className="px-6 py-3">
                <Badge variant="neutral" size="sm">
                  {item.provider}
                </Badge>
              </td>
              <td className="px-6 py-3 text-right">{fmt(item.requests)}</td>
              <td className="px-6 py-3 text-right text-[var(--text-secondary)] whitespace-nowrap">
                {fmtTime(item.lastUsed)}
              </td>
            </>
          ),
        };
      }
    }
  }, [stats, tableView, sortBy, sortOrder]);

  if (!stats && !loading)
    return <div className="text-[var(--text-secondary)]">Failed to load usage statistics.</div>;

  const spinner = (
    <div className="flex items-center justify-center py-12 text-[var(--text-secondary)]">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {!hidePeriodSelector && (
        <div className="flex w-full items-center gap-2 sm:w-auto sm:self-end">
          <div className="grid flex-1 grid-cols-4 items-center gap-1 rounded-[var(--radius)] border border-[var(--bg-secondary)] bg-[var(--bg-secondary)] p-1 sm:flex sm:flex-none">
            {PERIODS.map((p) => (
              <button
                type="button"
                key={p.value}
                onClick={() => setPeriod(p.value)}
                disabled={fetching}
                className={`rounded-[6px] px-3 py-1 text-sm font-medium transition-colors ${
                  period === p.value
                    ? "bg-[var(--accent-blue)] text-[var(--text-inverted)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {fetching && (
            <Loader2 className="h-4 w-4 text-[var(--text-secondary)] animate-spin" />
          )}
        </div>
      )}

      {loading || !stats ? spinner : <OverviewCards stats={stats} />}

      {loading || !stats ? (
        spinner
      ) : (
        <div className="grid min-w-0 grid-cols-1 items-stretch gap-2 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <ProviderTopology
            providers={providers}
            activeRequests={stats.activeRequests || []}
            lastProvider={stats.recentRequests?.[0]?.provider || ""}
            errorProvider={stats.errorProvider || ""}
          />
          <RecentRequests requests={stats.recentRequests || []} />
        </div>
      )}

      {loading ? spinner : <UsageChart period={period} />}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <select
            value={tableView}
            onChange={(e) => setTableView(e.target.value as TableView)}
            className="w-full rounded-[var(--radius)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--accent-blue)] sm:w-auto"
            style={{ colorScheme: "auto" }}
          >
            {TABLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 items-center gap-1 rounded-[var(--radius)] border border-[var(--bg-secondary)] bg-[var(--bg-secondary)] p-1 sm:flex">
            <button
              type="button"
              onClick={() => setViewMode("costs")}
              className={`px-3 py-1 rounded-[6px] text-sm font-medium transition-colors ${
                viewMode === "costs"
                  ? "bg-[var(--accent-blue)] text-[var(--text-inverted)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
              }`}
            >
              Costs
            </button>
            <button
              type="button"
              onClick={() => setViewMode("tokens")}
              className={`px-3 py-1 rounded-[6px] text-sm font-medium transition-colors ${
                viewMode === "tokens"
                  ? "bg-[var(--accent-blue)] text-[var(--text-inverted)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
              }`}
            >
              Tokens
            </button>
          </div>
        </div>
        {loading
          ? spinner
          : activeTableConfig && (
              <UsageTable
                title=""
                columns={activeTableConfig.columns}
                groupedData={activeTableConfig.groupedData}
                tableType={tableView}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onToggleSort={toggleSort}
                viewMode={viewMode}
                storageKey={activeTableConfig.storageKey}
                renderSummaryCells={activeTableConfig.renderSummaryCells}
                renderDetailCells={activeTableConfig.renderDetailCells}
                emptyMessage={activeTableConfig.emptyMessage}
              />
            )}
      </div>
    </div>
  );
}
