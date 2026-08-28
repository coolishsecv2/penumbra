import { useEffect, useState } from "react";
import { Zap, Loader2, X } from "lucide-react";

export interface FlashProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPartition: string;
  currentIndex: number;
  totalCount: number;
}

export function FlashProgressModal({
  isOpen,
  onClose,
  currentPartition,
  currentIndex,
  totalCount,
}: FlashProgressModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsVisible(true), 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setIsVisible(false), 300);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isVisible && !isOpen) return null;

  const percentage =
    currentIndex >= totalCount
      ? 100
      : totalCount > 0
        ? Math.round((currentIndex / totalCount) * 100)
        : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[100] bg-black/60 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed left-1/2 top-1/2 z-[110] mx-3 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <div className="overflow-hidden rounded-lg border-2 border-accent bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-accent" />
              <h2 className="text-sm font-bold text-foreground">
                Flashing Partitions
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded p-1 text-muted transition-colors hover:bg-card-hover hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4 p-4">
            <p className="text-xs text-muted">
              Flashing partition {currentIndex} of {totalCount}...
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Current:</span>
                <span className="font-mono text-xs text-accent">
                  {currentPartition}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Progress:</span>
                <span className="font-mono text-xs text-foreground">
                  {currentIndex} / {totalCount}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 rounded-lg border border-border bg-card-hover p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-accent">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Flashing...</span>
              </div>

              {/* Native progress bar */}
              <div className="relative h-2 overflow-hidden rounded-full bg-border">
                <div
                  className="absolute inset-y-0 left-0 bg-accent transition-all duration-300 animate-pulse"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted">
                <span className="truncate font-mono">
                  {currentPartition}
                </span>
                <span className="font-mono">{percentage}%</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end border-t border-border p-4">
            <button
              onClick={onClose}
              className="rounded-lg bg-danger px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-danger/80"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
