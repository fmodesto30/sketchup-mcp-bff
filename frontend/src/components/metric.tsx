import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/status";

const valTone: Record<Tone, string> = {
  ok: "text-ok", info: "text-blue", warn: "text-warn", danger: "text-danger", neutral: "text-foreground",
};

export function Metric({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  sub,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  sub?: string;
}) {
  return (
    <div className="relative rounded-md border border-border/60 bg-background/60 p-3.5">
      {Icon && <Icon className="absolute right-3 top-3 size-4 text-muted-foreground/50" />}
      <div className={cn("font-mono text-2xl font-bold leading-none tracking-tight", valTone[tone])}>
        {value}
      </div>
      <div className="mt-1.5 text-[11px] uppercase tracking-wide text-muted-foreground/60">{label}</div>
      {sub && <div className="mt-1.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
