import { useState } from "react";
import {
  Cpu,
  MemoryStick,
  Database,
  Zap,
  Upload,
  FolderOpen,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { useDeviceStore } from "../services/store";
import * as api from "../services/api";

export function Advanced() {
  const { connected } = useDeviceStore();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground font-mono">Advanced</h1>
        <p className="text-sm text-muted mt-1">Memory operations, bulk tools, and device control</p>
      </div>

      {!connected ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Cpu className="h-8 w-8 text-muted mx-auto mb-3" />
          <p className="text-sm text-muted">Connect a device first from Dashboard</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Memory Operations */}
          <Section title="Memory Operations">
            <MemoryOps />
          </Section>

          {/* Raw Flash Operations */}
          <Section title="Raw Flash Offset">
            <RawFlashOps />
          </Section>

          {/* Bulk Operations */}
          <Section title="Bulk Operations">
            <BulkOps />
          </Section>

          {/* XFlash / RSC Flash */}
          <Section title="XFlash (V5 Devices)">
            <XFlashOps />
          </Section>

          {/* Boot Custom Preloader */}
          <Section title="Boot Custom Preloader">
            <BootPlOps />
          </Section>

          {/* Device Crash */}
          <Section title="Crash to BootROM">
            <CrashOps />
          </Section>

          {/* Patch DA */}
          <Section title="Patch DA File">
            <PatchDaOps />
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

function MemoryOps() {
  const [address, setAddress] = useState("");
  const [length, setLength] = useState("");
  const [filePath, setFilePath] = useState("");
  const [operation, setOperation] = useState<string | null>(null);
  const [regValue, setRegValue] = useState<string | null>(null);

  async function handlePeek() {
    if (!address || !length || !filePath) return;
    setOperation("peeking");
    try {
      await api.peekMemory(parseInt(address, 16), parseInt(length, 16), filePath);
      setOperation(null);
    } catch (e) {
      alert(`Peek failed: ${e}`);
      setOperation(null);
    }
  }

  async function handlePoke() {
    if (!address || !filePath) return;
    setOperation("poking");
    try {
      await api.pokeMemory(parseInt(address, 16), filePath);
      setOperation(null);
    } catch (e) {
      alert(`Poke failed: ${e}`);
      setOperation(null);
    }
  }

  async function handleReadReg() {
    if (!address) return;
    setOperation("reading_reg");
    try {
      const value = await api.readRegister(parseInt(address, 16));
      setRegValue(`0x${value.toString(16).toUpperCase().padStart(8, "0")}`);
      setOperation(null);
    } catch (e) {
      alert(`Register read failed: ${e}`);
      setOperation(null);
    }
  }

  async function handleWriteReg() {
    if (!address || !regValue) return;
    setOperation("writing_reg");
    try {
      await api.writeRegister(parseInt(address, 16), parseInt(regValue, 16));
      setOperation(null);
    } catch (e) {
      alert(`Register write failed: ${e}`);
      setOperation(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase text-muted mb-1 block">Address (hex)</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x00000000"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-muted mb-1 block">Length (hex)</label>
          <input
            type="text"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            placeholder="0x100"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase text-muted mb-1 block">File Path</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            placeholder="Path to file..."
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
          />
          <button
            onClick={async () => {
              const { open } = await import("@tauri-apps/plugin-dialog");
              const file = await open({ multiple: false });
              if (file) setFilePath(file as string);
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-muted hover:text-foreground"
          >
            <FolderOpen className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handlePeek}
          disabled={!address || !length || !filePath || operation !== null}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent/20 px-3 py-2 text-xs text-accent hover:bg-accent/30 disabled:opacity-50"
        >
          {operation === "peeking" ? <RefreshCw className="h-3 w-3 animate-spin" /> : <MemoryStick className="h-3 w-3" />}
          Peek Memory
        </button>
        <button
          onClick={handlePoke}
          disabled={!address || !filePath || operation !== null}
          className="flex items-center justify-center gap-2 rounded-lg bg-warning/20 px-3 py-2 text-xs text-warning hover:bg-warning/30 disabled:opacity-50"
        >
          {operation === "poking" ? <RefreshCw className="h-3 w-3 animate-spin" /> : <MemoryStick className="h-3 w-3" />}
          Poke Memory
        </button>
      </div>

      {/* Register Operations */}
      <div className="border-t border-border pt-3 mt-3">
        <p className="text-[10px] font-bold uppercase text-muted mb-2">32-bit Register Operations</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={regValue || ""}
            onChange={(e) => setRegValue(e.target.value)}
            placeholder="Value (hex)"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-accent focus:outline-none"
          />
          <button
            onClick={handleReadReg}
            disabled={!address || operation !== null}
            className="flex items-center gap-2 rounded-lg bg-success/20 px-3 py-2 text-xs text-success hover:bg-success/30 disabled:opacity-50"
          >
            Read
          </button>
          <button
            onClick={handleWriteReg}
            disabled={!address || !regValue || operation !== null}
            className="flex items-center gap-2 rounded-lg bg-danger/20 px-3 py-2 text-xs text-danger hover:bg-danger/30 disabled:opacity-50"
          >
            Write
          </button>
        </div>
      </div>
    </div>
  );
}

function RawFlashOps() {
  const [address, setAddress] = useState("");
  const [length, setLength] = useState("");
  const [inputPath, setInputPath] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [operation, setOperation] = useState<string | null>(null);

  async function handleWriteOffset() {
    if (!address || !length || !inputPath) return;
    setOperation("writing");
    try {
      await api.writeOffset(parseInt(address, 16), parseInt(length, 16), inputPath);
      setOperation(null);
    } catch (e) {
      alert(`Write failed: ${e}`);
      setOperation(null);
    }
  }

  async function handleReadOffset() {
    if (!address || !length || !outputPath) return;
    setOperation("reading");
    try {
      await api.readOffset(parseInt(address, 16), parseInt(length, 16), outputPath);
      setOperation(null);
    } catch (e) {
      alert(`Read failed: ${e}`);
      setOperation(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase text-muted mb-1 block">Offset (hex)</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x00000000"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-muted mb-1 block">Length (hex)</label>
          <input
            type="text"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            placeholder="0x1000"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase text-muted mb-1 block">Input File (write)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputPath}
              onChange={(e) => setInputPath(e.target.value)}
              placeholder="Input file..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
            />
            <button
              onClick={async () => {
                const { open } = await import("@tauri-apps/plugin-dialog");
                const file = await open({ multiple: false });
                if (file) setInputPath(file as string);
              }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-muted hover:text-foreground"
            >
              <FolderOpen className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-muted mb-1 block">Output File (read)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={outputPath}
              onChange={(e) => setOutputPath(e.target.value)}
              placeholder="Output file..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
            />
            <button
              onClick={async () => {
                const { open } = await import("@tauri-apps/plugin-dialog");
                const file = await open({ multiple: false });
                if (file) setOutputPath(file as string);
              }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-muted hover:text-foreground"
            >
              <FolderOpen className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleWriteOffset}
          disabled={!address || !length || !inputPath || operation !== null}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent/20 px-3 py-2 text-xs text-accent hover:bg-accent/30 disabled:opacity-50"
        >
          {operation === "writing" ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          Write to Offset
        </button>
        <button
          onClick={handleReadOffset}
          disabled={!address || !length || !outputPath || operation !== null}
          className="flex items-center justify-center gap-2 rounded-lg bg-success/20 px-3 py-2 text-xs text-success hover:bg-success/30 disabled:opacity-50"
        >
          {operation === "reading" ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          Read from Offset
        </button>
      </div>
    </div>
  );
}

function Download(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

function BulkOps() {
  const [inputDir, setInputDir] = useState("");
  const [outputDir, setOutputDir] = useState("");
  const [skip, setSkip] = useState("");
  const [ignoreMissing, setIgnoreMissing] = useState(false);
  const [operation, setOperation] = useState<string | null>(null);

  const skipList = skip.split(",").map((s) => s.trim()).filter(Boolean);

  async function handleWriteAll() {
    if (!inputDir) return;
    setOperation("writing_all");
    try {
      await api.writeAll(inputDir, skipList, ignoreMissing);
      setOperation(null);
      alert("Write all completed successfully!");
    } catch (e) {
      alert(`Write all failed: ${e}`);
      setOperation(null);
    }
  }

  async function handleReadAll() {
    if (!outputDir) return;
    setOperation("reading_all");
    try {
      await api.readAll(outputDir, skipList);
      setOperation(null);
      alert("Read all completed successfully!");
    } catch (e) {
      alert(`Read all failed: ${e}`);
      setOperation(null);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] font-bold uppercase text-muted mb-1 block">Skip Partitions (comma-separated)</label>
        <input
          type="text"
          value={skip}
          onChange={(e) => setSkip(e.target.value)}
          placeholder="e.g. nvram,protect"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="ignoreMissing"
          checked={ignoreMissing}
          onChange={(e) => setIgnoreMissing(e.target.checked)}
          className="rounded border-border"
        />
        <label htmlFor="ignoreMissing" className="text-xs text-muted">Ignore missing partitions</label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase text-muted mb-1 block">Input Directory (write all)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputDir}
              onChange={(e) => setInputDir(e.target.value)}
              placeholder="Directory with .bin files..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
            />
            <button
              onClick={async () => {
                const { open } = await import("@tauri-apps/plugin-dialog");
                const dir = await open({ directory: true });
                if (dir) setInputDir(dir as string);
              }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-muted hover:text-foreground"
            >
              <FolderOpen className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-muted mb-1 block">Output Directory (read all)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={outputDir}
              onChange={(e) => setOutputDir(e.target.value)}
              placeholder="Empty directory..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
            />
            <button
              onClick={async () => {
                const { open } = await import("@tauri-apps/plugin-dialog");
                const dir = await open({ directory: true });
                if (dir) setOutputDir(dir as string);
              }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-muted hover:text-foreground"
            >
              <FolderOpen className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleWriteAll}
          disabled={!inputDir || operation !== null}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent/20 px-3 py-2 text-xs text-accent hover:bg-accent/30 disabled:opacity-50"
        >
          {operation === "writing_all" ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          Write All Partitions
        </button>
        <button
          onClick={handleReadAll}
          disabled={!outputDir || operation !== null}
          className="flex items-center justify-center gap-2 rounded-lg bg-success/20 px-3 py-2 text-xs text-success hover:bg-success/30 disabled:opacity-50"
        >
          {operation === "reading_all" ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          Read All Partitions
        </button>
      </div>
    </div>
  );
}

function XFlashOps() {
  const { partitions } = useDeviceStore();
  const [selectedPartition, setSelectedPartition] = useState("");
  const [filePath, setFilePath] = useState("");
  const [operation, setOperation] = useState<string | null>(null);

  async function handleRscFlash() {
    if (!selectedPartition || !filePath) return;
    setOperation("rsc_flash");
    try {
      await api.rscFlash(selectedPartition, filePath);
      setOperation(null);
      alert("RSC flash completed!");
    } catch (e) {
      alert(`RSC flash failed: ${e}`);
      setOperation(null);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] font-bold uppercase text-muted mb-1 block">Partition</label>
        <select
          value={selectedPartition}
          onChange={(e) => setSelectedPartition(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
        >
          <option value="">Select partition...</option>
          {partitions.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name} ({p.size_human})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase text-muted mb-1 block">File to Flash</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            placeholder="File path..."
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
          />
          <button
            onClick={async () => {
              const { open } = await import("@tauri-apps/plugin-dialog");
              const file = await open({ multiple: false });
              if (file) setFilePath(file as string);
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-muted hover:text-foreground"
          >
            <FolderOpen className="h-4 w-4" />
          </button>
        </div>
      </div>

      <button
        onClick={handleRscFlash}
        disabled={!selectedPartition || !filePath || operation !== null}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-warning/20 px-3 py-2 text-xs text-warning hover:bg-warning/30 disabled:opacity-50"
      >
        {operation === "rsc_flash" ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
        RSC Flash (XFlash V5)
      </button>
    </div>
  );
}

function BootPlOps() {
  const [filePath, setFilePath] = useState("");
  const [address, setAddress] = useState("");
  const [raw, setRaw] = useState(false);
  const [operation, setOperation] = useState<string | null>(null);

  async function handleBootPl() {
    if (!filePath) return;
    setOperation("booting");
    try {
      await api.bootPreloader(
        filePath,
        address ? parseInt(address, 16) : null,
        raw
      );
      setOperation(null);
      alert("Preloader booted!");
    } catch (e) {
      alert(`Boot failed: ${e}`);
      setOperation(null);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] font-bold uppercase text-muted mb-1 block">Preloader File</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            placeholder="Preloader file path..."
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
          />
          <button
            onClick={async () => {
              const { open } = await import("@tauri-apps/plugin-dialog");
              const file = await open({ multiple: false });
              if (file) setFilePath(file as string);
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-muted hover:text-foreground"
          >
            <FolderOpen className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase text-muted mb-1 block">Jump Address (hex, optional)</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x00000000"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={raw}
              onChange={(e) => setRaw(e.target.checked)}
              className="rounded border-border"
            />
            Raw binary mode
          </label>
        </div>
      </div>

      <button
        onClick={handleBootPl}
        disabled={!filePath || operation !== null}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent/20 px-3 py-2 text-xs text-accent hover:bg-accent/30 disabled:opacity-50"
      >
        {operation === "booting" ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
        Boot Preloader (BROM only)
      </button>
    </div>
  );
}

function CrashOps() {
  const [operation, setOperation] = useState<string | null>(null);

  async function handleCrash() {
    if (!confirm("Crash device to BootROM? This will force a restart.")) return;
    setOperation("crashing");
    try {
      await api.crashDevice();
      setOperation(null);
      alert("Device crashed to BootROM!");
    } catch (e) {
      alert(`Crash failed: ${e}`);
      setOperation(null);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <AlertTriangle className="h-4 w-4 text-danger flex-shrink-0" />
      <p className="text-xs text-muted flex-1">
        Crash the device into BootROM by triggering an assertion. Only works in Preloader mode.
      </p>
      <button
        onClick={handleCrash}
        disabled={operation !== null}
        className="flex items-center gap-2 rounded-lg bg-danger/20 px-3 py-2 text-xs text-danger hover:bg-danger/30 disabled:opacity-50"
      >
        {operation === "crashing" ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
        Crash
      </button>
    </div>
  );
}

function PatchDaOps() {
  const [inputPath, setInputPath] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [operation, setOperation] = useState<string | null>(null);

  async function handlePatchDa() {
    if (!inputPath || !outputPath) return;
    setOperation("patching");
    try {
      await api.patchDa(inputPath, outputPath);
      setOperation(null);
      alert("DA patched successfully!");
    } catch (e) {
      alert(`Patch failed: ${e}`);
      setOperation(null);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] font-bold uppercase text-muted mb-1 block">Input DA File</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputPath}
            onChange={(e) => setInputPath(e.target.value)}
            placeholder="Original DA file..."
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
          />
          <button
            onClick={async () => {
              const { open } = await import("@tauri-apps/plugin-dialog");
              const file = await open({ multiple: false });
              if (file) setInputPath(file as string);
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-muted hover:text-foreground"
          >
            <FolderOpen className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase text-muted mb-1 block">Output DA File</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={outputPath}
            onChange={(e) => setOutputPath(e.target.value)}
            placeholder="Patched DA file..."
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
          />
          <button
            onClick={async () => {
              const { open } = await import("@tauri-apps/plugin-dialog");
              const file = await open({ multiple: false });
              if (file) setOutputPath(file as string);
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-muted hover:text-foreground"
          >
            <FolderOpen className="h-4 w-4" />
          </button>
        </div>
      </div>

      <button
        onClick={handlePatchDa}
        disabled={!inputPath || !outputPath || operation !== null}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent/20 px-3 py-2 text-xs text-accent hover:bg-accent/30 disabled:opacity-50"
      >
        {operation === "patching" ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Database className="h-3 w-3" />}
        Patch DA File
      </button>
    </div>
  );
}
