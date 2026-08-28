import { useState } from "react";
import {
  HardDrive,
  RotateCcw,
  Power,
  Zap,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { useDeviceStore } from "../services/store";
import { useOperationStore } from "../services/operationStore";
import { useOperationStream } from "../hooks/useOperationStream";
import { PartitionTable } from "../components/PartitionTable";
import { OperationModal } from "../components/OperationModal";
import { ProgressWidget } from "../components/ProgressWidget";
import * as api from "../services/api";
import type { Partition } from "../types";

export function Tools() {
  const { connected, partitions } = useDeviceStore();
  const { isRunning, startOperation, completeOperation } = useOperationStore();
  useOperationStream();
  const [selectedPartitions, setSelectedPartitions] = useState<Set<string>>(
    new Set()
  );
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    partition: Partition | null;
    operation: "read" | "write";
  }>({ isOpen: false, partition: null, operation: "read" });
  const [operation, setOperation] = useState<string | null>(null);

  const handleToggleSelected = (name: string) => {
    const next = new Set(selectedPartitions);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setSelectedPartitions(next);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPartitions(new Set(partitions.map((p) => p.name)));
    } else {
      setSelectedPartitions(new Set());
    }
  };

  const handleRead = (partition: Partition) => {
    setModalState({ isOpen: true, partition, operation: "read" });
  };

  const handleWrite = (partition: Partition) => {
    setModalState({ isOpen: true, partition, operation: "write" });
  };

  const handleFormat = async (partition: Partition) => {
    if (
      !confirm(`Format partition "${partition.name}"? This is equivalent to erase.`)
    )
      return;
    setOperation("formatting");
    startOperation("erase", partition.name);
    try {
      await api.formatPartition(partition.name);
    } catch (e) {
      console.error(`Format failed: ${e}`);
    } finally {
      completeOperation();
      setOperation(null);
    }
  };

  const handleErase = async (partition: Partition) => {
    if (
      !confirm(
        `Erase partition "${partition.name}"? This cannot be undone.`
      )
    )
      return;
    setOperation("erasing");
    startOperation("erase", partition.name);
    try {
      await api.erasePartition(partition.name);
    } catch (e) {
      console.error(`Erase failed: ${e}`);
    } finally {
      completeOperation();
      setOperation(null);
    }
  };

  const handleReboot = async (mode: string) => {
    try {
      await api.rebootDevice(mode);
    } catch (e) {
      console.error(`Reboot failed: ${e}`);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background p-6">
      <OperationModal
        isOpen={modalState.isOpen}
        onClose={() =>
          setModalState({ isOpen: false, partition: null, operation: "read" })
        }
        partition={modalState.partition}
        operation={modalState.operation}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <div>
          <h1 className="text-xl font-bold text-foreground font-mono">
            Tools
          </h1>
          <p className="text-sm text-muted mt-1">
            Device management and utilities
          </p>
        </div>

        {!connected ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <HardDrive className="h-8 w-8 text-muted mx-auto mb-3" />
            <p className="text-sm text-muted">
              Connect a device first from Dashboard
            </p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            {/* Partition Table */}
            <div className="flex min-h-0 flex-1 flex-col">
              <PartitionTable
                partitions={partitions}
                selectedPartitions={selectedPartitions}
                onToggleSelected={handleToggleSelected}
                onSelectAll={handleSelectAll}
                onRead={handleRead}
                onWrite={handleWrite}
                onFormat={handleFormat}
                onErase={handleErase}
              />
            </div>

            {/* Progress Widget */}
            <ProgressWidget />

            {/* Device Controls */}
            <div className="flex-shrink-0 rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">
                Device Controls
              </h2>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handleReboot("fastboot")}
                  className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card-hover px-3 py-2.5 text-xs text-foreground transition-colors hover:border-accent"
                >
                  <Zap className="h-3.5 w-3.5 text-accent" />
                  Fastboot
                </button>
                <button
                  onClick={() => handleReboot("recovery")}
                  className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card-hover px-3 py-2.5 text-xs text-foreground transition-colors hover:border-warning"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-warning" />
                  Recovery
                </button>
                <button
                  onClick={() => handleReboot("normal")}
                  className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card-hover px-3 py-2.5 text-xs text-foreground transition-colors hover:border-success"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-success" />
                  Reboot
                </button>
                <button
                  onClick={() => api.shutdownDevice()}
                  className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card-hover px-3 py-2.5 text-xs text-foreground transition-colors hover:border-danger"
                >
                  <Power className="h-3.5 w-3.5 text-danger" />
                  Shutdown
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
