"use client";

import { forwardRef } from "react";
import type { ComponentType, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import type { LucideProps } from "lucide-react";
import { Button as ShadButton } from "@/shared/components/ui/button";
import type { ButtonProps as ShadButtonProps } from "@/shared/components/ui/button";
import { Icon, type IconName } from "./Icon";
import { cn } from "@/lib/utils";

type LegacyVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type LegacySize = "sm" | "md" | "lg";

const variantMap: Record<LegacyVariant, NonNullable<ShadButtonProps["variant"]>> = {
  primary: "default",
  secondary: "secondary",
  outline: "outline",
  ghost: "ghost",
  danger: "destructive",
  success: "default",
};

const sizeMap: Record<LegacySize, NonNullable<ShadButtonProps["size"]>> = {
  sm: "sm",
  md: "default",
  lg: "lg",
};

type IconLike = IconName | ComponentType<LucideProps>;

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "ref"> {
  children?: ReactNode;
  variant?: LegacyVariant;
  size?: LegacySize;
  icon?: IconLike;
  iconRight?: IconLike;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
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
        isSuccess && "bg-[var(--accent-green)] text-[var(--text-inverted)] hover:brightness-95",
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin h-4 w-4" />
      ) : icon ? (
        <Icon
          name={typeof icon === "string" ? (icon as IconName) : undefined}
          icon={typeof icon !== "string" ? icon : undefined}
          size={16}
        />
      ) : null}
      {children}
      {iconRight && !loading && (
        <Icon
          name={typeof iconRight === "string" ? (iconRight as IconName) : undefined}
          icon={typeof iconRight !== "string" ? iconRight : undefined}
          size={16}
        />
      )}
    </ShadButton>
  );
});

export default Button;
