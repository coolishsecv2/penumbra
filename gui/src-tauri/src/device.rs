/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use anyhow::{Context, Result};
use penumbra::port::{PortBackend, PortType};
use penumbra::{Device, DeviceBuilder, Partition};
use std::sync::{Arc, Mutex};

use crate::error::AppError;

pub struct DeviceManager {
    device: Option<Device<'static, PortType>>,
}

impl DeviceManager {
    pub fn new() -> Self {
        Self { device: None }
    }

    pub fn connect(&mut self, da_path: &str, preloader_path: Option<&str>) -> Result<()> {
        let da_data = std::fs::read(da_path)
            .context(format!("Failed to read DA file: {}", da_path))?;

        let pl_data = preloader_path.map(|p| std::fs::read(p)).transpose()?;

        let vid = Some(0x0E8D);
        let pid = Some(0x2000);

        let mtk_port = PortType::find_device(vid, pid, PortBackend::Auto)
            .map_err(|e| AppError::Connection(format!("Failed to find device: {}", e)))?
            .ok_or_else(|| AppError::Connection("No MTK device found".to_string()))?;

        let mut builder = DeviceBuilder::new(mtk_port).with_da_data(&da_data);

        if let Some(ref pl) = pl_data {
            builder = builder.with_preloader(pl);
        }

        let mut device = builder
            .build()
            .map_err(|e| AppError::Device(format!("Failed to build device: {}", e)))?;

        device
            .init()
            .map_err(|e| AppError::Device(format!("Failed to initialize: {}", e)))?;

        self.device = Some(device);
        Ok(())
    }

    pub fn disconnect(&mut self) {
        if let Some(ref mut device) = self.device {
            let _ = device.shutdown();
        }
        self.device = None;
    }

    pub fn is_connected(&self) -> bool {
        self.device.is_some()
    }

    pub fn list_partitions(&mut self) -> Result<Vec<PartitionInfo>> {
        let device = self
            .device
            .as_mut()
            .ok_or(AppError::NotConnected)?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        let partitions: Vec<PartitionInfo> = device
            .partitions_iter()
            .map(|p| PartitionInfo {
                name: p.name.clone(),
                address: format!("0x{:016X}", p.address),
                size: p.size,
                size_human: format_size(p.size),
            })
            .collect();

        Ok(partitions)
    }

    pub fn flash_partition(&mut self, partition: &str, image_path: &str) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        let image_data = std::fs::read(image_path)
            .context(format!("Failed to read image: {}", image_path))?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        let size = image_data.len();
        let data = image_data.as_slice();
        let mut progress = |written: usize, total: usize| {
            log::info!("Flash progress: {}/{}", written, total);
        };

        device.write_partition(partition, size, data, &mut progress)
            .map_err(|e| AppError::Device(format!("Flash failed: {}", e)))?;

        Ok(())
    }

    pub fn read_partition(&mut self, partition: &str, output_path: &str) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        let file = std::fs::File::create(output_path)?;
        let mut writer = std::io::BufWriter::new(file);

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        let mut progress = |read: usize, total: usize| {
            log::info!("Read progress: {}/{}", read, total);
        };

        device.read_partition(partition, &mut writer, &mut progress)
            .map_err(|e| AppError::Device(format!("Read failed: {}", e)))?;

        Ok(())
    }

    pub fn erase_partition(&mut self, partition: &str) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        let mut progress = |erased: usize, total: usize| {
            log::info!("Erase progress: {}/{}", erased, total);
        };

        device.erase_partition(partition, &mut progress)
            .map_err(|e| AppError::Device(format!("Erase failed: {}", e)))?;

        Ok(())
    }

    pub fn format_partition(&mut self, partition: &str) -> Result<()> {
        self.erase_partition(partition)
    }

    pub fn reboot(&mut self, mode: &str) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        let boot_mode = match mode {
            "normal" => penumbra::da::protocol::BootMode::Normal,
            "fastboot" => penumbra::da::protocol::BootMode::Fastboot,
            "recovery" => penumbra::da::protocol::BootMode::Meta,
            _ => return Err(AppError::Device(format!("Invalid mode: {}", mode)).into()),
        };

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        device.reboot(boot_mode)
            .map_err(|e| AppError::Device(format!("Reboot failed: {}", e)))?;

        Ok(())
    }

    pub fn shutdown(&mut self) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        device.shutdown()
            .map_err(|e| AppError::Device(format!("Shutdown failed: {}", e)))?;

        Ok(())
    }

    pub fn force_fastboot(&mut self) -> Result<()> {
        self.reboot("fastboot")
    }

    pub fn flash_scatter(&mut self, scatter_path: &str) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        let scatter_content = std::fs::read_to_string(scatter_path)
            .context("Failed to read scatter file")?;

        let firmware_dir = std::path::Path::new(scatter_path)
            .parent()
            .map(|p| p.to_path_buf());

        let reader_source = |path: &str| -> Result<(std::io::BufReader<std::fs::File>, usize)> {
            let file_path = firmware_dir.as_ref()
                .map(|d| d.join(path))
                .unwrap_or_else(|| std::path::PathBuf::from(path));

            let file = std::fs::File::open(&file_path)
                .context(format!("Failed to open: {}", file_path.display()))?;
            let size = file.metadata()?.len() as usize;
            Ok((std::io::BufReader::new(file), size))
        };

        let writer_sink = |path: &str| -> Result<std::io::BufWriter<std::fs::File>> {
            let file = std::fs::File::create(path)?;
            Ok(std::io::BufWriter::new(file))
        };

        let mut progress = |written: usize, total: usize| {
            log::info!("Scatter flash: {}/{}", written, total);
        };

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        device.flash_scatter(&scatter_content, reader_source, writer_sink, &mut progress)
            .map_err(|e| AppError::Device(format!("Scatter flash failed: {}", e)))?;

        Ok(())
    }

    pub fn get_device_info(&mut self) -> Result<DeviceInfo> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        let devinfo = device.devinfo();
        let hw_code = devinfo.hw_code();
        let hw_subcode = devinfo.hw_subcode();

        let chip_name = devinfo.chip()
            .map(|c| format!("{:?}", c))
            .unwrap_or_else(|| "Unknown".to_string());

        let partitions = device.partitions().len();

        Ok(DeviceInfo {
            hw_code,
            hw_subcode,
            chip_name,
            partitions,
            connected: true,
        })
    }
}

fn format_size(bytes: usize) -> String {
    const KB: usize = 1024;
    const MB: usize = 1024 * KB;
    const GB: usize = 1024 * MB;

    if bytes >= GB {
        format!("{:.1} GiB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.1} MiB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.1} KiB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PartitionInfo {
    pub name: String,
    pub address: String,
    pub size: usize,
    pub size_human: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct DeviceInfo {
    pub hw_code: u16,
    pub hw_subcode: u16,
    pub chip_name: String,
    pub partitions: usize,
    pub connected: bool,
}

pub static DEVICE_MANAGER: once_cell::sync::Lazy<Arc<Mutex<DeviceManager>>> =
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(DeviceManager::new())));
