import { cn } from "@/lib/utils";
import { tone as toTone, tonePill, toneDot, type Tone } from "@/lib/status";

export function StatusPill({
  status,
  tone: forced,
  pulse,
  className,
  label,
}: {
  status?: string;
  tone?: Tone;
  pulse?: boolean;
  className?: string;
  label?: string;
}) {
  const t = forced ?? toTone(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tonePill[t],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", toneDot[t], pulse && "animate-pulse-dot")} />
      {label ?? status}
    </span>
  );
}
