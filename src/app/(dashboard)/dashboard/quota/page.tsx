import { Suspense } from "react";
import { CardSkeleton } from "@/shared/components/Loading";
import ProviderLimits from "../usage/components/ProviderLimits";

export default function QuotaPage() {
  return (
    <div className="px-8 py-7">
      <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">Quota</h1>
      <p className="mt-1 text-[14px] text-[var(--text-secondary)] max-w-[540px]">
        Per-provider rate limits, daily caps, and remaining quota across every configured account.
      </p>
      <div className="mt-6">
        <Suspense fallback={<CardSkeleton />}>
          <ProviderLimits />
        </Suspense>
      </div>
    </div>
  );
}
