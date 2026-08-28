import { create } from "zustand";
import type { DeviceState } from "../types";

export const useDeviceStore = create<DeviceState>((set) => ({
  connected: false,
  isConnecting: false,
  connectionError: null,
  daPath: localStorage.getItem("penumbra:daPath") || null,
  preloaderPath: localStorage.getItem("penumbra:preloaderPath") || null,
  partitions: [],
  deviceInfo: null,
  setConnected: (connected) => set({ connected, connectionError: null }),
  setConnecting: (isConnecting) => set({ isConnecting }),
  setConnectionError: (connectionError) => set({ connectionError }),
  setDaPath: (daPath) => {
    if (daPath) {
      localStorage.setItem("penumbra:daPath", daPath);
    } else {
      localStorage.removeItem("penumbra:daPath");
    }
    set({ daPath });
  },
  setPreloaderPath: (preloaderPath) => {
    if (preloaderPath) {
      localStorage.setItem("penumbra:preloaderPath", preloaderPath);
    } else {
      localStorage.removeItem("penumbra:preloaderPath");
    }
    set({ preloaderPath });
  },
  setPartitions: (partitions) => set({ partitions }),
  setDeviceInfo: (deviceInfo) => set({ deviceInfo }),
  disconnect: () =>
    set({
      connected: false,
      isConnecting: false,
      connectionError: null,
      partitions: [],
      deviceInfo: null,
    }),
}));
