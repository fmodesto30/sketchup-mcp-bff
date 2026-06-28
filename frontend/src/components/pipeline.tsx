import { ChevronRight, Check, Loader2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowStep } from "@/api/types";

const STEP = {
  done: { box: "border-t-ok", icon: "text-ok" },
  doing: { box: "border-t-blue bg-card", icon: "text-blue" },
  pending: { box: "border-t-border opacity-60", icon: "text-muted-foreground" },
} as const;

function StepIcon({ status }: { status: WorkflowStep["status"] }) {
  if (status === "done") return <Check className="size-4" />;
  if (status === "doing") return <Loader2 className="size-4 animate-spin" />;
  return <Circle className="size-4" />;
}

export function Pipeline({ steps }: { steps: WorkflowStep[] }) {
  if (!steps.length) return null;
  return (
    <div className="flex flex-wrap items-stretch gap-y-2">
      {steps.map((s, i) => {
        const cfg = STEP[s.status] ?? STEP.pending;
        return (
          <div key={s.key + i} className="flex items-stretch">
            <div
              className={cn(
                "min-w-[88px] flex-1 rounded-md border border-border/60 border-t-2 bg-background px-2 py-3 text-center",
                cfg.box,
              )}
            >
              <div className={cn("flex justify-center", cfg.icon)}>
                <StepIcon status={s.status} />
              </div>
              <div className="mt-1.5 text-[11px] font-semibold">{s.label}</div>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className="size-4 shrink-0 self-center text-border" />
            )}
          </div>
        );
      })}
    </div>
  );
}
