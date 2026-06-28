import * as React from "react";
import { cn } from "@/lib/utils";

const accentMap: Record<string, string> = {
  gold: "border-t-2 border-t-primary",
  blue: "border-t-2 border-t-blue",
  purple: "border-t-2 border-t-purple",
  orange: "border-t-2 border-t-orange",
  ok: "border-t-2 border-t-ok",
};

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { accent?: keyof typeof accentMap }
>(({ className, accent, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border border-border bg-card text-card-foreground shadow-sm transition-colors hover:border-border/80",
      "bg-gradient-to-b from-white/[0.015] to-transparent bg-[length:100%_120px] bg-no-repeat",
      accent && accentMap[accent],
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-start justify-between gap-3 p-4", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm font-semibold leading-tight tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardEyebrow = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70", className)}
      {...props}
    />
  ),
);
CardEyebrow.displayName = "CardEyebrow";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-4 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardEyebrow, CardContent };
