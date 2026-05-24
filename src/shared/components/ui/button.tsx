import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap text-[13px] font-medium transition-[transform,background-color,color,opacity] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-blue)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent-blue)] text-[var(--text-inverted)] hover:brightness-95",
        // Legacy alias retained for older callers
        primary:
          "bg-[var(--accent-blue)] text-[var(--text-inverted)] hover:brightness-95",
        destructive:
          "bg-[var(--accent-red)] text-[var(--text-inverted)] hover:brightness-95",
        outline:
          "border border-[var(--bg-secondary)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]",
        secondary:
          "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]",
        soft:
          "bg-[color-mix(in_srgb,var(--accent-blue)_14%,transparent)] text-[var(--accent-blue)] hover:bg-[color-mix(in_srgb,var(--accent-blue)_22%,transparent)]",
        ghost:
          "bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]",
        link: "text-[var(--accent-blue)] underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-[12px]",
        lg: "h-10 px-5",
        icon: "h-9 w-9 p-0",
      },
      pill: {
        true: "rounded-full",
        false: "rounded-[var(--radius-md)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      pill: true,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, pill, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, pill, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
