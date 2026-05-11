"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { Button as ShadButton } from "@/shared/components/ui/button";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

const variantMap = {
  primary: "default",
  secondary: "secondary",
  outline: "outline",
  ghost: "ghost",
  danger: "destructive",
  success: "default",
};

const sizeMap = { sm: "sm", md: "default", lg: "lg" };

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
        <Loader2 className="animate-spin h-4 w-4" />
      ) : icon ? (
        <Icon name={typeof icon === "string" ? icon : undefined} icon={typeof icon !== "string" ? icon : undefined} size={16} />
      ) : null}
      {children}
      {iconRight && !loading && (
        <Icon name={typeof iconRight === "string" ? iconRight : undefined} icon={typeof iconRight !== "string" ? iconRight : undefined} size={16} />
      )}
    </ShadButton>
  );
});

export default Button;
