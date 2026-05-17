// @ts-nocheck
// Legacy CLI tool card. Per T15 plan, large/intricate card files keep
// `@ts-nocheck` while visible tokens/icons are migrated. Business logic preserved.
"use client";

import { AlertCircle, ArrowRight, BadgeCheck, Check, ChevronDown, Copy, Eye, EyeOff, Loader2, PlayCircle, Shield, ShieldCheck, StopCircle, TriangleAlert } from "lucide-react";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
const ICON_DISPATCH: Record<string, ComponentType<LucideProps>> = {
  check: Check, content_copy: Copy, visibility: Eye, visibility_off: EyeOff, expand_more: ChevronDown, progress_activity: Loader2,
};
function DynIcon({ name, ...rest }: { name: string } & LucideProps) {
  const Comp = ICON_DISPATCH[name] ?? Copy;
  return <Comp {...rest} />;
}
import { useState, useEffect, useCallback } from "react";
import { Card, Button, Badge, Input } from "@/shared/components";

const DEFAULT_MITM_ROUTER_BASE = "http://localhost:20128";

/**
 * Shared MITM infrastructure card — manages SSL cert + server start/stop.
 * DNS per-tool is handled separately in MitmToolCard.
 */
export default function MitmServerCard({ apiKeys, cloudEnabled, onStatusChange }: any) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [sudoPassword, setSudoPassword] = useState("");
  const [selectedApiKey, setSelectedApiKey] = useState(() => apiKeys?.[0]?.key || "");
  const [pendingAction, setPendingAction] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [mitmRouterBaseUrl, setMitmRouterBaseUrl] = useState(DEFAULT_MITM_ROUTER_BASE);
  const [port443Conflict, setPort443Conflict] = useState(null);

  const serverIsWindows = status?.isWin === true;
  const canRunWithoutPassword = serverIsWindows || status?.hasCachedPassword || status?.needsSudoPassword === false;
  const isAdmin = status?.isAdmin !== false;
  // No privilege: not admin/root AND (Win OR no cached sudo password)
  const noPrivilege = !isAdmin && (serverIsWindows || (!status?.hasCachedPassword && status?.needsSudoPassword !== false));

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/cli-tools/antigravity-mitm");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.mitmRouterBaseUrl) {
          setMitmRouterBaseUrl(data.mitmRouterBaseUrl);
        }
        onStatusChange?.(data);
      }
    } catch {
      setStatus({ running: false, certExists: false, dnsStatus: {} });
    }
  }, [onStatusChange]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchStatus();
    });
  }, [fetchStatus]);

  const handleAction = (action) => {
    setActionError(null);
    // Wait for status to load before deciding whether to show sudo modal
    if (!status) return;
    if (canRunWithoutPassword) {
      doAction(action, "");
    } else {
      setPendingAction(action);
      setShowPasswordModal(true);
      setModalError(null);
    }
  };

  const doAction = async (action, password, forceKillPort443 = false) => {
    setLoading(true);
    setActionError(null);
    try {
      let res;
      if (action === "trust-cert") {
        res = await fetch("/api/cli-tools/antigravity-mitm", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "trust-cert", sudoPassword: password }),
        });
      } else if (action === "start") {
        const keyToUse = selectedApiKey?.trim()
          || (apiKeys?.length > 0 ? apiKeys[0].key : null)
          || (!cloudEnabled ? "sk_uniro" : null);
        res = await fetch("/api/cli-tools/antigravity-mitm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: keyToUse,
            sudoPassword: password,
            mitmRouterBaseUrl: mitmRouterBaseUrl.trim() || DEFAULT_MITM_ROUTER_BASE,
            forceKillPort443,
          }),
        });
      } else {
        res = await fetch("/api/cli-tools/antigravity-mitm", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sudoPassword: password }),
        });
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.code === "PORT_443_BUSY" && data.portOwner) {
          setShowPasswordModal(false);
          setPort443Conflict({ owner: data.portOwner, password });
          return;
        }
        setActionError(data.error || `Failed to ${action} MITM server`);
        return;
      }
      setShowPasswordModal(false);
      setSudoPassword("");
      setPort443Conflict(null);
      await fetchStatus();
    } catch (e) {
      setActionError(e.message || "Network error");
    } finally {
      setLoading(false);
      setPendingAction(null);
    }
  };

  const handleKillAndStart = () => {
    const pwd = port443Conflict?.password || "";
    doAction("start", pwd, true);
  };

  const handleConfirmPassword = () => {
    if (!sudoPassword.trim()) {
      setModalError("Sudo password is required");
      return;
    }
    doAction(pendingAction, sudoPassword);
  };

  const isRunning = status?.running;

  return (
    <>
      <Card padding="sm" className="border-primary/20 bg-primary/5">
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Shield size={20} className="text-primary" />
              <span className="font-semibold text-sm text-[var(--text-primary)]">MITM Server</span>
              {isRunning ? (
                <Badge variant="success" size="sm">Running</Badge>
              ) : (
                <Badge variant="default" size="sm">Stopped</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1 text-xs text-[var(--text-secondary)]" data-i18n-skip="true">
              {[
                { label: "Cert", ok: status?.certExists },
                { label: "Trusted", ok: status?.certTrusted },
                { label: "Server", ok: isRunning },
              ].map(({ label, ok }) => (
                <span key={label} className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded ${ok ? "text-green-600" : "text-[var(--text-secondary)]"}`}>
                  <DynIcon name={ok ? "check_circle" : "cancel"} size={12} className="" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Purpose & How it works */}
          <div className="px-2 py-2 rounded-lg bg-[var(--bg-elevated)]/50 border border-border/50 flex flex-col gap-2">
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              <span className="font-medium text-[var(--text-primary)]">Purpose:</span> Use Antigravity IDE & GitHub Copilot → with ANY provider/model from Uniro
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              <span className="font-medium text-[var(--text-primary)]">How it works:</span> Antigravity/Copilot IDE request → DNS redirect to localhost:443 → MITM proxy intercepts → Uniro → response to Antigravity/Copilot
            </p>
          </div>

          {/* Base URL + API Key — same row pattern as Claude Code / cli-tools */}
          <div className="flex flex-col gap-2">
            <div className="grid gap-1 sm:grid-cols-[8rem_auto_1fr] sm:items-center sm:gap-2">
              <span className="text-xs font-semibold text-[var(--text-primary)] sm:text-right sm:text-sm">Uniro Base URL</span>
              <ArrowRight size={14} className="hidden text-[var(--text-secondary)] sm:inline" />
              <input
                type="text"
                value={mitmRouterBaseUrl}
                onChange={(e) => setMitmRouterBaseUrl(e.target.value)}
                placeholder={DEFAULT_MITM_ROUTER_BASE}
                disabled={isRunning}
                className="flex-1 min-w-0 px-2 py-1.5 bg-[var(--bg-elevated)] rounded border border-border text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
              />
            </div>
            {!isRunning && (
              <div className="grid gap-1 sm:grid-cols-[8rem_auto_1fr] sm:items-center sm:gap-2">
                <span className="text-xs font-semibold text-[var(--text-primary)] sm:text-right sm:text-sm">API Key</span>
                <ArrowRight size={14} className="hidden text-[var(--text-secondary)] sm:inline" />
                <input
                  type="text"
                  list="mitm-api-keys"
                  value={selectedApiKey}
                  onChange={(e) => setSelectedApiKey(e.target.value)}
                  placeholder={cloudEnabled ? "Enter or pick API key" : "sk_uniro (default)"}
                  className="flex-1 min-w-0 px-2 py-1.5 bg-[var(--bg-elevated)] rounded border border-border text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                {apiKeys?.length > 0 && (
                  <datalist id="mitm-api-keys">
                    {apiKeys.map((key) => (
                      <option key={key.id} value={key.key}>{key.name || key.key}</option>
                    ))}
                  </datalist>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center" data-i18n-skip="true">
            {status?.certExists && !status?.certTrusted && (
              <button
                onClick={() => handleAction("trust-cert")}
                disabled={loading}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs font-medium text-yellow-600 transition-colors hover:bg-yellow-500/20 disabled:opacity-50 sm:w-auto sm:py-1.5"
              >
                <BadgeCheck size={16} />
                Trust Cert
              </button>
            )}
            {isRunning ? (
              <button
                onClick={() => handleAction("stop")}
                disabled={loading}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/20 disabled:opacity-50 sm:w-auto sm:py-1.5"
              >
                <StopCircle size={16} />
                Stop Server
              </button>
            ) : (
              <button
                onClick={() => handleAction("start")}
                disabled={loading || !status || (serverIsWindows && !isAdmin)}
                title={serverIsWindows && !isAdmin ? "Administrator required" : undefined}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50 sm:w-auto sm:py-1.5"
              >
                <PlayCircle size={16} />
                Start Server
              </button>
            )}
            {isRunning && (
              <p className="text-xs text-[var(--text-secondary)]">Enable DNS per tool below to activate interception</p>
            )}
          </div>

          {/* Action error */}
          {actionError && (
            <div className="flex items-start gap-2 px-2 py-1.5 rounded text-xs bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Windows admin warning */}
          {serverIsWindows && !isAdmin && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded text-xs bg-red-500/10 text-red-600 border border-red-500/20">
              <ShieldCheck size={14} />
              <span>Administrator required — restart Uniro as Administrator to use MITM</span>
            </div>
          )}
        </div>
      </Card>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-[var(--bg-elevated)] p-5 shadow-xl sm:p-6">
            <h3 className="font-semibold text-[var(--text-primary)]">Sudo Password Required</h3>
            <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <TriangleAlert size={20} className="text-yellow-500" />
              <p className="text-xs text-[var(--text-secondary)]">Required for SSL certificate and server startup</p>
            </div>
            <Input
              type="password"
              placeholder="Enter sudo password"
              value={sudoPassword}
              onChange={(e) => setSudoPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !loading) handleConfirmPassword(); }}
            />
            {modalError && (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded text-xs bg-red-500/10 text-red-600">
                <AlertCircle size={14} />
                <span>{modalError}</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowPasswordModal(false); setSudoPassword(""); setModalError(null); }} disabled={loading}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmPassword} loading={loading}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Port 443 Conflict Modal */}
      {port443Conflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 flex w-full max-w-md flex-col gap-4 rounded-xl border border-border bg-[var(--bg-elevated)] p-5 shadow-xl sm:p-6">
            <h3 className="font-semibold text-[var(--text-primary)]">Port 443 Already In Use</h3>
            <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <TriangleAlert size={20} className="text-yellow-500" />
              <div className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                <p>Port 443 is currently used by another process:</p>
                <p className="font-mono text-[var(--text-primary)]" data-i18n-skip="true">
                  {port443Conflict.owner.name} (PID {port443Conflict.owner.pid})
                </p>
                <p>Kill this process to start MITM Server?</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setPort443Conflict(null); setLoading(false); }} disabled={loading}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleKillAndStart} loading={loading}>
                Kill & Start
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
