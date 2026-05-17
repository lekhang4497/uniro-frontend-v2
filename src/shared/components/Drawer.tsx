"use client";

import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { cn } from "@/lib/utils";

type DrawerWidth = "sm" | "md" | "lg" | "xl" | "full";

const widths: Record<DrawerWidth, string> = {
  sm: "sm:max-w-[400px]",
  md: "sm:max-w-[500px]",
  lg: "sm:max-w-[600px]",
  xl: "sm:max-w-[800px]",
  full: "sm:max-w-full",
};

export interface DrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children?: ReactNode;
  width?: DrawerWidth;
  className?: string;
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  width = "md",
  className,
}: DrawerProps) {
  return (
    <Sheet
      open={!!isOpen}
      onOpenChange={(open) => {
        if (!open && onClose) onClose();
      }}
    >
      <SheetContent
        side="right"
        className={cn("p-0 flex flex-col", widths[width] ?? widths.md, className)}
      >
        {title && (
          <SheetHeader className="p-6 border-b border-[var(--bg-secondary)]">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
        )}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
