import { create } from "zustand";
import type { ScatterFile } from "../types";

interface FlasherState {
  scatterFile: ScatterFile | null;
  isLoadingScatter: boolean;
  selectedPartitions: Set<string>;
  partitionImages: Map<string, string>;
  isFlashing: boolean;
  currentFlashIndex: number;
  totalFlashCount: number;
  flashModalMinimized: boolean;
  showFlashModal: boolean;

  setScatterFile: (file: ScatterFile | null) => void;
  setLoadingScatter: (loading: boolean) => void;
  setSelectedPartitions: (selected: Set<string>) => void;
  setPartitionImages: (images: Map<string, string>) => void;
  togglePartitionSelection: (partition: string) => void;
  clearFlasherState: () => void;
  setFlashing: (flashing: boolean, index?: number, total?: number) => void;
  updateFlashProgress: (index: number) => void;
  setFlashModalMinimized: (minimized: boolean) => void;
  setFlashModalOpen: (open: boolean) => void;
}

export const useFlasherStore = create<FlasherState>((set, get) => ({
  scatterFile: null,
  isLoadingScatter: false,
  selectedPartitions: new Set(),
  partitionImages: new Map(),
  isFlashing: false,
  currentFlashIndex: 0,
  totalFlashCount: 0,
  flashModalMinimized: false,
  showFlashModal: false,

  setScatterFile: (file) => set({ scatterFile: file }),

  setLoadingScatter: (loading) => set({ isLoadingScatter: loading }),

  setSelectedPartitions: (selected) => set({ selectedPartitions: selected }),

  setPartitionImages: (images) => set({ partitionImages: images }),

  togglePartitionSelection: (partition) => {
    const selected = new Set(get().selectedPartitions);
    if (selected.has(partition)) {
      selected.delete(partition);
    } else {
      selected.add(partition);
    }
    set({ selectedPartitions: selected });
  },

  clearFlasherState: () =>
    set({
      scatterFile: null,
      selectedPartitions: new Set(),
      partitionImages: new Map(),
      isFlashing: false,
      currentFlashIndex: 0,
      totalFlashCount: 0,
      flashModalMinimized: false,
      showFlashModal: false,
    }),

  setFlashing: (flashing, index, total) =>
    set({
      isFlashing: flashing,
      currentFlashIndex: index ?? 0,
      totalFlashCount: total ?? 0,
    }),

  updateFlashProgress: (index) => set({ currentFlashIndex: index }),

  setFlashModalMinimized: (minimized) => set({ flashModalMinimized: minimized }),

  setFlashModalOpen: (open) =>
    set({ showFlashModal: open, flashModalMinimized: false }),
}));
