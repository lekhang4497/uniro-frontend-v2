"use client";

import { useState, useEffect } from "react";
import { MITM_TOOLS } from "@/shared/constants/cliTools";
import { getModelsByProviderId } from "@/shared/constants/models";
import { isOpenAICompatibleProvider, isAnthropicCompatibleProvider } from "@/shared/constants/providers";
import { MitmServerCard, MitmToolCard } from "@/app/(dashboard)/dashboard/cli-tools/components";

type Connection = {
  provider: string;
  isActive?: boolean;
  name?: string;
};

type ApiKey = {
  id: string | number;
  key: string;
};

type MitmStatus = {
  running: boolean;
  certExists: boolean;
  dnsStatus: Record<string, boolean>;
  hasCachedPassword: boolean;
  needsSudoPassword?: boolean;
  isWin?: boolean;
};

export default function MitmPageClient() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [modelAliases, setModelAliases] = useState<Record<string, unknown>>({});
  const [cloudEnabled, setCloudEnabled] = useState(false);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [mitmStatus, setMitmStatus] = useState<MitmStatus>({ running: false, certExists: false, dnsStatus: {}, hasCachedPassword: false });

  useEffect(() => {
    fetchConnections();
    fetchApiKeys();
    fetchAliases();
    fetchCloudSettings();
  }, []);

  const fetchConnections = async () => {
    try {
      const res = await fetch("/api/providers");
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections || []);
      }
    } catch { /* ignore */ }
  };

  const fetchApiKeys = async () => {
    try {
      const res = await fetch("/api/keys");
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys || []);
      }
    } catch { /* ignore */ }
  };

  const fetchAliases = async () => {
    try {
      const res = await fetch("/api/models/alias");
      if (res.ok) {
        const data = await res.json();
        setModelAliases(data.aliases || {});
      }
    } catch { /* ignore */ }
  };

  const fetchCloudSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setCloudEnabled(data.cloudEnabled || false);
      }
    } catch { /* ignore */ }
  };

  const getActiveProviders = () => connections.filter((c) => c.isActive !== false);

  const hasActiveProviders = () => {
    const active = getActiveProviders();
    return active.some((conn) =>
      getModelsByProviderId(conn.provider).length > 0 ||
      isOpenAICompatibleProvider(conn.provider) ||
      isAnthropicCompatibleProvider(conn.provider)
    );
  };

  const mitmTools = Object.entries(MITM_TOOLS);

  return (
    <div className="px-8 py-7">
      <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">MITM Proxy</h1>
      <p className="mt-1 text-[14px] text-[var(--text-secondary)] max-w-[640px]">
        Intercept HTTPS from CLI tools that don&apos;t support custom endpoints — Copilot, Cursor, Antigravity, Kiro.
      </p>

      <div className="mt-6 flex w-full flex-col gap-6">
        {/* Page banner */}
        <header className="card flex flex-wrap items-center gap-5 px-6 py-4">
          <div className="flex items-center gap-3">
            <span
              className={`dot-pulse ${mitmStatus.running ? "" : "error"}`}
              aria-hidden="true"
            />
            <div>
              <h2 className="brand-mark text-base mb-0.5">
                MITM proxy {mitmStatus.running ? "intercepting" : "paused"}
              </h2>
              <div className="text-xs text-muted-foreground">
                Port 7878 · {mitmTools.length} CLI tools routed · CA {mitmStatus.certExists ? "installed" : "not installed"}
              </div>
            </div>
          </div>
          <div className="flex-1" />
          <span className={`chip ${mitmStatus.running ? "ok" : "bad"} text-[11px]`}>
            {mitmStatus.running ? "active" : "offline"}
          </span>
        </header>

        {/* MITM Server Card */}
        <MitmServerCard
          apiKeys={apiKeys}
          cloudEnabled={cloudEnabled}
          onStatusChange={setMitmStatus}
        />

        {/* Tool Cards */}
        <div className="grid gap-3 sm:gap-4">
          {mitmTools.map(([toolId, tool]) => (
            <MitmToolCard
              key={toolId}
              tool={tool}
              isExpanded={expandedTool === toolId}
              onToggle={() => setExpandedTool(expandedTool === toolId ? null : toolId)}
              serverRunning={mitmStatus.running}
              dnsActive={mitmStatus.dnsStatus?.[toolId] || false}
              hasCachedPassword={mitmStatus.hasCachedPassword || false}
              needsSudoPassword={mitmStatus.needsSudoPassword !== false}
              isWin={mitmStatus.isWin === true}
              apiKeys={apiKeys}
              activeProviders={getActiveProviders()}
              hasActiveProviders={hasActiveProviders()}
              modelAliases={modelAliases}
              cloudEnabled={cloudEnabled}
              onDnsChange={(data: any) => setMitmStatus((prev) => ({ ...prev, dnsStatus: data.dnsStatus ?? prev.dnsStatus }))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
