"use client";

import { useState, useEffect, useRef } from "react";
import {
  ChevronUp,
  ChevronDown,
  Lock,
  Key,
  Network,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge, Toggle } from "@/shared/components";
import CooldownTimer from "./CooldownTimer";

type ProxyPool = {
  id: string;
  name: string;
  proxyUrl?: string;
  noProxy?: string;
  isActive?: boolean;
};

type Connection = {
  id: string;
  name?: string;
  email?: string;
  displayName?: string;
  testStatus?: string;
  isActive?: boolean;
  lastError?: string;
  priority?: number;
  globalPriority?: number;
  providerSpecificData?: {
    proxyPoolId?: string | null;
    connectionProxyEnabled?: boolean;
    connectionProxyUrl?: string;
    connectionNoProxy?: string;
  };
  [k: string]: unknown;
};

export default function ConnectionRow({
  connection,
  proxyPools,
  isOAuth,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onToggleActive,
  onUpdateProxy,
  onEdit,
  onDelete,
}: {
  connection: Connection;
  proxyPools?: ProxyPool[];
  isOAuth: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleActive: (isActive: boolean) => void;
  onUpdateProxy?: (poolId: string | null) => Promise<void> | void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showProxyDropdown, setShowProxyDropdown] = useState(false);
  const [updatingProxy, setUpdatingProxy] = useState(false);
  const proxyDropdownRef = useRef<HTMLDivElement | null>(null);

  const proxyPoolMap = new Map((proxyPools || []).map((pool) => [pool.id, pool]));
  const boundProxyPoolId = connection.providerSpecificData?.proxyPoolId || null;
  const boundProxyPool = boundProxyPoolId ? proxyPoolMap.get(boundProxyPoolId) : null;
  const hasLegacyProxy =
    connection.providerSpecificData?.connectionProxyEnabled === true &&
    !!connection.providerSpecificData?.connectionProxyUrl;
  const hasAnyProxy = !!boundProxyPoolId || hasLegacyProxy;
  const proxyDisplayText = boundProxyPool
    ? `Pool: ${boundProxyPool.name}`
    : boundProxyPoolId
    ? `Pool: ${boundProxyPoolId} (inactive/missing)`
    : hasLegacyProxy
    ? `Legacy: ${connection.providerSpecificData?.connectionProxyUrl}`
    : "";

  let maskedProxyUrl = "";
  if (boundProxyPool?.proxyUrl || connection.providerSpecificData?.connectionProxyUrl) {
    const rawProxyUrl =
      boundProxyPool?.proxyUrl || connection.providerSpecificData?.connectionProxyUrl || "";
    try {
      const parsed = new URL(rawProxyUrl);
      maskedProxyUrl = `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}`;
    } catch {
      maskedProxyUrl = rawProxyUrl;
    }
  }

  const noProxyText =
    boundProxyPool?.noProxy || connection.providerSpecificData?.connectionNoProxy || "";

  let proxyBadgeVariant: "success" | "error" | "default" = "default";
  if (boundProxyPool?.isActive === true) {
    proxyBadgeVariant = "success";
  } else if (boundProxyPoolId || hasLegacyProxy) {
    proxyBadgeVariant = "error";
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showProxyDropdown) return;
    const handler = (e: MouseEvent) => {
      if (proxyDropdownRef.current && !proxyDropdownRef.current.contains(e.target as Node)) {
        setShowProxyDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showProxyDropdown]);

  const handleSelectProxy = async (poolId: string) => {
    setUpdatingProxy(true);
    try {
      if (onUpdateProxy) await onUpdateProxy(poolId === "__none__" ? null : poolId);
    } finally {
      setUpdatingProxy(false);
      setShowProxyDropdown(false);
    }
  };

  const isEmail = (v: unknown): v is string =>
    typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const displayName = isOAuth
    ? isEmail(connection.email)
      ? connection.email
      : isEmail(connection.name)
      ? connection.name
      : connection.name || connection.email || connection.displayName || "OAuth Account"
    : connection.name;

  const [isCooldown, setIsCooldown] = useState(false);

  // Get earliest model lock timestamp
  const modelLockUntil =
    Object.entries(connection)
      .filter(([k]) => k.startsWith("modelLock_"))
      .map(([, v]) => v as string | undefined)
      .filter((v): v is string => !!v)
      .sort()[0] || null;

  useEffect(() => {
    const checkCooldown = () => {
      const until =
        Object.entries(connection)
          .filter(([k]) => k.startsWith("modelLock_"))
          .map(([, v]) => v as string | undefined)
          .filter((v): v is string => !!v && new Date(v).getTime() > Date.now())
          .sort()[0] || null;
      setIsCooldown(!!until);
    };

    checkCooldown();
    const interval = modelLockUntil ? setInterval(checkCooldown, 1000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [modelLockUntil, connection]);

  // Determine effective status
  const effectiveStatus =
    connection.testStatus === "unavailable" && !isCooldown
      ? "active"
      : connection.testStatus;

  const getStatusVariant = (): "success" | "error" | "default" => {
    if (connection.isActive === false) return "default";
    if (effectiveStatus === "active" || effectiveStatus === "success") return "success";
    if (
      effectiveStatus === "error" ||
      effectiveStatus === "expired" ||
      effectiveStatus === "unavailable"
    )
      return "error";
    return "default";
  };

  return (
    <div
      className={`group flex min-w-0 flex-col gap-3 rounded-lg p-2 transition-colors hover:bg-[var(--bg-secondary)]/40 sm:flex-row sm:items-center sm:justify-between ${connection.isActive === false ? "opacity-60" : ""}`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center sm:gap-3">
        {/* Priority arrows */}
        <div className="flex shrink-0 flex-col">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className={`p-0.5 rounded ${isFirst ? "text-[var(--text-tertiary)]/30 cursor-not-allowed" : "hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--accent-blue)]"}`}
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className={`p-0.5 rounded ${isLast ? "text-[var(--text-tertiary)]/30 cursor-not-allowed" : "hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--accent-blue)]"}`}
          >
            <ChevronDown size={14} />
          </button>
        </div>
        {isOAuth ? (
          <Lock size={16} className="shrink-0 text-[var(--text-secondary)]" />
        ) : (
          <Key size={16} className="shrink-0 text-[var(--text-secondary)]" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{displayName}</p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
            <Badge variant={getStatusVariant()} size="sm" dot>
              {connection.isActive === false ? "disabled" : (effectiveStatus || "Unknown")}
            </Badge>
            {hasAnyProxy && (
              <Badge variant={proxyBadgeVariant} size="sm">
                Proxy
              </Badge>
            )}
            {isCooldown && connection.isActive !== false && modelLockUntil && (
              <CooldownTimer until={modelLockUntil} />
            )}
            {connection.lastError && connection.isActive !== false && (
              <span
                className="max-w-full truncate text-xs text-[var(--accent-red)] sm:max-w-[300px]"
                title={connection.lastError}
              >
                {connection.lastError}
              </span>
            )}
            <span className="text-xs text-[var(--text-secondary)]">#{connection.priority}</span>
            {connection.globalPriority && (
              <span className="text-xs text-[var(--text-secondary)]">
                Auto: {connection.globalPriority}
              </span>
            )}
          </div>
          {hasAnyProxy && (
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span
                className="max-w-full truncate text-[11px] text-[var(--text-secondary)] sm:max-w-[420px]"
                title={proxyDisplayText}
              >
                {proxyDisplayText}
              </span>
              {maskedProxyUrl && (
                <code className="max-w-full truncate rounded bg-[var(--bg-secondary)] px-1 py-0.5 font-mono text-[10px] text-[var(--text-secondary)] sm:max-w-[260px]">
                  {maskedProxyUrl}
                </code>
              )}
              {noProxyText && (
                <span
                  className="max-w-full truncate text-[11px] text-[var(--text-secondary)] sm:max-w-[320px]"
                  title={noProxyText}
                >
                  no_proxy: {noProxyText}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
        <div className="grid flex-1 grid-cols-3 gap-1 sm:flex sm:flex-none">
          {/* Proxy button with inline dropdown */}
          {(proxyPools || []).length > 0 && (
            <div className="relative" ref={proxyDropdownRef}>
              <button
                onClick={() => setShowProxyDropdown((v) => !v)}
                className={`flex w-full flex-col items-center rounded px-2 py-1 transition-colors hover:bg-[var(--bg-secondary)] ${hasAnyProxy ? "text-[var(--accent-blue)]" : "text-[var(--text-secondary)] hover:text-[var(--accent-blue)]"}`}
                disabled={updatingProxy}
              >
                {updatingProxy ? <Loader2 size={18} className="animate-spin" /> : <Network size={18} />}
                <span className="text-[10px] leading-tight">Proxy</span>
              </button>
              {showProxyDropdown && (
                <div className="absolute right-0 top-full z-50 mt-1 max-w-[78vw] min-w-[160px] rounded-lg border border-[var(--bg-secondary)] bg-[var(--bg-primary)] py-1 shadow-lg">
                  <button
                    onClick={() => handleSelectProxy("__none__")}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--bg-secondary)] ${!boundProxyPoolId ? "text-[var(--accent-blue)] font-medium" : "text-[var(--text-primary)]"}`}
                  >
                    None
                  </button>
                  {(proxyPools || []).map((pool) => (
                    <button
                      key={pool.id}
                      onClick={() => handleSelectProxy(pool.id)}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--bg-secondary)] ${boundProxyPoolId === pool.id ? "text-[var(--accent-blue)] font-medium" : "text-[var(--text-primary)]"}`}
                    >
                      {pool.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={onEdit}
            className="flex flex-col items-center rounded px-2 py-1 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--accent-blue)]"
          >
            <Pencil size={18} />
            <span className="text-[10px] leading-tight">Edit</span>
          </button>
          <button
            onClick={onDelete}
            className="flex flex-col items-center rounded px-2 py-1 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10"
          >
            <Trash2 size={18} />
            <span className="text-[10px] leading-tight">Delete</span>
          </button>
        </div>
        <span
          title={(connection.isActive ?? true) ? "Disable connection" : "Enable connection"}
          className="inline-flex"
        >
          <Toggle
            size="sm"
            checked={connection.isActive ?? true}
            onChange={onToggleActive}
          />
        </span>
      </div>
    </div>
  );
}
