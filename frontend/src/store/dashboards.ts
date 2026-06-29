// dashboards.ts — estado dos dashboards customizáveis (drag/resize/add/remove),
// persistido em localStorage. Cada dashboard tem um nome + um layout (react-grid-layout).
import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Um item do grid (i = id do widget; um widget por dashboard no v1). */
export interface GridItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface Dashboard {
  id: string;
  name: string;
  layout: GridItem[];
}

/** Layout padrão da "Visão Geral" — arranjo inicial dos widgets (12 colunas). */
export const DEFAULT_LAYOUT: GridItem[] = [
  { i: "kpis", x: 0, y: 0, w: 12, h: 2, minW: 4, minH: 2 },
  { i: "activity", x: 0, y: 2, w: 7, h: 9, minW: 4, minH: 5 },
  { i: "decisions", x: 7, y: 2, w: 5, h: 5, minW: 3, minH: 3 },
  { i: "system", x: 7, y: 7, w: 5, h: 4, minW: 3, minH: 3 },
  { i: "runs", x: 0, y: 11, w: 7, h: 6, minW: 4, minH: 4 },
  { i: "workflow", x: 7, y: 11, w: 5, h: 6, minW: 3, minH: 4 },
];

const DEFAULT_ID = "default";

function makeId() {
  // sem Date.now()/random no módulo: deriva de um contador + do nome
  return "dash-" + Math.floor(performance.now()).toString(36) + "-" + Math.floor(performance.now() % 997).toString(36);
}

interface DashState {
  dashboards: Dashboard[];
  activeId: string;
  editing: boolean;

  active: () => Dashboard;
  setActive: (id: string) => void;
  setEditing: (v: boolean) => void;
  updateLayout: (layout: GridItem[]) => void;
  addWidget: (widgetId: string, size?: { w: number; h: number; minW?: number; minH?: number }) => void;
  removeWidget: (i: string) => void;
  createDashboard: (name: string) => void;
  renameActive: (name: string) => void;
  deleteActive: () => void;
  resetActive: () => void;
}

export const useDashboards = create<DashState>()(
  persist(
    (set, get) => ({
      dashboards: [{ id: DEFAULT_ID, name: "Visão Geral", layout: DEFAULT_LAYOUT }],
      activeId: DEFAULT_ID,
      editing: false,

      active: () => {
        const s = get();
        return s.dashboards.find((d) => d.id === s.activeId) ?? s.dashboards[0];
      },
      setActive: (id) => set({ activeId: id }),
      setEditing: (v) => set({ editing: v }),

      updateLayout: (layout) =>
        set((s) => ({
          dashboards: s.dashboards.map((d) => (d.id === s.activeId ? { ...d, layout } : d)),
        })),

      addWidget: (widgetId, size = { w: 4, h: 5, minW: 3, minH: 3 }) =>
        set((s) => ({
          dashboards: s.dashboards.map((d) => {
            if (d.id !== s.activeId || d.layout.some((it) => it.i === widgetId)) return d;
            const y = d.layout.reduce((m, it) => Math.max(m, it.y + it.h), 0);
            return { ...d, layout: [...d.layout, { i: widgetId, x: 0, y, ...size }] };
          }),
        })),

      removeWidget: (i) =>
        set((s) => ({
          dashboards: s.dashboards.map((d) =>
            d.id === s.activeId ? { ...d, layout: d.layout.filter((it) => it.i !== i) } : d,
          ),
        })),

      createDashboard: (name) =>
        set((s) => {
          const id = makeId();
          return {
            dashboards: [...s.dashboards, { id, name: name.trim() || "Novo dashboard", layout: [] }],
            activeId: id,
            editing: true,
          };
        }),

      renameActive: (name) =>
        set((s) => ({
          dashboards: s.dashboards.map((d) => (d.id === s.activeId ? { ...d, name: name.trim() || d.name } : d)),
        })),

      deleteActive: () =>
        set((s) => {
          if (s.activeId === DEFAULT_ID) return s; // o default não some
          const dashboards = s.dashboards.filter((d) => d.id !== s.activeId);
          return { dashboards, activeId: DEFAULT_ID, editing: false };
        }),

      resetActive: () =>
        set((s) => ({
          dashboards: s.dashboards.map((d) =>
            d.id === s.activeId
              ? { ...d, layout: d.id === DEFAULT_ID ? DEFAULT_LAYOUT : [] }
              : d,
          ),
        })),
    }),
    {
      name: "interior-cockpit-dashboards",
      version: 1,
      // só os dashboards + qual está ativo persistem; "editing" sempre começa off
      partialize: (s) => ({ dashboards: s.dashboards, activeId: s.activeId }),
    },
  ),
);

export const DEFAULT_DASHBOARD_ID = DEFAULT_ID;
