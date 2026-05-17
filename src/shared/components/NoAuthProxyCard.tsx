"use client";

import { useEffect, useState } from "react";
import { LockOpen } from "lucide-react";
import Card from "./Card";
import Select from "./Select";
import Badge from "./Badge";

const NONE_PROXY_POOL_VALUE = "__none__";

interface ProxyPool {
  id: string;
  name: string;
}

interface ProxyPoolsResponse {
  proxyPools?: ProxyPool[];
}

interface SettingsResponse {
  providerStrategies?: Record<string, { proxyPoolId?: string }>;
}

export interface NoAuthProxyCardProps {
  providerId: string;
}

export default function NoAuthProxyCard({ providerId }: NoAuthProxyCardProps) {
  const [proxyPools, setProxyPools] = useState<ProxyPool[]>([]);
  const [proxyPoolId, setProxyPoolId] = useState<string>(NONE_PROXY_POOL_VALUE);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/proxy-pools?isActive=true", { cache: "no-store" }).then((r) =>
        r.ok ? (r.json() as Promise<ProxyPoolsResponse>) : { proxyPools: [] }
      ),
      fetch("/api/settings", { cache: "no-store" }).then((r) =>
        r.ok ? (r.json() as Promise<SettingsResponse>) : ({} as SettingsResponse)
      ),
    ])
      .then(([poolData, settingsData]) => {
        if (cancelled) return;
        setProxyPools(poolData.proxyPools || []);
        const override = (settingsData.providerStrategies || {})[providerId] || {};
        setProxyPoolId(override.proxyPoolId || NONE_PROXY_POOL_VALUE);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [providerId]);

  const handleChange = async (newValue: string) => {
    setProxyPoolId(newValue);
    setSaving(true);
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const data: SettingsResponse = res.ok ? await res.json() : {};
      const current = data.providerStrategies || {};
      const override: { proxyPoolId?: string } = { ...(current[providerId] || {}) };
      if (newValue === NONE_PROXY_POOL_VALUE) delete override.proxyPoolId;
      else override.proxyPoolId = newValue;
      const updated = { ...current };
      if (Object.keys(override).length === 0) delete updated[providerId];
      else updated[providerId] = override;
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerStrategies: updated }),
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (e) {
      console.log("Save proxyPoolId error:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--accent-green)]/10 text-[var(--accent-green)]">
          <LockOpen className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">No authentication required</p>
          <p className="text-xs text-[var(--text-secondary)]">
            This provider is ready to use. Optionally route requests through a proxy pool to bypass IP-based limits.
          </p>
        </div>
        {savedFlash && (
          <Badge variant="success" size="sm">
            Saved
          </Badge>
        )}
      </div>
      <Select
        label="Proxy Pool"
        value={proxyPoolId}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        options={[
          { value: NONE_PROXY_POOL_VALUE, label: "None (direct)" },
          ...proxyPools.map((pool) => ({ value: pool.id, label: pool.name })),
        ]}
      />
    </Card>
  );
}
