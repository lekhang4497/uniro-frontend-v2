"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Menu, X } from "lucide-react";
import { UniroMark } from "@/shared/components/UniroMark";

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  return (
    <nav className="fixed top-0 z-50 w-full bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-default)]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          type="button"
          className="flex items-center gap-3 cursor-pointer bg-transparent border-none p-0"
          onClick={() => router.push("/")}
          aria-label="Navigate to home"
        >
          <div className="size-8 rounded bg-[var(--bg-inverse)] flex items-center justify-center text-[var(--text-inverted)]">
            <UniroMark size={18} className="text-[var(--text-inverted)]" />
          </div>
          <h2 className="text-[var(--text-primary)] text-xl font-bold tracking-tight">
            Uniro
          </h2>
        </button>

        {/* Desktop menu */}
        <div className="hidden md:flex items-center gap-8">
          <a
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium transition-colors"
            href="#features"
          >
            Features
          </a>
          <a
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium transition-colors"
            href="#how-it-works"
          >
            How it Works
          </a>
          <a
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium transition-colors"
            href="https://github.com/your-org/uniro#readme"
            target="_blank"
            rel="noopener noreferrer"
          >
            Docs
          </a>
          <a
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium transition-colors flex items-center gap-1"
            href="https://github.com/your-org/uniro"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* CTA + Mobile menu */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="hidden sm:flex h-9 items-center justify-center rounded-lg px-4 bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] active:bg-[var(--button-primary-bg-active)] transition-colors text-[var(--button-primary-fg)] text-sm font-bold"
          >
            Get Started
          </button>
          <button
            type="button"
            className="md:hidden text-[var(--text-primary)]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border-default)] bg-[var(--bg-primary)]/95 backdrop-blur-md">
          <div className="flex flex-col gap-4 p-6">
            <a
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium transition-colors"
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </a>
            <a
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium transition-colors"
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
            >
              How it Works
            </a>
            <a
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium transition-colors"
              href="https://github.com/your-org/uniro#readme"
              target="_blank"
              rel="noopener noreferrer"
            >
              Docs
            </a>
            <a
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium transition-colors"
              href="https://github.com/your-org/uniro"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="h-9 rounded-lg bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-bg-hover)] active:bg-[var(--button-primary-bg-active)] text-[var(--button-primary-fg)] text-sm font-bold transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
