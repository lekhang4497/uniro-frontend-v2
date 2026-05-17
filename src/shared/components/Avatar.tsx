"use client";

import {
  Avatar as ShadAvatar,
  AvatarImage,
  AvatarFallback,
} from "@/shared/components/ui/avatar";
import { cn } from "@/lib/utils";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizes: Record<AvatarSize, string> = {
  xs: "size-6 text-xs",
  sm: "size-8 text-sm",
  md: "size-10 text-base",
  lg: "size-12 text-lg",
  xl: "size-16 text-xl",
};

const fallbackPalette = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-yellow-500",
  "bg-lime-500",
  "bg-green-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-sky-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-fuchsia-500",
  "bg-pink-500",
  "bg-rose-500",
];

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function colorFor(name?: string): string {
  if (!name) return "bg-[var(--accent-blue)]";
  return fallbackPalette[name.charCodeAt(0) % fallbackPalette.length] ?? "bg-[var(--accent-blue)]";
}

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  className?: string;
}

export default function Avatar({ src, alt = "Avatar", name, size = "md", className }: AvatarProps) {
  return (
    <ShadAvatar
      className={cn("ring-2 ring-[var(--bg-primary)]", sizes[size], className)}
      aria-label={alt}
    >
      {src && <AvatarImage src={src} alt={alt} />}
      <AvatarFallback className={cn("text-white font-semibold", colorFor(name))}>
        {getInitials(name)}
      </AvatarFallback>
    </ShadAvatar>
  );
}
