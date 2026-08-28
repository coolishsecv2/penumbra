import { useState, useMemo, memo } from "react";
import {
  Download,
  Upload,
  Search,
  Trash2,
  FileDown,
} from "lucide-react";
import type { Partition } from "../types";

interface PartitionTableProps {
  partitions: Partition[];
  selectedPartitions: Set<string>;
  onToggleSelected: (partitionName: string) => void;
  onSelectAll: (checked: boolean) => void;
  onRead: (partition: Partition) => void;
  onWrite: (partition: Partition) => void;
  onFormat: (partition: Partition) => void;
  onErase: (partition: Partition) => void;
}

interface Flag {
  label: string;
  className: string;
}

function getPartitionFlags(name: string): Flag[] {
  const flags: Flag[] = [];
  const baseName = name.replace(/_(a|b)$/i, "");

  if (name.endsWith("_a")) {
    flags.push({ label: "A", className: "bg-accent text-white" });
  } else if (name.endsWith("_b")) {
    flags.push({ label: "B", className: "bg-accent/30 text-accent" });
  }

  if (
    ["system", "vendor", "product", "system_ext", "odm"].includes(baseName)
  ) {
    flags.push({ label: "ext4", className: "bg-success/20 text-success" });
  } else if (baseName === "userdata") {
    flags.push({ label: "f2fs", className: "bg-success/20 text-success" });
  } else if (
    [
      "boot",
      "init_boot",
      "vendor_boot",
      "recovery",
      "vbmeta",
      "logo",
      "dtbo",
    ].includes(baseName)
  ) {
    flags.push({ label: "img", className: "bg-accent/20 text-accent" });
  } else if (
    ["seccfg", "otp", "proinfo", "nvcfg", "nvram", "protect1", "protect2"].includes(baseName)
  ) {
    flags.push({ label: "Protected", className: "bg-danger/20 text-danger" });
  }

  return flags;
}

export const PartitionTable = memo<PartitionTableProps>(
  ({
    partitions,
    selectedPartitions,
    onToggleSelected,
    onSelectAll,
    onRead,
    onWrite,
    onFormat,
    onErase,
  }) => {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredPartitions = useMemo(
      () =>
        partitions.filter((p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase())
        ),
      [partitions, searchTerm]
    );

    const allSelected =
      filteredPartitions.length > 0 &&
      filteredPartitions.every((p) => selectedPartitions.has(p.name));

    return (
      <div className="flex h-full flex-col gap-3">
        {/* Search */}
        <div className="relative flex-shrink-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search partitions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </div>

        {/* Table */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
          {/* Header */}
          <div className="sticky top-0 z-10 grid grid-cols-[auto_2fr_1.5fr_1.5fr_1fr_auto] items-center gap-3 border-b border-border bg-card px-3 py-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => onSelectAll(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-accent"
              title="Select all"
            />
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Name
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Start
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Size
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Type
            </div>
            <div className="w-28 text-center text-[10px] font-bold uppercase tracking-wider text-muted">
              Actions
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {filteredPartitions.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted">
                {searchTerm
                  ? "No partitions matching search"
                  : "No partitions available"}
              </div>
            ) : (
              filteredPartitions.map((partition, index) => (
                <div
                  key={partition.name}
                  className={`grid grid-cols-[auto_2fr_1.5fr_1.5fr_1fr_auto] items-center gap-3 border-b border-border px-3 py-1.5 transition-colors hover:bg-accent/5 ${
                    index % 2 === 1 ? "bg-card/50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPartitions.has(partition.name)}
                    onChange={() => onToggleSelected(partition.name)}
                    className="h-4 w-4 cursor-pointer accent-accent"
                  />

                  <div className="flex items-center">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(partition.name);
                      }}
                      className="truncate text-left font-mono text-xs text-foreground hover:text-accent"
                      title={`${partition.name} (click to copy)`}
                    >
                      {partition.name}
                    </button>
                  </div>

                  <div
                    className="truncate font-mono text-xs text-muted"
                    title={partition.address}
                  >
                    {partition.address}
                  </div>

                  <div
                    className="truncate font-mono text-xs text-muted"
                    title={partition.size_human}
                  >
                    {partition.size_human}
                  </div>

                  <div className="flex items-center gap-1">
                    {getPartitionFlags(partition.name).map((flag) => (
                      <span
                        key={flag.label}
                        className={`rounded px-1.5 py-px text-[9px] font-bold uppercase ${flag.className}`}
                      >
                        {flag.label}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-0.5">
                    <button
                      onClick={() => onRead(partition)}
                      title="Read (Dump)"
                      className="rounded p-1.5 text-muted transition-colors hover:bg-success/10 hover:text-success"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onWrite(partition)}
                      title="Write (Flash)"
                      className="rounded p-1.5 text-muted transition-colors hover:bg-accent/10 hover:text-accent"
                    >
                      <Upload className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onFormat(partition)}
                      title="Format"
                      className="rounded p-1.5 text-muted transition-colors hover:bg-warning/10 hover:text-warning"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onErase(partition)}
                      title="Erase"
                      className="rounded p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 text-[10px] text-muted">
          Showing {filteredPartitions.length} of {partitions.length} partitions
        </div>
      </div>
    );
  }
);

PartitionTable.displayName = "PartitionTable";
