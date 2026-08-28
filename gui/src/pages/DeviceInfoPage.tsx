import { useState } from "react";
import {
  HardDrive,
  Key,
  Info,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";
import { useDeviceStore } from "../services/store";
import * as api from "../services/api";
import type { StorageInfo, KeysInfo, PartitionDetail } from "../types";

export function DeviceInfoPage() {
  const { connected } = useDeviceStore();
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [keysInfo, setKeysInfo] = useState<KeysInfo | null>(null);
  const [partitions, setPartitions] = useState<PartitionDetail[]>([]);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>("partitions");
  const [copied, setCopied] = useState<string | null>(null);

  async function loadSection(section: string) {
    setLoading(section);
    try {
      switch (section) {
        case "storage":
          setStorageInfo(await api.getStorageInfo());
          break;
        case "keys":
          setKeysInfo(await api.getKeys());
          break;
        case "partitions":
          setPartitions(await api.getPartitionTable());
          break;
        case "slot":
          setActiveSlot(await api.getActiveSlot());
          break;
      }
    } catch (e) {
      alert(`Failed to load ${section}: ${e}`);
    } finally {
      setLoading(null);
    }
  }

  function toggleSection(section: string) {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
      if (
        (section === "storage" && !storageInfo) ||
        (section === "keys" && !keysInfo) ||
        (section === "partitions" && partitions.length === 0) ||
        (section === "slot" && activeSlot === null)
      ) {
        loadSection(section);
      }
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  async function handleSetSlot(slot: string) {
    if (!confirm(`Set active boot slot to ${slot}?`)) return;
    try {
      await api.setActiveSlot(slot);
      setActiveSlot(slot);
    } catch (e) {
      alert(`Failed to set slot: ${e}`);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground font-mono">Device Info</h1>
        <p className="text-sm text-muted mt-1">Detailed device information and keys</p>
      </div>

      {!connected ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <HardDrive className="h-8 w-8 text-muted mx-auto mb-3" />
          <p className="text-sm text-muted">Connect a device first from Dashboard</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Partition Table */}
          <CollapsibleSection
            title="Partition Table (GPT)"
            icon={<HardDrive className="h-4 w-4 text-accent" />}
            expanded={expandedSection === "partitions"}
            onToggle={() => toggleSection("partitions")}
            loading={loading === "partitions"}
          >
            {partitions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted border-b border-border">
                      <th className="text-left py-2 pr-4">Name</th>
                      <th className="text-left py-2 pr-4">Address</th>
                      <th className="text-left py-2 pr-4">Size</th>
                      <th className="text-left py-2">Section</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partitions.map((p) => (
                      <tr key={p.name} className="border-b border-border/50">
                        <td className="py-1.5 pr-4 font-mono text-foreground">{p.name}</td>
                        <td className="py-1.5 pr-4 font-mono text-muted">{p.address}</td>
                        <td className="py-1.5 pr-4 text-foreground">{p.size_human}</td>
                        <td className="py-1.5 text-muted">{p.section}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted">Click to load partition table</p>
            )}
          </CollapsibleSection>

          {/* Storage Info */}
          <CollapsibleSection
            title="Storage Information"
            icon={<Info className="h-4 w-4 text-success" />}
            expanded={expandedSection === "storage"}
            onToggle={() => toggleSection("storage")}
            loading={loading === "storage"}
          >
            {storageInfo ? (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <InfoRow label="Storage Type" value={storageInfo.storage_type} />
                <InfoRow label="Total Size" value={`${storageInfo.total_size_human} (0x${storageInfo.total_size.toString(16)})`} />
                <InfoRow label="Block Size" value={`${storageInfo.block_size_human} (0x${storageInfo.block_size.toString(16)})`} />
                <InfoRow label="Boot 1 Size" value={storageInfo.boot1_size_human} />
                <InfoRow label="Boot 2 Size" value={storageInfo.boot2_size_human} />
                <InfoRow label="User Area" value={storageInfo.user_size_human} />
                <InfoRow label="RPMB Size" value={storageInfo.rpmb_size_human} />
                <InfoRow label="Partitions" value={String(storageInfo.partition_count)} />
              </div>
            ) : (
              <p className="text-xs text-muted">Click to load storage info</p>
            )}
          </CollapsibleSection>

          {/* Device Keys */}
          <CollapsibleSection
            title="Device Keys"
            icon={<Key className="h-4 w-4 text-warning" />}
            expanded={expandedSection === "keys"}
            onToggle={() => toggleSection("keys")}
            loading={loading === "keys"}
          >
            {keysInfo ? (
              <div className="space-y-2 text-xs">
                <KeyRow label="SEC Fuse" value={keysInfo.sec_fuse} id="secfuse" onCopy={copyToClipboard} copied={copied} />
                <KeyRow label="HRID" value={keysInfo.hrid} id="hrid" onCopy={copyToClipboard} copied={copied} />
                <KeyRow label="Public Key" value={keysInfo.public_key} id="pubk" onCopy={copyToClipboard} copied={copied} />
                <KeyRow label="RPMB Key" value={keysInfo.rpmb_key} id="rpmb" onCopy={copyToClipboard} copied={copied} />
                <KeyRow label="FDE Key" value={keysInfo.fde_key} id="fde" onCopy={copyToClipboard} copied={copied} />
                <KeyRow label="TEE Key" value={keysInfo.tee_key} id="tee" onCopy={copyToClipboard} copied={copied} />
                <KeyRow label="ROT Key" value={keysInfo.rot_key} id="rot" onCopy={copyToClipboard} copied={copied} />
              </div>
            ) : (
              <p className="text-xs text-muted">Click to load device keys (requires DA Extensions)</p>
            )}
          </CollapsibleSection>

          {/* Boot Slot */}
          <CollapsibleSection
            title="Boot Slot (A/B)"
            icon={<HardDrive className="h-4 w-4 text-danger" />}
            expanded={expandedSection === "slot"}
            onToggle={() => toggleSection("slot")}
            loading={loading === "slot"}
          >
            {activeSlot !== null ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">Active Slot:</span>
                  <span className="font-mono text-sm font-bold text-accent">{activeSlot}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSetSlot("A")}
                    disabled={activeSlot === "A"}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground hover:border-accent disabled:opacity-50"
                  >
                    Set Slot A
                  </button>
                  <button
                    onClick={() => handleSetSlot("B")}
                    disabled={activeSlot === "B"}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground hover:border-accent disabled:opacity-50"
                  >
                    Set Slot B
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted">Click to load boot slot info</p>
            )}
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({
  title,
  icon,
  expanded,
  onToggle,
  loading,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-card-hover"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {loading && <span className="text-xs text-muted ml-2">Loading...</span>}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted" />
        )}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted">{label}:</span>
      <span className="ml-2 text-foreground font-mono">{value}</span>
    </div>
  );
}

function KeyRow({
  label,
  value,
  id,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  id: string;
  onCopy: (text: string, id: string) => void;
  copied: string | null;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted whitespace-nowrap min-w-[80px]">{label}:</span>
      <span className="font-mono text-foreground break-all flex-1">{value}</span>
      <button
        onClick={() => onCopy(value, id)}
        className="text-muted hover:text-foreground flex-shrink-0"
      >
        {copied === id ? (
          <Check className="h-3 w-3 text-success" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}
