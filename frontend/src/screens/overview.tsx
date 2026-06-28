import { Link } from "react-router-dom";
import { Bot, Activity, Inbox, Cpu, ArrowRight, Workflow as WorkflowIcon, CheckCircle2 } from "lucide-react";
import { useStatus, useAgents, useRuns, useDecisions, useWorkflows } from "@/api/hooks";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Metric } from "@/components/metric";
import { StatusPill } from "@/components/ui/status-pill";
import { Pipeline } from "@/components/pipeline";
import { EmptyState, ErrorState } from "@/components/states";
import { SkeletonText } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/utils";

export default function Overview() {
  const status = useStatus();
  const agents = useAgents();
  const runs = useRuns();
  const decisions = useDecisions();
  const workflows = useWorkflows();

  const online = (agents.data?.agents ?? []).filter((a) => a.online).length;
  const running = (runs.data?.runs ?? []).filter((r) => r.status === "running").length;
  const pending = (decisions.data?.decisions ?? []).filter((d) => d.status === "pending").length;
  const recentRuns = (runs.data?.runs ?? []).slice(0, 6);
  const activeWf = (workflows.data?.workflows ?? []).find((w) => w.status === "running");

  return (
    <>
      <PageHeader title="Visão Geral" subtitle="Mission control — estado do sistema, agentes, runs e decisões" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Agentes online" value={agents.isLoading ? "—" : `${online}/${agents.data?.agents.length ?? 0}`} icon={Bot} tone={online ? "ok" : "neutral"} />
        <Metric label="Runs ativos" value={runs.isLoading ? "—" : running} icon={Activity} tone={running ? "info" : "neutral"} />
        <Metric label="Decisões pendentes" value={decisions.isLoading ? "—" : pending} icon={Inbox} tone={pending ? "warn" : "neutral"} />
        <Metric label="Modelos locais" value={status.data?.ollama.ok ? status.data.ollama.models : "off"} icon={Cpu} tone={status.data?.ollama.ok ? "ok" : "neutral"} />
      </div>

      <div className="mt-4 grid grid-cols-12 gap-4">
        {/* runs recentes */}
        <Card className="col-span-12 lg:col-span-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="size-4 text-muted-foreground" /> Runs recentes</CardTitle>
            <Link to="/runs" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              ver todos <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {runs.isError ? (
              <ErrorState message={runs.error?.message} />
            ) : runs.isLoading ? (
              <SkeletonText lines={5} />
            ) : recentRuns.length === 0 ? (
              <EmptyState icon={Activity} title="Nenhum run ainda" sub="Dispare um agente ou workflow para ver execuções aqui." />
            ) : (
              <div className="-mt-1 divide-y divide-border/60">
                {recentRuns.map((r) => (
                  <Link key={r.id} to={`/runs/${r.id}`} className="flex items-center gap-3 py-2.5 hover:opacity-90">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{r.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground/60">
                        {r.kind} · {r.agentName ?? r.workflowId} · {timeAgo(r.startedAt)}
                      </div>
                    </div>
                    <StatusPill status={r.status} pulse={r.status === "running"} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* decisões pendentes */}
        <Card className="col-span-12 lg:col-span-4" accent="gold">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Inbox className="size-4 text-muted-foreground" /> Decisões pendentes</CardTitle>
            <Link to="/decisions" className="text-xs text-muted-foreground hover:text-foreground"><ArrowRight className="size-3.5" /></Link>
          </CardHeader>
          <CardContent>
            {(decisions.data?.decisions ?? []).filter((d) => d.status === "pending").slice(0, 4).length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Tudo em dia" sub="Nenhuma decisão aguardando." />
            ) : (
              <div className="space-y-2">
                {(decisions.data?.decisions ?? []).filter((d) => d.status === "pending").slice(0, 4).map((d) => (
                  <Link key={d.id} to="/decisions" className="block rounded-md border border-border bg-background/50 p-3 hover:border-border/80">
                    <div className="text-sm font-medium">{d.title}</div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{d.question}</div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* workflow ativo */}
        <Card className="col-span-12 lg:col-span-8" accent="blue">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><WorkflowIcon className="size-4 text-muted-foreground" /> Workflow ativo</CardTitle>
            <Link to="/workflows" className="text-xs text-muted-foreground hover:text-foreground">workflows <ArrowRight className="inline size-3.5" /></Link>
          </CardHeader>
          <CardContent>
            {activeWf ? (
              <div>
                <div className="mb-3 text-sm"><b>{activeWf.name}</b> <span className="text-muted-foreground">— {activeWf.description}</span></div>
                <Pipeline steps={activeWf.steps} />
              </div>
            ) : (
              <EmptyState icon={WorkflowIcon} title="Nenhum workflow rodando" sub="Os workflows disponíveis ficam na aba Workflows." />
            )}
          </CardContent>
        </Card>

        {/* sistema */}
        <Card className="col-span-12 lg:col-span-4">
          <CardHeader><CardTitle className="flex items-center gap-2"><Cpu className="size-4 text-muted-foreground" /> Sistema</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            <Row label="Upstream (dados)" ok={status.data?.upstream.ok} detail={status.data?.upstream.url} />
            <Row label="Ollama (modelos)" ok={status.data?.ollama.ok} detail={status.data?.ollama.ok ? `${status.data.ollama.models} modelos` : "offline"} />
            <Row label="Agentes" ok={online > 0} detail={`${online} online`} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Row({ label, ok, detail }: { label: string; ok?: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <StatusPill tone={ok ? "ok" : "danger"} label={detail ?? (ok ? "ok" : "off")} />
    </div>
  );
}
