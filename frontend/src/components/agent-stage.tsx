// agent-stage.tsx — "Estúdio ao vivo": o time de agentes como bonequinhos num
// cenário. Status real (online/offline/working), balão de fala, botão Rodar, e um
// chat da conversa. Quando você dispara um agente, ele "consulta" os outros (demo
// honesta do fluxo enquanto o ciclo real do upstream não está rodando).
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Play, MessagesSquare, Wifi, WifiOff } from "lucide-react";
import type { Agent } from "@/api/types";
import { cn } from "@/lib/utils";

/* papel → carinha do bonequinho + cor do cenário */
const FACE: Record<string, { emoji: string; tint: string }> = {
  PM: { emoji: "🧭", tint: "from-blue/25 to-blue/5 text-blue" },
  "Team Lead": { emoji: "🛠️", tint: "from-primary/25 to-primary/5 text-primary" },
  Arquiteto: { emoji: "📐", tint: "from-purple/25 to-purple/5 text-purple" },
};
const DEFAULT_FACE = { emoji: "🤖", tint: "from-secondary to-secondary text-muted-foreground" };

interface ChatLine { id: number; agentId: string; name: string; text: string }

/** roteiro leve PM → Team Lead → Arquiteto pra dar vida ao clicar Rodar. */
const SCRIPT: Record<string, { say: string; to?: string }[]> = {
  "interior-pm": [
    { say: "Preciso do programa da sala.", to: "interior-orchestrator" },
    { say: "Team Lead, coordena com o Arquiteto?", to: "interior-designer" },
  ],
  "interior-orchestrator": [
    { say: "Rodando os gates locais…" },
    { say: "Arquiteto, propõe o layout?", to: "interior-designer" },
  ],
  "interior-designer": [
    { say: "Propondo o layout do cômodo…" },
    { say: "Programa pronto pro PM aprovar.", to: "interior-pm" },
  ],
};

export function AgentStage({
  agents,
  onRun,
  runningId,
}: {
  agents: Agent[];
  onRun: (id: string) => void;
  runningId?: string | null;
}) {
  const reduce = useReducedMotion();
  const [busy, setBusy] = useState<string | null>(null);     // agente "atuando" agora (demo)
  const [bubbles, setBubbles] = useState<Record<string, string>>({});
  const [chat, setChat] = useState<ChatLine[]>([]);
  const seq = useRef(0);
  const timers = useRef<number[]>([]);
  const online = agents.filter((a) => a.online).length;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function act(agent: Agent) {
    onRun(agent.id);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setBusy(agent.id);
    setBubbles({});
    const steps = SCRIPT[agent.id] ?? [{ say: "Trabalhando…" }];
    steps.forEach((s, i) => {
      const t = window.setTimeout(() => {
        setBubbles({ [agent.id]: s.say });
        setChat((c) => [...c.slice(-12), { id: ++seq.current, agentId: agent.id, name: agent.name, text: s.say }]);
      }, 250 + i * 1400);
      timers.current.push(t);
    });
    const end = window.setTimeout(() => { setBusy(null); setBubbles({}); }, 250 + steps.length * 1400 + 1200);
    timers.current.push(end);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* cenário */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-b from-card to-background/40 p-4">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-sm font-semibold">Estúdio — time ao vivo</div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]",
            online ? "border-ok/25 bg-ok/10 text-ok" : "border-border bg-secondary text-muted-foreground")}>
            {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
            {online}/{agents.length} online
          </span>
        </div>
        <p className="mb-4 text-[11px] text-muted-foreground/60">
          Cada agente fica online quando o modelo dele está vivo no Ollama. Clique em <b>Rodar</b> pra ele atuar e consultar o time.
        </p>

        {/* "chão" do cenário */}
        <div className="relative flex min-h-[230px] items-end justify-around gap-2 rounded-lg bg-[radial-gradient(120%_80%_at_50%_120%,hsl(var(--primary)/0.06),transparent)] pb-2 pt-10">
          {agents.length === 0 ? (
            <div className="m-auto text-xs text-muted-foreground/50">sem agentes</div>
          ) : (
            agents.map((a, i) => {
              const f = FACE[a.role] ?? DEFAULT_FACE;
              const isBusy = busy === a.id || runningId === a.id || a.status === "working";
              const ring = a.online ? (isBusy ? "ring-warn shadow-[0_0_18px] shadow-warn/40" : "ring-ok/70")
                : "ring-muted-foreground/30";
              const bubble = bubbles[a.id] ?? (a.status === "working" ? a.message : undefined);
              return (
                <div key={a.id} className="relative flex flex-1 flex-col items-center gap-1.5">
                  {/* balão */}
                  <AnimatePresence>
                    {bubble && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                        className="absolute -top-1 z-10 max-w-[150px] -translate-y-full rounded-xl border border-border bg-popover px-2.5 py-1.5 text-[11px] leading-snug text-foreground shadow-pop"
                      >
                        {bubble}
                        <span className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 border-b border-r border-border bg-popover" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* bonequinho */}
                  <motion.button
                    onClick={() => a.online && act(a)}
                    disabled={!a.online}
                    title={a.online ? `Rodar ${a.name}` : `${a.name} offline`}
                    animate={reduce ? undefined : { y: isBusy ? [-2, -10, -2] : [0, -5, 0] }}
                    transition={{ duration: isBusy ? 0.6 : 2.6 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
                    className={cn(
                      "grid size-16 place-items-center rounded-full bg-gradient-to-b text-2xl ring-2 transition-shadow disabled:opacity-50",
                      f.tint, ring, a.online && "hover:scale-105",
                    )}
                  >
                    {f.emoji}
                  </motion.button>

                  {/* base/sombra */}
                  <div className="-mt-1 h-1 w-10 rounded-full bg-black/40 blur-[2px]" />

                  <div className="text-center">
                    <div className="text-xs font-semibold leading-none">{a.name}</div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground/60">{a.role}{a.model ? ` · ${a.model.split(":")[0]}` : ""}</div>
                  </div>

                  <button
                    onClick={() => a.online && act(a)}
                    disabled={!a.online}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                      a.online ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                        : "border-border bg-secondary text-muted-foreground/60",
                    )}
                  >
                    <Play className="size-2.5" /> {isBusy ? "atuando" : a.online ? "Rodar" : "offline"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* chat do time */}
      <div className="flex min-h-[230px] flex-col rounded-xl border border-border bg-popover/60 p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <MessagesSquare className="size-4 text-muted-foreground" /> Conversa do time
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto">
          {chat.length === 0 ? (
            <div className="grid h-full place-items-center px-3 text-center text-[11px] text-muted-foreground/50">
              O time está online. Clique em <b className="mx-1 text-foreground/70">Rodar</b> num agente
              pra ver a conversa — ou suba o ciclo real (upstream :8781) pra puxar a conversa ao vivo.
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {chat.map((m) => {
                const f = FACE[agents.find((a) => a.id === m.agentId)?.role ?? ""] ?? DEFAULT_FACE;
                return (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
                    <span className={cn("grid size-6 shrink-0 place-items-center rounded-full bg-gradient-to-b text-xs", f.tint)}>{f.emoji}</span>
                    <div className="min-w-0">
                      <div className="text-[10px] text-muted-foreground/60">{m.name}</div>
                      <div className="rounded-lg rounded-tl-sm border border-border bg-card px-2.5 py-1.5 text-xs text-foreground/90">{m.text}</div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
