// nav.ts — registro de navegação do cockpit.
import {
  LayoutGrid, Bot, Activity, Workflow, Cpu, Inbox, Images, type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** chave de badge dinâmico calculado na sidebar */
  badge?: "runs" | "decisions";
  end?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV: NavSection[] = [
  {
    title: "Cockpit",
    items: [
      { to: "/", label: "Visão Geral", icon: LayoutGrid, end: true },
      { to: "/agents", label: "Agentes", icon: Bot },
      { to: "/runs", label: "Runs", icon: Activity, badge: "runs" },
      { to: "/workflows", label: "Workflows", icon: Workflow },
    ],
  },
  {
    title: "Modelos & Decisões",
    items: [
      { to: "/models", label: "Modelos", icon: Cpu },
      { to: "/decisions", label: "Decisões", icon: Inbox, badge: "decisions" },
      { to: "/artifacts", label: "Artefatos", icon: Images },
    ],
  },
];
