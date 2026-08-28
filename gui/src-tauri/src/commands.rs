/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::device::{DeviceInfo, PartitionInfo, DEVICE_MANAGER};
use crate::error::AppError;

#[tauri::command]
pub async fn connect_device(
    da_path: String,
    preloader_path: Option<String>,
) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::Device(e.to_string()))?;
    manager.connect(&da_path, preloader_path.as_deref())
        .map_err(|e| AppError::Connection(e.to_string()))
}

#[tauri::command]
pub async fn disconnect_device() -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::Device(e.to_string()))?;
    manager.disconnect();
    Ok(())
}

#[tauri::command]
pub async fn list_partitions() -> Result<Vec<PartitionInfo>, AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::Device(e.to_string()))?;
    manager.list_partitions().map_err(|e| AppError::Device(e.to_string()))
}

#[tauri::command]
pub async fn flash_partition(
    partition: String,
    image_path: String,
) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::Device(e.to_string()))?;
    manager.flash_partition(&partition, &image_path)
        .map_err(|e| AppError::Device(e.to_string()))
}

#[tauri::command]
pub async fn read_partition(
    partition: String,
    output_path: String,
) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::Device(e.to_string()))?;
    manager.read_partition(&partition, &output_path)
        .map_err(|e| AppError::Device(e.to_string()))
}

#[tauri::command]
pub async fn erase_partition(partition: String) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::Device(e.to_string()))?;
    manager.erase_partition(&partition)
        .map_err(|e| AppError::Device(e.to_string()))
}

#[tauri::command]
pub async fn format_partition(partition: String) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::Device(e.to_string()))?;
    manager.format_partition(&partition)
        .map_err(|e| AppError::Device(e.to_string()))
}

#[tauri::command]
pub async fn reboot_device(mode: String) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::Device(e.to_string()))?;
    manager.reboot(&mode).map_err(|e| AppError::Device(e.to_string()))
}

#[tauri::command]
pub async fn shutdown_device() -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::Device(e.to_string()))?;
    manager.shutdown().map_err(|e| AppError::Device(e.to_string()))
}

#[tauri::command]
pub async fn force_fastboot() -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::Device(e.to_string()))?;
    manager.force_fastboot().map_err(|e| AppError::Device(e.to_string()))
}

#[tauri::command]
pub async fn flash_scatter(scatter_path: String) -> Result<(), AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::Device(e.to_string()))?;
    manager.flash_scatter(&scatter_path)
        .map_err(|e| AppError::Device(e.to_string()))
}

#[tauri::command]
pub async fn get_device_info() -> Result<DeviceInfo, AppError> {
    let mut manager = DEVICE_MANAGER.lock().map_err(|e| AppError::Device(e.to_string()))?;
    manager.get_device_info().map_err(|e| AppError::Device(e.to_string()))
}
