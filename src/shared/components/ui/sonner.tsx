"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[var(--bg-primary)] group-[.toaster]:text-[var(--text-primary)] group-[.toaster]:border group-[.toaster]:border-[var(--bg-secondary)] group-[.toaster]:shadow-[var(--shadow-popover)]",
          description: "group-[.toast]:text-[var(--text-secondary)]",
          actionButton:
            "group-[.toast]:bg-[var(--accent-blue)] group-[.toast]:text-[var(--text-inverted)]",
          cancelButton:
            "group-[.toast]:bg-[var(--bg-secondary)] group-[.toast]:text-[var(--text-secondary)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
