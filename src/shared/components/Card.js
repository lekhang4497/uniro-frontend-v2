"use client";

import { Card as ShadCard } from "@/shared/components/ui/card";
import { cn } from "@/lib/utils";

const paddings = {
  none: "",
  xs: "p-3",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export default function Card({
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
}) {
  return (
    <ShadCard
      className={cn(
        elev ? "shadow-[var(--shadow-elev)]" : "shadow-sm",
        hover && "hover:shadow-[var(--shadow-warm)] hover:border-primary/30 transition-all cursor-pointer",
        paddings[padding],
        className
      )}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 rounded-[10px] bg-muted text-muted-foreground">
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
              </div>
            )}
            <div>
              {title && <h3 className="text-foreground font-semibold">{title}</h3>}
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </ShadCard>
  );
}

Card.Section = function CardSection({ children, className, ...props }) {
  return (
    <div
      className={cn("p-4 rounded-[10px] bg-background border border-border", className)}
      {...props}
    >
      {children}
    </div>
  );
};

Card.Row = function CardRow({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "p-3 -mx-3 px-3 transition-colors border-b border-border last:border-b-0 hover:bg-muted/50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

Card.ListItem = function CardListItem({ children, actions, className, ...props }) {
  return (
    <div
      className={cn(
        "group flex items-center justify-between p-3 -mx-3 px-3 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors",
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
