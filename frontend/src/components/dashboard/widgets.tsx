// widgets.tsx — catálogo de widgets do dashboard customizável. Cada widget é
// autossuficiente (busca seus próprios dados via hooks; React Query dedupa).
import type { FC } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bot, Activity, Inbox, Cpu, ArrowRight, Workflow as WorkflowIcon,
  CheckCircle2, Network, type LucideIcon,
} from "lucide-react";
import { useStatus, useAgents, useRuns, useDecisions, useWorkflows, useLiveActivity } from "@/api/hooks";
import type { FileActivityEvent } from "@/api/types";
import { StatusPill } from "@/components/ui/status-pill";
import { Pipeline } from "@/components/pipeline";
import { LiveActivity } from "@/components/live-activity";
import { EmptyState } from "@/components/states";
import { cn, timeAgo } from "@/lib/utils";
import type { Tone } from "@/lib/status";

const VAL_TONE: Record<Tone, string> = {
  ok: "text-ok", info: "text-blue", warn: "text-warn", danger: "text-danger", neutral: "text-foreground",
};
const ICON_TONE: Record<Tone, string> = {
  ok: "bg-ok/12 text-ok", info: "bg-blue/12 text-blue", warn: "bg-warn/12 text-warn",
  danger: "bg-danger/12 text-danger", neutral: "bg-secondary text-muted-foreground",
};

/** evento de atividade → seção da doc "Como Funciona". */
function docAnchor(ev: FileActivityEvent): string {
  if (ev.path.includes("artifacts")) return "artifacts";
  if (ev.source === "ollama") return "agentes";
  if (ev.source === "upstream") return "arquitetura";
  if (ev.source === "runner" || ev.runId) return "agentes";
  if (ev.endpoint) return "api";
  return "fluxo";
}

/* ── widgets ─────────────────────────────────────────────────────────────── */
const KpisWidget: FC = () => {
  const status = useStatus();
  const agents = useAgents();
  const runs = useRuns();
  const decisions = useDecisions();
  const total = agents.data?.agents.length ?? 0;
  const online = (agents.data?.agents ?? []).filter((a) => a.online).length;
  const running = (runs.data?.runs ?? []).filter((r) => r.status === "running").length;
  const pending = (decisions.data?.decisions ?? []).filter((d) => d.status === "pending").length;
  const ollamaOk = !!status.data?.ollama.ok;
  const tiles: { label: string; value: React.ReactNode; icon: LucideIcon; tone: Tone; pulse?: boolean }[] = [
    { label: "Agentes online", value: `${online}/${total}`, icon: Bot, tone: online ? "ok" : "neutral", pulse: online > 0 },
    { label: "Runs ativos", value: running, icon: Activity, tone: running ? "info" : "neutral", pulse: running > 0 },
    { label: "Decisões pendentes", value: pending, icon: Inbox, tone: pending ? "warn" : "neutral", pulse: pending > 0 },
    { label: "Modelos locais", value: ollamaOk ? status.data!.ollama.models : "off", icon: Cpu, tone: ollamaOk ? "ok" : "neutral" },
  ];
  return (
    <div className="grid h-full grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((m) => (
        <div key={m.label} className="relative flex flex-col justify-center overflow-hidden rounded-xl border border-border bg-card p-3.5">
          <div className="flex items-start justify-between">
            <span className={cn("grid size-8 place-items-center rounded-lg", ICON_TONE[m.tone])}><m.icon className="size-4" /></span>
            {m.pulse && <span className={cn("size-2 rounded-full animate-pulse-dot", VAL_TONE[m.tone].replace("text-", "bg-"))} />}
          </div>
          <div className={cn("mt-2 font-mono text-2xl font-bold leading-none", VAL_TONE[m.tone])}>{m.value}</div>
          <div className="mt-1 text-[10.5px] uppercase tracking-wide text-muted-foreground/60">{m.label}</div>
        </div>
      ))}
    </div>
  );
};

const ActivityWidget: FC = () => {
  const navigate = useNavigate();
  const activity = useLiveActivity(40);
  return <LiveActivity events={activity.events} live={activity.live} className="h-full" onSelect={(ev) => navigate(`/flow#${docAnchor(ev)}`)} />;
};

const DecisionsWidget: FC = () => {
  const decisions = useDecisions();
  const pending = (decisions.data?.decisions ?? []).filter((d) => d.status === "pending");
  if (pending.length === 0) return <EmptyState icon={CheckCircle2} title="Tudo em dia" sub="Nenhuma decisão aguardando." />;
  return (
    <div className="space-y-2">
      {pending.map((d) => (
        <Link key={d.id} to="/decisions" className="block rounded-lg border border-border bg-background/50 p-3 transition-colors hover:border-warn/30 hover:bg-warn/[0.04]">
          <div className="text-sm font-medium">{d.title}</div>
          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{d.question}</div>
        </Link>
      ))}
    </div>
  );
};

const SystemWidget: FC = () => {
  const status = useStatus();
  const agents = useAgents();
  const online = (agents.data?.agents ?? []).filter((a) => a.online).length;
  const ollamaOk = !!status.data?.ollama.ok;
  const Row = ({ label, ok, detail }: { label: string; ok?: boolean; detail?: string }) => (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <StatusPill tone={ok ? "ok" : "danger"} label={detail ?? (ok ? "ok" : "off")} />
    </div>
  );
  return (
    <div className="space-y-2.5">
      <Row label="Upstream (dados)" ok={status.data?.upstream.ok} detail={status.data?.upstream.ok ? "online" : "offline"} />
      <Row label="Ollama (modelos)" ok={ollamaOk} detail={ollamaOk ? `${status.data!.ollama.models} modelos` : "offline"} />
      <Row label="Agentes" ok={online > 0} detail={`${online} online`} />
    </div>
  );
};

const RunsWidget: FC = () => {
  const runs = useRuns();
  const recent = (runs.data?.runs ?? []).slice(0, 8);
  if (recent.length === 0) return <EmptyState icon={Activity} title="Nenhum run" sub="Dispare um agente ou workflow." />;
  return (
    <div className="-mt-1 divide-y divide-border/60">
      {recent.map((r) => (
        <Link key={r.id} to={`/runs/${r.id}`} className="flex items-center gap-3 py-2.5 transition-opacity hover:opacity-90">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{r.title}</div>
            <div className="mt-0.5 text-xs text-muted-foreground/60">{r.kind} · {r.agentName ?? r.workflowId} · {timeAgo(r.startedAt)}</div>
          </div>
          <StatusPill status={r.status} pulse={r.status === "running"} />
        </Link>
      ))}
    </div>
  );
};

const WorkflowWidget: FC = () => {
  const workflows = useWorkflows();
  const active = (workflows.data?.workflows ?? []).find((w) => w.status === "running");
  if (!active) return <EmptyState icon={WorkflowIcon} title="Nenhum workflow rodando" sub="Os disponíveis ficam em Operação › Workflows." />;
  return (
    <div>
      <div className="mb-3 text-sm"><b>{active.name}</b> <span className="text-muted-foreground">— {active.description}</span></div>
      <Pipeline steps={active.steps} />
    </div>
  );
};

const AgentsWidget: FC = () => {
  const agents = useAgents();
  const list = agents.data?.agents ?? [];
  if (list.length === 0) return <EmptyState icon={Bot} title="Sem agentes" />;
  return (
    <div className="space-y-1.5">
      {list.map((a) => (
        <Link key={a.id} to="/operacao?tab=agentes" className="flex items-center gap-2.5 rounded-md border border-border bg-background/40 px-2.5 py-2 transition-colors hover:border-border/80">
          <span className={cn("size-2 shrink-0 rounded-full", a.online ? "bg-ok" : "bg-muted-foreground/40")} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{a.name}</div>
            <div className="truncate text-[11px] text-muted-foreground/60">{a.role}{a.model ? ` · ${a.model}` : ""}</div>
          </div>
          <StatusPill status={a.status} pulse={a.status === "working"} />
        </Link>
      ))}
    </div>
  );
};

/* ── registro ────────────────────────────────────────────────────────────── */
export interface WidgetDef {
  title: string;
  icon: LucideIcon;
  Comp: FC;
  /** tamanho padrão ao adicionar pelo palette */
  size: { w: number; h: number; minW: number; minH: number };
  /** corpo sem padding (ex.: feed que já tem seu próprio scroll/borda) */
  noPad?: boolean;
}

export const WIDGETS: Record<string, WidgetDef> = {
  kpis: { title: "Indicadores", icon: Activity, Comp: KpisWidget, size: { w: 12, h: 2, minW: 4, minH: 2 }, noPad: true },
  activity: { title: "Acontecendo agora", icon: Activity, Comp: ActivityWidget, size: { w: 7, h: 9, minW: 4, minH: 5 } },
  decisions: { title: "Decisões pendentes", icon: Inbox, Comp: DecisionsWidget, size: { w: 5, h: 5, minW: 3, minH: 3 } },
  system: { title: "Sistema", icon: Network, Comp: SystemWidget, size: { w: 5, h: 4, minW: 3, minH: 3 } },
  runs: { title: "Runs recentes", icon: Activity, Comp: RunsWidget, size: { w: 7, h: 6, minW: 4, minH: 4 } },
  workflow: { title: "Workflow ativo", icon: WorkflowIcon, Comp: WorkflowWidget, size: { w: 5, h: 6, minW: 3, minH: 4 } },
  agents: { title: "Agentes", icon: Bot, Comp: AgentsWidget, size: { w: 4, h: 6, minW: 3, minH: 4 } },
};

export const WIDGET_IDS = Object.keys(WIDGETS);

/** link rápido por widget (canto do frame) para a tela cheia correspondente. */
export const WIDGET_LINK: Record<string, { to: string; label: string } | undefined> = {
  activity: { to: "/flow", label: "docs" },
  decisions: { to: "/decisions", label: "ver todas" },
  runs: { to: "/operacao?tab=runs", label: "ver todos" },
  workflow: { to: "/operacao?tab=workflows", label: "workflows" },
  agents: { to: "/operacao?tab=agentes", label: "ver time" },
};
