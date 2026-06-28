// status.ts — mapeia strings de status do domínio para um "tom" visual.
export type Tone = "ok" | "info" | "warn" | "danger" | "neutral";

const MAP: Record<string, Tone> = {
  // ok
  succeeded: "ok", done: "ok", success: "ok", online: "ok", aprovado: "ok", pass: "ok", answered: "ok",
  // info (em andamento)
  running: "info", working: "info", doing: "info", thinking: "info",
  // warn
  queued: "warn", pending: "warn", waiting: "warn", pendente: "warn", idle: "neutral",
  // danger
  failed: "danger", error: "danger", blocked: "danger", rejected: "danger", skipped: "neutral",
};

export function tone(status?: string | null): Tone {
  const k = String(status ?? "").toLowerCase().trim();
  if (MAP[k]) return MAP[k];
  for (const key in MAP) if (k.includes(key)) return MAP[key];
  return "neutral";
}

export const toneText: Record<Tone, string> = {
  ok: "text-ok", info: "text-blue", warn: "text-warn", danger: "text-danger", neutral: "text-muted-foreground",
};
export const toneDot: Record<Tone, string> = {
  ok: "bg-ok", info: "bg-blue", warn: "bg-warn", danger: "bg-danger", neutral: "bg-muted-foreground",
};
export const tonePill: Record<Tone, string> = {
  ok: "bg-ok/12 text-ok border-ok/25",
  info: "bg-blue/12 text-blue border-blue/25",
  warn: "bg-warn/12 text-warn border-warn/25",
  danger: "bg-danger/12 text-danger border-danger/25",
  neutral: "bg-secondary text-muted-foreground border-border",
};
