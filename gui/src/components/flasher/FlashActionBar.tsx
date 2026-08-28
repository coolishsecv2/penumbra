interface FlashActionBarProps {
  selectedCount: number;
  selectedWithImagesCount: number;
  missingImagesCount: number;
  canFlash: boolean;
  isFlashing: boolean;
  currentFlashIndex: number;
  totalFlashCount: number;
  isConnected: boolean;
  daPath: string | null;
  onFlash: () => void;
}

export function FlashActionBar({
  selectedCount,
  selectedWithImagesCount,
  missingImagesCount,
  canFlash,
  isFlashing,
  currentFlashIndex,
  totalFlashCount,
  isConnected,
  daPath,
  onFlash,
}: FlashActionBarProps) {
  const isDisabled = !canFlash || isFlashing;

  const getTitle = (): string => {
    if (isFlashing) return "Flashing in progress...";
    if (!daPath) return "No DA file selected";
    if (!isConnected) return "Connect a device first";
    if (selectedCount === 0) return "Select partitions to flash";
    if (missingImagesCount > 0)
      return `${missingImagesCount} partition(s) missing image files`;
    return "Flash selected partitions";
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 text-xs text-muted">
        {isFlashing ? (
          <span className="block truncate font-semibold text-accent">
            Flashing partition {currentFlashIndex} of {totalFlashCount}...
          </span>
        ) : (
          <>
            <span className="font-semibold text-foreground">{selectedCount}</span>{" "}
            partitions selected
            {selectedCount > 0 && (
              <span className="ml-2">
                ({selectedWithImagesCount} with images)
              </span>
            )}
          </>
        )}
      </div>
      <button
        onClick={onFlash}
        disabled={isDisabled}
        title={getTitle()}
        className="w-full rounded-lg bg-accent px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-accent-hover disabled:opacity-50 sm:w-auto"
      >
        {isFlashing ? "Flashing..." : "Flash Selected"}
      </button>
    </div>
  );
}
