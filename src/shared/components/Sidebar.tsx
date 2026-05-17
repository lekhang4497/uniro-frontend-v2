"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpCircle,
  Copy,
  CheckCircle2,
  PowerOff,
  Power,
} from "lucide-react";
import { APP_CONFIG, UPDATER_CONFIG } from "@/shared/constants/config";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, type NavItem } from "./sidebar/navItems";
import { Button } from "./ui/button";
import { ConfirmModal } from "./Modal";
import { UniroMark } from "./UniroMark";

type UpdateInfo = {
  hasUpdate?: boolean;
  latestVersion?: string;
};

type SidebarProps = {
  /** Called when a nav link is clicked (used by the mobile drawer to close itself) */
  onClose?: () => void;
  /** Show the Admin nav group */
  isAdmin?: boolean;
};

export default function Sidebar({ onClose, isAdmin = false }: SidebarProps) {
  const pathname = usePathname() ?? "/";
  const [showShutdownModal, setShowShutdownModal] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [shutdownCountdown, setShutdownCountdown] = useState(0);
  const [enableTranslator, setEnableTranslator] = useState(false);
  const { copied, copy } = useCopyToClipboard(2000);

  const INSTALL_CMD = UPDATER_CONFIG.installCmdLatest;

  // Feature flag for translator route — gated server-side via /api/settings.
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.enableTranslator) setEnableTranslator(true);
      })
      .catch(() => {});
  }, []);

  // Lazy check for a newer npm release on mount.
  useEffect(() => {
    fetch("/api/version")
      .then((res) => res.json())
      .then((data: UpdateInfo) => {
        if (data.hasUpdate) setUpdateInfo(data);
      })
      .catch(() => {});
  }, []);

  // Active state: /dashboard root and /dashboard/endpoint/* both highlight Endpoint.
  // Otherwise highlight the longest-prefix match so /dashboard/providers/[id]
  // still selects Providers.
  const isActive = (href: string) => {
    if (href === "/dashboard/endpoint") {
      return pathname === "/dashboard" || pathname.startsWith("/dashboard/endpoint");
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const isItemVisible = (item: NavItem) => {
    if (!item.requiresFlag) return true;
    if (item.requiresFlag === "enableTranslator") return enableTranslator;
    return false;
  };

  const handleUpdate = () => {
    setShowUpdateModal(false);
    setIsUpdating(true);
  };

  // Triggered by the Copy button inside ManualUpdatePanel: copy + countdown + shutdown.
  const handleCopyAndShutdown = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
    } catch {
      /* clipboard blocked — fall through, useCopyToClipboard handles its own toast */
    }
    copy(INSTALL_CMD);
    let remaining = UPDATER_CONFIG.shutdownCountdownSec;
    setShutdownCountdown(remaining);
    const timer = setInterval(() => {
      remaining -= 1;
      setShutdownCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        fetch("/api/version/shutdown", { method: "POST" }).catch(() => {});
        setIsDisconnected(true);
      }
    }, 1000);
  };

  const handleCancelUpdate = () => {
    setIsUpdating(false);
    setShutdownCountdown(0);
  };

  const handleShutdown = async () => {
    setIsShuttingDown(true);
    try {
      await fetch("/api/shutdown", { method: "POST" });
    } catch {
      // Expected — server is going away.
    }
    setIsShuttingDown(false);
    setShowShutdownModal(false);
    setIsDisconnected(true);
  };

  return (
    <>
      <aside className="flex h-screen w-[260px] flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)]">
        {/* Brand — Uniro mark + wordmark + tagline */}
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-[10px] border-b border-[var(--border)] px-4 py-4 hover:bg-[var(--bg-tertiary)]/40 transition-colors"
        >
          <UniroMark size={26} className="shrink-0 text-[var(--text-primary)]" title="Uniro" />
          <div className="flex min-w-0 flex-col leading-none">
            <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
              {APP_CONFIG.name}
            </span>
            <span className="mt-1 text-[10.5px] text-[var(--text-tertiary)]">
              your AI endpoint
            </span>
          </div>
        </Link>

        {/* Update banner */}
        {updateInfo && (
          <div className="mx-3 mt-3 flex flex-col gap-1.5 rounded-[8px] border border-[var(--accent-orange)]/40 bg-[color-mix(in_srgb,var(--accent-orange)_10%,transparent)] p-2.5">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--accent-orange)]">
              <ArrowUpCircle className="h-3.5 w-3.5" />
              New version available: v{updateInfo.latestVersion}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowUpdateModal(true)}
                className="cursor-pointer rounded bg-[var(--accent-orange)] px-2 py-1 text-[11px] font-semibold text-[var(--text-inverted)] transition-opacity hover:opacity-90"
              >
                Update now
              </button>
              <button
                type="button"
                onClick={() => copy(INSTALL_CMD)}
                title="Copy install command"
                className="min-w-0 flex-1 cursor-pointer text-left transition-opacity hover:opacity-80"
              >
                <code className="block truncate font-mono text-[10px] text-[var(--accent-orange)]/80">
                  {copied ? "Copied" : INSTALL_CMD}
                </code>
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="custom-scrollbar flex-1 overflow-y-auto px-[10px] py-3">
          {NAV_GROUPS.filter(
            (g) => !g.visibleWhen || g.visibleWhen({ isAdmin, pathname })
          ).map((group) => {
            const visibleItems = group.items.filter(isItemVisible);
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label} className="mb-3 flex flex-col gap-[2px]">
                <div className="px-2 pb-[6px] pt-[10px] text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                  {group.label}
                </div>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "group relative flex items-center gap-[10px] rounded-[6px] px-2 py-[7px] text-[13px] transition-colors",
                        active
                          ? "bg-[var(--bg-tertiary)] font-medium text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/50 hover:text-[var(--text-primary)]"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-[var(--accent-blue)]" : "text-[var(--text-tertiary)]"
                        )}
                      />
                      <span className="flex-1 truncate text-left">{item.label}</span>
                      {item.dot === "ok" && (
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-1.5 rounded-full bg-[var(--accent-green)]"
                          style={{ boxShadow: "0 0 6px var(--accent-green)" }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer — server status card + shutdown */}
        <div className="space-y-3 border-t border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-[var(--accent-green)]"
                style={{ boxShadow: "0 0 6px var(--accent-green)" }}
              />
              <span className="text-[11px] font-semibold text-[var(--accent-green)]">
                Endpoint online
              </span>
              <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">
                v{APP_CONFIG.version}
              </span>
            </div>
            <div className="truncate font-mono text-[10.5px] text-[var(--text-secondary)]">
              localhost:20128/v1
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowShutdownModal(true)}
            className="inline-flex h-7 w-full items-center justify-center gap-1.5 rounded-[6px] text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent-red)_10%,transparent)] hover:text-[var(--accent-red)]"
          >
            <Power className="h-3.5 w-3.5" />
            Shutdown
          </button>
        </div>
      </aside>

      {/* Shutdown confirmation */}
      <ConfirmModal
        isOpen={showShutdownModal}
        onClose={() => setShowShutdownModal(false)}
        onConfirm={handleShutdown}
        title="Close proxy"
        message="Are you sure you want to close the proxy server?"
        confirmText="Close"
        cancelText="Cancel"
        variant="danger"
        loading={isShuttingDown}
      />

      {/* Update confirmation */}
      <ConfirmModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        onConfirm={handleUpdate}
        title="Update Uniro"
        message={`Show install command for v${updateInfo?.latestVersion || ""}? You can copy it and shutdown to install manually.`}
        confirmText="Show command"
        cancelText="Cancel"
        variant="primary"
      />

      {/* Disconnected / Updating overlay */}
      {(isDisconnected || isUpdating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          {isUpdating ? (
            <ManualUpdatePanel
              latestVersion={updateInfo?.latestVersion}
              installCmd={INSTALL_CMD}
              copied={!!copied}
              onCopyAndShutdown={handleCopyAndShutdown}
              onCancel={handleCancelUpdate}
              countdown={shutdownCountdown}
              isDisconnected={isDisconnected}
            />
          ) : (
            <div className="p-8 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent-red)_18%,transparent)] text-[var(--accent-red)]">
                <PowerOff className="h-8 w-8" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-white">Server disconnected</h2>
              <p className="mb-6 text-[var(--text-secondary)]">The proxy server has been stopped.</p>
              <Button variant="secondary" onClick={() => globalThis.location.reload()}>
                Reload page
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

type ManualUpdatePanelProps = {
  latestVersion?: string;
  installCmd: string;
  copied: boolean;
  onCopyAndShutdown: () => void;
  onCancel: () => void;
  countdown: number;
  isDisconnected: boolean;
};

function ManualUpdatePanel({
  latestVersion,
  installCmd,
  copied,
  onCopyAndShutdown,
  onCancel,
  countdown,
  isDisconnected,
}: ManualUpdatePanelProps): ReactNode {
  const isCountingDown = countdown > 0;
  return (
    <div className="w-full max-w-lg rounded-[12px] border border-white/10 bg-neutral-900/95 p-6 text-white">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
          <Copy className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">
            Update Uniro{latestVersion ? ` to v${latestVersion}` : ""}
          </h2>
          <p className="text-xs text-white/60">
            {isDisconnected
              ? "Server stopped. Paste the command into a terminal to install."
              : isCountingDown
                ? `Command copied. Server will stop in ${countdown}s...`
                : "Click the button below to copy the install command and shutdown."}
          </p>
        </div>
      </div>

      <p className="mb-2 text-sm text-white/80">Install command:</p>
      <div className="mb-4 w-full rounded bg-white/5 px-3 py-2">
        <code className="break-all font-mono text-xs text-amber-400">{installCmd}</code>
      </div>

      <ol className="mb-4 list-inside list-decimal space-y-1 text-xs text-white/70">
        <li>
          Click <strong>Copy &amp; shutdown</strong> below.
        </li>
        <li>Paste the command into your terminal and press Enter.</li>
        <li>
          Run <code className="rounded bg-white/10 px-1 text-green-400">uniro</code> again after install.
        </li>
      </ol>

      {isDisconnected ? (
        <Button variant="secondary" className="w-full" onClick={() => globalThis.location.reload()}>
          Reload page
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={isCountingDown}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="w-full"
            onClick={onCopyAndShutdown}
            disabled={isCountingDown}
          >
            {copied ? (
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Copied — shutting down...
              </span>
            ) : isCountingDown ? (
              `Shutting down in ${countdown}s`
            ) : (
              "Copy & shutdown"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
