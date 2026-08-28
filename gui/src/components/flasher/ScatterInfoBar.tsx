import { X } from "lucide-react";
import type { ScatterFile } from "../../types";

interface ScatterInfoBarProps {
  scatterFile: ScatterFile;
  onSelectAll: () => void;
  onClearAll: () => void;
  onClearScatter: () => void;
}

export function ScatterInfoBar({
  scatterFile,
  onSelectAll,
  onClearAll,
  onClearScatter,
}: ScatterInfoBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div>
          <span className="text-muted">Platform:</span>{" "}
          <span className="font-mono text-foreground">{scatterFile.platform || "Unknown"}</span>
        </div>
        <div>
          <span className="text-muted">Storage:</span>{" "}
          <span className="font-mono text-foreground">{scatterFile.storage_type}</span>
        </div>
        <div>
          <span className="text-muted">Partitions:</span>{" "}
          <span className="font-mono text-foreground">{scatterFile.partitions.length}</span>
        </div>
        <div>
          <span className="text-muted">File:</span>{" "}
          <span className="font-mono text-[10px] text-foreground">
            {scatterFile.file_path.split(/[/\\]/).pop()}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onSelectAll}
          className="rounded px-2 py-1 text-xs text-muted transition-colors hover:bg-accent/10 hover:text-accent"
        >
          Select All
        </button>
        <button
          onClick={onClearAll}
          className="rounded px-2 py-1 text-xs text-muted transition-colors hover:bg-accent/10 hover:text-accent"
        >
          Deselect All
        </button>
        <button
          onClick={onClearScatter}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-danger transition-colors hover:bg-danger/10"
        >
          <X className="h-3 w-3" />
          Clear
        </button>
      </div>
    </div>
  );
}
