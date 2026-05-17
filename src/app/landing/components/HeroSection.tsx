"use client";

import { Code2, Rocket } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 px-6 min-h-[90vh] flex flex-col items-center justify-center overflow-hidden">
      {/* Glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[#d97757]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl w-full text-center flex flex-col items-center gap-8">
        {/* Version badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#2a2926] bg-[#1f1e1c]/50 px-3 py-1 text-xs font-medium text-[#d97757]">
          <span className="flex h-2 w-2 rounded-full bg-[#d97757] animate-pulse" />
          v1.0 is now live
        </div>

        {/* Main heading */}
        <h1 className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tight">
          One Endpoint for <br />
          <span className="text-[#d97757]">All AI Providers</span>
        </h1>

        {/* Description */}
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-light">
          AI endpoint proxy with web dashboard - A JavaScript port of CLIProxyAPI.
          Works seamlessly with Claude Code, OpenAI Codex, Cline, RooCode, and
          other CLI tools.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 w-full">
          <button
            type="button"
            className="h-12 px-8 rounded-lg bg-[#d97757] hover:bg-[#e0650a] text-[#141413] text-base font-bold transition-all shadow-[0_0_15px_rgba(217,119,87,0.4)] flex items-center gap-2"
          >
            <Rocket className="h-5 w-5" />
            Get Started
          </button>
          <a
            href="https://github.com/your-org/uniro"
            target="_blank"
            rel="noopener noreferrer"
            className="h-12 px-8 rounded-lg border border-[#2a2926] bg-[#1f1e1c] hover:bg-[#2a2926] text-white text-base font-bold transition-all flex items-center gap-2"
          >
            <Code2 className="h-5 w-5" />
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
