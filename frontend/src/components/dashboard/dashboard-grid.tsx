// dashboard-grid.tsx — dashboard customizável (drag + resize + add/remove),
// múltiplos dashboards nomeados, persistido em localStorage.
import { useState, type ComponentType, type ReactNode } from "react";
import { Link } from "react-router-dom";
import ReactGridLayout from "react-grid-layout";

type RGLItem = ReactGridLayout.Layout; // {i,x,y,w,h,minW?,minH?,...}
import {
  Plus, X, Pencil, Check, RotateCcw, Trash2, LayoutDashboard, GripVertical,
} from "lucide-react";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useDashboards, DEFAULT_DASHBOARD_ID, type GridItem } from "@/store/dashboards";
import { WIDGETS, WIDGET_IDS, WIDGET_LINK } from "@/components/dashboard/widgets";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface GridProps {
  className?: string;
  layout: RGLItem[];
  cols?: number;
  rowHeight?: number;
  margin?: [number, number];
  containerPadding?: [number, number];
  isDraggable?: boolean;
  isResizable?: boolean;
  draggableHandle?: string;
  draggableCancel?: string;
  onLayoutChange?: (layout: RGLItem[]) => void;
  children?: ReactNode;
}
// WidthProvider existe em runtime (module.exports.WidthProvider) mas não é tipado como
// membro do default export (@types usa `export =`). Cast mínimo e explícito.
const Grid = (ReactGridLayout as unknown as {
  WidthProvider: (c: unknown) => ComponentType<GridProps>;
}).WidthProvider(ReactGridLayout);

function WidgetFrame({ id, editing, onRemove }: { id: string; editing: boolean; onRemove: () => void }) {
  const def = WIDGETS[id];
  if (!def) return null;
  const link = WIDGET_LINK[id];
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className={cn(
        "flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2",
        editing && "widget-handle cursor-move select-none bg-secondary/30",
      )}>
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          {editing && <GripVertical className="size-3.5 shrink-0 text-muted-foreground/50" />}
          <def.icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{def.title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!editing && link && (
            <Link to={link.to} className="text-[11px] text-muted-foreground hover:text-foreground">{link.label} →</Link>
          )}
          {editing && (
            <button
              onClick={onRemove}
              className="widget-no-drag grid size-6 place-items-center rounded text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
              title="Remover widget"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className={cn("min-h-0 flex-1 overflow-auto", !def.noPad && "p-3")}>
        <def.Comp />
      </div>
    </Card>
  );
}

export function DashboardGrid() {
  const {
    dashboards, activeId, editing, active, setActive, setEditing,
    updateLayout, addWidget, removeWidget, createDashboard, deleteActive, resetActive,
  } = useDashboards();
  const current = active();
  const present = new Set(current.layout.map((it) => it.i));
  const available = WIDGET_IDS.filter((w) => !present.has(w));

  const [palette, setPalette] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {dashboards.map((d) => (
            <button
              key={d.id}
              onClick={() => setActive(d.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                d.id === activeId ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutDashboard className="size-3.5" /> {d.name}
            </button>
          ))}
          <button
            onClick={() => { setNewName(""); setNewOpen(true); }}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-border/70 hover:text-foreground"
          >
            <Plus className="size-3.5" /> novo
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {editing && (
            <>
              <Button size="sm" variant="ghost" onClick={() => setPalette((v) => !v)}>
                <Plus className="size-3.5" /> Widget
              </Button>
              <Button size="sm" variant="ghost" onClick={resetActive}>
                <RotateCcw className="size-3.5" /> Resetar
              </Button>
              {activeId !== DEFAULT_DASHBOARD_ID && (
                <Button size="sm" variant="ghost" onClick={deleteActive}>
                  <Trash2 className="size-3.5" /> Excluir
                </Button>
              )}
            </>
          )}
          <Button size="sm" variant={editing ? "primary" : "secondary"} onClick={() => { setEditing(!editing); setPalette(false); }}>
            {editing ? <><Check className="size-3.5" /> Concluir</> : <><Pencil className="size-3.5" /> Editar</>}
          </Button>
        </div>
      </div>

      {/* palette de widgets disponíveis */}
      {editing && palette && (
        <Card className="flex flex-wrap items-center gap-2 p-3">
          <span className="text-xs text-muted-foreground/70">Adicionar:</span>
          {available.length === 0 ? (
            <span className="text-xs text-muted-foreground/50">todos os widgets já estão no dashboard</span>
          ) : (
            available.map((w) => {
              const def = WIDGETS[w];
              return (
                <button
                  key={w}
                  onClick={() => { addWidget(w, def.size); setPalette(false); }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-xs transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <def.icon className="size-3.5" /> {def.title}
                </button>
              );
            })
          )}
        </Card>
      )}

      {/* grid */}
      {current.layout.length === 0 ? (
        <Card className="grid place-items-center py-16 text-center text-sm text-muted-foreground">
          <div>
            Dashboard vazio. <button className="text-primary hover:underline" onClick={() => { setEditing(true); setPalette(true); }}>Adicione widgets</button>.
          </div>
        </Card>
      ) : (
        <Grid
          className={cn("dashboard-grid", editing && "is-editing")}
          layout={current.layout}
          cols={12}
          rowHeight={40}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          isDraggable={editing}
          isResizable={editing}
          draggableHandle=".widget-handle"
          draggableCancel=".widget-no-drag"
          onLayoutChange={(l) =>
            updateLayout(l.map((it) => ({ i: it.i, x: it.x, y: it.y, w: it.w, h: it.h, minW: it.minW, minH: it.minH })))
          }
        >
          {current.layout.map((item) => (
            <div key={item.i}>
              <WidgetFrame id={item.i} editing={editing} onRemove={() => removeWidget(item.i)} />
            </div>
          ))}
        </Grid>
      )}

      {/* novo dashboard */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Novo dashboard</DialogTitle>
          <form
            onSubmit={(e) => { e.preventDefault(); createDashboard(newName); setNewOpen(false); }}
            className="mt-3 space-y-3"
          >
            <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex.: Produção, Render, Debug…" />
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setNewOpen(false)}>Cancelar</Button>
              <Button type="submit" size="sm" variant="primary">Criar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
