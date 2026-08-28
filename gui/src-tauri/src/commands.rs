/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::config::AntumbraConfig;
use crate::device::{
    DeviceInfo, KeysInfo, PartitionInfo, PartitionDetail, StorageInfoResult, DEVICE_MANAGER,
};
use crate::error::AppError;

#[tauri::command]
pub async fn connect_device(
    da_path: String,
    preloader_path: Option<String>,
) -> Result<(), AppError> {
    let manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    let _cancel_token = manager.cancel_token();
    drop(manager);

    let _ = crate::device_discovery::ensure_udev_rules(None);

    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.connect(&da_path, preloader_path.as_deref())
        .map_err(AppError::from)
}

#[tauri::command]
pub async fn disconnect_device() -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.disconnect();
    Ok(())
}

#[tauri::command]
pub async fn cancel_operation() -> Result<(), AppError> {
    let manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.cancel();
    Ok(())
}

#[tauri::command]
pub async fn list_partitions() -> Result<Vec<PartitionInfo>, AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.list_partitions().map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn flash_partition(
    partition: String,
    image_path: String,
    app: tauri::AppHandle,
) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.flash_partition(&partition, &image_path, &app)
        .map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn read_partition(
    partition: String,
    output_path: String,
    app: tauri::AppHandle,
) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.read_partition(&partition, &output_path, &app)
        .map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn erase_partition(partition: String, app: tauri::AppHandle) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.erase_partition(&partition, &app)
        .map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn format_partition(partition: String, app: tauri::AppHandle) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.format_partition(&partition, &app)
        .map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn reboot_device(mode: String) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.reboot(&mode).map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn shutdown_device() -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.shutdown().map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn force_fastboot() -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.force_fastboot().map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn flash_scatter(scatter_path: String, app: tauri::AppHandle) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.flash_scatter(&scatter_path, &app)
        .map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn get_device_info() -> Result<DeviceInfo, AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.get_device_info().map_err(|e| AppError::device(e.to_string()))
}

// === NEW COMMANDS ===

#[tauri::command]
pub async fn write_offset(
    address: u64,
    length: usize,
    input_path: String,
) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.write_offset(address, length, &input_path)
        .map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn read_offset(
    address: u64,
    length: usize,
    output_path: String,
) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.read_offset(address, length, &output_path)
        .map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn write_all(
    input_dir: String,
    skip: Vec<String>,
    ignore_missing: bool,
) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.write_all(&input_dir, &skip, ignore_missing)
        .map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn read_all(
    output_dir: String,
    skip: Vec<String>,
) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.read_all(&output_dir, &skip)
        .map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn get_partition_table() -> Result<Vec<PartitionDetail>, AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.get_partition_table().map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn get_storage_info() -> Result<StorageInfoResult, AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.get_storage_info().map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn get_keys() -> Result<KeysInfo, AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.get_keys().map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn get_active_slot() -> Result<String, AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.get_active_slot().map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn set_active_slot(slot: String) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.set_active_slot(&slot).map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn peek_memory(
    address: u64,
    length: usize,
    output_path: String,
) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.peek_memory(address, length, &output_path)
        .map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn poke_memory(
    address: u64,
    input_path: String,
) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.poke_memory(address, &input_path)
        .map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn read_register(address: u64) -> Result<u32, AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.read_register(address).map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn write_register(address: u64, value: u32) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.write_register(address, value).map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn rpmb_read(
    region: u8,
    start_sector: u32,
    num_sectors: Option<u32>,
    output_path: String,
) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.rpmb_read(region, start_sector, num_sectors, &output_path)
        .map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn rpmb_write(
    region: u8,
    start_sector: u32,
    num_sectors: Option<u32>,
    input_path: String,
) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.rpmb_write(region, start_sector, num_sectors, &input_path)
        .map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn rpmb_erase(
    region: u8,
    start_sector: u32,
    num_sectors: Option<u32>,
) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.rpmb_erase(region, start_sector, num_sectors)
        .map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn rpmb_auth(
    region: u8,
    key: String,
) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.rpmb_auth(region, &key).map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn seccfg_lock() -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.seccfg_set_lock(true).map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn seccfg_unlock() -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.seccfg_set_lock(false).map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn efuse_read(output_path: String) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.efuse_read(&output_path).map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn efuse_write(input_path: String) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.efuse_write(&input_path).map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn crash_device() -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.crash_device().map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn boot_preloader(
    file_path: String,
    address: Option<u32>,
    raw: bool,
) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.boot_preloader(&file_path, address, raw)
        .map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn rsc_flash(
    partition: String,
    file_path: String,
) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::device(e.to_string()))?;
    manager.rsc_flash(&partition, &file_path)
        .map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn patch_da(input_path: String, output_path: String) -> Result<(), AppError> {
    crate::device::DeviceManager::patch_da(&input_path, &output_path)
        .map_err(|e| AppError::device(e.to_string()))
}

// === Scatter ===

#[tauri::command]
pub async fn parse_scatter_file(file_path: String) -> Result<crate::scatter::ScatterFileInfo, AppError> {
    crate::scatter::parse_scatter(&file_path)
}

#[tauri::command]
pub async fn detect_image_files(
    scatter_path: String,
    partitions: Vec<crate::scatter::ScatterPartitionInfo>,
) -> Result<std::collections::HashMap<String, String>, AppError> {
    crate::scatter::detect_image_files(&scatter_path, &partitions)
}

// === Config ===

#[tauri::command]
pub async fn get_config() -> Result<AntumbraConfig, AppError> {
    AntumbraConfig::load().map(|c| (*c).clone()).map_err(|e| AppError::device(e.to_string()))
}

#[tauri::command]
pub async fn save_config(config: AntumbraConfig) -> Result<(), AppError> {
    config.save().map_err(|e| AppError::device(e.to_string()))
}

// === Logo / Assets ===

#[tauri::command]
pub async fn get_logo() -> Result<String, AppError> {
    let path = std::env::current_exe()
        .map_err(|e| AppError::device(e.to_string()))?
        .parent()
        .ok_or_else(|| AppError::device("Cannot find exe directory".to_string()))?
        .join("logo.txt");

    std::fs::read_to_string(&path)
        .map_err(|e| AppError::device(format!("Failed to read logo.txt: {}", e)))
}

#[tauri::command]
pub async fn get_logo_ascii() -> Result<String, AppError> {
    let path = std::env::current_exe()
        .map_err(|e| AppError::device(e.to_string()))?
        .parent()
        .ok_or_else(|| AppError::device("Cannot find exe directory".to_string()))?
        .join("logo_ascii.txt");

    std::fs::read_to_string(&path)
        .map_err(|e| AppError::device(format!("Failed to read logo_ascii.txt: {}", e)))
}
