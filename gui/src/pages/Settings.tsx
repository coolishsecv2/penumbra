import { useState, useEffect } from "react";
import { FolderOpen, Save, Info } from "lucide-react";
import { useDeviceStore } from "../services/store";
import * as api from "../services/api";

export function Settings() {
  const { daPath, preloaderPath, setDaPath, setPreloaderPath } = useDeviceStore();
  const [saved, setSaved] = useState(false);
  const [logo, setLogo] = useState("");

  useEffect(() => {
    api.getLogo().then(setLogo).catch(() => {});
  }, []);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function selectFile(setter: (path: string | null) => void) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const file = await open({ multiple: false });
    if (file) setter(file as string);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground font-mono">Settings</h1>
        <p className="text-sm text-muted mt-1">Configure Penumbra</p>
      </div>

      {/* Logo */}
      {logo && (
        <div className="rounded-lg border border-border bg-card p-4">
          <pre className="text-[9px] leading-tight text-accent font-mono overflow-x-auto whitespace-pre">
            {logo}
          </pre>
        </div>
      )}

      {/* File Paths */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
          File Paths
        </h2>

        <div>
          <label className="text-xs font-bold text-muted mb-1 block">DA File</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={daPath || ""}
              onChange={(e) => setDaPath(e.target.value || null)}
              placeholder="Path to DA file..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            />
            <button
              onClick={() => selectFile(setDaPath)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted hover:text-foreground"
            >
              <FolderOpen className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-muted mb-1 block">
            Preloader File (Optional)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={preloaderPath || ""}
              onChange={(e) => setPreloaderPath(e.target.value || null)}
              placeholder="Path to preloader file..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            />
            <button
              onClick={() => selectFile(setPreloaderPath)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted hover:text-foreground"
            >
              <FolderOpen className="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent-hover"
        >
          <Save className="h-4 w-4" />
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>

      {/* About */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
          About
        </h2>
        <p className="text-sm text-foreground">Penumbra GUI v1.2.0</p>
        <p className="text-xs text-muted mt-1">
          A modern GUI for MediaTek device management
        </p>
        <p className="text-xs text-muted">
          Based on{" "}
          <a
            href="https://github.com/shomykohai/penumbra"
            className="text-accent hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            shomykohai/penumbra
          </a>
        </p>
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-accent/10 border border-accent/20 px-3 py-2">
          <Info className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-accent">
            AGPL-3.0-or-later. All modifications must remain open source.
            Based on the Penumbra project by Shomy.
          </p>
        </div>
      </div>
    </div>
  );
}
