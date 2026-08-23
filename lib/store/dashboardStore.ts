import { create } from "zustand";

export type Toast = {
  id: number;
  message: string;
  tone: "success" | "error";
};

type DashboardState = {
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toasts: Toast[];
  pushToast: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
};

let toastId = 0;

export const useDashboardStore = create<DashboardState>((set) => ({
  sidebarOpen: false,
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  toasts: [],
  pushToast: (message, tone = "success") =>
    set((state) => ({ toasts: [...state.toasts, { id: ++toastId, message, tone }] })),
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
