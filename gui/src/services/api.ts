import { invoke } from "@tauri-apps/api/core";
import type { Partition, DeviceInfo } from "../types";

export async function connectDevice(
  daPath: string,
  preloaderPath?: string
): Promise<void> {
  await invoke("connect_device", { daPath, preloaderPath });
}

export async function disconnectDevice(): Promise<void> {
  await invoke("disconnect_device");
}

export async function listPartitions(): Promise<Partition[]> {
  return await invoke("list_partitions");
}

export async function flashPartition(
  partition: string,
  imagePath: string
): Promise<void> {
  await invoke("flash_partition", { partition, imagePath });
}

export async function readPartition(
  partition: string,
  outputPath: string
): Promise<void> {
  await invoke("read_partition", { partition, outputPath });
}

export async function erasePartition(partition: string): Promise<void> {
  await invoke("erase_partition", { partition });
}

export async function formatPartition(partition: string): Promise<void> {
  await invoke("format_partition", { partition });
}

export async function rebootDevice(mode: string): Promise<void> {
  await invoke("reboot_device", { mode });
}

export async function shutdownDevice(): Promise<void> {
  await invoke("shutdown_device");
}

export async function forceFastboot(): Promise<void> {
  await invoke("force_fastboot");
}

export async function flashScatter(scatterPath: string): Promise<void> {
  await invoke("flash_scatter", { scatterPath });
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
  return await invoke("get_device_info");
}
