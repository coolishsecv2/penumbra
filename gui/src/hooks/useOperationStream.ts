import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useOperationStore } from "../services/operationStore";

interface ProgressPayload {
  current: number;
  total: number;
  operation: string;
  partition: string;
  percentage: number;
}

interface CompletePayload {
  success: boolean;
  error?: string;
  operation: string;
  partition: string;
}

export function useOperationStream() {
  const { updateProgress, completeOperation } = useOperationStore();

  useEffect(() => {
    let unlistenProgress: (() => void) | null = null;
    let unlistenComplete: (() => void) | null = null;

    const setup = async () => {
      unlistenProgress = await listen<ProgressPayload>(
        "operation:progress",
        (event) => {
          updateProgress(event.payload.current, event.payload.total);
        }
      );

      unlistenComplete = await listen<CompletePayload>(
        "operation:complete",
        () => {
          completeOperation();
        }
      );
    };

    setup();

    return () => {
      if (unlistenProgress) unlistenProgress();
      if (unlistenComplete) unlistenComplete();
    };
  }, [updateProgress, completeOperation]);
}
