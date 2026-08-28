import { useMemo } from "react";
import { Zap, Loader2 } from "lucide-react";
import { useOperationStore } from "../services/operationStore";

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec >= 1024 * 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024 * 1024)).toFixed(1)} GB/s`;
  }
  if (bytesPerSec >= 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  if (bytesPerSec >= 1024) {
    return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  }
  return `${bytesPerSec} B/s`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

function formatElapsed(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  if (hr > 0) return `${hr}h ${min % 60}m ${sec % 60}s`;
  if (min > 0) return `${min}m ${sec % 60}s`;
  return `${sec}s`;
}

function formatEta(
  bytesPerSec: number,
  current: number,
  total: number
): string {
  if (bytesPerSec <= 0 || current >= total) return "";
  const remaining = total - current;
  const sec = Math.ceil(remaining / bytesPerSec);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  if (hr > 0) return `~${hr}h ${min % 60}m`;
  if (min > 0) return `~${min}m ${sec % 60}s`;
  return `~${sec}s`;
}

export function ProgressWidget() {
  const { isRunning, operation, partition, current, total, percentage, startTime } =
    useOperationStore();

  const speed = useMemo(() => {
    if (!startTime || !isRunning || current === 0) return 0;
    const elapsed = (Date.now() - startTime) / 1000;
    return elapsed > 0 ? current / elapsed : 0;
  }, [startTime, isRunning, current]);

  const elapsed = useMemo(() => {
    if (!startTime) return "";
    return formatElapsed(Date.now() - startTime);
  }, [startTime, isRunning]);

  const eta = useMemo(() => {
    if (!isRunning || speed <= 0 || current >= total) return "";
    return formatEta(speed, current, total);
  }, [isRunning, speed, current, total]);

  if (!isRunning) return null;

  const operationLabel = (() => {
    switch (operation) {
      case "flash":
        return "Flashing";
      case "read":
        return "Reading";
      case "erase":
        return "Erasing";
      case "scatter":
        return "Scatter Flash";
      default:
        return operation;
    }
  })();

  return (
    <div className="flex-shrink-0 rounded-lg border border-accent bg-accent/5 p-3">
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-accent flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-bold text-foreground">
              {operationLabel} {partition}
            </span>
            <span className="flex-shrink-0 font-mono text-xs text-accent">
              {percentage.toFixed(1)}%
            </span>
          </div>

          {/* Native progress bar */}
          <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-border">
            <div
              className="absolute inset-y-0 left-0 bg-accent transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Stats row */}
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted">
            <span className="font-mono">
              {formatBytes(current)} / {formatBytes(total)}
            </span>
            <div className="flex items-center gap-2">
              {speed > 0 && (
                <span className="flex items-center gap-0.5 font-mono text-accent">
                  <Zap className="h-2.5 w-2.5" />
                  {formatSpeed(speed)}
                </span>
              )}
              {elapsed && <span className="font-mono">{elapsed}</span>}
              {eta && <span className="font-mono text-accent">{eta}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
