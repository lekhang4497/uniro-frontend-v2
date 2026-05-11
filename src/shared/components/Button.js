"use client";

import { forwardRef } from "react";
import { Button as ShadButton } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";

// Legacy -> shadcn variant mapping
const variantMap = {
  primary: "default",
  secondary: "secondary",
  outline: "outline",
  ghost: "ghost",
  danger: "destructive",
  // success has no shadcn equivalent — keep custom class
  success: "default",
};

// Legacy size labels -> shadcn sizes
const sizeMap = {
  sm: "sm",
  md: "default",
  lg: "lg",
};

const Button = forwardRef(function Button(
  {
    children,
    variant = "primary",
    size = "md",
    icon,
    iconRight,
    disabled = false,
    loading = false,
    fullWidth = false,
    className,
    ...props
  },
  ref
) {
  const isSuccess = variant === "success";
  return (
    <ShadButton
      ref={ref}
      variant={variantMap[variant] ?? "default"}
      size={sizeMap[size] ?? "default"}
      disabled={disabled || loading}
      className={cn(
        isSuccess && "bg-uniro-green text-uniro-light hover:bg-uniro-green/90",
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
      ) : icon ? (
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && (
        <span className="material-symbols-outlined text-[18px]">{iconRight}</span>
      )}
    </ShadButton>
  );
});

export default Button;
