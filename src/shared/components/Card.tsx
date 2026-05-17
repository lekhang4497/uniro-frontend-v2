"use client";

import type { ComponentType, HTMLAttributes, ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import { Card as ShadCard } from "@/shared/components/ui/card";
import { Icon, type IconName } from "./Icon";
import { cn } from "@/lib/utils";

type CardPadding = "none" | "xs" | "sm" | "md" | "lg";
type IconLike = IconName | ComponentType<LucideProps>;

const paddings: Record<CardPadding, string> = {
  none: "",
  xs: "p-3",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  children?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: IconLike;
  action?: ReactNode;
  padding?: CardPadding;
  hover?: boolean;
  elev?: boolean;
  className?: string;
}

interface CardWithSubcomponents {
  (props: CardProps): React.JSX.Element;
  Section: (props: HTMLAttributes<HTMLDivElement>) => React.JSX.Element;
  Row: (props: HTMLAttributes<HTMLDivElement>) => React.JSX.Element;
  ListItem: (props: HTMLAttributes<HTMLDivElement> & { actions?: ReactNode }) => React.JSX.Element;
}

const CardImpl = function Card({
  children,
  title,
  subtitle,
  icon,
  action,
  padding = "md",
  hover = false,
  elev = false,
  className,
  ...props
}: CardProps) {
  return (
    <ShadCard
      className={cn(
        elev ? "shadow-[var(--shadow-popover)]" : "",
        hover && "hover:border-[var(--accent-blue)]/30 transition-colors cursor-pointer",
        paddings[padding],
        className
      )}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                <Icon
                  name={typeof icon === "string" ? (icon as IconName) : undefined}
                  icon={typeof icon !== "string" ? icon : undefined}
                  size={20}
                />
              </div>
            )}
            <div>
              {title && <h3 className="text-[var(--text-primary)] font-semibold">{title}</h3>}
              {subtitle && <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </ShadCard>
  );
} as CardWithSubcomponents;

CardImpl.Section = function CardSection({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "p-4 rounded-[var(--radius-md)] bg-[var(--bg-primary)] border border-[var(--bg-secondary)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

CardImpl.Row = function CardRow({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "p-3 -mx-3 px-3 transition-colors border-b border-[var(--bg-secondary)] last:border-b-0 hover:bg-[var(--bg-secondary)]/50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

CardImpl.ListItem = function CardListItem({
  children,
  actions,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { actions?: ReactNode }) {
  return (
    <div
      className={cn(
        "group flex items-center justify-between p-3 -mx-3 px-3 border-b border-[var(--bg-secondary)] last:border-b-0 hover:bg-[var(--bg-secondary)]/50 transition-colors",
        className
      )}
      {...props}
    >
      <div className="flex-1 min-w-0">{children}</div>
      {actions && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {actions}
        </div>
      )}
    </div>
  );
};

export default CardImpl;
