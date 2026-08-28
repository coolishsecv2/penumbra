import { useState, useCallback } from "react";
import { useDeviceStore } from "../services/store";
import * as api from "../services/api";
import { ErrorHandler } from "../services/utils/errorHandler";

// Stable selector functions to prevent unnecessary re-subscriptions
const selectIsConnected = (state: ReturnType<typeof useDeviceStore.getState>) =>
  state.connected;
const selectIsConnecting = (
  state: ReturnType<typeof useDeviceStore.getState>
) => state.isConnecting;

/**
 * Custom hook for managing device connection lifecycle.
 *
 * Encapsulates connection logic including:
 * - Validation of DA file selection
 * - Connection to device via API
 * - Partition list retrieval
 * - Connection state management
 * - Error handling and user feedback
 */
export function useDeviceConnection() {
  const {
    daPath,
    preloaderPath,
    setConnected,
    setConnecting,
    setConnectionError,
    setPartitions,
    setDeviceInfo,
    disconnect: storeDisconnect,
  } = useDeviceStore();
  const [error, setError] = useState<string | null>(null);

  /**
   * Connect to the device and retrieve partition list.
   */
  const connect = useCallback(async () => {
    if (!daPath) {
      ErrorHandler.handle(new Error("No DA file selected"), "Connection", {
        customMessage: "Please select a DA file first",
      });
      return false;
    }

    setConnecting(true);
    setConnectionError(null);
    setError(null);

    try {
      // Cancel any existing operation first
      await api.cancelOperation();

      // Connect and get device info
      await api.connectDevice(daPath, preloaderPath || undefined);

      // Load device info and partitions
      const info = await api.getDeviceInfo();
      setDeviceInfo(info);

      const parts = await api.listPartitions();
      setPartitions(parts);

      setConnected(true);
      ErrorHandler.success(
        "Connection",
        `Connected! Found ${parts.length} partitions`
      );
      return true;
    } catch (err: unknown) {
      const parsedError = ErrorHandler.handle(err, "Connection");
      setError(parsedError.message);
      setConnectionError(parsedError.message);
      setConnected(false);
      return false;
    } finally {
      setConnecting(false);
    }
  }, [
    daPath,
    preloaderPath,
    setConnecting,
    setConnectionError,
    setConnected,
    setDeviceInfo,
    setPartitions,
  ]);

  /**
   * Disconnect from the device and clear partition data.
   */
  const disconnect = useCallback(() => {
    api.cancelOperation().catch(() => undefined);
    storeDisconnect();
  }, [storeDisconnect]);

  return {
    connect,
    disconnect,
    isConnected: useDeviceStore(selectIsConnected),
    isConnecting: useDeviceStore(selectIsConnecting),
    error,
  };
}
