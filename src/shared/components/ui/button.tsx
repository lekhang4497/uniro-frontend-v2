import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap text-[13px] font-medium transition-[transform,background-color,color,border-color,opacity] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Solid inverse surface: black on light, white on dark.
        default:
          "bg-[var(--button-primary-bg)] text-[var(--button-primary-fg)] hover:bg-[var(--button-primary-bg-hover)] active:bg-[var(--button-primary-bg-active)]",
        primary:
          "bg-[var(--button-primary-bg)] text-[var(--button-primary-fg)] hover:bg-[var(--button-primary-bg-hover)] active:bg-[var(--button-primary-bg-active)]",
        destructive:
          "bg-[var(--button-destructive-bg)] text-[var(--button-destructive-fg)] hover:bg-[var(--button-destructive-bg-hover)]",
        // Secondary: fits page surface, framed by a visible border.
        secondary:
          "bg-[var(--button-secondary-bg)] text-[var(--button-secondary-fg)] border border-[var(--button-secondary-border)] hover:bg-[var(--button-secondary-bg-hover)] active:bg-[var(--button-secondary-bg-active)]",
        // Outline keeps the bordered look without filling the surface.
        outline:
          "border border-[var(--border-default)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--button-ghost-bg-hover)] hover:border-[var(--border-strong)]",
        // Soft accent: kept for tinted call-outs (uses the blue accent).
        soft:
          "bg-[color-mix(in_srgb,var(--accent-blue)_14%,transparent)] text-[var(--accent-blue)] hover:bg-[color-mix(in_srgb,var(--accent-blue)_22%,transparent)]",
        ghost:
          "bg-transparent text-[var(--text-primary)] hover:bg-[var(--button-ghost-bg-hover)] active:bg-[var(--button-ghost-bg-active)]",
        link: "text-[var(--text-primary)] underline-offset-4 hover:underline active:scale-100",
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
