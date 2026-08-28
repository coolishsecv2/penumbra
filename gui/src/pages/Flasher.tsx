import { useState } from "react";
import { Zap, Upload, FolderOpen, RefreshCw } from "lucide-react";
import { useDeviceStore } from "../services/store";
import * as api from "../services/api";

export function Flasher() {
  const { connected, partitions } = useDeviceStore();
  const [selectedPartition, setSelectedPartition] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [flashOperation, setFlashOperation] = useState<"idle" | "flashing" | "done">("idle");

  async function handleFlash() {
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
                  const file = await open({ multiple: false, filters: [{ name: "Images", extensions: ["img", "bin", "bin"] }] });
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
            onClick={handleFlash}
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
      )}
    </div>
  );
}
