import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide border",
  {
    variants: {
      variant: {
        default: "bg-secondary text-muted-foreground border-border",
        ok: "bg-ok/12 text-ok border-ok/25",
        warn: "bg-warn/12 text-warn border-warn/25",
        danger: "bg-danger/12 text-danger border-danger/25",
        info: "bg-blue/12 text-blue border-blue/25",
        gold: "bg-primary/12 text-primary border-primary/30",
        purple: "bg-purple/12 text-purple border-purple/30",
        outline: "bg-transparent text-muted-foreground border-border",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
