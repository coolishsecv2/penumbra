import { useMemo, useRef, useState } from "react";
import { Zap, Upload, FolderOpen, RefreshCw, FileText } from "lucide-react";
import { useDeviceStore } from "../services/store";
import { useFlasherStore } from "../services/flasherStore";
import * as api from "../services/api";
import { ScatterDropzone } from "../components/flasher/ScatterDropzone";
import { ScatterInfoBar } from "../components/flasher/ScatterInfoBar";
import { FlashPartitionTable } from "../components/flasher/FlashPartitionTable";
import { FlashActionBar } from "../components/flasher/FlashActionBar";
import { FlashProgressModal } from "../components/flasher/FlashProgressModal";

export function Flasher() {
  const { connected, daPath } = useDeviceStore();
  const [mode, setMode] = useState<"partition" | "scatter">("partition");
  const [selectedPartition, setSelectedPartition] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [flashOperation, setFlashOperation] = useState<"idle" | "flashing" | "done">("idle");

  const {
    scatterFile,
    isLoadingScatter,
    selectedPartitions,
    partitionImages,
    isFlashing,
    currentFlashIndex,
    totalFlashCount,
    showFlashModal,
    setScatterFile,
    setLoadingScatter,
    setSelectedPartitions,
    setPartitionImages,
    setFlashing,
    updateFlashProgress,
    setFlashModalOpen,
    togglePartitionSelection,
    clearFlasherState,
  } = useFlasherStore();

  const flashingCancelled = useRef(false);
  const [scatterError, setScatterError] = useState<string | null>(null);

  const selectedFlashOrder = useMemo(
    () =>
      (scatterFile?.partitions ?? [])
        .filter((p) => selectedPartitions.has(p.partition_name))
        .map((p) => p.partition_name),
    [scatterFile, selectedPartitions]
  );

  const currentFlashingPartition = useMemo(
    () =>
      selectedFlashOrder.length > 0 && currentFlashIndex > 0
        ? selectedFlashOrder[currentFlashIndex - 1] || ""
        : "",
    [selectedFlashOrder, currentFlashIndex]
  );

  const downloadPartitions = useMemo(
    () => scatterFile?.partitions.filter((p) => p.is_download) || [],
    [scatterFile]
  );

  const selectedCount = selectedPartitions.size;
  const selectedWithImagesCount = useMemo(
    () =>
      Array.from(selectedPartitions).filter((name) =>
        partitionImages.has(name)
      ).length,
    [selectedPartitions, partitionImages]
  );
  const missingImagesCount = selectedCount - selectedWithImagesCount;
  const canFlash =
    selectedCount > 0 &&
    missingImagesCount === 0 &&
    connected &&
    !!daPath;

  const loadScatterPath = async (path: string) => {
    setLoadingScatter(true);
    setScatterError(null);
    setSelectedPartitions(new Set());
    setPartitionImages(new Map());

    try {
      const parsed = await api.parseScatterFile(path);
      setScatterFile(parsed);

      const detectedImages = await api.detectImageFiles(
        path,
        parsed.partitions
      );

      const imageMap = new Map(Object.entries(detectedImages));

      // Synthesize _b from _a
      for (const [name, image] of imageMap) {
        if (name.endsWith("_a")) {
          const bName = name.slice(0, -2) + "_b";
          if (!imageMap.has(bName)) {
            imageMap.set(bName, image);
          }
        }
      }

      setPartitionImages(imageMap);

      const partitionsWithImages = new Set(
        parsed.partitions
          .filter((p) => p.is_download && imageMap.has(p.partition_name))
          .map((p) => p.partition_name)
      );
      setSelectedPartitions(partitionsWithImages);
    } catch (error: unknown) {
      console.error("Failed to parse scatter:", error);
      setScatterFile(null);
      setScatterError(
        "Failed to parse scatter file. Make sure it is a valid MediaTek scatter layout."
      );
    } finally {
      setLoadingScatter(false);
    }
  };

  const handleSelectScatterFile = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const file = await open({
      multiple: false,
      filters: [{ name: "Scatter", extensions: ["txt", "xml"] }],
    });
    if (file) {
      await loadScatterPath(file as string);
    }
  };

  const handleSelectAll = () => {
    if (!scatterFile) return;
    const partitionsWithImages = new Set(
      scatterFile.partitions
        .filter((p) => p.is_download && partitionImages.has(p.partition_name))
        .map((p) => p.partition_name)
    );
    setSelectedPartitions(partitionsWithImages);
  };

  const handleClearAll = () => {
    setSelectedPartitions(new Set());
  };

  const handleClearScatter = () => {
    clearFlasherState();
    setScatterError(null);
  };

  const handleTogglePartition = (partitionName: string) => {
    togglePartitionSelection(partitionName);
  };

  const handleSelectImage = async (partitionName: string) => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const file = await open({
      multiple: false,
      filters: [
        { name: "Image Files", extensions: ["img", "bin"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (file) {
      const next = new Map(partitionImages);
      next.set(partitionName, file as string);
      setPartitionImages(next);

      const nextSelected = new Set(selectedPartitions);
      nextSelected.add(partitionName);
      setSelectedPartitions(nextSelected);
    }
  };

  const handleFlash = async () => {
    if (!canFlash || isFlashing) return;

    flashingCancelled.current = false;
    setFlashing(true, 0, selectedFlashOrder.length);
    setFlashModalOpen(true);

    let successCount = 0;
    let failed = false;
    let failedPartitionName = "";

    for (let i = 0; i < selectedFlashOrder.length; i++) {
      if (flashingCancelled.current) break;

      const partitionName = selectedFlashOrder[i];
      const imgPath = partitionImages.get(partitionName);

      if (!imgPath) continue;

      updateFlashProgress(i + 1);

      try {
        await api.flashPartition(partitionName, imgPath);
        successCount++;
      } catch (e) {
        console.error(`Flash failed at ${partitionName}:`, e);
        failed = true;
        failedPartitionName = partitionName;
        break;
      }
    }

    setFlashing(false);
    setFlashModalOpen(false);

    if (flashingCancelled.current && !failed) {
      console.log(`Flash cancelled after ${successCount} partition(s)`);
    } else if (failed) {
      console.error(`Flash failed at partition ${failedPartitionName}`);
    } else {
      console.log(`Successfully flashed ${successCount} partition(s)`);
    }
  };

  const handleFlashPartition = async () => {
    if (!selectedPartition || !imagePath) return;
    setFlashOperation("flashing");
    try {
      await api.flashPartition(selectedPartition, imagePath);
      setFlashOperation("done");
      setTimeout(() => setFlashOperation("idle"), 2000);
    } catch (e) {
      console.error(`Flash failed: ${e}`);
      setFlashOperation("idle");
    }
  };

  const handleFlashModalClose = () => {
    flashingCancelled.current = true;
    setFlashModalOpen(false);
  };

  return (
    <div className="flex h-full flex-col bg-background p-6">
      <FlashProgressModal
        isOpen={showFlashModal}
        onClose={handleFlashModalClose}
        currentPartition={currentFlashingPartition}
        currentIndex={currentFlashIndex}
        totalCount={totalFlashCount}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <div>
          <h1 className="text-xl font-bold text-foreground font-mono">
            Flasher
          </h1>
          <p className="text-sm text-muted mt-1">
            Flash firmware to device partitions
          </p>
        </div>

        {!connected ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <Zap className="h-8 w-8 text-muted mx-auto mb-3" />
            <p className="text-sm text-muted">
              Connect a device first from Dashboard
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Mode Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setMode("partition")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-colors ${
                  mode === "partition"
                    ? "bg-accent text-white"
                    : "border border-border bg-card text-muted hover:text-foreground"
                }`}
              >
                <Zap className="h-3 w-3" />
                Single Partition
              </button>
              <button
                onClick={() => setMode("scatter")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-colors ${
                  mode === "scatter"
                    ? "bg-accent text-white"
                    : "border border-border bg-card text-muted hover:text-foreground"
                }`}
              >
                <FileText className="h-3 w-3" />
                Scatter File
              </button>
            </div>

            {mode === "partition" ? (
              <div className="space-y-4">
                {/* Partition Select */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted mb-2 block">
                    Target Partition
                  </label>
                  <select
                    value={selectedPartition}
                    onChange={(e) => setSelectedPartition(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  >
                    <option value="">Select partition...</option>
                    {useDeviceStore.getState().partitions.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} ({p.size_human})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Image File */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted mb-2 block">
                    Firmware Image
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={imagePath}
                      onChange={(e) => setImagePath(e.target.value)}
                      placeholder="Path to image file..."
                      className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                    />
                    <button
                      onClick={async () => {
                        const { open } = await import(
                          "@tauri-apps/plugin-dialog"
                        );
                        const file = await open({
                          multiple: false,
                          filters: [
                            { name: "Images", extensions: ["img", "bin"] },
                          ],
                        });
                        if (file) setImagePath(file as string);
                      }}
                      className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-card-hover"
                    >
                      <FolderOpen className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Flash Button */}
                <button
                  onClick={handleFlashPartition}
                  disabled={
                    !selectedPartition ||
                    !imagePath ||
                    flashOperation === "flashing"
                  }
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
                >
                  {flashOperation === "flashing" ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : flashOperation === "done" ? (
                    <span>Done!</span>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Flash Partition
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Scatter Mode */}
                {!scatterFile ? (
                  <ScatterDropzone
                    onLoadPath={loadScatterPath}
                    onSelectFile={handleSelectScatterFile}
                    isLoading={isLoadingScatter}
                  />
                ) : (
                  <>
                    <ScatterInfoBar
                      scatterFile={scatterFile}
                      onSelectAll={handleSelectAll}
                      onClearAll={handleClearAll}
                      onClearScatter={handleClearScatter}
                    />

                    {isFlashing && (
                      <div className="flex items-center gap-3 rounded-lg border border-accent bg-accent/5 p-3">
                        <RefreshCw className="h-4 w-4 animate-spin text-accent" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">
                            Flashing {currentFlashIndex} of {totalFlashCount}
                          </p>
                          <p className="truncate font-mono text-[10px] text-accent">
                            {currentFlashingPartition || "Starting..."}
                          </p>
                        </div>
                        <span className="font-mono text-xs text-accent">
                          {Math.round(
                            (currentFlashIndex /
                              Math.max(totalFlashCount, 1)) *
                              100
                          )}
                          %
                        </span>
                      </div>
                    )}

                    <FlashPartitionTable
                      partitions={downloadPartitions}
                      selectedPartitions={selectedPartitions}
                      partitionImages={partitionImages}
                      onTogglePartition={handleTogglePartition}
                      onSelectImage={handleSelectImage}
                    />

                    <FlashActionBar
                      selectedCount={selectedCount}
                      selectedWithImagesCount={selectedWithImagesCount}
                      missingImagesCount={missingImagesCount}
                      canFlash={canFlash && !isFlashing}
                      isFlashing={isFlashing}
                      currentFlashIndex={currentFlashIndex}
                      totalFlashCount={totalFlashCount}
                      isConnected={connected}
                      daPath={daPath}
                      onFlash={handleFlash}
                    />
                  </>
                )}

                {scatterError && (
                  <div className="rounded-lg border border-danger bg-danger/10 p-3 text-xs text-danger">
                    <p className="flex items-center gap-2 font-semibold">
                      <Zap className="h-3 w-3" />
                      {scatterError}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
