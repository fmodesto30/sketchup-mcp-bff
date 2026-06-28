// store/ui.ts — estado de UI puramente local (Zustand). Estado de servidor fica no TanStack Query.
import { create } from "zustand";

interface UiState {
  cmdkOpen: boolean;
  setCmdkOpen: (v: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
}

export const useUi = create<UiState>((set) => ({
  cmdkOpen: false,
  setCmdkOpen: (v) => set({ cmdkOpen: v }),
  sidebarOpen: false,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
}));
