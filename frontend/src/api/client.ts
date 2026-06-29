// client.ts — cliente HTTP tipado do BFF.
// Regra de arquitetura: o frontend fala SÓ com /api/* (o BFF integra Ollama/agents).
// Em dev, o Vite faz proxy de /api → BFF (:8782). VITE_MOCKS=1 usa fixtures tipadas.
import type {
  StatusResponse, ModelsResponse, ChatRequest, ChatResponse,
  AgentsResponse, RunsResponse, RunDetailResponse, RunLogsResponse,
  ArtifactsResponse, DecisionsResponse, DecisionRespondRequest, DecisionRespondResponse,
  WorkflowsResponse, RunTriggerResponse, LogLine, StudioState,
  FileEventsResponse, FileActivityEvent,
} from "./types";
import { mocks } from "./mocks";

export const USE_MOCKS = import.meta.env.VITE_MOCKS === "1";

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}) },
    ...init,
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      detail = j.error ?? j.detail ?? j.hint ?? detail; // envelope de erro do BFF usa `error`
    } catch {
      /* corpo não-JSON */
    }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<T>;
}

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));

/* ── endpoints ─────────────────────────────────────────────────────────────*/
export const api = {
  async status(): Promise<StatusResponse> {
    if (USE_MOCKS) return delay(120).then(() => mocks.status);
    return http("/api/status");
  },
  async models(): Promise<ModelsResponse> {
    if (USE_MOCKS) return delay().then(() => mocks.models);
    return http("/api/models");
  },
  async chat(body: ChatRequest): Promise<ChatResponse> {
    if (USE_MOCKS) return delay(700).then(() => ({ ...mocks.chat, model: body.model }));
    // timeout no cliente para a UI não pendurar se o modelo local travar
    return http("/api/models/chat", {
      method: "POST", body: JSON.stringify(body), signal: AbortSignal.timeout(125_000),
    });
  },
  async agents(): Promise<AgentsResponse> {
    if (USE_MOCKS) return delay().then(() => mocks.agents);
    return http("/api/agents");
  },
  async runAgent(id: string, input?: string): Promise<RunTriggerResponse> {
    if (USE_MOCKS) return delay().then(() => mocks.runStarted);
    return http(`/api/agents/${encodeURIComponent(id)}/run`, {
      method: "POST", body: JSON.stringify({ input }),
    });
  },
  async runs(): Promise<RunsResponse> {
    if (USE_MOCKS) return delay().then(() => mocks.runs);
    return http("/api/runs");
  },
  async run(id: string): Promise<RunDetailResponse> {
    if (USE_MOCKS) return delay().then(() => ({ run: mocks.getRun(id) }));
    return http(`/api/runs/${encodeURIComponent(id)}`);
  },
  async runLogs(id: string): Promise<RunLogsResponse> {
    if (USE_MOCKS) return delay().then(() => ({ logs: mocks.getRunLogs(id) }));
    return http(`/api/runs/${encodeURIComponent(id)}/logs?format=json`);
  },
  async artifacts(): Promise<ArtifactsResponse> {
    if (USE_MOCKS) return delay().then(() => mocks.artifacts);
    return http("/api/artifacts");
  },
  async decisions(): Promise<DecisionsResponse> {
    if (USE_MOCKS) return delay().then(() => mocks.decisions);
    return http("/api/decisions");
  },
  async respondDecision(id: string, body: DecisionRespondRequest): Promise<DecisionRespondResponse> {
    if (USE_MOCKS) return delay().then(() => ({ ok: true }));
    return http(`/api/decisions/${encodeURIComponent(id)}/respond`, {
      method: "POST", body: JSON.stringify(body),
    });
  },
  async workflows(): Promise<WorkflowsResponse> {
    if (USE_MOCKS) return delay().then(() => mocks.workflows);
    return http("/api/workflows");
  },
  async runWorkflow(id: string): Promise<RunTriggerResponse> {
    if (USE_MOCKS) return delay().then(() => mocks.runStarted);
    return http(`/api/workflows/${encodeURIComponent(id)}/run`, { method: "POST", body: "{}" });
  },
  async state(): Promise<StudioState> {
    if (USE_MOCKS) return delay().then(() => ({}) as StudioState);
    return http("/api/state");
  },
  async fileEvents(since = 0): Promise<FileEventsResponse> {
    if (USE_MOCKS) return delay(120).then(() => mocks.fileEvents);
    return http(`/api/file-map/events?since=${since}`);
  },
};

/* ── SSE: stream de logs ao vivo de um run ─────────────────────────────────-*/
export function streamRunLogs(
  id: string,
  onLine: (line: LogLine) => void,
  onEnd?: () => void,
): () => void {
  if (USE_MOCKS) {
    // simula streaming a partir das fixtures
    const lines = mocks.getRunLogs(id);
    let i = 0;
    const t = setInterval(() => {
      if (i >= lines.length) {
        clearInterval(t);
        onEnd?.();
        return;
      }
      onLine(lines[i++]);
    }, 500);
    return () => clearInterval(t);
  }
  const es = new EventSource(`/api/runs/${encodeURIComponent(id)}/logs`);
  es.onmessage = (ev) => {
    try {
      onLine(JSON.parse(ev.data) as LogLine);
    } catch {
      /* ignora linha malformada */
    }
  };
  es.addEventListener("end", () => {
    es.close();
    onEnd?.();
  });
  es.onerror = () => {
    // EventSource reconecta sozinho em erro transitório; só encerra se fechou de vez
    if (es.readyState === EventSource.CLOSED) {
      es.close();
      onEnd?.();
    }
  };
  return () => es.close();
}

/* ── SSE: feed "acontecendo agora" — eventos de atividade do BFF ─────────────-*/
export function streamFileEvents(
  onEvent: (e: FileActivityEvent) => void,
  onError?: () => void,
): () => void {
  if (USE_MOCKS) {
    let i = 0;
    const seed = mocks.fileEvents.events;
    const t = setInterval(() => {
      onEvent({ ...seed[i % seed.length], id: `mock-${i}`, seq: 1000 + i, ts: new Date().toISOString() });
      i++;
    }, 1800);
    return () => clearInterval(t);
  }
  const es = new EventSource(`/api/file-map/events/stream`);
  es.onmessage = (ev) => {
    try {
      onEvent(JSON.parse(ev.data) as FileActivityEvent);
    } catch {
      /* ignora linha malformada / heartbeat */
    }
  };
  es.onerror = () => {
    if (es.readyState === EventSource.CLOSED) {
      es.close();
      onError?.();
    }
  };
  return () => es.close();
}
