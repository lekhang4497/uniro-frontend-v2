"use client";

// Pricing settings — wraps the shared <PricingModal /> for full editing and
// shows a small status / providers summary up top. This route lives *outside*
// the `(dashboard)` group on purpose: it has its own bare layout so the modal
// owns the full viewport.

import { useState, useEffect } from "react";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import PricingModal from "@/shared/components/PricingModal";

type ProviderPricing = Record<string, unknown>;
type PricingData = Record<string, ProviderPricing>;

export default function PricingSettingsPage() {
  const [showModal, setShowModal] = useState(false);
  const [currentPricing, setCurrentPricing] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/pricing");
      if (response.ok) {
        const data = (await response.json()) as PricingData;
        setCurrentPricing(data);
      }
    } catch (error) {
      console.error("Failed to load pricing:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePricingUpdated = () => {
    loadPricing();
  };

  // Count total models with pricing
  const getModelCount = (): number => {
    if (!currentPricing) return 0;
    let count = 0;
    for (const provider of Object.values(currentPricing)) {
      if (provider) count += Object.keys(provider).length;
    }
    return count;
  };

  // Get providers list
  const getProviders = (): string[] => {
    if (!currentPricing) return [];
    return Object.keys(currentPricing).sort();
  };

  return (
    <div className="px-8 py-7 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
            Pricing Settings
          </h1>
          <p className="mt-1 text-[14px] text-[var(--text-secondary)] max-w-[540px]">
            Configure pricing rates for cost tracking and calculations.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>Edit Pricing</Button>
      </div>

      {/* Quick Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--text-secondary)]">
            Total Models
          </div>
          <div className="text-2xl font-semibold mt-1 text-[var(--text-primary)]">
            {loading ? "…" : getModelCount()}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--text-secondary)]">
            Providers
          </div>
          <div className="text-2xl font-semibold mt-1 text-[var(--text-primary)]">
            {loading ? "…" : getProviders().length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--text-secondary)]">
            Status
          </div>
          <div className="text-2xl font-semibold mt-1 text-[var(--accent-green)]">
            {loading ? "…" : "Active"}
          </div>
        </Card>
      </div>

      {/* Info Section */}
      <Card className="mt-6 p-6">
        <h2 className="text-[15px] font-semibold mb-3 text-[var(--text-primary)]">How Pricing Works</h2>
        <div className="space-y-3 text-[13px] text-[var(--text-secondary)]">
          <p>
            <strong className="text-[var(--text-primary)]">Cost Calculation:</strong> Costs are
            calculated based on token usage and pricing rates. Each request&apos;s cost is determined by:
            (input_tokens × input_rate) + (output_tokens × output_rate) + (cached_tokens × cached_rate)
          </p>
          <p>
            <strong className="text-[var(--text-primary)]">Pricing Format:</strong> All rates are in{" "}
            <strong className="text-[var(--text-primary)]">dollars per million tokens</strong> ($/1M
            tokens). Example: An input rate of 2.50 means $2.50 per 1,000,000 input tokens.
          </p>
          <p>
            <strong className="text-[var(--text-primary)]">Token Types:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              <strong className="text-[var(--text-primary)]">Input:</strong> Standard prompt tokens
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">Output:</strong> Completion / response tokens
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">Cached:</strong> Cached input tokens
              (typically 50% of input rate)
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">Reasoning:</strong> Special reasoning /
              thinking tokens (fallback to output rate)
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">Cache Creation:</strong> Tokens used to
              create cache entries (fallback to input rate)
            </li>
          </ul>
          <p>
            <strong className="text-[var(--text-primary)]">Custom Pricing:</strong> You can override
            default pricing for specific models. Reset to defaults anytime to restore standard rates.
          </p>
        </div>
      </Card>

      {/* Current Pricing Preview */}
      <Card className="mt-6 p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
            Current Pricing Overview
          </h2>
          <button
            onClick={() => setShowModal(true)}
            className="text-[12px] text-[var(--accent-blue)] hover:underline"
          >
            View Full Details
          </button>
        </div>

        {loading ? (
          <div className="text-center py-4 text-[var(--text-secondary)] text-[13px]">
            Loading pricing data…
          </div>
        ) : currentPricing ? (
          <div className="space-y-2">
            {Object.keys(currentPricing)
              .slice(0, 5)
              .map((provider) => {
                const models = currentPricing[provider];
                return (
                  <div key={provider} className="text-[13px]">
                    <span className="font-semibold text-[var(--text-primary)]">
                      {provider.toUpperCase()}:
                    </span>{" "}
                    <span className="text-[var(--text-secondary)]">
                      {models ? Object.keys(models).length : 0} models
                    </span>
                  </div>
                );
              })}
            {Object.keys(currentPricing).length > 5 && (
              <div className="text-[13px] text-[var(--text-secondary)]">
                + {Object.keys(currentPricing).length - 5} more providers
              </div>
            )}
          </div>
        ) : (
          <div className="text-[var(--text-secondary)] text-[13px]">No pricing data available</div>
        )}
      </Card>

      {/* Pricing Modal */}
      {showModal && (
        <PricingModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSave={handlePricingUpdated}
        />
      )}
    </div>
  );
}
