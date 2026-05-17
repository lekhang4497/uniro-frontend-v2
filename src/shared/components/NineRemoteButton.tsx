"use client";

import { useState } from "react";
import { Monitor } from "lucide-react";
import NineRemotePromoModal from "./NineRemotePromoModal";

export default function NineRemoteButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
        title="9Remote"
      >
        <Monitor className="h-4 w-4" />
        <span className="text-xs font-medium">Remote</span>
      </button>

      <NineRemotePromoModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
