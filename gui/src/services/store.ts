import { create } from "zustand";
import type { DeviceState } from "../types";

export const useDeviceStore = create<DeviceState>((set) => ({
  connected: false,
  daPath: null,
  preloaderPath: null,
  partitions: [],
  deviceInfo: null,
  setConnected: (connected) => set({ connected }),
  setDaPath: (daPath) => set({ daPath }),
  setPreloaderPath: (preloaderPath) => set({ preloaderPath }),
  setPartitions: (partitions) => set({ partitions }),
  setDeviceInfo: (deviceInfo) => set({ deviceInfo }),
}));
