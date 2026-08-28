import { useState } from "react";
import { CheckSquare, Square, FolderOpen } from "lucide-react";
import type { ScatterPartition } from "../../types";

interface FlashPartitionTableProps {
  partitions: ScatterPartition[];
  selectedPartitions: Set<string>;
  partitionImages: Map<string, string>;
  onTogglePartition: (partitionName: string) => void;
  onSelectImage: (partitionName: string) => void;
}

function formatHexSize(hex: string): string {
  const num = parseInt(hex, 16);
  if (isNaN(num)) return hex;
  const KB = 1024;
  const MB = 1024 * KB;
  const GB = 1024 * MB;
  if (num >= GB) return `${(num / GB).toFixed(1)} GB`;
  if (num >= MB) return `${(num / MB).toFixed(1)} MB`;
  if (num >= KB) return `${(num / KB).toFixed(1)} KB`;
  return `${num} B`;
}

export function FlashPartitionTable({
  partitions,
  selectedPartitions,
  partitionImages,
  onTogglePartition,
  onSelectImage,
}: FlashPartitionTableProps) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="sticky top-0 z-10 grid grid-cols-[auto_2fr_1fr_1.5fr_2fr] items-center gap-3 border-b border-border bg-card px-3 py-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Select</div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Partition</div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Size</div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Type</div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Image File</div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {partitions.map((partition, index) => {
          const isSelected = selectedPartitions.has(partition.partition_name);
          const imageFile = partitionImages.get(partition.partition_name);

          return (
            <div
              key={partition.partition_name}
              className={`grid grid-cols-[auto_2fr_1fr_1.5fr_2fr] items-center gap-3 border-b border-border px-3 py-1.5 transition-colors ${
                hoveredRow === index
                  ? "bg-accent/5"
                  : isSelected
                    ? "bg-accent/10"
                    : index % 2 === 1
                      ? "bg-card/50"
                      : ""
              }`}
              onMouseEnter={() => setHoveredRow(index)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <div className="flex items-center">
                <button
                  onClick={() => onTogglePartition(partition.partition_name)}
                  className="text-muted transition-colors hover:text-accent"
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-accent" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="flex min-w-0 items-center">
                <div className="flex min-w-0 flex-col">
                  <span
                    className="truncate font-mono text-xs text-foreground"
                    title={partition.partition_name}
                  >
                    {partition.partition_name}
                  </span>
                  {partition.file_name && (
                    <span
                      className="truncate font-mono text-[10px] text-muted"
                      title={partition.file_name}
                    >
                      {partition.file_name}
                    </span>
                  )}
                </div>
              </div>

              <div
                className="truncate font-mono text-xs text-foreground"
                title={partition.partition_size}
              >
                {formatHexSize(partition.partition_size)}
              </div>

              <div
                className="truncate font-mono text-[10px] text-muted"
                title={partition.operation_type}
              >
                {partition.operation_type}
              </div>

              <div className="flex min-w-0 items-center">
                {imageFile ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                      className="truncate font-mono text-[10px] text-success"
                      title={imageFile}
                    >
                      {imageFile.split(/[/\\]/).pop()}
                    </span>
                    <button
                      onClick={() => onSelectImage(partition.partition_name)}
                      className="flex-shrink-0 p-1 text-muted transition-colors hover:text-accent"
                      title="Change image file"
                    >
                      <FolderOpen className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onSelectImage(partition.partition_name)}
                    className="flex items-center gap-1 rounded border border-border bg-card-hover px-2 py-0.5 text-[10px] text-muted transition-colors hover:border-accent hover:text-foreground"
                  >
                    <FolderOpen className="h-3 w-3" />
                    Select
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
