import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-9 w-full rounded-[var(--radius)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-blue)] disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-[var(--text-primary)]",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
