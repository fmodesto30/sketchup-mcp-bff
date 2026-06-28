import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Concatena classes Tailwind resolvendo conflitos (padrão shadcn). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Tempo relativo curto em pt-BR a partir de epoch (s ou ms), ISO ou Date. */
export function timeAgo(input?: string | number | Date | null): string {
  if (input == null) return "";
  const d =
    input instanceof Date
      ? input
      : new Date(typeof input === "number" && input < 1e12 ? input * 1000 : input);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (Number.isNaN(s)) return "";
  if (s < 5) return "agora";
  if (s < 60) return `${s}s atrás`;
  if (s < 3600) return `${Math.floor(s / 60)}min atrás`;
  if (s < 86400) return `${Math.floor(s / 3600)}h atrás`;
  return `${Math.floor(s / 86400)}d atrás`;
}
