"use client";

import { Network, Terminal } from "lucide-react";

export default function HowItWorks() {
  return (
    <section
      className="py-24 border-y border-[var(--bg-secondary)] bg-[var(--bg-tertiary)]"
      id="how-it-works"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[var(--text-primary)]">
            How Uniro Works
          </h2>
          <p className="text-[var(--text-secondary)] max-w-xl text-lg">
            Data flows seamlessly from your application through our intelligent
            routing layer to the best provider for the job.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connection line */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-[2px] bg-linear-to-r from-[var(--bg-secondary)] via-[var(--accent-blue)] to-[var(--bg-secondary)] -z-10" />

          {/* Step 1: CLI & SDKs */}
          <div className="flex flex-col gap-6 relative group">
            <div className="w-24 h-24 rounded-2xl bg-[var(--bg-primary)] border border-[var(--bg-secondary)] flex items-center justify-center group-hover:border-[var(--text-tertiary)] transition-colors z-10 mx-auto md:mx-0">
              <Terminal className="h-9 w-9 text-[var(--text-secondary)]" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">
                1. CLI &amp; SDKs
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Your requests start from your favorite tools or our unified SDK.
                Just change the base URL.
              </p>
            </div>
          </div>

          {/* Step 2: Uniro Hub */}
          <div className="flex flex-col gap-6 relative group md:items-center md:text-center">
            <div className="w-24 h-24 rounded-2xl bg-[var(--bg-primary)] border-2 border-[var(--accent-blue)] flex items-center justify-center z-10 mx-auto">
              <Network className="h-9 w-9 text-[var(--accent-blue)] animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2 text-[var(--accent-blue)]">
                2. Uniro Hub
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Our engine analyzes the prompt, checks provider health, and routes
                for lowest latency or cost.
              </p>
            </div>
          </div>

          {/* Step 3: AI Providers */}
          <div className="flex flex-col gap-6 relative group md:items-end md:text-right">
            <div className="w-24 h-24 rounded-2xl bg-[var(--bg-primary)] border border-[var(--bg-secondary)] flex items-center justify-center group-hover:border-[var(--text-tertiary)] transition-colors z-10 mx-auto md:mx-0">
              <div className="grid grid-cols-2 gap-2">
                <div className="w-6 h-6 rounded bg-[var(--bg-secondary)]" />
                <div className="w-6 h-6 rounded bg-[var(--bg-secondary)]" />
                <div className="w-6 h-6 rounded bg-[var(--bg-secondary)]" />
                <div className="w-6 h-6 rounded bg-[var(--bg-secondary)]" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">
                3. AI Providers
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                The request is fulfilled by OpenAI, Anthropic, Gemini, or others
                instantly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
