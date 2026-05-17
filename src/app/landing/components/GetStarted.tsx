"use client";

import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

export default function GetStarted() {
  const { copied, copy } = useCopyToClipboard();

  const handleCopy = (text: string) => {
    copy(text, "landing");
  };

  return (
    <section className="py-24 px-6 bg-[var(--bg-tertiary)]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-16 items-start">
          {/* Left: Steps */}
          <div className="flex-1">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[var(--text-primary)]">
              Get Started in 30 Seconds
            </h2>
            <p className="text-[var(--text-secondary)] text-lg mb-8">
              Install Uniro, configure your providers via web dashboard, and start
              routing AI requests.
            </p>

            <div className="flex flex-col gap-6">
              <div className="flex gap-4">
                <div className="flex-none w-8 h-8 rounded-full bg-[var(--accent-blue)]/15 text-[var(--accent-blue)] flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-lg text-[var(--text-primary)]">
                    Install Uniro
                  </h4>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Run npx command to start the server instantly
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-none w-8 h-8 rounded-full bg-[var(--accent-blue)]/15 text-[var(--accent-blue)] flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-lg text-[var(--text-primary)]">
                    Open Dashboard
                  </h4>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Configure providers and API keys via web interface
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-none w-8 h-8 rounded-full bg-[var(--accent-blue)]/15 text-[var(--accent-blue)] flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-lg text-[var(--text-primary)]">
                    Route Requests
                  </h4>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Point your CLI tools to http://localhost:20128
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Code block */}
          <div className="flex-1 w-full">
            <div className="rounded-xl overflow-hidden bg-[#1e1e1e] border border-[var(--bg-secondary)]">
              {/* Terminal header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#252526] border-b border-[#3a3a3a]">
                <div className="ml-1 text-xs text-gray-400 font-mono">
                  terminal
                </div>
              </div>

              {/* Terminal content */}
              <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto">
                <div
                  className="flex items-center gap-2 mb-4 group cursor-pointer"
                  onClick={() => handleCopy("npx uniro")}
                >
                  <span className="text-green-400">$</span>
                  <span className="text-white">npx uniro</span>
                  <span className="ml-auto text-gray-500 text-xs opacity-0 group-hover:opacity-100">
                    {copied === "landing" ? "Copied" : "Copy"}
                  </span>
                </div>

                <div className="text-gray-400 mb-6">
                  <span className="text-[#0285FF]">&gt;</span> Starting Uniro...
                  <br />
                  <span className="text-[#0285FF]">&gt;</span> Server running on{" "}
                  <span className="text-blue-400">http://localhost:20128</span>
                  <br />
                  <span className="text-[#0285FF]">&gt;</span> Dashboard:{" "}
                  <span className="text-blue-400">
                    http://localhost:20128/dashboard
                  </span>
                  <br />
                  <span className="text-green-400">&gt;</span> Ready to route!
                </div>

                <div className="text-xs text-gray-500 mb-2 border-t border-gray-700 pt-4">
                  Configure providers in dashboard or use environment variables
                </div>

                <div className="text-gray-400 text-xs">
                  <span className="text-purple-400">Data Location:</span>
                  <br />
                  <span className="text-gray-500">  macOS/Linux:</span>{" "}
                  ~/.uniro/db/data.sqlite
                  <br />
                  <span className="text-gray-500">  Windows:</span>{" "}
                  %APPDATA%/uniro/db/data.sqlite
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
