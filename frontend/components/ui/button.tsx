"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
};

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-accent text-accent-foreground shadow-panel hover:bg-accent/90 focus-visible:ring-accent",
  secondary:
    "border border-border bg-surface text-foreground hover:bg-surface-elevated focus-visible:ring-ring",
  ghost:
    "bg-transparent text-foreground hover:bg-surface focus-visible:ring-ring",
  danger:
    "bg-danger/90 text-white hover:bg-danger focus-visible:ring-danger",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 rounded-xl px-3 text-sm",
  md: "h-11 rounded-2xl px-4 text-sm",
  lg: "h-12 rounded-2xl px-5 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, children, ...props }, ref) => {
    const classes = cn(
      "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:pointer-events-none disabled:opacity-50",
      variantClasses[variant],
      sizeClasses[size],
      className,
    );

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>;
      return React.cloneElement(child, {
        className: cn(classes, child.props.className),
      });
    }

    return (
      <button
        ref={ref}
        className={classes}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
