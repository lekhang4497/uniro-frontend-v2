"use client";

import { useState, useEffect } from "react";
 
import { getDefaultPricing } from "@/shared/constants/pricing";

type PricingField = "input" | "output" | "cached" | "reasoning" | "cache_creation";
type ModelPricing = Partial<Record<PricingField, number>>;
type ProviderPricing = Record<string, ModelPricing>;
type PricingData = Record<string, ProviderPricing>;

export interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export default function PricingModal({ isOpen, onClose, onSave }: PricingModalProps) {
  const [pricingData, setPricingData] = useState<PricingData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPricing();
    }
  }, [isOpen]);

  const loadPricing = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/pricing");
      if (response.ok) {
        const data = (await response.json()) as PricingData;
        setPricingData(data);
      } else {
        setPricingData(getDefaultPricing() as PricingData);
      }
    } catch (error) {
      console.error("Failed to load pricing:", error);
      setPricingData(getDefaultPricing() as PricingData);
    } finally {
      setLoading(false);
    }
  };

  const handlePricingChange = (
    provider: string,
    model: string,
    field: PricingField,
    value: string
  ) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;

    setPricingData((prev) => {
      const newData: PricingData = { ...prev };
      if (!newData[provider]) newData[provider] = {};
      if (!newData[provider][model]) newData[provider][model] = {};
      newData[provider][model][field] = numValue;
      return newData;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pricingData),
      });

      if (response.ok) {
        onSave?.();
        onClose();
      } else {
        const error = (await response.json()) as { error?: string };
        alert(`Failed to save pricing: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to save pricing:", error);
      alert("Failed to save pricing");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset all pricing to defaults? This cannot be undone.")) return;

    try {
      const response = await fetch("/api/pricing", { method: "DELETE" });
      if (response.ok) {
        setPricingData(getDefaultPricing() as PricingData);
      }
    } catch (error) {
      console.error("Failed to reset pricing:", error);
      alert("Failed to reset pricing");
    }
  };

  if (!isOpen) return null;

  const allProviders = Object.keys(pricingData).sort();
  const pricingFields: PricingField[] = ["input", "output", "cached", "reasoning", "cache_creation"];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-primary)] border border-[var(--bg-secondary)] rounded-[var(--radius-lg)] shadow-[var(--shadow-popover)] max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--bg-secondary)] flex items-center justify-between">
          <h2 className="text-xl font-semibold">Pricing Configuration</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-[var(--text-secondary)]">
              Loading pricing data...
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-[var(--bg-secondary)] border border-[var(--bg-secondary)] rounded-[var(--radius-md)] p-3 text-sm">
                <p className="font-medium mb-1">Pricing Rates Format</p>
                <p className="text-[var(--text-secondary)]">
                  All rates are in <strong>dollars per million tokens</strong> ($/1M tokens).
                  Example: Input rate of 2.50 means $2.50 per 1,000,000 input tokens.
                </p>
              </div>

              {allProviders.map((provider) => {
                const providerData = pricingData[provider];
                if (!providerData) return null;
                const models = Object.keys(providerData).sort();
                return (
                  <div
                    key={provider}
                    className="border border-[var(--bg-secondary)] rounded-[var(--radius-md)] overflow-hidden"
                  >
                    <div className="bg-[var(--bg-secondary)] px-4 py-2 font-semibold text-sm">
                      {provider.toUpperCase()}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] uppercase text-xs">
                          <tr>
                            <th className="px-3 py-2 text-left">Model</th>
                            <th className="px-3 py-2 text-right">Input</th>
                            <th className="px-3 py-2 text-right">Output</th>
                            <th className="px-3 py-2 text-right">Cached</th>
                            <th className="px-3 py-2 text-right">Reasoning</th>
                            <th className="px-3 py-2 text-right">Cache Creation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--bg-secondary)]">
                          {models.map((model) => {
                            const modelData = providerData[model];
                            if (!modelData) return null;
                            return (
                              <tr key={model} className="hover:bg-[var(--bg-secondary)]/50">
                                <td className="px-3 py-2 font-medium">{model}</td>
                                {pricingFields.map((field) => (
                                  <td key={field} className="px-3 py-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={modelData[field] || 0}
                                      onChange={(e) =>
                                        handlePricingChange(provider, model, field, e.target.value)
                                      }
                                      className="w-20 px-2 py-1 text-right bg-[var(--bg-primary)] border border-[var(--bg-secondary)] rounded focus:outline-2 focus:outline-offset-2 focus:outline-[var(--accent-blue)]"
                                    />
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {allProviders.length === 0 && (
                <div className="text-center py-8 text-[var(--text-secondary)]">
                  No pricing data available
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--bg-secondary)] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-sm text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 rounded border border-[var(--accent-red)]/20 transition-colors"
            disabled={saving}
          >
            Reset to Defaults
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--bg-secondary)] rounded transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-[var(--accent-blue)] text-[var(--text-inverted)] rounded hover:brightness-95 transition-colors disabled:opacity-50"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
