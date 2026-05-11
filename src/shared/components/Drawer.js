"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { cn } from "@/lib/utils";

const widths = {
  sm: "sm:max-w-[400px]",
  md: "sm:max-w-[500px]",
  lg: "sm:max-w-[600px]",
  xl: "sm:max-w-[800px]",
  full: "sm:max-w-full",
};

export default function Drawer({ isOpen, onClose, title, children, width = "md", className }) {
  return (
    <Sheet open={!!isOpen} onOpenChange={(open) => { if (!open && onClose) onClose(); }}>
      <SheetContent side="right" className={cn("p-0 flex flex-col", widths[width] || widths.md, className)}>
        {title && (
          <SheetHeader className="p-6 border-b border-border">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
        )}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
