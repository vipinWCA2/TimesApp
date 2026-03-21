import { create } from "zustand";

interface ActivityStore {
  lastMouseX: number;
  lastMouseY: number;
  lastActivityAt: number;
  isIdle: boolean;
  updateMousePosition: (x: number, y: number) => void;
  setIdle: (idle: boolean) => void;
}

export const useActivityStore = create<ActivityStore>((set) => ({
  lastMouseX: 0,
  lastMouseY: 0,
  lastActivityAt: Date.now(),
  isIdle: false,

  updateMousePosition: (x: number, y: number) =>
    set({
      lastMouseX: x,
      lastMouseY: y,
      lastActivityAt: Date.now(),
      isIdle: false,
    }),

  setIdle: (idle: boolean) => set({ isIdle: idle }),
}));
