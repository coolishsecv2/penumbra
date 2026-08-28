import { useState, useEffect, useCallback, memo } from "react";
import { X, FolderOpen, AlertTriangle } from "lucide-react";
import type { Partition } from "../types";
import * as api from "../services/api";

interface OperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  partition: Partition | null;
  operation: "read" | "write";
}

export const OperationModal = memo<OperationModalProps>(
  ({ isOpen, onClose, partition, operation }) => {
    const [filePath, setFilePath] = useState("");
    const [isExecuting, setIsExecuting] = useState(false);
    const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

    useEffect(() => {
      if (isOpen && partition) {
        setFilePath("");
        setIsExecuting(false);
        setShowOverwriteConfirm(false);
      }
    }, [isOpen, partition, operation]);

    useEffect(() => {
      if (!isOpen) return;
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && isOpen && !isExecuting) {
          onClose();
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, isExecuting, onClose]);

    const handleBrowse = useCallback(async () => {
      const { open, save } = await import("@tauri-apps/plugin-dialog");

      if (operation === "write") {
        const file = await open({
          multiple: false,
          filters: [
            { name: "Image Files", extensions: ["img", "bin"] },
            { name: "All Files", extensions: ["*"] },
          ],
        });
        if (file) setFilePath(file as string);
      } else {
        const file = await save({
          defaultPath: partition ? `${partition.name}.img` : "partition.img",
        });
        if (file) {
          setFilePath(file as string);
          setShowOverwriteConfirm(false);
        }
      }
    }, [operation, partition]);

    const handleStart = useCallback(async () => {
      if (!partition || !filePath) return;
      setIsExecuting(true);

      try {
        if (operation === "write") {
          await api.flashPartition(partition.name, filePath);
        } else {
          await api.readPartition(partition.name, filePath);
        }
        onClose();
      } catch (e) {
        console.error(`Operation failed: ${e}`);
      } finally {
        setIsExecuting(false);
      }
    }, [partition, filePath, operation, onClose]);

    if (!isOpen || !partition) return null;

    const canStart = filePath && !isExecuting;

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 transition-opacity duration-200"
          onClick={!isExecuting ? onClose : undefined}
        />

        {/* Modal */}
        <div
          className="fixed left-1/2 top-1/2 z-[110] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 mx-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-2xl">
            {/* Overwrite Confirm Overlay */}
            {showOverwriteConfirm && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center border-2 border-warning bg-card p-4">
                <AlertTriangle className="mb-4 h-10 w-10 text-warning" />
                <h3 className="mb-2 text-center text-sm font-bold text-foreground">
                  File Already Exists
                </h3>
                <p className="mb-4 text-center text-xs text-muted">
                  The output file already exists. Overwrite it?
                </p>
                <p className="mb-4 max-w-full break-all px-4 text-center font-mono text-[10px] text-muted">
                  {filePath}
                </p>
                <div className="flex w-full gap-2">
                  <button
                    onClick={() => {
                      setShowOverwriteConfirm(false);
                      handleBrowse();
                    }}
                    className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground transition-colors hover:bg-card-hover"
                  >
                    Choose Different
                  </button>
                  <button
                    onClick={() => {
                      setShowOverwriteConfirm(false);
                      handleStart();
                    }}
                    className="flex-1 rounded-lg bg-warning px-3 py-2 text-xs font-bold text-black transition-colors hover:bg-warning/80"
                  >
                    Overwrite
                  </button>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="text-sm font-bold text-foreground">
                {operation === "write" ? "Write" : "Read"} Partition
              </h2>
              <button
                onClick={onClose}
                disabled={isExecuting}
                className="rounded p-1 text-muted transition-colors hover:bg-card-hover hover:text-foreground disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 p-4">
              {/* Partition Info */}
              <div className="rounded-lg border border-border bg-card-hover p-3">
                <div className="text-[10px] text-muted">Partition</div>
                <div className="font-mono text-sm text-foreground">
                  {partition.name}
                </div>
                {partition.size_human && (
                  <div className="text-[10px] text-muted">
                    Size: {partition.size_human}
                  </div>
                )}
              </div>

              {/* File Path */}
              <div>
                <label className="mb-2 block text-xs font-bold text-foreground">
                  {operation === "write" ? "Image File" : "Output File"}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    placeholder={
                      operation === "write"
                        ? "Select image file..."
                        : "Select output location..."
                    }
                    disabled={isExecuting}
                    className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none disabled:opacity-50"
                  />
                  <button
                    onClick={handleBrowse}
                    disabled={isExecuting}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-muted transition-colors hover:text-foreground disabled:opacity-50"
                  >
                    <FolderOpen className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-border p-4">
              <button
                onClick={onClose}
                disabled={isExecuting}
                className="rounded-lg border border-border bg-card px-4 py-2 text-xs text-foreground transition-colors hover:bg-card-hover disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                disabled={!canStart}
                className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {isExecuting ? "Starting..." : "Start"}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }
);

OperationModal.displayName = "OperationModal";
