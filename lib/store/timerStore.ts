import { create } from "zustand";

interface TimerStore {
  isRunning: boolean;
  startedAt: string | null;
  elapsedSeconds: number;
  activeTimeLogId: string | null;
  activeProjectId: string | null;
  activeTaskId: string | null;
  activeTaskTitle: string | null;
  startTimer: (
    startedAt: string,
    timeLogId: string,
    projectId: string | null,
    taskId?: string | null,
    taskTitle?: string | null
  ) => void;
  stopTimer: () => void;
  tick: () => void;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  isRunning: false,
  startedAt: null,
  elapsedSeconds: 0,
  activeTimeLogId: null,
  activeProjectId: null,
  activeTaskId: null,
  activeTaskTitle: null,

  startTimer: (
    startedAt: string,
    timeLogId: string,
    projectId: string | null,
    taskId?: string | null,
    taskTitle?: string | null
  ) => {
    const now = Date.now();
    const start = new Date(startedAt).getTime();
    const elapsed = Math.floor((now - start) / 1000);
    set({
      isRunning: true,
      startedAt,
      elapsedSeconds: Math.max(0, elapsed),
      activeTimeLogId: timeLogId,
      activeProjectId: projectId,
      activeTaskId: taskId ?? null,
      activeTaskTitle: taskTitle ?? null,
    });
  },

  stopTimer: () =>
    set({
      isRunning: false,
      startedAt: null,
      elapsedSeconds: 0,
      activeTimeLogId: null,
      activeProjectId: null,
      activeTaskId: null,
      activeTaskTitle: null,
    }),

  tick: () => {
    const { isRunning, startedAt } = get();
    if (!isRunning || !startedAt) return;
    const now = Date.now();
    const start = new Date(startedAt).getTime();
    const elapsed = Math.floor((now - start) / 1000);
    set({ elapsedSeconds: Math.max(0, elapsed) });
  },
}));
