import { useNavigate } from "react-router-dom";
import { Bot, Cpu, Play, Wrench } from "lucide-react";
import { useAgents, useRunAgent } from "@/api/hooks";
import type { Agent } from "@/api/types";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState, ErrorState } from "@/components/states";
import { SkeletonText } from "@/components/ui/skeleton";

export default function Agents() {
  const { data, isLoading, isError, error } = useAgents();
  const runAgent = useRunAgent();
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Agentes" subtitle="Organização multi-agente — status, modelo, ferramentas e disparo de run" />
      {isError ? (
        <ErrorState message={error?.message} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-4"><SkeletonText lines={4} /></CardContent></Card>
          ))}
        </div>
      ) : (data?.agents ?? []).length === 0 ? (
        <EmptyState icon={Bot} title="Sem agentes" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data!.agents.map((a) => (
            <AgentCard
              key={a.id}
              agent={a}
              onRun={() => runAgent.mutate({ id: a.id }, { onSuccess: (r) => r.runId && navigate(`/runs/${r.runId}`) })}
              running={runAgent.isPending && runAgent.variables?.id === a.id}
            />
          ))}
        </div>
      )}
    </>
  );
}

function AgentCard({ agent, onRun, running }: { agent: Agent; onRun: () => void; running: boolean }) {
  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 pt-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md border border-border bg-secondary text-muted-foreground">
            <Bot className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold">{agent.name}</span>
              <span className={`size-2 shrink-0 rounded-full ${agent.online ? "bg-ok shadow-[0_0_6px] shadow-ok" : "bg-muted-foreground/40"}`} />
            </div>
            <div className="text-xs text-muted-foreground/60">{agent.role} · {agent.umbrella}</div>
          </div>
          <StatusPill status={agent.status} pulse={agent.status === "working"} />
        </div>

        {agent.message && <p className="line-clamp-2 text-xs text-muted-foreground">{agent.message}</p>}

        <div className="flex flex-wrap items-center gap-1.5">
          {agent.model && (
            <Badge variant="info" className="gap-1 normal-case"><Cpu className="size-3" /> {agent.model}</Badge>
          )}
          {agent.tools.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
              <Wrench className="size-3 text-muted-foreground/50" /> {t}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-2 border-t border-border/60 pt-3">
          <Button size="sm" variant="primary" onClick={onRun} disabled={running}>
            <Play className="size-3.5" /> {running ? "Disparando…" : "Run"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
