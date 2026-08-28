import { create } from "zustand";

interface OperationState {
  isRunning: boolean;
  operation: string;
  partition: string;
  current: number;
  total: number;
  percentage: number;
  startTime: number | null;

  startOperation: (operation: string, partition: string) => void;
  updateProgress: (current: number, total: number) => void;
  completeOperation: () => void;
  reset: () => void;
}

export const useOperationStore = create<OperationState>((set, get) => ({
  isRunning: false,
  operation: "",
  partition: "",
  current: 0,
  total: 0,
  percentage: 0,
  startTime: null,

  startOperation: (operation, partition) =>
    set({
      isRunning: true,
      operation,
      partition,
      current: 0,
      total: 0,
      percentage: 0,
      startTime: Date.now(),
    }),

  updateProgress: (current, total) => {
    const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;
    set({ current, total, percentage });
  },

  completeOperation: () =>
    set({
      isRunning: false,
      current: 0,
      total: 0,
      percentage: 0,
      startTime: null,
    }),

  reset: () =>
    set({
      isRunning: false,
      operation: "",
      partition: "",
      current: 0,
      total: 0,
      percentage: 0,
      startTime: null,
    }),
}));
