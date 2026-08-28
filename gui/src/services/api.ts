import { invoke } from "@tauri-apps/api/core";
import type {
  Partition,
  PartitionDetail,
  DeviceInfo,
  StorageInfo,
  KeysInfo,
  ScatterFile,
  ScatterPartition,
} from "../types";

// === Connection ===

export async function cancelOperation(): Promise<void> {
  await invoke("cancel_operation");
}

export async function connectDevice(
  daPath: string,
  preloaderPath?: string
): Promise<void> {
  await invoke("connect_device", { daPath, preloaderPath });
}

export async function disconnectDevice(): Promise<void> {
  await invoke("disconnect_device");
}

// === Partitions ===

export async function listPartitions(): Promise<Partition[]> {
  return await invoke("list_partitions");
}

export async function getPartitionTable(): Promise<PartitionDetail[]> {
  return await invoke("get_partition_table");
}

// === Flash Operations ===

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

export async function flashScatter(scatterPath: string): Promise<void> {
  await invoke("flash_scatter", { scatterPath });
}

export async function writeOffset(
  address: number,
  length: number,
  inputPath: string
): Promise<void> {
  await invoke("write_offset", { address, length, inputPath });
}

export async function readOffset(
  address: number,
  length: number,
  outputPath: string
): Promise<void> {
  await invoke("read_offset", { address, length, outputPath });
}

export async function writeAll(
  inputDir: string,
  skip: string[],
  ignoreMissing: boolean
): Promise<void> {
  await invoke("write_all", { inputDir, skip, ignoreMissing });
}

export async function readAll(
  outputDir: string,
  skip: string[]
): Promise<void> {
  await invoke("read_all", { outputDir, skip });
}

// === Device Info ===

export async function getDeviceInfo(): Promise<DeviceInfo> {
  return await invoke("get_device_info");
}

export async function getStorageInfo(): Promise<StorageInfo> {
  return await invoke("get_storage_info");
}

export async function getKeys(): Promise<KeysInfo> {
  return await invoke("get_keys");
}

export async function getActiveSlot(): Promise<string> {
  return await invoke("get_active_slot");
}

export async function setActiveSlot(slot: string): Promise<void> {
  await invoke("set_active_slot", { slot });
}

// === Memory Operations ===

export async function peekMemory(
  address: number,
  length: number,
  outputPath: string
): Promise<void> {
  await invoke("peek_memory", { address, length, outputPath });
}

export async function pokeMemory(
  address: number,
  inputPath: string
): Promise<void> {
  await invoke("poke_memory", { address, inputPath });
}

export async function readRegister(address: number): Promise<number> {
  return await invoke("read_register", { address });
}

export async function writeRegister(
  address: number,
  value: number
): Promise<void> {
  await invoke("write_register", { address, value });
}

// === RPMB ===

export async function rpmbRead(
  region: number,
  startSector: number,
  numSectors: number | null,
  outputPath: string
): Promise<void> {
  await invoke("rpmb_read", {
    region,
    startSector,
    numSectors,
    outputPath,
  });
}

export async function rpmbWrite(
  region: number,
  startSector: number,
  numSectors: number | null,
  inputPath: string
): Promise<void> {
  await invoke("rpmb_write", {
    region,
    startSector,
    numSectors,
    inputPath,
  });
}

export async function rpmbErase(
  region: number,
  startSector: number,
  numSectors: number | null
): Promise<void> {
  await invoke("rpmb_erase", { region, startSector, numSectors });
}

export async function rpmbAuth(
  region: number,
  key: string
): Promise<void> {
  await invoke("rpmb_auth", { region, key });
}

// === Security ===

export async function seccfgLock(): Promise<void> {
  await invoke("seccfg_lock");
}

export async function seccfgUnlock(): Promise<void> {
  await invoke("seccfg_unlock");
}

export async function efuseRead(outputPath: string): Promise<void> {
  await invoke("efuse_read", { outputPath });
}

export async function efuseWrite(inputPath: string): Promise<void> {
  await invoke("efuse_write", { inputPath });
}

// === Device Control ===

export async function rebootDevice(mode: string): Promise<void> {
  await invoke("reboot_device", { mode });
}

export async function shutdownDevice(): Promise<void> {
  await invoke("shutdown_device");
}

export async function forceFastboot(): Promise<void> {
  await invoke("force_fastboot");
}

export async function crashDevice(): Promise<void> {
  await invoke("crash_device");
}

export async function bootPreloader(
  filePath: string,
  address: number | null,
  raw: boolean
): Promise<void> {
  await invoke("boot_preloader", { filePath, address, raw });
}

export async function rscFlash(
  partition: string,
  filePath: string
): Promise<void> {
  await invoke("rsc_flash", { partition, filePath });
}

// === CLI (no device needed) ===

export async function patchDa(
  inputPath: string,
  outputPath: string
): Promise<void> {
  await invoke("patch_da", { inputPath, outputPath });
}

// === Logo / Assets ===

export async function getLogo(): Promise<string> {
  return await invoke("get_logo");
}

export async function getLogoAscii(): Promise<string> {
  return await invoke("get_logo_ascii");
}

// === Scatter ===

export async function parseScatterFile(filePath: string): Promise<ScatterFile> {
  return await invoke("parse_scatter_file", { filePath });
}

export async function detectImageFiles(
  scatterPath: string,
  partitions: ScatterPartition[]
): Promise<Record<string, string>> {
  return await invoke("detect_image_files", { scatterPath, partitions });
}
