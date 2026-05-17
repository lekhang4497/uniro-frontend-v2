import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[11px] font-medium transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-blue)]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--bg-secondary)] text-[var(--text-secondary)]",
        secondary:
          "bg-[var(--bg-secondary)] text-[var(--text-secondary)]",
        outline:
          "border border-[var(--bg-secondary)] text-[var(--text-secondary)]",
        destructive:
          "bg-[var(--accent-red)] text-[var(--text-inverted)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
