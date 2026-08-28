import { useEffect, useState } from "react";
import { FileText, FolderOpen, Loader2 } from "lucide-react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import type { UnlistenFn } from "@tauri-apps/api/event";

interface ScatterDropzoneProps {
  onLoadPath: (path: string) => Promise<void>;
  onSelectFile: () => void;
  isLoading: boolean;
}

export function ScatterDropzone({
  onLoadPath,
  onSelectFile,
  isLoading,
}: ScatterDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    const setup = async () => {
      unlisten = await getCurrentWebview().onDragDropEvent((event) => {
        if (event.payload.type !== "drop") return;
        const paths = event.payload.paths;
        if (!paths || paths.length === 0) return;

        const dropPath = paths[0];
        if (
          dropPath.toLowerCase().endsWith(".txt") ||
          dropPath.toLowerCase().endsWith(".xml") ||
          dropPath.toLowerCase().endsWith(".scatter")
        ) {
          void onLoadPath(dropPath);
        }
      });
    };

    setup();
    return () => {
      if (unlisten) unlisten();
    };
  }, [onLoadPath]);

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
      }}
      className={`flex h-40 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed transition-all duration-300 ${
        isDragOver
          ? "border-accent bg-accent/5"
          : "border-border hover:border-accent/50 hover:bg-card-hover"
      }`}
    >
      {isLoading ? (
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      ) : (
        <FileText className="h-8 w-8 text-muted" />
      )}
      <p className="px-6 text-center text-sm text-muted">
        {isLoading
          ? "Loading scatter file..."
          : "Drag & drop scatter file here"}
      </p>
      {!isLoading && (
        <button
          onClick={onSelectFile}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-foreground"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Select File
        </button>
      )}
    </div>
  );
}
