"use client";

/**
 * ModelAvailabilityBadge — compact inline status indicator
 *
 * Shows green when all models are operational, or amber/red when there are
 * issues, with a hover popover for details and cooldown clearing.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { CheckCircle2, Clock, AlertCircle, HelpCircle, ShieldCheck, AlertTriangle, RotateCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/shared/components";
import { useNotificationStore } from "@/store/notificationStore";

type StatusKey = "available" | "cooldown" | "unavailable" | "unknown";

const STATUS_CONFIG: Record<StatusKey, { icon: LucideIcon; color: string; label: string }> = {
  available: { icon: CheckCircle2, color: "var(--accent-green)", label: "Available" },
  cooldown: { icon: Clock, color: "var(--accent-orange)", label: "Cooldown" },
  unavailable: { icon: AlertCircle, color: "var(--accent-red)", label: "Unavailable" },
  unknown: { icon: HelpCircle, color: "var(--text-tertiary)", label: "Unknown" },
};

type ModelEntry = {
  provider: string;
  model: string;
  status: StatusKey;
};

type AvailabilityData = {
  models?: ModelEntry[];
  unavailableCount?: number;
};

export default function ModelAvailabilityBadge() {
  const [data, setData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [clearing, setClearing] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const notify = useNotificationStore() as { success: (msg: string) => void; error: (msg: string) => void };

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/models/availability");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silent fail — will retry
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Close popover on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setExpanded(false);
    };
    if (expanded) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [expanded]);

  const handleClearCooldown = async (provider: string, model: string) => {
    setClearing(`${provider}:${model}`);
    try {
      const res = await fetch("/api/models/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clearCooldown", provider, model }),
      });
      if (res.ok) {
        notify.success(`Cooldown cleared for ${model}`);
        await fetchStatus();
      } else {
        notify.error("Failed to clear cooldown");
      }
    } catch {
      notify.error("Failed to clear cooldown");
    } finally {
      setClearing(null);
    }
  };

  if (loading) return null;

  const models = data?.models || [];
  const unavailableCount =
    data?.unavailableCount || models.filter((m) => m.status !== "available").length;
  const isHealthy = unavailableCount === 0;

  // Group unhealthy models by provider
  const byProvider: Record<string, ModelEntry[]> = {};
  models.forEach((m) => {
    if (m.status === "available") return;
    const key = m.provider || "unknown";
    if (!byProvider[key]) byProvider[key] = [];
    byProvider[key].push(m);
  });

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button intentionally hidden; popover is reserved for future use */}

      {expanded && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-[var(--bg-primary)] border border-[var(--bg-secondary)] rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--bg-secondary)] bg-[var(--bg-secondary)]/30">
            <div className="flex items-center gap-2">
              {isHealthy ? (
                <ShieldCheck size={16} className="text-[var(--accent-green)]" />
              ) : (
                <AlertTriangle size={16} className="text-[var(--accent-orange)]" />
              )}
              <span className="text-sm font-semibold text-[var(--text-primary)]">Model Status</span>
            </div>
            <button
              onClick={fetchStatus}
              className="p-1 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title="Refresh"
            >
              <RotateCw size={14} />
            </button>
          </div>

          <div className="px-4 py-3 max-h-60 overflow-y-auto">
            {isHealthy ? (
              <p className="text-sm text-[var(--text-secondary)] text-center py-2">
                All models are responding normally.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {Object.entries(byProvider).map(([provider, provModels]) => (
                  <div key={provider}>
                    <p className="text-xs font-semibold text-[var(--text-primary)] mb-1.5 capitalize">
                      {provider}
                    </p>
                    <div className="flex flex-col gap-1">
                      {provModels.map((m) => {
                        const status = STATUS_CONFIG[m.status] || STATUS_CONFIG.unknown;
                        const StatusIcon = status.icon;
                        const isClearing = clearing === `${m.provider}:${m.model}`;
                        return (
                          <div
                            key={`${m.provider}-${m.model}`}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary)]/40"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <StatusIcon size={14} className="shrink-0" style={{ color: status.color }} />
                              <span className="font-mono text-xs text-[var(--text-primary)] truncate">
                                {m.model}
                              </span>
                            </div>
                            {m.status === "cooldown" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleClearCooldown(m.provider, m.model)}
                                disabled={isClearing}
                                className="text-[10px] px-1.5! py-0.5! ml-2"
                              >
                                {isClearing ? "..." : "Clear"}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
