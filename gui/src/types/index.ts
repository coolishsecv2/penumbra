export interface Partition {
  name: string;
  address: string;
  size: number;
  size_human: string;
  section: string;
}

export interface PartitionDetail {
  name: string;
  address: string;
  size: number;
  size_human: string;
  section: string;
}

export interface DeviceInfo {
  hw_code: number;
  hw_subcode: number;
  chip_name: string;
  partitions: number;
  connected: boolean;
}

export interface StorageInfo {
  storage_type: string;
  total_size: number;
  block_size: number;
  boot1_size: number;
  boot2_size: number;
  user_size: number;
  rpmb_size: number;
  partition_count: number;
  total_size_human: string;
  block_size_human: string;
  boot1_size_human: string;
  boot2_size_human: string;
  user_size_human: string;
  rpmb_size_human: string;
}

export interface KeysInfo {
  sec_fuse: string;
  hrid: string;
  public_key: string;
  rpmb_key: string;
  fde_key: string;
  tee_key: string;
  rot_key: string;
}

export type ErrorCategory =
  | "network"
  | "permission"
  | "filesystem"
  | "validation"
  | "command"
  | "unknown";

export interface AppError {
  type: string;
  message: string;
  category: ErrorCategory;
  suggestion?: string;
  code?: number;
  output?: string;
}

export interface SerializedError {
  type?: string;
  message?: string;
  category?: string;
  suggestion?: string;
  code?: number;
  output?: string;
}

export interface DeviceState {
  connected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  daPath: string | null;
  preloaderPath: string | null;
  partitions: Partition[];
  deviceInfo: DeviceInfo | null;
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setDaPath: (path: string | null) => void;
  setPreloaderPath: (path: string | null) => void;
  setPartitions: (partitions: Partition[]) => void;
  setDeviceInfo: (info: DeviceInfo | null) => void;
  disconnect: () => void;
}
