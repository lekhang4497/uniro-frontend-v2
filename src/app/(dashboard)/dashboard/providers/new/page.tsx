"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Key, Lock, Link as LinkIcon } from "lucide-react";
import { Card, Button, Input, Select, Toggle } from "@/shared/components";
import { AI_PROVIDERS, AUTH_METHODS } from "@/shared/constants/config";

type ProviderEntry = {
  id: string;
  name: string;
  color?: string;
  icon?: string;
};

type AuthMethod = {
  id: string;
  name: string;
};

const providerOptions = (Object.values(AI_PROVIDERS) as ProviderEntry[]).map((p) => ({
  value: p.id,
  label: p.name,
}));

const authMethodOptions = (Object.values(AUTH_METHODS) as AuthMethod[]).map((m) => ({
  value: m.id,
  label: m.name,
}));

type FormData = {
  provider: string;
  authMethod: string;
  apiKey: string;
  displayName: string;
  isActive: boolean;
};

type FormErrors = Partial<Record<keyof FormData | "submit", string | null>>;

export default function NewProviderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    provider: "",
    authMethod: "api_key",
    apiKey: "",
    displayName: "",
    isActive: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const handleChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors: FormErrors = {};
    if (!formData.provider) newErrors.provider = "Please select a provider";
    if (formData.authMethod === "api_key" && !formData.apiKey) {
      newErrors.apiKey = "API Key is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push("/dashboard/providers");
      } else {
        const data = await response.json();
        setErrors({ submit: data.error || "Failed to create provider" });
      }
    } catch {
      setErrors({ submit: "An error occurred. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const selectedProvider = (AI_PROVIDERS as Record<string, ProviderEntry>)[formData.provider];

  return (
    <div className="px-8 py-7">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/providers"
            className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            Back to Providers
          </Link>
          <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
            Add New Provider
          </h1>
          <p className="mt-1 text-[14px] text-[var(--text-secondary)] max-w-[540px]">
            Configure a new AI provider to use with your applications.
          </p>
        </div>

        {/* Form */}
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Provider Selection */}
            <Select
              label="Provider"
              options={providerOptions}
              value={formData.provider}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange("provider", e.target.value)}
              placeholder="Select a provider"
              error={errors.provider ?? undefined}
              required
            />

            {/* Provider Info */}
            {selectedProvider && (
              <Card.Section className="flex items-center gap-3">
                <div className="size-10 rounded-lg flex items-center justify-center bg-[var(--bg-primary)] border border-[var(--bg-secondary)]">
                  <span className="text-base font-semibold" style={{ color: selectedProvider.color }}>
                    {(selectedProvider.name || "?").slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{selectedProvider.name}</p>
                  <p className="text-sm text-[var(--text-secondary)]">Selected provider</p>
                </div>
              </Card.Section>
            )}

            {/* Auth Method */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium">
                Authentication Method <span className="text-[var(--accent-red)]">*</span>
              </label>
              <div className="flex gap-3">
                {authMethodOptions.map((method) => {
                  const Comp = method.value === "api_key" ? Key : Lock;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => handleChange("authMethod", method.value)}
                      className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border transition-all ${
                        formData.authMethod === method.value
                          ? "border-[var(--accent-blue)] bg-[var(--accent-blue)]/5 text-[var(--accent-blue)]"
                          : "border-[var(--bg-secondary)] hover:border-[var(--accent-blue)]/50"
                      }`}
                    >
                      <Comp size={18} />
                      <span className="font-medium">{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* API Key Input */}
            {formData.authMethod === "api_key" && (
              <Input
                label="API Key"
                type="password"
                placeholder="Enter your API key"
                value={formData.apiKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("apiKey", e.target.value)}
                error={errors.apiKey ?? undefined}
                hint="Your API key will be encrypted and stored securely."
                required
              />
            )}

            {/* OAuth2 Button */}
            {formData.authMethod === "oauth2" && (
              <Card.Section>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  Connect your account using OAuth2 authentication.
                </p>
                <Button type="button" variant="secondary" icon={LinkIcon}>
                  Connect with OAuth2
                </Button>
              </Card.Section>
            )}

            {/* Display Name */}
            <Input
              label="Display Name"
              placeholder="e.g., Production API, Dev Environment"
              value={formData.displayName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("displayName", e.target.value)}
              hint="Optional. A friendly name to identify this configuration."
            />

            {/* Active Toggle */}
            <Toggle
              checked={formData.isActive}
              onChange={(checked: boolean) => handleChange("isActive", checked)}
              label="Active"
              description="Enable this provider for use in your applications"
            />

            {/* Error Message */}
            {errors.submit && (
              <div className="p-4 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 text-[var(--accent-red)] text-sm">
                {errors.submit}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-[var(--bg-secondary)]">
              <Link href="/dashboard/providers" className="flex-1">
                <Button type="button" variant="ghost" fullWidth>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" loading={loading} fullWidth className="flex-1">
                Create Provider
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
