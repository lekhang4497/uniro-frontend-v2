"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  LayoutGrid,
  ChevronDown,
  Check,
  Hourglass,
  Ban,
  CheckCircle2,
  RotateCw,
  Loader2,
  Edit2,
  Trash2,
  AlertCircle,
  CloudOff,
} from "lucide-react";
import ProviderIcon from "@/shared/components/ProviderIcon";
import QuotaTable from "./QuotaTable";
import Toggle from "@/shared/components/Toggle";
import { parseQuotaData, calculatePercentage, type NormalizedQuota } from "./utils";
import Card from "@/shared/components/Card";
import { EditConnectionModal } from "@/shared/components";
import type { ConnectionUpdates } from "@/shared/components/EditConnectionModal";
import { USAGE_SUPPORTED_PROVIDERS, USAGE_APIKEY_PROVIDERS } from "@/shared/constants/providers";

type Connection = {
  id: string;
  provider: string;
  authType?: string;
  isActive?: boolean;
  name?: string;
  email?: string;
  [key: string]: unknown;
};

type QuotaEntry = {
  quotas: NormalizedQuota[];
  plan?: string | null;
  message?: string | null;
  raw?: unknown;
};

// Connection is eligible for the quota page when it uses OAuth or is an apikey provider whitelisted for quota
const isUsageEligible = (conn: Connection) =>
  USAGE_SUPPORTED_PROVIDERS.includes(conn.provider) &&
  (conn.authType === "oauth" || USAGE_APIKEY_PROVIDERS.includes(conn.provider));

const REFRESH_INTERVAL_MS = 60000; // 60 seconds
const DEPLETED_QUOTA_THRESHOLD = 5; // percent
const AUTO_REFRESH_STORAGE_KEY = "quotaAutoRefresh";

export default function ProviderLimits() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [quotaData, setQuotaData] = useState<Record<string, QuotaEntry>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [autoRefresh, setAutoRefresh] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(AUTO_REFRESH_STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });
  const [, setLastUpdated] = useState<Date | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [proxyPools, setProxyPools] = useState<any[]>([]);
  const [providerFilter, setProviderFilter] = useState("all");
  const [expiringFirst, setExpiringFirst] = useState(false);
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);
  const [bulkToggling, setBulkToggling] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch all provider connections
  const fetchConnections = useCallback(async (): Promise<Connection[]> => {
    try {
      const response = await fetch("/api/providers/client");
      if (!response.ok) throw new Error("Failed to fetch connections");

      const data = await response.json();
      const connectionList: Connection[] = data.connections || [];
      setConnections(connectionList);
      return connectionList;
    } catch (error) {
      console.error("Error fetching connections:", error);
      setConnections([]);
      return [];
    }
  }, []);

  // Fetch quota for a specific connection
  const fetchQuota = useCallback(async (connectionId: string, provider: string) => {
    setLoading((prev) => ({ ...prev, [connectionId]: true }));
    setErrors((prev) => ({ ...prev, [connectionId]: null }));

    try {
      console.log(
        `[ProviderLimits] Fetching quota for ${provider} (${connectionId})`,
      );
      const response = await fetch(`/api/usage/${connectionId}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || response.statusText;

        // Handle different error types gracefully
        if (response.status === 404) {
          console.warn(
            `[ProviderLimits] Connection not found for ${provider}, skipping`,
          );
          return;
        }

        if (response.status === 401) {
          console.warn(
            `[ProviderLimits] Auth error for ${provider}:`,
            errorMsg,
          );
          setQuotaData((prev) => ({
            ...prev,
            [connectionId]: {
              quotas: [],
              message: errorMsg,
            },
          }));
          return;
        }

        throw new Error(`HTTP ${response.status}: ${errorMsg}`);
      }

      const data = await response.json();
      console.log(`[ProviderLimits] Got quota for ${provider}:`, data);

      const parsedQuotas = parseQuotaData(provider, data);

      setQuotaData((prev) => ({
        ...prev,
        [connectionId]: {
          quotas: parsedQuotas,
          plan: data.plan || null,
          message: data.message || null,
          raw: data,
        },
      }));
    } catch (error) {
      console.error(
        `[ProviderLimits] Error fetching quota for ${provider} (${connectionId}):`,
        error,
      );
      setErrors((prev) => ({
        ...prev,
        [connectionId]: (error as Error).message || "Failed to fetch quota",
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [connectionId]: false }));
    }
  }, []);

  // Refresh quota for a specific provider
  const refreshProvider = useCallback(
    async (connectionId: string, provider: string) => {
      await fetchQuota(connectionId, provider);
      setLastUpdated(new Date());
    },
    [fetchQuota],
  );

  const handleDeleteConnection = useCallback(async (id: string) => {
    if (!confirm("Delete this connection?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/providers/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConnections((prev) => prev.filter((c) => c.id !== id));
        setQuotaData((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setLoading((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setErrors((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    } catch (error) {
      console.error("Error deleting connection:", error);
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleToggleConnectionActive = useCallback(async (id: string, isActive: boolean) => {
    setTogglingId(id);
    try {
      const res = await fetch(`/api/providers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (res.ok) {
        setConnections((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isActive } : c)),
        );
      }
    } catch (error) {
      console.error("Error updating connection status:", error);
    } finally {
      setTogglingId(null);
    }
  }, []);

  const handleUpdateConnection = useCallback(
    async (formData: ConnectionUpdates) => {
      if (!selectedConnection?.id) return;
      const connectionId = selectedConnection.id;
      const provider = selectedConnection.provider;
      try {
        const res = await fetch(`/api/providers/${connectionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          await fetchConnections();
          setShowEditModal(false);
          setSelectedConnection(null);
          if (USAGE_SUPPORTED_PROVIDERS.includes(provider)) {
            await fetchQuota(connectionId, provider);
          }
        }
      } catch (error) {
        console.error("Error saving connection:", error);
      }
    },
    [selectedConnection, fetchConnections, fetchQuota],
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/proxy-pools?isActive=true", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.proxyPools) {
          setProxyPools(data.proxyPools);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Refresh all providers
  const refreshAll = useCallback(async () => {
    if (refreshingAll) return;

    setRefreshingAll(true);
    setCountdown(60);

    try {
      const conns = await fetchConnections();

      const eligibleConnections = conns.filter(isUsageEligible);

      await Promise.all(
        eligibleConnections.map((conn) => fetchQuota(conn.id, conn.provider)),
      );

      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error refreshing all providers:", error);
    } finally {
      setRefreshingAll(false);
    }
  }, [refreshingAll, fetchConnections, fetchQuota]);

  // Initial load
  useEffect(() => {
    const initializeData = async () => {
      setConnectionsLoading(true);
      const conns = await fetchConnections();
      setConnectionsLoading(false);

      const eligibleConnections = conns.filter(isUsageEligible);

      const loadingState: Record<string, boolean> = {};
      eligibleConnections.forEach((conn) => {
        loadingState[conn.id] = true;
      });
      setLoading(loadingState);

      await Promise.all(
        eligibleConnections.map((conn) => fetchQuota(conn.id, conn.provider)),
      );
      setLastUpdated(new Date());
    };

    initializeData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist auto-refresh preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(AUTO_REFRESH_STORAGE_KEY, String(autoRefresh));
  }, [autoRefresh]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      refreshAll();
    }, REFRESH_INTERVAL_MS);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return 60;
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [autoRefresh, refreshAll]);

  // Pause auto-refresh when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
      } else if (autoRefresh) {
        intervalRef.current = setInterval(refreshAll, REFRESH_INTERVAL_MS);
        countdownRef.current = setInterval(() => {
          setCountdown((prev) => (prev <= 1 ? 60 : prev - 1));
        }, 1000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [autoRefresh, refreshAll]);

  const filteredConnections = connections.filter(isUsageEligible);

  const providerFilteredConnections = filteredConnections.filter(
    (conn) => providerFilter === "all" || conn.provider === providerFilter,
  );

  const getEarliestResetTime = (conn: Connection) => {
    const resetTimes = (quotaData[conn.id]?.quotas || [])
      .map((quota) =>
        quota.resetAt ? new Date(quota.resetAt).getTime() : Number.POSITIVE_INFINITY,
      )
      .filter((time) => Number.isFinite(time));
    return resetTimes.length > 0 ? Math.min(...resetTimes) : Number.POSITIVE_INFINITY;
  };

  const sortedConnections = [...providerFilteredConnections].sort((a, b) => {
    if (expiringFirst) {
      const expiryDiff = getEarliestResetTime(a) - getEarliestResetTime(b);
      if (expiryDiff !== 0) return expiryDiff;
    }
    const orderA = USAGE_SUPPORTED_PROVIDERS.indexOf(a.provider);
    const orderB = USAGE_SUPPORTED_PROVIDERS.indexOf(b.provider);
    if (orderA !== orderB) return orderA - orderB;
    return a.provider.localeCompare(b.provider);
  });

  const isConnectionDepleted = (conn: Connection) => {
    const quotas = quotaData[conn.id]?.quotas;
    if (!quotas?.length) return false;
    return quotas.some((q) => {
      if (!q.total || q.total <= 0) return false;
      return calculatePercentage(q.used, q.total) <= DEPLETED_QUOTA_THRESHOLD;
    });
  };

  const bulkSetActive = useCallback(
    async (targetIds: string[], isActive: boolean) => {
      if (!targetIds.length || bulkToggling) return;
      setBulkToggling(true);
      try {
        await Promise.all(
          targetIds.map((id) =>
            fetch(`/api/providers/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isActive }),
            }),
          ),
        );
        setConnections((prev) =>
          prev.map((c) => (targetIds.includes(c.id) ? { ...c, isActive } : c)),
        );
      } catch (error) {
        console.error("Error bulk toggling connections:", error);
      } finally {
        setBulkToggling(false);
      }
    },
    [bulkToggling],
  );

  const handleDisableDepleted = () => {
    const ids = sortedConnections
      .filter((c) => (c.isActive ?? true) && isConnectionDepleted(c))
      .map((c) => c.id);
    bulkSetActive(ids, false);
  };

  const handleEnableAvailable = () => {
    const ids = sortedConnections
      .filter((c) => !(c.isActive ?? true) && !isConnectionDepleted(c))
      .map((c) => c.id);
    bulkSetActive(ids, true);
  };

  const providerOptions = Array.from(
    new Set(filteredConnections.map((conn) => conn.provider)),
  ).sort();
  const selectedProviderLabel =
    providerFilter === "all" ? "All providers" : providerFilter;

  // Empty state
  if (!connectionsLoading && sortedConnections.length === 0) {
    return (
      <Card padding="lg">
        <div className="text-center py-12">
          <CloudOff size={64} className="mx-auto text-[var(--text-secondary)] opacity-20" />
          <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
            No Providers Connected
          </h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            Connect to providers with OAuth to track your API quota limits and usage.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Provider Limits</h2>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setProviderMenuOpen((prev) => !prev)}
              className="flex h-8 items-center justify-between gap-1 rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-secondary)]/40 px-2 text-xs text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]"
              aria-haspopup="menu"
              aria-expanded={providerMenuOpen}
              title="Filter quota providers"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                {providerFilter === "all" ? (
                  <LayoutGrid size={14} className="text-[var(--text-secondary)]" />
                ) : (
                  <ProviderIcon
                    src={`/providers/${providerFilter}.png`}
                    alt={providerFilter}
                    size={18}
                    className="size-[18px] rounded object-contain"
                    fallbackText={providerFilter.slice(0, 2).toUpperCase()}
                  />
                )}
                <span className="truncate capitalize hidden lg:inline">
                  {selectedProviderLabel}
                </span>
              </span>
              <ChevronDown size={14} className="text-[var(--text-secondary)]" />
            </button>

            {providerMenuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-30 bg-transparent"
                  aria-label="Close provider filter"
                  onClick={() => setProviderMenuOpen(false)}
                />
                <div className="absolute left-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-[var(--bg-secondary)] bg-[var(--bg-primary)]/95 p-1.5 shadow-xl shadow-black/10 backdrop-blur sm:w-72">
                  <button
                    type="button"
                    onClick={() => {
                      setProviderFilter("all");
                      setProviderMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${providerFilter === "all" ? "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]" : "text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"}`}
                  >
                    <LayoutGrid size={22} />
                    <span className="font-medium">All providers</span>
                    {providerFilter === "all" && <Check size={20} className="ml-auto" />}
                  </button>
                  <div className="my-1 h-px bg-[var(--bg-secondary)]" />
                  <div className="max-h-72 overflow-y-auto pr-1">
                    {providerOptions.map((provider) => (
                      <button
                        key={provider}
                        type="button"
                        onClick={() => {
                          setProviderFilter(provider);
                          setProviderMenuOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${providerFilter === provider ? "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]" : "text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"}`}
                      >
                        <ProviderIcon
                          src={`/providers/${provider}.png`}
                          alt={provider}
                          size={24}
                          className="size-6 rounded-md object-contain"
                          fallbackText={provider.slice(0, 2).toUpperCase()}
                        />
                        <span className="font-medium capitalize">{provider}</span>
                        {providerFilter === provider && (
                          <Check size={20} className="ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setExpiringFirst((prev) => !prev)}
            className={`flex h-8 shrink-0 items-center gap-1 rounded-[var(--radius-md)] border px-2 text-xs transition-colors ${expiringFirst ? "border-[var(--accent-orange)]/40 bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]" : "border-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"}`}
            title="Sort accounts by earliest quota reset time"
          >
            <Hourglass size={14} />
            <span className="hidden sm:inline">Expiring first</span>
          </button>

          {/* Bulk: disable depleted */}
          <button
            type="button"
            onClick={handleDisableDepleted}
            disabled={bulkToggling}
            className="flex h-8 shrink-0 items-center gap-1 rounded-[var(--radius-md)] border border-[var(--accent-red)]/30 px-2 text-xs text-[var(--accent-red)] transition-colors hover:bg-[var(--accent-red)]/10 disabled:opacity-50"
            title="Disable connections with depleted quota (within current filter)"
          >
            <Ban size={14} />
            <span className="hidden sm:inline">Turn off Empty</span>
          </button>

          {/* Bulk: enable available */}
          <button
            type="button"
            onClick={handleEnableAvailable}
            disabled={bulkToggling}
            className="flex h-8 shrink-0 items-center gap-1 rounded-[var(--radius-md)] border border-[var(--accent-green)]/30 px-2 text-xs text-[var(--accent-green)] transition-colors hover:bg-[var(--accent-green)]/10 disabled:opacity-50"
            title="Enable connections that still have quota (within current filter)"
          >
            <CheckCircle2 size={14} />
            <span className="hidden sm:inline">Turn on Available</span>
          </button>

          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh((prev) => !prev)}
            className="flex h-8 shrink-0 items-center gap-1 rounded-[var(--radius-md)] border border-[var(--bg-secondary)] px-2 text-xs transition-colors hover:bg-[var(--bg-secondary)]"
            title={autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"}
          >
            <span
              className={`text-[10px] ${autoRefresh ? "text-[var(--accent-blue)]" : "text-[var(--text-secondary)]"}`}
            >
              {autoRefresh ? "ON" : "OFF"}
            </span>
            <span className="hidden text-[var(--text-primary)] sm:inline">Auto-refresh</span>
            {autoRefresh && (
              <span className="text-[10px] text-[var(--text-secondary)] tabular-nums">
                ({countdown}s)
              </span>
            )}
          </button>

          {/* Refresh all button */}
          <button
            type="button"
            onClick={refreshAll}
            disabled={refreshingAll}
            className="flex h-8 shrink-0 items-center gap-1 rounded-[var(--radius-md)] border border-[var(--bg-secondary)] px-2 text-xs text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)] disabled:opacity-50"
            title="Refresh all"
          >
            <RotateCw size={14} className={refreshingAll ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Provider cards: 2 columns, compact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sortedConnections.map((conn) => {
          const quota = quotaData[conn.id];
          const isLoading = loading[conn.id];
          const error = errors[conn.id];

          const isInactive = conn.isActive === false;
          const rowBusy = deletingId === conn.id || togglingId === conn.id;

          return (
            <Card
              key={conn.id}
              padding="none"
              className={`min-w-0 ${isInactive ? "opacity-60" : ""}`}
            >
              <div className="px-3 py-2 border-b border-[var(--bg-secondary)]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 shrink-0 rounded-md flex items-center justify-center overflow-hidden">
                      <ProviderIcon
                        src={`/providers/${conn.provider}.png`}
                        alt={conn.provider}
                        size={32}
                        className="object-contain"
                        fallbackText={conn.provider?.slice(0, 2).toUpperCase() || "PR"}
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] capitalize truncate">
                        {conn.provider}
                      </h3>
                      {(() => {
                        const isEmail = (v: unknown) =>
                          typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                        const label = isEmail(conn.email)
                          ? conn.email
                          : isEmail(conn.name)
                          ? conn.name
                          : conn.name;
                        return label ? (
                          <p className="text-xs text-[var(--text-secondary)] truncate">{label}</p>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => refreshProvider(conn.id, conn.provider)}
                      disabled={isLoading || rowBusy}
                      className="p-1.5 rounded-[var(--radius-md)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50"
                      title="Refresh quota"
                    >
                      <RotateCw
                        size={18}
                        className={`text-[var(--text-secondary)] ${isLoading ? "animate-spin" : ""}`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedConnection(conn);
                        setShowEditModal(true);
                      }}
                      disabled={rowBusy}
                      className="p-1.5 rounded-[var(--radius-md)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors disabled:opacity-50"
                      title="Edit connection"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteConnection(conn.id)}
                      disabled={rowBusy}
                      className="p-1.5 rounded-[var(--radius-md)] hover:bg-[var(--accent-red)]/10 text-[var(--accent-red)] transition-colors disabled:opacity-50"
                      title="Delete connection"
                    >
                      <Trash2
                        size={18}
                        className={deletingId === conn.id ? "animate-pulse" : ""}
                      />
                    </button>
                    <div
                      className="inline-flex items-center pl-0.5"
                      title={(conn.isActive ?? true) ? "Disable connection" : "Enable connection"}
                    >
                      <Toggle
                        size="sm"
                        checked={conn.isActive ?? true}
                        disabled={rowBusy}
                        onChange={(nextActive: boolean) =>
                          handleToggleConnectionActive(conn.id, nextActive)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-2 py-1.5">
                {isLoading ? (
                  <div className="text-center py-5 text-[var(--text-secondary)]">
                    <Loader2 size={28} className="mx-auto animate-spin" />
                  </div>
                ) : error ? (
                  <div className="text-center py-5">
                    <AlertCircle size={28} className="mx-auto text-[var(--accent-red)]" />
                    <p className="mt-1.5 text-xs text-[var(--text-secondary)]">{error}</p>
                  </div>
                ) : quota?.message ? (
                  <div className="text-center py-5">
                    <p className="text-xs text-[var(--text-secondary)]">{quota.message}</p>
                  </div>
                ) : (
                  <QuotaTable quotas={quota?.quotas} compact />
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <EditConnectionModal
        isOpen={showEditModal}
        connection={selectedConnection}
        proxyPools={proxyPools}
        onSave={handleUpdateConnection}
        onClose={() => {
          setShowEditModal(false);
          setSelectedConnection(null);
        }}
      />
    </div>
  );
}
