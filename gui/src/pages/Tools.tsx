import { useState } from "react";
import {
  HardDrive,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Power,
  Zap,
} from "lucide-react";
import { useDeviceStore } from "../services/store";
import * as api from "../services/api";

export function Tools() {
  const { connected, partitions } = useDeviceStore();
  const [selectedPartition, setSelectedPartition] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [operation, setOperation] = useState<string | null>(null);

  async function handleRead() {
    if (!selectedPartition || !outputPath) return;
    setOperation("reading");
    try {
      await api.readPartition(selectedPartition, outputPath);
      setOperation(null);
    } catch (e) {
      alert(`Read failed: ${e}`);
      setOperation(null);
    }
  }

  async function handleErase() {
    if (!selectedPartition) return;
    if (!confirm(`Erase partition "${selectedPartition}"? This cannot be undone.`)) return;
    setOperation("erasing");
    try {
      await api.erasePartition(selectedPartition);
      setOperation(null);
    } catch (e) {
      alert(`Erase failed: ${e}`);
      setOperation(null);
    }
  }

  async function handleReboot(mode: string) {
    try {
      await api.rebootDevice(mode);
    } catch (e) {
      alert(`Reboot failed: ${e}`);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground font-mono">Tools</h1>
        <p className="text-sm text-muted mt-1">Device management and utilities</p>
      </div>

      {!connected ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <HardDrive className="h-8 w-8 text-muted mx-auto mb-3" />
          <p className="text-sm text-muted">Connect a device first from Dashboard</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Partition Operations */}
          <Section title="Partition Operations">
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

            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={outputPath}
                  onChange={(e) => setOutputPath(e.target.value)}
                  placeholder="Output path..."
                  className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
                <button
                  onClick={handleRead}
                  disabled={!selectedPartition || !outputPath || operation !== null}
                  className="flex items-center gap-2 rounded-lg bg-success/20 px-3 py-2 text-sm text-success hover:bg-success/30 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Read
                </button>
              </div>

              <button
                onClick={handleErase}
                disabled={!selectedPartition || operation !== null}
                className="flex items-center justify-center gap-2 rounded-lg bg-danger/20 px-3 py-2 text-sm text-danger hover:bg-danger/30 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Erase
              </button>
            </div>
          </Section>

          {/* Device Controls */}
          <Section title="Device Controls">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleReboot("fastboot")}
                className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground hover:border-accent hover:bg-card-hover"
              >
                <Zap className="h-4 w-4 text-accent" />
                Force Fastboot
              </button>
              <button
                onClick={() => handleReboot("recovery")}
                className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground hover:border-accent hover:bg-card-hover"
              >
                <RotateCcw className="h-4 w-4 text-warning" />
                Recovery
              </button>
              <button
                onClick={() => handleReboot("normal")}
                className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground hover:border-accent hover:bg-card-hover"
              >
                <RotateCcw className="h-4 w-4 text-success" />
                Reboot Normal
              </button>
              <button
                onClick={async () => {
                  await api.shutdownDevice();
                }}
                className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground hover:border-danger hover:bg-card-hover"
              >
                <Power className="h-4 w-4 text-danger" />
                Shutdown
              </button>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}
