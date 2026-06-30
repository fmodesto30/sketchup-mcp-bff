import { motion } from "framer-motion";
import { GitBranch, ServerCog, ShieldCheck, CircleDot, FileCheck2 } from "lucide-react";
import { useNocLedger, useNocStatus } from "@/api/hooks";
import type { NocTask, NocLockState } from "@/api/types";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState } from "@/components/states";
import { SkeletonText } from "@/components/ui/skeleton";
import { staggerContainer, staggerItem } from "@/components/flow/animated-section";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, string> = {
  COMMITTED: "text-ok border-ok/30 bg-ok/10",
  VERIFY_FAILED: "text-danger border-danger/30 bg-danger/10",
  VISUAL_REVIEW_QUEUED: "text-warn border-warn/30 bg-warn/10",
  NOOP: "text-muted-foreground border-border bg-secondary",
  DRY_RUN: "text-muted-foreground border-border bg-secondary",
};
const tone = (s: string) => STATUS_TONE[s] ?? "text-blue border-blue/30 bg-blue/10";

const LOCK_TONE: Record<string, string> = {
  held: "text-ok bg-ok/10 border-ok/30",
  stale: "text-warn bg-warn/10 border-warn/30",
  free: "text-muted-foreground bg-secondary border-border",
};

function LockBadge({ lock }: { lock?: NocLockState }) {
  if (!lock) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
      LOCK_TONE[lock.state] ?? LOCK_TONE.free)}>
      <CircleDot className="size-3" /> {lock.label}
    </span>
  );
}

export default function NocLedger() {
  const ledger = useNocLedger();
  const status = useNocStatus();
  const tasks = ledger.data?.tasks ?? [];

  return (
    <>
      <PageHeader title="NOC — atuador autônomo"
        subtitle="Runs REAIS do atuador, lidos do ledger no disco (.ai_bridge/noc/actions.jsonl). Não é stub." />

      {/* faixa de honestidade */}
      <Card className="mb-4 border-blue/20 bg-blue/[0.04]">
        <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 font-medium text-blue"><ServerCog className="size-4" /> Vidro read-only</span>
          <span>O atuador (worktree → <code>claude -p</code> → branch) roda no NOC, não aqui — o cockpit só LÊ os arquivos.</span>
          <span className="ml-auto inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-ok" /> nunca toca main · veredito visual = só você</span>
        </CardContent>
      </Card>

      {/* linha de status do atuador */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <LockBadge lock={status.data?.lock} />
        <Badge variant="outline">fila: {status.data?.queueCount ?? "—"}</Badge>
        <Badge variant="outline">tasks no ledger: {status.data?.taskCount ?? tasks.length}</Badge>
        {ledger.data?.live && (
          <span className="inline-flex items-center gap-1 text-xs text-ok">
            <span className="size-1.5 rounded-full bg-ok animate-pulse-dot" /> LIVE
          </span>
        )}
        {status.data?.nocRoot && (
          <code className="ml-auto truncate text-[10px] text-muted-foreground/40">{status.data.nocRoot}</code>
        )}
      </div>

      {ledger.isError ? (
        <ErrorState message={ledger.error?.message} />
      ) : ledger.isLoading ? (
        <Card className="p-4"><SkeletonText lines={4} /></Card>
      ) : !ledger.data?.live ? (
        <Card><EmptyState icon={GitBranch} title="Sem ledger do NOC"
          sub={ledger.data?.reason || "actions.jsonl ainda não existe — o atuador não rodou."} /></Card>
      ) : tasks.length === 0 ? (
        <Card><EmptyState icon={GitBranch} title="Fila vazia (live)" sub="Nenhum ciclo no ledger ainda." /></Card>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
          {tasks.map((t) => (
            <motion.div key={t.taskId} variants={staggerItem}>
              <TaskCard t={t} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </>
  );
}

function TaskCard({ t }: { t: NocTask }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground/60">{t.taskId}</span>
              <span className="font-semibold">{t.title || "(sem título)"}</span>
            </div>
            {t.branch && (
              <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground/70">
                <GitBranch className="size-3.5" /> <code>{t.branch}</code>
                {t.dryRun && <Badge variant="outline" className="ml-1">dry-run</Badge>}
              </div>
            )}
          </div>
          <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold", tone(t.status))}>
            {t.status}
          </span>
        </div>

        {(t.verifyChecked.length > 0 || t.verifyMissing.length > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3 text-xs">
            <span className="inline-flex items-center gap-1 text-ok"><FileCheck2 className="size-3.5" /> verify</span>
            {t.verifyChecked.map((f) => (
              <code key={f} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground/80">{f}</code>
            ))}
            {t.verifyMissing.map((f) => (
              <code key={f} className="rounded bg-danger/10 px-1.5 py-0.5 text-[10px] text-danger">faltou: {f}</code>
            ))}
          </div>
        )}

        {t.outTail && <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground/40">{t.outTail}</p>}
      </CardContent>
    </Card>
  );
}
