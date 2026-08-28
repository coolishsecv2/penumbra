import { useState } from "react";
import { Zap, Upload, FolderOpen, RefreshCw, FileText } from "lucide-react";
import { useDeviceStore } from "../services/store";
import * as api from "../services/api";

export function Flasher() {
  const { connected, partitions } = useDeviceStore();
  const [mode, setMode] = useState<"partition" | "scatter">("partition");
  const [selectedPartition, setSelectedPartition] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [scatterPath, setScatterPath] = useState("");
  const [flashOperation, setFlashOperation] = useState<"idle" | "flashing" | "done">("idle");

  async function handleFlashPartition() {
    if (!selectedPartition || !imagePath) return;
    setFlashOperation("flashing");
    try {
      await api.flashPartition(selectedPartition, imagePath);
      setFlashOperation("done");
      setTimeout(() => setFlashOperation("idle"), 2000);
    } catch (e) {
      alert(`Flash failed: ${e}`);
      setFlashOperation("idle");
    }
  }

  async function handleFlashScatter() {
    if (!scatterPath) return;
    setFlashOperation("flashing");
    try {
      await api.flashScatter(scatterPath);
      setFlashOperation("done");
      setTimeout(() => setFlashOperation("idle"), 2000);
    } catch (e) {
      alert(`Scatter flash failed: ${e}`);
      setFlashOperation("idle");
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground font-mono">Flasher</h1>
        <p className="text-sm text-muted mt-1">Flash firmware to device partitions</p>
      </div>

      {!connected ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Zap className="h-8 w-8 text-muted mx-auto mb-3" />
          <p className="text-sm text-muted">Connect a device first from Dashboard</p>
        </div>
      ) : (
        <div className="space-y-4">
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
                  {partitions.map((p) => (
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
                      const { open } = await import("@tauri-apps/plugin-dialog");
                      const file = await open({ multiple: false, filters: [{ name: "Images", extensions: ["img", "bin"] }] });
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
                disabled={!selectedPartition || !imagePath || flashOperation === "flashing"}
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
            <div className="space-y-4">
              {/* Scatter File */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted mb-2 block">
                  Scatter File
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scatterPath}
                    onChange={(e) => setScatterPath(e.target.value)}
                    placeholder="Path to scatter file..."
                    className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                  <button
                    onClick={async () => {
                      const { open } = await import("@tauri-apps/plugin-dialog");
                      const file = await open({
                        multiple: false,
                        filters: [{ name: "Scatter", extensions: ["txt"] }],
                      });
                      if (file) setScatterPath(file as string);
                    }}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-card-hover"
                  >
                    <FolderOpen className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-[10px] text-muted mt-1">
                  Firmware files must be in the same directory as the scatter file.
                </p>
              </div>

              {/* Flash Button */}
              <button
                onClick={handleFlashScatter}
                disabled={!scatterPath || flashOperation === "flashing"}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {flashOperation === "flashing" ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : flashOperation === "done" ? (
                  <span>Done!</span>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Flash from Scatter
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
