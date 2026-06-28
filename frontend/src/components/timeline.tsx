import { Check, Loader2, X, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RunStep } from "@/api/types";

const NODE = {
  done: { ring: "border-ok text-ok", Icon: Check },
  running: { ring: "border-blue text-blue", Icon: Loader2 },
  failed: { ring: "border-danger text-danger", Icon: X },
  pending: { ring: "border-border text-muted-foreground", Icon: Circle },
} as const;

export function Timeline({ steps }: { steps: RunStep[] }) {
  return (
    <div className="flex flex-col">
      {steps.map((s, i) => {
        const cfg = NODE[s.status] ?? NODE.pending;
        const last = i === steps.length - 1;
        return (
          <div key={i} className="relative grid grid-cols-[24px_1fr] gap-3">
            {!last && <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-border" />}
            <div
              className={cn(
                "z-10 grid size-6 place-items-center rounded-full border-2 bg-card",
                cfg.ring,
              )}
            >
              <cfg.Icon className={cn("size-3", s.status === "running" && "animate-spin")} />
            </div>
            <div className="pb-4">
              <div className="text-sm">{s.name}</div>
              {(s.startedAt || s.finishedAt) && (
                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground/50">
                  {s.status}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
