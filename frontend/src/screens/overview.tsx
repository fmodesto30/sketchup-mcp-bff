import { DashboardGrid } from "@/components/dashboard/dashboard-grid";

export default function Overview() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mission control ao vivo — em <b className="text-foreground/80">Editar</b> você arrasta, redimensiona e monta o seu próprio painel.
        </p>
      </header>
      <DashboardGrid />
    </div>
  );
}
