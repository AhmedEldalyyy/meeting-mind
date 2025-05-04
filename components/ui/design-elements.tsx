import React from "react";
import { cn } from "@/lib/utils";

interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  variant?: "default" | "subtle" | "dotted";
}

export const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ className, orientation = "horizontal", variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-border dark:bg-border transition-soft",
          orientation === "horizontal" && "h-px w-full",
          orientation === "vertical" && "h-full w-px",
          variant === "default" && "opacity-100",
          variant === "subtle" && "opacity-50",
          variant === "dotted" && "border-dotted border-t border-border bg-transparent",
          className
        )}
        {...props}
      />
    );
  }
);
Divider.displayName = "Divider";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline";
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-soft",
          variant === "default" && "bg-primary text-primary-foreground shadow-soft dark:shadow-soft-dark",
          variant === "outline" && "border border-primary text-primary-foreground",
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

interface AccentBoxProps extends React.HTMLAttributes<HTMLDivElement> {}

export const AccentBox = React.forwardRef<HTMLDivElement, AccentBoxProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-xl border bg-background p-6 transition-soft backdrop-blur-[2px] shadow-soft dark:shadow-soft-dark",
          "before:absolute before:-inset-0.5 before:-z-10 before:bg-gradient-to-br before:from-primary/20 before:to-secondary/20 before:blur-xl",
          className
        )}
        {...props}
      />
    );
  }
);
AccentBox.displayName = "AccentBox";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border border-border/50 bg-background/50 backdrop-blur-md backdrop-saturate-150 transition-soft shadow-soft dark:shadow-soft-dark",
          "dark:bg-background/30 dark:backdrop-blur-xl dark:backdrop-saturate-200",
          className
        )}
        {...props}
      />
    );
  }
);
GlassCard.displayName = "GlassCard"; 