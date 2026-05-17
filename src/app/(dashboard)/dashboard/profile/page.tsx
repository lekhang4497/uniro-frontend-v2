// @ts-nocheck
// Profile / app-level settings page (~700 LOC). All business logic
// (settings fetch, password change, proxy form, db import/export, fallback
// strategy) is preserved verbatim; visible classes/icons are migrated to
// the new tokens + Lucide. Keeps `@ts-nocheck` to bypass the loose `any`s
// in settings shapes coming back from /api/settings — typing these would
// require a backend type contract we don't have here.
"use client";

import { useState, useEffect, useRef } from "react";
import {
  Computer,
  Sun,
  Moon,
  Contrast,
  Shield,
  Route,
  Wifi,
  Activity,
  Download,
  Upload,
} from "lucide-react";
import { useTheme } from "@/shared/hooks/useTheme";
import { cn } from "@/lib/utils";
import { APP_CONFIG } from "@/shared/constants/config";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { Label } from "@/shared/components/ui/label";

export default function ProfilePage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState({ fallbackStrategy: "fill-first" });
  const [loading, setLoading] = useState(true);
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [passStatus, setPassStatus] = useState({ type: "", message: "" });
  const [passLoading, setPassLoading] = useState(false);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState({ type: "", message: "" });
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const [proxyForm, setProxyForm] = useState({
    outboundProxyEnabled: false,
    outboundProxyUrl: "",
    outboundNoProxy: "",
  });
  const [proxyStatus, setProxyStatus] = useState({ type: "", message: "" });
  const [proxyLoading, setProxyLoading] = useState(false);
  const [proxyTestLoading, setProxyTestLoading] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setProxyForm({
          outboundProxyEnabled: data?.outboundProxyEnabled === true,
          outboundProxyUrl: data?.outboundProxyUrl || "",
          outboundNoProxy: data?.outboundNoProxy || "",
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch settings:", err);
        setLoading(false);
      });
  }, []);

  const updateOutboundProxy = async (e) => {
    e.preventDefault();
    if (settings.outboundProxyEnabled !== true) return;
    setProxyLoading(true);
    setProxyStatus({ type: "", message: "" });

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outboundProxyUrl: proxyForm.outboundProxyUrl,
          outboundNoProxy: proxyForm.outboundNoProxy,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSettings((prev) => ({ ...prev, ...data }));
        setProxyStatus({ type: "success", message: "Proxy settings applied" });
      } else {
        setProxyStatus({ type: "error", message: data.error || "Failed to update proxy settings" });
      }
    } catch (err) {
      setProxyStatus({ type: "error", message: "An error occurred" });
    } finally {
      setProxyLoading(false);
    }
  };

  const testOutboundProxy = async () => {
    if (settings.outboundProxyEnabled !== true) return;

    const proxyUrl = (proxyForm.outboundProxyUrl || "").trim();
    if (!proxyUrl) {
      setProxyStatus({ type: "error", message: "Please enter a Proxy URL to test" });
      return;
    }

    setProxyTestLoading(true);
    setProxyStatus({ type: "", message: "" });

    try {
      const res = await fetch("/api/settings/proxy-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proxyUrl }),
      });

      const data = await res.json();
      if (res.ok && data?.ok) {
        setProxyStatus({
          type: "success",
          message: `Proxy test OK (${data.status}) in ${data.elapsedMs}ms`,
        });
      } else {
        setProxyStatus({
          type: "error",
          message: data?.error || "Proxy test failed",
        });
      }
    } catch (err) {
      setProxyStatus({ type: "error", message: "An error occurred" });
    } finally {
      setProxyTestLoading(false);
    }
  };

  const updateOutboundProxyEnabled = async (outboundProxyEnabled) => {
    setProxyLoading(true);
    setProxyStatus({ type: "", message: "" });

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outboundProxyEnabled }),
      });

      const data = await res.json();
      if (res.ok) {
        setSettings((prev) => ({ ...prev, ...data }));
        setProxyForm((prev) => ({ ...prev, outboundProxyEnabled: data?.outboundProxyEnabled === true }));
        setProxyStatus({
          type: "success",
          message: outboundProxyEnabled ? "Proxy enabled" : "Proxy disabled",
        });
      } else {
        setProxyStatus({ type: "error", message: data.error || "Failed to update proxy settings" });
      }
    } catch (err) {
      setProxyStatus({ type: "error", message: "An error occurred" });
    } finally {
      setProxyLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setPassStatus({ type: "error", message: "Passwords do not match" });
      return;
    }

    setPassLoading(true);
    setPassStatus({ type: "", message: "" });

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setPassStatus({ type: "success", message: "Password updated successfully" });
        setPasswords({ current: "", new: "", confirm: "" });
      } else {
        setPassStatus({ type: "error", message: data.error || "Failed to update password" });
      }
    } catch (err) {
      setPassStatus({ type: "error", message: "An error occurred" });
    } finally {
      setPassLoading(false);
    }
  };

  const updateFallbackStrategy = async (strategy) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fallbackStrategy: strategy }),
      });
      if (res.ok) {
        setSettings((prev) => ({ ...prev, fallbackStrategy: strategy }));
      }
    } catch (err) {
      console.error("Failed to update settings:", err);
    }
  };

  const updateComboStrategy = async (strategy) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comboStrategy: strategy }),
      });
      if (res.ok) {
        setSettings((prev) => ({ ...prev, comboStrategy: strategy }));
      }
    } catch (err) {
      console.error("Failed to update combo strategy:", err);
    }
  };

  const updateStickyLimit = async (limit) => {
    const numLimit = parseInt(limit);
    if (isNaN(numLimit) || numLimit < 1) return;

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stickyRoundRobinLimit: numLimit }),
      });
      if (res.ok) {
        setSettings((prev) => ({ ...prev, stickyRoundRobinLimit: numLimit }));
      }
    } catch (err) {
      console.error("Failed to update sticky limit:", err);
    }
  };

  const updateComboStickyLimit = async (limit) => {
    const numLimit = parseInt(limit);
    if (isNaN(numLimit) || numLimit < 1) return;

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comboStickyRoundRobinLimit: numLimit }),
      });
      if (res.ok) {
        setSettings((prev) => ({ ...prev, comboStickyRoundRobinLimit: numLimit }));
      }
    } catch (err) {
      console.error("Failed to update combo sticky limit:", err);
    }
  };

  const updateRequireLogin = async (requireLogin) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requireLogin }),
      });
      if (res.ok) {
        setSettings((prev) => ({ ...prev, requireLogin }));
      }
    } catch (err) {
      console.error("Failed to update require login:", err);
    }
  };

  const updateObservabilityEnabled = async (enabled) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enableObservability: enabled }),
      });
      if (res.ok) {
        setSettings((prev) => ({ ...prev, enableObservability: enabled }));
      }
    } catch (err) {
      console.error("Failed to update enableObservability:", err);
    }
  };

  const reloadSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) return;
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error("Failed to reload settings:", err);
    }
  };

  const handleExportDatabase = async () => {
    setDbLoading(true);
    setDbStatus({ type: "", message: "" });
    try {
      const res = await fetch("/api/settings/database");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to export database");
      }

      const payload = await res.json();
      const content = JSON.stringify(payload, null, 2);
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[.:]/g, "-");
      anchor.href = url;
      anchor.download = `uniro-backup-${stamp}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setDbStatus({ type: "success", message: "Database backup downloaded" });
    } catch (err) {
      setDbStatus({ type: "error", message: err.message || "Failed to export database" });
    } finally {
      setDbLoading(false);
    }
  };

  const handleImportDatabase = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setDbLoading(true);
    setDbStatus({ type: "", message: "" });

    try {
      const raw = await file.text();
      const payload = JSON.parse(raw);

      const res = await fetch("/api/settings/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to import database");
      }

      await reloadSettings();
      setDbStatus({ type: "success", message: "Database imported successfully" });
    } catch (err) {
      setDbStatus({ type: "error", message: err.message || "Invalid backup file" });
    } finally {
      if (importFileRef.current) {
        importFileRef.current.value = "";
      }
      setDbLoading(false);
    }
  };

  const observabilityEnabled = settings.enableObservability === true;

  const themeIcons = { light: Sun, dark: Moon, system: Contrast };

  return (
    <div className="px-8 py-7">
      <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
        Profile
      </h1>
      <p className="mt-1 text-[14px] text-[var(--text-secondary)] max-w-[540px]">
        Your local Uniro instance, theme, routing strategy, network, and observability settings.
      </p>

      <div className="mt-6 max-w-2xl flex flex-col gap-6">
        {/* Local Mode Info */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="size-10 sm:size-12 rounded-[var(--radius)] bg-[var(--accent-green)]/10 text-[var(--accent-green)] flex items-center justify-center shrink-0">
                <Computer className="size-5 sm:size-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)]">Local Mode</h2>
                <p className="text-[13px] text-[var(--text-secondary)]">Running on your machine</p>
              </div>
            </div>
            <div className="inline-flex p-1 rounded-[var(--radius)] border border-[var(--bg-secondary)] bg-[var(--bg-secondary)] w-full sm:w-auto">
              {(["light", "dark", "system"] as const).map((option) => {
                const ThemeIcon = themeIcons[option];
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setTheme(option)}
                    className={cn(
                      "flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors flex-1 sm:flex-initial",
                      theme === option
                        ? "bg-[var(--bg-primary)] text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <ThemeIcon className="h-3.5 w-3.5" />
                    <span className="capitalize">{option}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-4 border-t border-[var(--bg-secondary)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-[var(--radius)] bg-[var(--bg-secondary)] gap-2">
              <div>
                <p className="font-medium text-[13px] text-[var(--text-primary)]">Database Location</p>
                <p className="text-[12px] text-[var(--text-secondary)] font-mono break-all">~/.uniro/db/data.sqlite</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="secondary"
                onClick={handleExportDatabase}
                disabled={dbLoading}
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4" />
                Download Backup
              </Button>
              <Button
                variant="outline"
                onClick={() => importFileRef.current?.click()}
                disabled={dbLoading}
                className="w-full sm:w-auto"
              >
                <Upload className="h-4 w-4" />
                Import Backup
              </Button>
              <input
                ref={importFileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImportDatabase}
              />
            </div>
            {dbStatus.message && (
              <p
                className={cn(
                  "text-[13px]",
                  dbStatus.type === "error"
                    ? "text-[var(--accent-red)]"
                    : "text-[var(--accent-green)]"
                )}
              >
                {dbStatus.message}
              </p>
            )}
          </div>
        </Card>

        {/* Security */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-[var(--radius)] bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] shrink-0">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">Security</h3>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-start sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[13px] text-[var(--text-primary)]">Require login</p>
                <p className="text-[12px] text-[var(--text-secondary)]">
                  When ON, dashboard requires password. When OFF, access without login.
                </p>
              </div>
              <Switch
                checked={settings.requireLogin === true}
                onCheckedChange={() => updateRequireLogin(!settings.requireLogin)}
                disabled={loading}
              />
            </div>
            {settings.requireLogin === true && (
              <form
                onSubmit={handlePasswordChange}
                className="flex flex-col gap-4 pt-4 border-t border-[var(--bg-secondary)]"
              >
                {settings.hasPassword && (
                  <div className="flex flex-col gap-2">
                    <Label>Current Password</Label>
                    <Input
                      type="password"
                      placeholder="Enter current password"
                      value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                      required
                    />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Confirm New Password</Label>
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {passStatus.message && (
                  <p
                    className={cn(
                      "text-[12px]",
                      passStatus.type === "error"
                        ? "text-[var(--accent-red)]"
                        : "text-[var(--accent-green)]"
                    )}
                  >
                    {passStatus.message}
                  </p>
                )}

                <div className="pt-2">
                  <Button type="submit" disabled={passLoading} className="w-full sm:w-auto">
                    {passLoading ? "Saving…" : settings.hasPassword ? "Update Password" : "Set Password"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Card>

        {/* Routing Preferences */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-[var(--radius)] bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] shrink-0">
              <Route className="h-5 w-5" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">Routing Strategy</h3>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-start sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[13px] text-[var(--text-primary)]">Round Robin</p>
                <p className="text-[12px] text-[var(--text-secondary)]">
                  Cycle through accounts to distribute load
                </p>
              </div>
              <Switch
                checked={settings.fallbackStrategy === "round-robin"}
                onCheckedChange={() =>
                  updateFallbackStrategy(
                    settings.fallbackStrategy === "round-robin" ? "fill-first" : "round-robin"
                  )
                }
                disabled={loading}
              />
            </div>

            {/* Sticky Round Robin Limit */}
            {settings.fallbackStrategy === "round-robin" && (
              <div className="flex items-start sm:items-center justify-between gap-4 pt-2 border-t border-[var(--bg-secondary)]">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[13px] text-[var(--text-primary)]">Sticky Limit</p>
                  <p className="text-[12px] text-[var(--text-secondary)]">
                    Calls per account before switching
                  </p>
                </div>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.stickyRoundRobinLimit || 3}
                  onChange={(e) => updateStickyLimit(e.target.value)}
                  disabled={loading}
                  className="w-20 text-center shrink-0"
                />
              </div>
            )}

            {/* Combo Round Robin */}
            <div className="flex items-start sm:items-center justify-between gap-4 pt-4 border-t border-[var(--bg-secondary)]">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[13px] text-[var(--text-primary)]">Combo Round Robin</p>
                <p className="text-[12px] text-[var(--text-secondary)]">
                  Cycle through providers in combos instead of always starting with first
                </p>
              </div>
              <Switch
                checked={settings.comboStrategy === "round-robin"}
                onCheckedChange={() =>
                  updateComboStrategy(
                    settings.comboStrategy === "round-robin" ? "fallback" : "round-robin"
                  )
                }
                disabled={loading}
              />
            </div>

            {/* Combo Sticky Round Robin Limit */}
            {settings.comboStrategy === "round-robin" && (
              <div className="flex items-center justify-between pt-2 border-t border-[var(--bg-secondary)]">
                <div>
                  <p className="font-medium text-[13px] text-[var(--text-primary)]">Combo Sticky Limit</p>
                  <p className="text-[12px] text-[var(--text-secondary)]">
                    Calls per combo model before switching
                  </p>
                </div>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.comboStickyRoundRobinLimit || 1}
                  onChange={(e) => updateComboStickyLimit(e.target.value)}
                  disabled={loading}
                  className="w-20 text-center"
                />
              </div>
            )}

            <p className="text-[11px] italic text-[var(--text-secondary)] pt-2 border-t border-[var(--bg-secondary)]">
              {settings.fallbackStrategy === "round-robin"
                ? `Currently distributing requests across all available accounts with ${settings.stickyRoundRobinLimit || 3} calls per account.`
                : "Currently using accounts in priority order (Fill First)."}
              {settings.comboStrategy === "round-robin"
                ? ` Combos rotate after ${settings.comboStickyRoundRobinLimit || 1} call${(settings.comboStickyRoundRobinLimit || 1) === 1 ? "" : "s"} per model.`
                : " Combos always start with their first model."}
            </p>
          </div>
        </Card>

        {/* Network */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-[var(--radius)] bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] shrink-0">
              <Wifi className="h-5 w-5" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">Network</h3>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-start sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[13px] text-[var(--text-primary)]">Outbound Proxy</p>
                <p className="text-[12px] text-[var(--text-secondary)]">
                  Enable proxy for OAuth + provider outbound requests.
                </p>
              </div>
              <Switch
                checked={settings.outboundProxyEnabled === true}
                onCheckedChange={() => updateOutboundProxyEnabled(!(settings.outboundProxyEnabled === true))}
                disabled={loading || proxyLoading}
              />
            </div>

            {settings.outboundProxyEnabled === true && (
              <form
                onSubmit={updateOutboundProxy}
                className="flex flex-col gap-4 pt-2 border-t border-[var(--bg-secondary)]"
              >
                <div className="flex flex-col gap-2">
                  <Label>Proxy URL</Label>
                  <Input
                    placeholder="http://127.0.0.1:7897"
                    value={proxyForm.outboundProxyUrl}
                    onChange={(e) => setProxyForm((prev) => ({ ...prev, outboundProxyUrl: e.target.value }))}
                    disabled={loading || proxyLoading}
                  />
                  <p className="text-[12px] text-[var(--text-secondary)]">
                    Leave empty to inherit existing env proxy (if any).
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--bg-secondary)]">
                  <Label>No Proxy</Label>
                  <Input
                    placeholder="localhost,127.0.0.1"
                    value={proxyForm.outboundNoProxy}
                    onChange={(e) => setProxyForm((prev) => ({ ...prev, outboundNoProxy: e.target.value }))}
                    disabled={loading || proxyLoading}
                  />
                  <p className="text-[12px] text-[var(--text-secondary)]">
                    Comma-separated hostnames/domains to bypass the proxy.
                  </p>
                </div>

                <div className="pt-2 border-t border-[var(--bg-secondary)] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={loading || proxyLoading || proxyTestLoading}
                    onClick={testOutboundProxy}
                    className="w-full sm:w-auto"
                  >
                    {proxyTestLoading ? "Testing…" : "Test proxy URL"}
                  </Button>
                  <Button type="submit" disabled={proxyLoading} className="w-full sm:w-auto">
                    {proxyLoading ? "Saving…" : "Apply"}
                  </Button>
                </div>
              </form>
            )}

            {proxyStatus.message && (
              <p
                className={cn(
                  "text-[12px] pt-2 border-t border-[var(--bg-secondary)]",
                  proxyStatus.type === "error"
                    ? "text-[var(--accent-red)]"
                    : "text-[var(--accent-green)]"
                )}
              >
                {proxyStatus.message}
              </p>
            )}
          </div>
        </Card>

        {/* Observability Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-[var(--radius)] bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] shrink-0">
              <Activity className="h-5 w-5" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">Observability</h3>
          </div>
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[13px] text-[var(--text-primary)]">Enable Observability</p>
              <p className="text-[12px] text-[var(--text-secondary)]">
                Record request details for inspection in the logs view
              </p>
            </div>
            <Switch
              checked={observabilityEnabled}
              onCheckedChange={updateObservabilityEnabled}
              disabled={loading}
            />
          </div>
        </Card>

        {/* App Info */}
        <div className="text-center text-[12px] text-[var(--text-secondary)] py-4">
          <p>{APP_CONFIG.name} v{APP_CONFIG.version}</p>
          <p className="mt-1">Local Mode - All data stored on your machine</p>
        </div>
      </div>
    </div>
  );
}
