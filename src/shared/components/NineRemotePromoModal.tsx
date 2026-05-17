"use client";

import { useEffect, type ComponentType } from "react";
import { createPortal } from "react-dom";
import {
  Terminal,
  Cast,
  FolderOpen,
  QrCode,
  WifiOff,
  Smartphone,
  X,
  ExternalLink,
} from "lucide-react";
import type { LucideProps } from "lucide-react";

interface Feature {
  Icon: ComponentType<LucideProps>;
  label: string;
  desc: string;
}

interface Bullet {
  Icon: ComponentType<LucideProps>;
  text: string;
}

const FEATURES: Feature[] = [
  { Icon: Terminal, label: "Terminal", desc: "Full shell access" },
  { Icon: Cast, label: "Desktop", desc: "Screen sharing" },
  { Icon: FolderOpen, label: "Files", desc: "Browse & edit files" },
];

const BULLETS: Bullet[] = [
  { Icon: QrCode, text: "Scan QR to connect instantly" },
  { Icon: WifiOff, text: "No port forwarding needed" },
  { Icon: Smartphone, text: "Works on any device" },
];

const NINE_REMOTE_URL = "https://9remote.cc";

export interface NineRemotePromoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NineRemotePromoModal({ isOpen, onClose }: NineRemotePromoModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative w-full max-w-sm rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-popover)] flex flex-col bg-[var(--bg-primary)] border border-[var(--bg-secondary)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--bg-secondary)]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-[var(--radius)] flex items-center justify-center bg-[var(--accent-blue)]">
              <Terminal className="h-4 w-4 text-[var(--text-inverted)]" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-blue)] font-mono">
              9Remote
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-7 py-7 pb-9 flex flex-col gap-6">
          {/* Hero */}
          <div className="flex flex-col items-center gap-2 text-center mt-2">
            <div className="w-14 h-14 rounded-[var(--radius-lg)] flex items-center justify-center mb-1 bg-[var(--accent-blue)]">
              <Terminal className="h-[30px] w-[30px] text-[var(--text-inverted)]" />
            </div>
            <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">9Remote</h1>
            <p className="text-xs text-[var(--text-secondary)] leading-5 max-w-[220px]">
              Access your terminal, desktop &amp; files from anywhere
            </p>
          </div>

          {/* Feature cards */}
          <div className="flex gap-2 w-full">
            {FEATURES.map(({ Icon, label, desc }) => (
              <div
                key={label}
                className="flex-1 flex flex-col items-center gap-1.5 py-4 px-1 rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-secondary)]"
              >
                <Icon className="h-[22px] w-[22px] text-[var(--accent-blue)]" />
                <p className="text-xs font-semibold text-[var(--text-primary)]">{label}</p>
                <p className="text-[10px] text-[var(--text-secondary)] text-center leading-4">{desc}</p>
              </div>
            ))}
          </div>

          {/* Bullets */}
          <div className="flex flex-col gap-3 w-full">
            {BULLETS.map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 flex-shrink-0 text-[var(--accent-blue)]" />
                <span className="text-xs text-[var(--text-secondary)]">{text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={() => window.open(NINE_REMOTE_URL, "_blank")}
            className="w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold text-[var(--text-inverted)] rounded-[var(--radius-md)] bg-[var(--accent-blue)] hover:brightness-95 active:scale-[0.98] transition-all"
          >
            <ExternalLink className="h-4 w-4" />
            Get 9Remote
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
