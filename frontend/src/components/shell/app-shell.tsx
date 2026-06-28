import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUi } from "@/store/ui";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette } from "./command-palette";

export function AppShell() {
  const cmdkOpen = useUi((s) => s.cmdkOpen);
  const setCmdk = useUi((s) => s.setCmdkOpen);
  const sidebarOpen = useUi((s) => s.sidebarOpen);
  const setSidebar = useUi((s) => s.setSidebarOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdk(!cmdkOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cmdkOpen, setCmdk]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen overflow-hidden">
        <div className="hidden w-[232px] shrink-0 md:block">
          <Sidebar />
        </div>

        {/* drawer mobile */}
        <div className={cn("fixed inset-0 z-40 md:hidden", sidebarOpen ? "block" : "hidden")}>
          <div className="absolute inset-0 bg-black/70" onClick={() => setSidebar(false)} />
          <div className="absolute left-0 top-0 h-full w-[232px]">
            <Sidebar />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1320px] p-5 sm:p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <CommandPalette />
    </TooltipProvider>
  );
}
