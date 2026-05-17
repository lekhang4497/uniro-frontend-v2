"use client";

import { useState } from "react";
import { Button, Badge, Input, Modal, Select } from "@/shared/components";

const BULK_PLACEHOLDER = `name1|sk-key1\nname2|sk-key2\nsk-key-only-auto-named`;

type ProxyPool = { id: string; name: string };

export default function AddApiKeyModal({
  isOpen,
  provider,
  providerName,
  isCompatible,
  isAnthropic,
  authType,
  authHint,
  website,
  proxyPools,
  error,
  onSave,
  onBulkDone,
  onClose,
}: {
  isOpen: boolean;
  provider?: string;
  providerName?: string;
  isCompatible?: boolean;
  isAnthropic?: boolean;
  authType?: string;
  authHint?: string;
  website?: string;
  proxyPools?: ProxyPool[];
  error?: string;
  onSave: (data: Record<string, unknown>) => Promise<void> | void;
  onBulkDone?: () => void;
  onClose: () => void;
}) {
  const NONE_PROXY_POOL_VALUE = "__none__";
  const isOllamaLocal = provider === "ollama-local";
  const isCookie = authType === "cookie";
  const credentialLabel = isCookie ? "Cookie Value" : "API Key";
  const credentialPlaceholder = isCookie
    ? provider === "grok-web"
      ? "sso=xxxxx... or just the raw value"
      : "eyJhbGciOi..."
    : "";

  const isAzure = provider === "azure";
  const isCloudflareAi = provider === "cloudflare-ai";

  const [formData, setFormData] = useState({
    name: "",
    apiKey: "",
    defaultModel: "",
    priority: 1,
    proxyPoolId: NONE_PROXY_POOL_VALUE,
    ollamaHostUrl: "",
  });
  const [azureData, setAzureData] = useState({
    azureEndpoint: "",
    apiVersion: "2024-10-01-preview",
    deployment: "",
    organization: "",
  });
  const [cloudflareData, setCloudflareData] = useState({ accountId: "" });
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<"success" | "failed" | null>(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [bulkText, setBulkText] = useState("");
  const [bulkResult, setBulkResult] = useState<{ success: number; failed: number } | null>(null);

  const buildProviderSpecificData = (): Record<string, unknown> | undefined => {
    if (isOllamaLocal && formData.ollamaHostUrl.trim()) {
      return { baseUrl: formData.ollamaHostUrl.trim() };
    }
    if (isAzure) {
      return {
        azureEndpoint: azureData.azureEndpoint,
        apiVersion: azureData.apiVersion,
        deployment: azureData.deployment,
        organization: azureData.organization,
      };
    }
    if (isCloudflareAi) {
      return { accountId: cloudflareData.accountId };
    }
    return undefined;
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      const res = await fetch("/api/providers/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: formData.apiKey,
          providerSpecificData: buildProviderSpecificData(),
        }),
      });
      const data = await res.json();
      setValidationResult(data.valid ? "success" : "failed");
    } catch {
      setValidationResult("failed");
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async () => {
    if (!provider) return;
    if (!isOllamaLocal && !formData.apiKey) return;
    if (!isOllamaLocal) {
      if (!formData.name) return;
    }
    if (isCompatible && !formData.defaultModel.trim()) return;

    setSaving(true);
    try {
      let isValid = false;
      try {
        setValidating(true);
        setValidationResult(null);
        const res = await fetch("/api/providers/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            apiKey: formData.apiKey,
            providerSpecificData: buildProviderSpecificData(),
          }),
        });
        const data = await res.json();
        isValid = !!data.valid;
        setValidationResult(isValid ? "success" : "failed");
      } catch {
        setValidationResult("failed");
      } finally {
        setValidating(false);
      }

      await onSave({
        name: formData.name || (isOllamaLocal ? "Ollama Local" : ""),
        apiKey: formData.apiKey,
        defaultModel: isCompatible ? formData.defaultModel.trim() : undefined,
        priority: formData.priority,
        proxyPoolId:
          formData.proxyPoolId === NONE_PROXY_POOL_VALUE ? null : formData.proxyPoolId,
        testStatus: isValid ? "active" : "unknown",
        providerSpecificData: buildProviderSpecificData(),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSubmit = async () => {
    const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    setSaving(true);
    setBulkResult(null);
    let success = 0;
    let failed = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const parts = line.split("|");
      const first = parts[0] ?? "";
      const apiKey = parts.length >= 2 ? parts.slice(1).join("|").trim() : first.trim();
      const baseName = parts.length >= 2 ? first.trim() : "Key";
      const name = `${baseName} ${i + 1}`;
      try {
        const res = await fetch("/api/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            apiKey,
            name,
            priority: 1,
            testStatus: "unknown",
          }),
        });
        if (res.ok) success++;
        else failed++;
      } catch {
        failed++;
      }
    }
    setSaving(false);
    setBulkResult({ success, failed });
    if (success > 0 && onBulkDone) onBulkDone();
  };

  if (!provider) return null;

  return (
    <Modal
      isOpen={isOpen}
      title={`Add ${providerName || provider} ${credentialLabel}`}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        {/* Mode switcher */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={mode === "single" ? "primary" : "ghost"}
            onClick={() => {
              setMode("single");
              setBulkResult(null);
            }}
          >
            Single
          </Button>
          <Button
            size="sm"
            variant={mode === "bulk" ? "primary" : "ghost"}
            onClick={() => {
              setMode("bulk");
              setBulkResult(null);
            }}
          >
            Bulk Add
          </Button>
        </div>

        {mode === "bulk" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[var(--text-secondary)]">
              One key per line. Format: <code>name|apiKey</code> or just <code>apiKey</code>{" "}
              (auto-named by index).
            </p>
            <textarea
              className="w-full rounded border border-[var(--accent-blue)]/30 bg-[var(--bg-secondary)] p-2 text-sm font-mono resize-y min-h-[140px] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]"
              placeholder={BULK_PLACEHOLDER}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
            {bulkResult && (
              <div
                className={`text-sm font-medium ${bulkResult.failed > 0 ? "text-[var(--accent-orange)]" : "text-[var(--accent-green)]"}`}
              >
                ✓ {bulkResult.success} added
                {bulkResult.failed > 0 ? `, ✗ ${bulkResult.failed} failed` : ""}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleBulkSubmit}
                fullWidth
                disabled={saving || !bulkText.trim()}
              >
                {saving ? "Adding..." : "Add All Keys"}
              </Button>
              <Button onClick={onClose} variant="ghost" fullWidth>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {mode === "single" && (
          <>
            <Input
              label="Name"
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder={isOllamaLocal ? "Ollama Local" : "Production Key"}
            />
            {isOllamaLocal && (
              <div className="flex gap-2">
                <Input
                  label="Ollama Host URL"
                  value={formData.ollamaHostUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, ollamaHostUrl: e.target.value })
                  }
                  placeholder="http://localhost:11434"
                  className="flex-1"
                />
                <div className="pt-6">
                  <Button
                    onClick={handleValidate}
                    disabled={validating || saving}
                    variant="secondary"
                  >
                    {validating ? "Checking..." : "Check"}
                  </Button>
                </div>
              </div>
            )}
            {!isOllamaLocal && (
              <div className="flex gap-2">
                <Input
                  label={credentialLabel}
                  type={isCookie ? "text" : "password"}
                  value={formData.apiKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, apiKey: e.target.value })
                  }
                  placeholder={credentialPlaceholder}
                  className="flex-1"
                />
                <div className="pt-6">
                  <Button
                    onClick={handleValidate}
                    disabled={!formData.apiKey || validating || saving}
                    variant="secondary"
                  >
                    {validating ? "Checking..." : "Check"}
                  </Button>
                </div>
              </div>
            )}
            {isCookie && authHint && (
              <p className="text-xs text-[var(--text-secondary)]">
                {authHint}
                {website && (
                  <>
                    {" "}
                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent-blue)] underline"
                    >
                      Open {website.replace(/^https?:\/\//, "")}
                    </a>
                  </>
                )}
              </p>
            )}
            {isCompatible && (
              <Input
                label="Default Model"
                value={formData.defaultModel}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, defaultModel: e.target.value })
                }
                placeholder={isAnthropic ? "claude-3-5-sonnet-latest" : "gpt-4o-mini"}
              />
            )}
            {isOllamaLocal && (
              <p className="text-xs text-[var(--text-secondary)]">
                Leave blank to use <code>http://localhost:11434</code>. For remote Ollama, enter
                the full host URL (e.g. <code>http://192.168.1.10:11434</code>).
              </p>
            )}
            {validationResult && (
              <Badge variant={validationResult === "success" ? "success" : "error"}>
                {validationResult === "success" ? "Valid" : "Invalid"}
              </Badge>
            )}
            {error && <p className="text-xs text-[var(--accent-red)] break-words">{error}</p>}
            {isCompatible && (
              <p className="text-xs text-[var(--text-secondary)]">
                Enter the model ID exactly as your compatible endpoint expects it. This model will
                be saved as the connection default.
              </p>
            )}
            {isCloudflareAi && (
              <div className="bg-[var(--bg-secondary)]/50 p-4 rounded-lg border border-[var(--accent-blue)]/20">
                <h3 className="font-semibold mb-3 text-sm">Cloudflare Workers AI</h3>
                <Input
                  label="Account ID"
                  value={cloudflareData.accountId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCloudflareData({ ...cloudflareData, accountId: e.target.value })
                  }
                  placeholder="abc123def456..."
                />
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  Find your Account ID in the right sidebar of{" "}
                  <a
                    href="https://dash.cloudflare.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-blue)] underline"
                  >
                    dash.cloudflare.com
                  </a>
                </p>
              </div>
            )}
            {isAzure && (
              <div className="bg-[var(--bg-secondary)]/50 p-4 rounded-lg border border-[var(--accent-blue)]/20">
                <h3 className="font-semibold mb-3 text-sm">Azure OpenAI Configuration</h3>
                <div className="flex flex-col gap-3">
                  <Input
                    label="Azure Endpoint"
                    value={azureData.azureEndpoint}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAzureData({ ...azureData, azureEndpoint: e.target.value })
                    }
                    placeholder="https://your-resource.openai.azure.com"
                  />
                  <Input
                    label="Deployment Name"
                    value={azureData.deployment}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAzureData({ ...azureData, deployment: e.target.value })
                    }
                    placeholder="gpt-4"
                  />
                  <Input
                    label="API Version"
                    value={azureData.apiVersion}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAzureData({ ...azureData, apiVersion: e.target.value })
                    }
                    placeholder="2024-10-01-preview"
                  />
                  <Input
                    label="Organization"
                    value={azureData.organization}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAzureData({ ...azureData, organization: e.target.value })
                    }
                    placeholder="Organization ID"
                  />
                </div>
              </div>
            )}

            <Input
              label="Priority"
              type="number"
              value={String(formData.priority)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, priority: Number.parseInt(e.target.value) || 1 })
              }
            />

            <Select
              label="Proxy Pool"
              value={formData.proxyPoolId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setFormData({ ...formData, proxyPoolId: e.target.value })
              }
              options={[
                { value: NONE_PROXY_POOL_VALUE, label: "None" },
                ...((proxyPools || []).map((pool) => ({ value: pool.id, label: pool.name }))),
              ]}
              placeholder="None"
            />

            {(proxyPools || []).length === 0 && (
              <p className="text-xs text-[var(--text-secondary)]">
                No active proxy pools available. Create one in Proxy Pools page first.
              </p>
            )}

            <p className="text-xs text-[var(--text-secondary)]">
              Legacy manual proxy fields are still accepted by API for backward compatibility.
            </p>

            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                fullWidth
                disabled={
                  saving ||
                  (!isOllamaLocal && (!formData.name || !formData.apiKey)) ||
                  (isCompatible === true && !formData.defaultModel.trim()) ||
                  (isAzure &&
                    (!azureData.azureEndpoint ||
                      !azureData.deployment ||
                      !azureData.organization)) ||
                  (isCloudflareAi && !cloudflareData.accountId)
                }
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button onClick={onClose} variant="ghost" fullWidth>
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
