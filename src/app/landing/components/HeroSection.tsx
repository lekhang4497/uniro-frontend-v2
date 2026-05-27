"use client";

import { Code2, Rocket } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 px-6 min-h-[90vh] flex flex-col items-center justify-center overflow-hidden">
      {/* Soft halo behind the headline */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[var(--bg-secondary)] opacity-60 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl w-full text-center flex flex-col items-center gap-8">
        {/* Version badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
          <span className="flex h-2 w-2 rounded-full bg-[var(--accent-green)] animate-pulse" />
          v1.0 is now live
        </div>

        {/* Main heading */}
        <h1 className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tight text-[var(--text-primary)]">
          One Endpoint for <br />
          <span className="text-[var(--text-secondary)]">All AI Providers</span>
        </h1>

        {/* Description */}
        <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto font-light">
          AI endpoint proxy with web dashboard - A JavaScript port of CLIProxyAPI.
          Works seamlessly with Claude Code, OpenAI Codex, Cline, RooCode, and
          other CLI tools.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 w-full">
          <button
            type="button"
            className="h-12 px-8 rounded-lg bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] active:bg-[var(--button-primary-bg-active)] text-[var(--button-primary-fg)] text-base font-bold transition-colors flex items-center gap-2"
          >
            <Rocket className="h-5 w-5" />
            Get Started
          </button>
          <a
            href="https://github.com/your-org/uniro"
            target="_blank"
            rel="noopener noreferrer"
            className="h-12 px-8 rounded-lg border border-[var(--button-secondary-border)] bg-[var(--button-secondary-bg)] hover:bg-[var(--button-secondary-bg-hover)] active:bg-[var(--button-secondary-bg-active)] text-[var(--button-secondary-fg)] text-base font-bold transition-colors flex items-center gap-2"
          >
            <Code2 className="h-5 w-5" />
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
