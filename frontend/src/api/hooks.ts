// hooks.ts — camada de dados (TanStack Query) sobre o client tipado.
import { useEffect, useState } from "react";
import {
  useMutation, useQuery, useQueryClient, type UseQueryOptions,
} from "@tanstack/react-query";
import { api, streamRunLogs } from "./client";
import type { ChatRequest, LogLine } from "./types";

export const qk = {
  status: ["status"] as const,
  models: ["models"] as const,
  agents: ["agents"] as const,
  runs: ["runs"] as const,
  run: (id: string) => ["run", id] as const,
  runLogs: (id: string) => ["run", id, "logs"] as const,
  artifacts: ["artifacts"] as const,
  decisions: ["decisions"] as const,
  workflows: ["workflows"] as const,
  state: ["state"] as const,
};

type QOpts<T> = Omit<UseQueryOptions<T, Error, T>, "queryKey" | "queryFn">;

export const useStatus = (o?: QOpts<Awaited<ReturnType<typeof api.status>>>) =>
  useQuery({ queryKey: qk.status, queryFn: api.status, refetchInterval: 6000, ...o });

export const useModels = () => useQuery({ queryKey: qk.models, queryFn: api.models });

export const useAgents = () =>
  useQuery({ queryKey: qk.agents, queryFn: api.agents, refetchInterval: 4000 });

export const useRuns = () =>
  useQuery({ queryKey: qk.runs, queryFn: api.runs, refetchInterval: 3000 });

export const useRun = (id: string) =>
  useQuery({ queryKey: qk.run(id), queryFn: () => api.run(id), enabled: !!id, refetchInterval: 2500 });

export const useRunLogs = (id: string, enabled = true) =>
  useQuery({ queryKey: qk.runLogs(id), queryFn: () => api.runLogs(id), enabled: !!id && enabled });

export const useArtifacts = () => useQuery({ queryKey: qk.artifacts, queryFn: api.artifacts });

export const useDecisions = () =>
  useQuery({ queryKey: qk.decisions, queryFn: api.decisions, refetchInterval: 6000 });

export const useWorkflows = () => useQuery({ queryKey: qk.workflows, queryFn: api.workflows });

export const useStudioState = () =>
  useQuery({ queryKey: qk.state, queryFn: api.state, refetchInterval: 5000 });

/* ── mutations ─────────────────────────────────────────────────────────────*/
export function useRunAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: string }) => api.runAgent(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.runs });
      qc.invalidateQueries({ queryKey: qk.agents });
    },
  });
}

export function useRunWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.runWorkflow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.runs }),
  });
}

export function useChat() {
  return useMutation({ mutationFn: (body: ChatRequest) => api.chat(body) });
}

export function useRespondDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, choice }: { id: string; choice: string }) =>
      api.respondDecision(id, { choice }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.decisions }),
  });
}

/* ── SSE: logs ao vivo de um run ───────────────────────────────────────────-*/
export function useRunLogStream(id: string | undefined, live: boolean) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setLines([]);
    setDone(false);
    if (!id || !live) return;
    const stop = streamRunLogs(
      id,
      (line) => setLines((prev) => [...prev, line]),
      () => setDone(true),
    );
    return stop;
  }, [id, live]);

  return { lines, done };
}
