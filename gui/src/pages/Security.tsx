import { useState } from "react";
import {
  Shield,
  Lock,
  Unlock,
  AlertTriangle,
  RefreshCw,
  FolderOpen,
  Key,
} from "lucide-react";
import { useDeviceStore } from "../services/store";
import * as api from "../services/api";

export function Security() {
  const { connected } = useDeviceStore();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground font-mono">Security</h1>
        <p className="text-sm text-muted mt-1">Seccfg, eFuse, and RPMB operations</p>
      </div>

      {!connected ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Shield className="h-8 w-8 text-muted mx-auto mb-3" />
          <p className="text-sm text-muted">Connect a device first from Dashboard</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Seccfg */}
          <Section title="Security Config (seccfg)">
            <SeccfgOps />
          </Section>

          {/* eFuse */}
          <Section title="eFuse Operations">
            <EfuseOps />
          </Section>

          {/* RPMB */}
          <Section title="RPMB (Replay Protected Memory Block)">
            <RpmbOps />
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

function SeccfgOps() {
  const [operation, setOperation] = useState<string | null>(null);

  async function handleLock() {
    if (!confirm("Lock seccfg? This may restrict device access.")) return;
    setOperation("locking");
    try {
      await api.seccfgLock();
      setOperation(null);
      alert("Seccfg locked!");
    } catch (e) {
      alert(`Lock failed: ${e}`);
      setOperation(null);
    }
  }

  async function handleUnlock() {
    if (!confirm("Unlock seccfg? This requires DA Extensions.")) return;
    setOperation("unlocking");
    try {
      await api.seccfgUnlock();
      setOperation(null);
      alert("Seccfg unlocked!");
    } catch (e) {
      alert(`Unlock failed: ${e}`);
      setOperation(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Lock or unlock the seccfg partition. Requires DA Extensions (device must be vulnerable or unfused).
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleUnlock}
          disabled={operation !== null}
          className="flex items-center justify-center gap-2 rounded-lg bg-success/20 px-3 py-2.5 text-xs text-success hover:bg-success/30 disabled:opacity-50"
        >
          {operation === "unlocking" ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <Unlock className="h-3 w-3" />
          )}
          Unlock Seccfg
        </button>
        <button
          onClick={handleLock}
          disabled={operation !== null}
          className="flex items-center justify-center gap-2 rounded-lg bg-danger/20 px-3 py-2.5 text-xs text-danger hover:bg-danger/30 disabled:opacity-50"
        >
          {operation === "locking" ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <Lock className="h-3 w-3" />
          )}
          Lock Seccfg
        </button>
      </div>
    </div>
  );
}

function EfuseOps() {
  const [inputPath, setInputPath] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [operation, setOperation] = useState<string | null>(null);

  async function handleRead() {
    if (!outputPath) return;
    setOperation("reading");
    try {
      await api.efuseRead(outputPath);
      setOperation(null);
      alert("eFuse read completed!");
    } catch (e) {
      alert(`eFuse read failed: ${e}`);
      setOperation(null);
    }
  }

  async function handleWrite() {
    if (!inputPath) return;
    if (
      !confirm(
        "WARNING: Writing eFuses is IRREVERSIBLE and DESTRUCTIVE.\n\n" +
          "You may permanently damage or brick your device.\n\n" +
          "Are you absolutely sure you want to proceed?"
      )
    )
      return;
    if (
      !confirm(
        "FINAL WARNING: No support will be provided for any issues arising from writing eFuses.\n\n" +
          "Click OK to proceed at your own risk."
      )
    )
      return;
    setOperation("writing");
    try {
      await api.efuseWrite(inputPath);
      setOperation(null);
      alert("eFuse write completed!");
    } catch (e) {
      alert(`eFuse write failed: ${e}`);
      setOperation(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/20 px-3 py-2">
        <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
        <p className="text-xs text-warning">
          eFuse operations are irreversible. Writing incorrect data may permanently brick your device.
        </p>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase text-muted mb-1 block">eFuse Data File</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputPath}
            onChange={(e) => setInputPath(e.target.value)}
            placeholder="Path to eFuse binary file..."
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
        <label className="text-[10px] font-bold uppercase text-muted mb-1 block">Output File (read eFuse)</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={outputPath}
            onChange={(e) => setOutputPath(e.target.value)}
            placeholder="Output path for eFuse data..."
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

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleRead}
          disabled={!outputPath || operation !== null}
          className="flex items-center justify-center gap-2 rounded-lg bg-success/20 px-3 py-2 text-xs text-success hover:bg-success/30 disabled:opacity-50"
        >
          {operation === "reading" ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
          Read eFuse
        </button>
        <button
          onClick={handleWrite}
          disabled={!inputPath || operation !== null}
          className="flex items-center justify-center gap-2 rounded-lg bg-danger/20 px-3 py-2 text-xs text-danger hover:bg-danger/30 disabled:opacity-50"
        >
          {operation === "writing" ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
          Write eFuse
        </button>
      </div>
    </div>
  );
}

function RpmbOps() {
  const [region, setRegion] = useState(0);
  const [startSector, setStartSector] = useState(0);
  const [numSectors, setNumSectors] = useState("");
  const [filePath, setFilePath] = useState("");
  const [authKey, setAuthKey] = useState("");
  const [operation, setOperation] = useState<string | null>(null);

  const numSectorsVal = numSectors ? parseInt(numSectors) : null;

  async function handleRead() {
    if (!filePath) return;
    setOperation("reading");
    try {
      await api.rpmbRead(region, startSector, numSectorsVal, filePath);
      setOperation(null);
      alert("RPMB read completed!");
    } catch (e) {
      alert(`RPMB read failed: ${e}`);
      setOperation(null);
    }
  }

  async function handleWrite() {
    if (!filePath) return;
    setOperation("writing");
    try {
      await api.rpmbWrite(region, startSector, numSectorsVal, filePath);
      setOperation(null);
      alert("RPMB write completed!");
    } catch (e) {
      alert(`RPMB write failed: ${e}`);
      setOperation(null);
    }
  }

  async function handleErase() {
    if (!confirm("Erase RPMB sectors? This cannot be undone.")) return;
    setOperation("erasing");
    try {
      await api.rpmbErase(region, startSector, numSectorsVal);
      setOperation(null);
      alert("RPMB erase completed!");
    } catch (e) {
      alert(`RPMB erase failed: ${e}`);
      setOperation(null);
    }
  }

  async function handleAuth() {
    if (!authKey) return;
    setOperation("authing");
    try {
      await api.rpmbAuth(region, authKey);
      setOperation(null);
      alert("RPMB authentication successful!");
    } catch (e) {
      alert(`RPMB auth failed: ${e}`);
      setOperation(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/20 px-3 py-2">
        <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
        <p className="text-xs text-warning">
          RPMB operations require DA Extensions. Ensure your device supports this before proceeding.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase text-muted mb-1 block">Region</label>
          <select
            value={region}
            onChange={(e) => setRegion(parseInt(e.target.value))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
          >
            <option value={0}>Region 0</option>
            <option value={1}>Region 1</option>
            <option value={2}>Region 2</option>
            <option value={3}>Region 3</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-muted mb-1 block">Start Sector</label>
          <input
            type="number"
            value={startSector}
            onChange={(e) => setStartSector(parseInt(e.target.value) || 0)}
            min={0}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-muted mb-1 block">Num Sectors</label>
          <input
            type="number"
            value={numSectors}
            onChange={(e) => setNumSectors(e.target.value)}
            placeholder="All"
            min={1}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
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
            placeholder="File for read/write..."
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

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleRead}
          disabled={!filePath || operation !== null}
          className="flex items-center justify-center gap-2 rounded-lg bg-success/20 px-3 py-2 text-xs text-success hover:bg-success/30 disabled:opacity-50"
        >
          {operation === "reading" ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
          Read
        </button>
        <button
          onClick={handleWrite}
          disabled={!filePath || operation !== null}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent/20 px-3 py-2 text-xs text-accent hover:bg-accent/30 disabled:opacity-50"
        >
          {operation === "writing" ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
          Write
        </button>
        <button
          onClick={handleErase}
          disabled={operation !== null}
          className="flex items-center justify-center gap-2 rounded-lg bg-danger/20 px-3 py-2 text-xs text-danger hover:bg-danger/30 disabled:opacity-50"
        >
          {operation === "erasing" ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
          Erase
        </button>
      </div>

      {/* Auth Section */}
      <div className="border-t border-border pt-3 mt-3">
        <p className="text-[10px] font-bold uppercase text-muted mb-2">RPMB Authentication</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={authKey}
            onChange={(e) => setAuthKey(e.target.value)}
            placeholder="Hex-encoded authentication key..."
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-accent focus:outline-none"
          />
          <button
            onClick={handleAuth}
            disabled={!authKey || operation !== null}
            className="flex items-center gap-2 rounded-lg bg-warning/20 px-3 py-2 text-xs text-warning hover:bg-warning/30 disabled:opacity-50"
          >
            {operation === "authing" ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Key className="h-3 w-3" />}
            Auth
          </button>
        </div>
      </div>
    </div>
  );
}
