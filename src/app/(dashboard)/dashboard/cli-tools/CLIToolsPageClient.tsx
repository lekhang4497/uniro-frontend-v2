"use client";

import { useState, useEffect, useCallback } from "react";
import { CardSkeleton } from "@/shared/components";
import { Shield } from "lucide-react";
import { CLI_TOOLS } from "@/shared/constants/cliTools";
import { getModelsByProviderId, PROVIDER_ID_TO_ALIAS } from "@/shared/constants/models";
import { ClaudeToolCard, CodexToolCard, DroidToolCard, OpenClawToolCard, HermesToolCard, DefaultToolCard, OpenCodeToolCard, CoworkToolCard, CopilotToolCard, ClineToolCard, KiloToolCard, MitmLinkCard } from "./components";
import { MITM_TOOLS } from "@/shared/constants/cliTools";

const CLOUD_URL = process.env.NEXT_PUBLIC_CLOUD_URL;

const ALL_STATUSES_URL = "/api/cli-tools/all-statuses";

type Props = {
  machineId: string;
};

type Connection = {
  provider: string;
  isActive?: boolean;
  name?: string;
};

type ApiKey = {
  id: string | number;
  key: string;
};

export default function CLIToolsPageClient({ machineId: _machineId }: Props) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [modelMappings, setModelMappings] = useState<Record<string, Record<string, string>>>({});
  const [cloudEnabled, setCloudEnabled] = useState(false);
  const [tunnelEnabled, setTunnelEnabled] = useState(false);
  const [tunnelPublicUrl, setTunnelPublicUrl] = useState("");
  const [tailscaleEnabled, setTailscaleEnabled] = useState(false);
  const [tailscaleUrl, setTailscaleUrl] = useState("");
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [toolStatuses, setToolStatuses] = useState<Record<string, unknown>>({});

  useEffect(() => {
    fetchConnections();
    loadCloudSettings();
    fetchApiKeys();
    fetchAllStatuses();
  }, []);

  const fetchAllStatuses = async () => {
    try {
      const res = await fetch(ALL_STATUSES_URL);
      if (res.ok) setToolStatuses(await res.json());
    } catch (error) {
      console.log("Error fetching tool statuses:", error);
    }
  };

  const loadCloudSettings = async () => {
    try {
      const [settingsRes, tunnelRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/tunnel/status"),
      ]);
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setCloudEnabled(data.cloudEnabled || false);
      }
      if (tunnelRes.ok) {
        const data = await tunnelRes.json();
        setTunnelEnabled(!!(data.tunnel?.enabled || data.tunnel?.settingsEnabled));
        setTunnelPublicUrl(data.tunnel?.publicUrl || "");
        setTailscaleEnabled(!!(data.tailscale?.enabled || data.tailscale?.settingsEnabled));
        setTailscaleUrl(data.tailscale?.tunnelUrl || "");
      }
    } catch (error) {
      console.log("Error loading settings:", error);
    }
  };

  const fetchApiKeys = async () => {
    try {
      const res = await fetch("/api/keys");
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys || []);
      }
    } catch (error) {
      console.log("Error fetching API keys:", error);
    }
  };

  const fetchConnections = async () => {
    try {
      const res = await fetch("/api/providers");
      const data = await res.json();
      if (res.ok) {
        setConnections(data.connections || []);
      }
    } catch (error) {
      console.log("Error fetching connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActiveProviders = () => connections.filter((c) => c.isActive !== false);

  const getAllAvailableModels = () => {
    const activeProviders = getActiveProviders();
    const models: Array<{
      value: string;
      label: string;
      provider: string;
      alias: string;
      connectionName?: string;
      modelId: string;
    }> = [];
    const seenModels = new Set<string>();
    activeProviders.forEach((conn) => {
      const alias = (PROVIDER_ID_TO_ALIAS as Record<string, string>)[conn.provider] || conn.provider;
      const providerModels = getModelsByProviderId(conn.provider);
      providerModels.forEach((m: any) => {
        const modelValue = `${alias}/${m.id}`;
        if (!seenModels.has(modelValue)) {
          seenModels.add(modelValue);
          models.push({ value: modelValue, label: `${alias}/${m.id}`, provider: conn.provider, alias, connectionName: conn.name, modelId: m.id });
        }
      });
    });
    return models;
  };

  const handleModelMappingChange = useCallback((toolId: string, modelAlias: string, targetModel: string) => {
    setModelMappings((prev) => {
      if (prev[toolId]?.[modelAlias] === targetModel) return prev;
      return { ...prev, [toolId]: { ...prev[toolId], [modelAlias]: targetModel } };
    });
  }, []);

  const getBaseUrl = () => {
    if (tunnelEnabled && tunnelPublicUrl) return tunnelPublicUrl;
    if (cloudEnabled && CLOUD_URL) return CLOUD_URL;
    if (typeof window !== "undefined") return window.location.origin;
    return "http://localhost:20128";
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const availableModels = getAllAvailableModels();
  const hasActiveProviders = availableModels.length > 0;

  const renderToolCard = (toolId: string, tool: any) => {
    const commonProps = {
      tool,
      isExpanded: expandedTool === toolId,
      onToggle: () => setExpandedTool(expandedTool === toolId ? null : toolId),
      baseUrl: getBaseUrl(),
      apiKeys,
      tunnelEnabled,
      tunnelPublicUrl,
      tailscaleEnabled,
      tailscaleUrl,
    };

    switch (toolId) {
      case "claude":
        return (
          <ClaudeToolCard
            key={toolId}
            {...commonProps}
            activeProviders={getActiveProviders()}
            modelMappings={modelMappings[toolId] || {}}
            onModelMappingChange={(alias: string, target: string) => handleModelMappingChange(toolId, alias, target)}
            hasActiveProviders={hasActiveProviders}
            cloudEnabled={cloudEnabled}
            initialStatus={(toolStatuses as any).claude}
          />
        );
      case "codex":
        return <CodexToolCard key={toolId} {...commonProps} activeProviders={getActiveProviders()} cloudEnabled={cloudEnabled} initialStatus={(toolStatuses as any).codex} />;
      case "opencode":
        return <OpenCodeToolCard key={toolId} {...commonProps} activeProviders={getActiveProviders()} cloudEnabled={cloudEnabled} initialStatus={(toolStatuses as any).opencode} />;
      case "cowork":
        return (
          <CoworkToolCard
            key={toolId}
            {...commonProps}
            activeProviders={getActiveProviders()}
            hasActiveProviders={hasActiveProviders}
            cloudEnabled={cloudEnabled}
            cloudUrl={CLOUD_URL}
            tunnelEnabled={tunnelEnabled}
            tunnelPublicUrl={tunnelPublicUrl}
            tailscaleEnabled={tailscaleEnabled}
            tailscaleUrl={tailscaleUrl}
            initialStatus={(toolStatuses as any).cowork}
          />
        );
      case "droid":
        return <DroidToolCard key={toolId} {...commonProps} activeProviders={getActiveProviders()} hasActiveProviders={hasActiveProviders} cloudEnabled={cloudEnabled} initialStatus={(toolStatuses as any).droid} />;
      case "openclaw":
        return <OpenClawToolCard key={toolId} {...commonProps} activeProviders={getActiveProviders()} hasActiveProviders={hasActiveProviders} cloudEnabled={cloudEnabled} initialStatus={(toolStatuses as any).openclaw} />;
      case "hermes":
        return <HermesToolCard key={toolId} {...commonProps} activeProviders={getActiveProviders()} hasActiveProviders={hasActiveProviders} cloudEnabled={cloudEnabled} initialStatus={(toolStatuses as any).hermes} />;
      case "copilot":
        return <CopilotToolCard key={toolId} {...commonProps} activeProviders={getActiveProviders()} cloudEnabled={cloudEnabled} initialStatus={(toolStatuses as any).copilot} />;
      case "cline":
        return <ClineToolCard key={toolId} {...commonProps} activeProviders={getActiveProviders()} cloudEnabled={cloudEnabled} initialStatus={(toolStatuses as any).cline} />;
      case "kilo":
        return <KiloToolCard key={toolId} {...commonProps} activeProviders={getActiveProviders()} cloudEnabled={cloudEnabled} initialStatus={(toolStatuses as any).kilo} />;
      default:
        return <DefaultToolCard key={toolId} toolId={toolId} {...commonProps} activeProviders={getActiveProviders()} cloudEnabled={cloudEnabled} tunnelEnabled={tunnelEnabled} />;
    }
  };

  const regularTools = Object.entries(CLI_TOOLS);
  const mitmTools = Object.entries(MITM_TOOLS);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-1 sm:px-0">
      <div className="flex flex-col gap-1">
        <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">CLI Tools</h1>
        <p className="text-[14px] text-[var(--text-secondary)]">Configure local coding tools to use your Uniro providers.</p>
      </div>
      <div className="grid gap-3 sm:gap-4">
        {regularTools.map(([toolId, tool]) => renderToolCard(toolId, tool))}
      </div>
      <div className="grid gap-3 sm:gap-4">
        <div className="flex items-center gap-2 px-1">
          <Shield size={18} className="text-[var(--accent-orange)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">MITM Tools</h2>
        </div>
        {mitmTools.map(([toolId, tool]) => (
          <MitmLinkCard key={toolId} tool={tool} />
        ))}
      </div>
    </div>
  );
}
