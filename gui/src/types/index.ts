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
