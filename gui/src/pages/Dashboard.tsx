import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap,
  HardDrive,
  Shield,
  ArrowRight,
  Usb,
  RefreshCw,
} from "lucide-react";
import { useDeviceStore } from "../services/store";
import * as api from "../services/api";

export function Dashboard() {
  const navigate = useNavigate();
  const { connected, daPath, partitions, deviceInfo, setConnected, setPartitions, setDeviceInfo } =
    useDeviceStore();
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (connected && daPath) {
      loadDeviceInfo();
    }
  }, [connected, daPath]);

  async function loadDeviceInfo() {
    try {
      const info = await api.getDeviceInfo();
      setDeviceInfo(info);
      const parts = await api.listPartitions();
      setPartitions(parts);
    } catch (e) {
      console.error("Failed to load device info:", e);
    }
  }

  async function handleConnect() {
    if (!daPath) {
      navigate("/settings");
      return;
    }
    setConnecting(true);
    try {
      await api.connectDevice(daPath);
      setConnected(true);
    } catch (e) {
      console.error("Connection failed:", e);
      alert(`Connection failed: ${e}`);
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground font-mono">
          Penumbra GUI
        </h1>
        <p className="text-sm text-muted mt-1">
          {connected
            ? `Device connected — ${partitions.length} partitions detected`
            : "Connect a device to get started"}
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatusCard
          icon={<Zap className="h-4 w-4 text-accent" />}
          label="DA Loader"
          value={daPath ? daPath.split(/[/\\]/).pop() || "Selected" : "Not set"}
          bg="bg-accent/10"
        />
        <StatusCard
          icon={<HardDrive className="h-4 w-4 text-success" />}
          label="Partitions"
          value={connected ? `${partitions.length} detected` : "No device"}
          bg="bg-success/10"
        />
        <StatusCard
          icon={<Shield className="h-4 w-4 text-warning" />}
          label="Chip"
          value={deviceInfo?.chip_name || "Unknown"}
          bg="bg-warning/10"
        />
      </div>

      {/* Connect Button */}
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {connecting ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Usb className="h-4 w-4" />
        )}
        {connecting ? "Connecting..." : connected ? "Reconnect" : "Connect Device"}
      </button>

      {/* Quick Actions */}
      {connected && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <ActionButton
              icon={<Zap className="h-4 w-4 text-accent" />}
              label="Force Fastboot"
              description="Reboot to fastboot mode"
              onClick={async () => {
                try {
                  await api.forceFastboot();
                  alert("Device rebooting to fastboot");
                } catch (e) {
                  alert(`Error: ${e}`);
                }
              }}
            />
            <ActionButton
              icon={<HardDrive className="h-4 w-4 text-success" />}
              label="Partition Manager"
              description="View and manage partitions"
              onClick={() => navigate("/tools")}
            />
            <ActionButton
              icon={<ArrowRight className="h-4 w-4 text-warning" />}
              label="Flasher"
              description="Flash firmware files"
              onClick={() => navigate("/flasher")}
            />
            <ActionButton
              icon={<Shield className="h-4 w-4 text-danger" />}
              label="Shutdown"
              description="Power off the device"
              onClick={async () => {
                try {
                  await api.shutdownDevice();
                  setConnected(false);
                } catch (e) {
                  alert(`Error: ${e}`);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatusCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <div className={`flex size-9 items-center justify-center rounded-lg ${bg}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
            {label}
          </p>
          <p className="truncate font-mono text-xs text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-all hover:border-accent hover:bg-card-hover"
    >
      {icon}
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-[11px] text-muted">{description}</p>
      </div>
    </button>
  );
}
