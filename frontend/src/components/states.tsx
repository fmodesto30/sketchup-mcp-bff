import { AlertCircle, Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingState({ label = "Carregando…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 p-4 text-sm text-muted-foreground/70", className)}>
      <Loader2 className="size-4 animate-spin text-blue" /> {label}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  sub,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  sub?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-4 py-10 text-center", className)}>
      <Icon className="size-7 text-border" strokeWidth={1.6} />
      <div className="font-medium text-muted-foreground">{title}</div>
      {sub && <div className="max-w-[40ch] text-sm text-muted-foreground/60">{sub}</div>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, className }: { message?: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border border-danger/25 bg-danger/10 p-3 text-sm text-danger",
        className,
      )}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <div>
        <b className="text-danger">Falha ao carregar.</b>
        {message ? <span className="ml-1 text-danger/80">{message}</span> : null}
      </div>
    </div>
  );
}
