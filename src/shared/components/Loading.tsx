"use client";

import type { HTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { Skeleton as ShadSkeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/lib/utils";

type SpinnerSize = "sm" | "md" | "lg" | "xl";

const spinnerSizes: Record<SpinnerSize, number> = { sm: 16, md: 24, lg: 32, xl: 48 };

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <Loader2
      size={spinnerSizes[size] ?? 24}
      className={cn("animate-spin text-[var(--accent-blue)]", className)}
    />
  );
}

interface PageLoadingProps {
  message?: string;
}

export function PageLoading({ message = "Loading..." }: PageLoadingProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-primary)]">
      <Spinner size="xl" />
      <p className="mt-4 text-[var(--text-secondary)]">{message}</p>
    </div>
  );
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <ShadSkeleton className={cn("rounded-[var(--radius-md)]", className)} {...props} />;
}

export function CardSkeleton() {
  return (
    <div className="p-6 rounded-[var(--radius-lg)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)]">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-10 rounded-[var(--radius-md)]" />
      </div>
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

type LoadingType = "spinner" | "page" | "skeleton" | "card";

interface LoadingProps extends SpinnerProps, PageLoadingProps, HTMLAttributes<HTMLDivElement> {
  type?: LoadingType;
}

export default function Loading({ type = "spinner", ...props }: LoadingProps) {
  switch (type) {
    case "page":
      return <PageLoading {...(props as PageLoadingProps)} />;
    case "skeleton":
      return <Skeleton {...(props as HTMLAttributes<HTMLDivElement>)} />;
    case "card":
      return <CardSkeleton />;
    default:
      return <Spinner {...(props as SpinnerProps)} />;
  }
}
