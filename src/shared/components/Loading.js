"use client";

import { Loader2 } from "lucide-react";
import { Skeleton as ShadSkeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/lib/utils";

const spinnerSizes = { sm: 16, md: 24, lg: 32, xl: 48 };

export function Spinner({ size = "md", className }) {
  return (
    <Loader2
      size={spinnerSizes[size] ?? 24}
      className={cn("animate-spin text-primary", className)}
    />
  );
}

export function PageLoading({ message = "Loading..." }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <Spinner size="xl" />
      <p className="mt-4 text-muted-foreground">{message}</p>
    </div>
  );
}

export function Skeleton({ className, ...props }) {
  return <ShadSkeleton className={cn("rounded-[10px]", className)} {...props} />;
}

export function CardSkeleton() {
  return (
    <div className="p-6 rounded-[14px] border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-10 rounded-[10px]" />
      </div>
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export default function Loading({ type = "spinner", ...props }) {
  switch (type) {
    case "page":
      return <PageLoading {...props} />;
    case "skeleton":
      return <Skeleton {...props} />;
    case "card":
      return <CardSkeleton {...props} />;
    default:
      return <Spinner {...props} />;
  }
}
