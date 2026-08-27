export interface Partition {
  name: string;
  address: string;
  size: number;
  size_human: string;
}

export interface DeviceInfo {
  hw_code: number;
  hw_subcode: number;
  chip_name: string;
  partitions: number;
  connected: boolean;
}

export interface DeviceState {
  connected: boolean;
  daPath: string | null;
  preloaderPath: string | null;
  partitions: Partition[];
  deviceInfo: DeviceInfo | null;
  setConnected: (connected: boolean) => void;
  setDaPath: (path: string | null) => void;
  setPreloaderPath: (path: string | null) => void;
  setPartitions: (partitions: Partition[]) => void;
  setDeviceInfo: (info: DeviceInfo | null) => void;
}
