"use client";

// Top bar for the router-builder. Houses: back link, inline-editable router
// name, draft badge, tools dropdown placeholder, settings dialog launcher,
// and the publish/save action.
//
// "Publish" is a manual save now that auto-save handles the typical case; it
// just forces a PATCH and surfaces a toast-style confirmation in the saving
// indicator next to it.

import { ChevronLeft, MoreHorizontal, Settings, Check } from "lucide-react";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

export function Header({
  routerName,
  onRename,
  onOpenSettings,
  onPublish,
  saveState,
  publishing,
  onOpenYaml,
}) {
  return (
    <header className="flex h-14 items-center gap-3 px-4 border-b border-border bg-card">
      <Link
        href="/dashboard"
        aria-label="Back"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <input
        type="text"
        value={routerName}
        onChange={(e) => onRename(e.target.value, { commit: false })}
        onBlur={(e) => onRename(e.target.value, { commit: true })}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="bg-transparent outline-none text-[16px] font-semibold tracking-tight min-w-0 max-w-[280px] truncate focus:bg-secondary rounded px-1.5 -mx-1.5 brand-mark"
      />
      <span className="ml-1 inline-flex items-center rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10.5px] tracking-[0.06em] uppercase text-muted-foreground">
        Draft
      </span>
      <div className="flex-1" />

      <SaveIndicator saveState={saveState} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Tools"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="text-[13px]">
          <DropdownMenuItem onSelect={() => onOpenYaml && onOpenYaml()}>
            Open in YAML view
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="Settings"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
      >
        <Settings className="h-4 w-4" />
      </button>

      <Button
        size="sm"
        onClick={onPublish}
        disabled={publishing}
      >
        {publishing ? "Saving..." : "Publish"}
      </Button>
    </header>
  );
}

function SaveIndicator({ saveState }) {
  if (!saveState) return null;
  if (saveState.saving) {
    return (
      <span className="text-[11px] text-muted-foreground">Saving...</span>
    );
  }
  if (saveState.lastSavedAt) {
    return (
      <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
        <Check className="h-3 w-3" /> Saved
      </span>
    );
  }
  return null;
}
