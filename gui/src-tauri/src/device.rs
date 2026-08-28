/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use std::io::{BufReader, BufWriter, Write};
use std::sync::atomic::{AtomicBool, Ordering};

use anyhow::{Context, Result};
use penumbra::da::DaProtocol;
use penumbra::da::xflash::set_rsc_info;
use penumbra::port::{PortBackend, PortType};
use penumbra::{Device, DeviceBuilder, MMIO, MtkPort, Storage};
use std::sync::{Arc, Mutex};

use crate::error::AppError;

pub struct DeviceManager {
    device: Option<Device<'static, PortType>>,
    cancel_token: Arc<AtomicBool>,
}

impl DeviceManager {
    pub fn new() -> Self {
        Self {
            device: None,
            cancel_token: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn cancel_token(&self) -> Arc<AtomicBool> {
        self.cancel_token.clone()
    }

    pub fn cancel(&self) {
        self.cancel_token.store(true, Ordering::Relaxed);
    }

    pub fn reset_cancel(&self) {
        self.cancel_token.store(false, Ordering::Relaxed);
    }

    pub fn is_cancelled(&self) -> bool {
        self.cancel_token.load(Ordering::Relaxed)
    }

    pub fn connect(&mut self, da_path: &str, preloader_path: Option<&str>) -> Result<()> {
        self.reset_cancel();

        let da_bytes = std::fs::read(da_path)
            .context(format!("Failed to read DA file: {}", da_path))?;
        let da_data: &'static [u8] = Box::leak(da_bytes.into_boxed_slice());

        let pl_bytes = preloader_path.map(|p| std::fs::read(p)).transpose()?;
        let pl_data: Option<&'static [u8]> = pl_bytes.map(|b| &*Box::leak(b.into_boxed_slice()));

        let vid = Some(0x0E8D);
        let pid = Some(0x2000);

        log::info!("Searching for MTK device (VID: {:04X}, PID: {:04X})...", vid.unwrap_or(0), pid.unwrap_or(0));

        let mtk_port = PortType::find_device(vid, pid, PortBackend::Auto)
            .map_err(|e| AppError::connection(format!("Failed to find device: {}", e)))?
            .ok_or_else(|| {
                AppError::Connection {
                    message: "No MTK device found".to_string(),
                    category: crate::error::ErrorCategory::Command,
                    suggestion: Some("Ensure the device is connected in Preloader or BROM mode. Try unplugging and re-plugging the USB cable.".to_string()),
                }
            })?;

        if self.is_cancelled() {
            return Err(AppError::Cancelled.into());
        }

        log::info!("Building device with DA...");
        let mut builder = DeviceBuilder::new(mtk_port).with_da_data(da_data);

        if let Some(pl) = pl_data {
            builder = builder.with_preloader(pl);
        }

        let mut device = builder
            .build()
            .map_err(|e| AppError::device(format!("Failed to build device: {}", e)))?;

        if self.is_cancelled() {
            return Err(AppError::Cancelled.into());
        }

        log::info!("Initializing device...");
        device
            .init()
            .map_err(|e| AppError::device(format!("Failed to initialize: {}", e)))?;

        self.device = Some(device);
        log::info!("Device connected successfully!");
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
                size_human: format_size(p.size as u64),
                section: format!("{:?}", p.kind),
            })
            .collect();

        Ok(partitions)
    }

    pub fn flash_partition(&mut self, partition: &str, image_path: &str, app: &tauri::AppHandle) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        let image_data = std::fs::read(image_path)
            .context(format!("Failed to read image: {}", image_path))?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        let size = image_data.len();
        let data = image_data.as_slice();
        let partition_clone = partition.to_string();
        let app_clone = app.clone();
        let mut progress = move |written: usize, total: usize| {
            crate::events::emit_progress(&app_clone, written, total, "flash", &partition_clone);
        };

        device.write_partition(partition, size, data, &mut progress)
            .map_err(|e| AppError::Device(format!("Flash failed: {}", e)))?;

        Ok(())
    }

    pub fn read_partition(&mut self, partition: &str, output_path: &str, app: &tauri::AppHandle) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        let file = std::fs::File::create(output_path)?;
        let mut writer = std::io::BufWriter::new(file);

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        let partition_clone = partition.to_string();
        let app_clone = app.clone();
        let mut progress = move |read: usize, total: usize| {
            crate::events::emit_progress(&app_clone, read, total, "read", &partition_clone);
        };

        device.read_partition(partition, &mut writer, &mut progress)
            .map_err(|e| AppError::Device(format!("Read failed: {}", e)))?;

        Ok(())
    }

    pub fn erase_partition(&mut self, partition: &str, app: &tauri::AppHandle) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        let partition_clone = partition.to_string();
        let app_clone = app.clone();
        let mut progress = move |erased: usize, total: usize| {
            crate::events::emit_progress(&app_clone, erased, total, "erase", &partition_clone);
        };

        device.erase_partition(partition, &mut progress)
            .map_err(|e| AppError::Device(format!("Erase failed: {}", e)))?;

        Ok(())
    }

    pub fn format_partition(&mut self, partition: &str, app: &tauri::AppHandle) -> Result<()> {
        self.erase_partition(partition, app)
    }

    pub fn reboot(&mut self, mode: &str) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        let boot_mode = match mode {
            "normal" => penumbra::BootMode::Normal,
            "fastboot" => penumbra::BootMode::Fastboot,
            "recovery" => penumbra::BootMode::Meta,
            "homescreen" => penumbra::BootMode::HomeScreen,
            "meta" => penumbra::BootMode::Meta,
            "test" => penumbra::BootMode::Test,
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

    pub fn flash_scatter(&mut self, scatter_path: &str, app: &tauri::AppHandle) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        let scatter_content = std::fs::read_to_string(scatter_path)
            .context("Failed to read scatter file")?;

        let firmware_dir = std::path::Path::new(scatter_path)
            .parent()
            .map(|p| p.to_path_buf());

        let reader_source = move |path: &str| -> penumbra::Result<(std::io::BufReader<std::fs::File>, usize)> {
            let file_path = firmware_dir.as_ref()
                .map(|d| d.join(path))
                .unwrap_or_else(|| std::path::PathBuf::from(path));

            let file = std::fs::File::open(&file_path)?;
            let size = file.metadata()?.len() as usize;
            Ok((std::io::BufReader::new(file), size))
        };

        let writer_sink = |path: &str| -> penumbra::Result<std::io::BufWriter<std::fs::File>> {
            let file = std::fs::File::create(path)?;
            Ok(std::io::BufWriter::new(file))
        };

        let app_clone = app.clone();
        let mut progress = move |written: usize, total: usize| {
            crate::events::emit_progress(&app_clone, written, total, "scatter", "all");
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

    // === NEW COMMANDS ===

    pub fn write_offset(&mut self, address: u64, length: usize, input_path: &str) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        let file = std::fs::File::open(input_path)
            .context(format!("Failed to open input file: {}", input_path))?;
        let mut reader = BufReader::new(file);

        let user_section = device.get_storage()
            .ok_or_else(|| AppError::Device("Failed to get storage".to_string()))?
            .get_user_part();

        let mut progress = |written: usize, total: usize| {
            log::info!("Write offset progress: {}/{}", written, total);
        };

        device.write_offset(address, length, user_section, &mut reader, &mut progress)
            .map_err(|e| AppError::Device(format!("Write offset failed: {}", e)))?;

        Ok(())
    }

    pub fn read_offset(&mut self, address: u64, length: usize, output_path: &str) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        let file = std::fs::File::create(output_path)?;
        let mut writer = BufWriter::new(file);

        let user_section = device.get_storage()
            .ok_or_else(|| AppError::Device("Failed to get storage".to_string()))?
            .get_user_part();

        let mut progress = |read: usize, total: usize| {
            log::info!("Read offset progress: {}/{}", read, total);
        };

        device.read_offset(address, length, user_section, &mut writer, &mut progress)
            .map_err(|e| AppError::Device(format!("Read offset failed: {}", e)))?;

        writer.flush()?;
        Ok(())
    }

    pub fn write_all(&mut self, input_dir: &str, skip: &[String], ignore_missing: bool) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        let dir_path = std::path::Path::new(input_dir);
        if !dir_path.exists() {
            return Err(AppError::Device("Directory does not exist".to_string()).into());
        }

        let entries: Vec<_> = std::fs::read_dir(dir_path)?
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.path().extension().map(|ext| ext == "bin").unwrap_or(false)
            })
            .collect();

        if entries.is_empty() {
            return Err(AppError::Device("Directory is empty".to_string()).into());
        }

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        for entry in &entries {
            let path = entry.path();
            let part_name = path.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_string();

            if skip.contains(&part_name) {
                log::info!("Skipping partition '{}'", part_name);
                continue;
            }

            let file_size = std::fs::metadata(&path)?.len();
            let file = std::fs::File::open(&path)?;
            let mut reader = BufReader::new(file);

            let part = match device.devinfo().get_partition(&part_name) {
                Some(p) => p,
                None => {
                    if !ignore_missing {
                        return Err(AppError::Device(
                            format!("Partition '{}' not found on device. Use ignore_missing to skip.", part_name)
                        ).into());
                    }
                    log::info!("Skipping partition '{}' (not found on device)", part_name);
                    continue;
                }
            };

            if file_size > part.size as u64 {
                return Err(AppError::Device(
                    format!("File size ({}) exceeds partition size ({}) for '{}'", file_size, part.size, part_name)
                ).into());
            }

            let mut progress = |written: usize, total: usize| {
                log::info!("Writing '{}': {}/{}", part_name, written, total);
            };

            device.write_partition(&part.name, file_size as usize, &mut reader, &mut progress)
                .map_err(|e| AppError::Device(format!("Failed to write '{}': {}", part_name, e)))?;

            log::info!("Written partition '{}'", part_name);
        }

        Ok(())
    }

    pub fn read_all(&mut self, output_dir: &str, skip: &[String]) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        let dir_path = std::path::Path::new(output_dir);
        std::fs::create_dir_all(dir_path)?;

        if std::fs::read_dir(dir_path)?.next().is_some() {
            return Err(AppError::Device("Output directory is not empty".to_string()).into());
        }

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        for p in device.partitions() {
            if skip.contains(&p.name) {
                log::info!("Skipping partition '{}'", p.name);
                continue;
            }

            let output_path = dir_path.join(format!("{}.bin", p.name));
            let mut output_file = BufWriter::new(std::fs::File::create(&output_path)?);

            let mut progress = |read: usize, total: usize| {
                log::info!("Reading '{}': {}/{}", p.name, read, total);
            };

            if let Err(e) = device.read_partition(p.name.as_str(), &mut output_file, &mut progress) {
                log::warn!("Failed to read partition '{}': {}. Skipping.", p.name, e);
            }

            output_file.flush()?;
            log::info!("Saved partition '{}' to '{}'", p.name, output_path.display());
        }

        Ok(())
    }

    pub fn get_partition_table(&mut self) -> Result<Vec<PartitionDetail>> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        let partitions: Vec<PartitionDetail> = device.partitions()
            .iter()
            .map(|p| PartitionDetail {
                name: p.name.clone(),
                address: format!("0x{:016X}", p.address),
                size: p.size,
                size_human: format_size(p.size as u64),
                section: format!("{:?}", p.kind),
            })
            .collect();

        Ok(partitions)
    }

    pub fn get_storage_info(&mut self) -> Result<StorageInfoResult> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        let storage = device.get_storage()
            .ok_or_else(|| AppError::Device("Cannot retrieve storage information".to_string()))?;

        let total_size = storage.total_size();
        let block_size = storage.block_size();
        let boot1_size = storage.get_pl1_size();
        let boot2_size = storage.get_pl2_size();
        let user_size = storage.get_user_size();
        let rpmb_size = storage.get_rpmb_size();
        let partition_count = device.partitions_iter().count();
        let storage_type = storage.as_str().to_string();

        Ok(StorageInfoResult {
            storage_type,
            total_size,
            block_size,
            boot1_size,
            boot2_size,
            user_size,
            rpmb_size,
            partition_count,
            total_size_human: format_size(total_size),
            block_size_human: format_size(block_size as u64),
            boot1_size_human: format_size(boot1_size),
            boot2_size_human: format_size(boot2_size),
            user_size_human: format_size(user_size),
            rpmb_size_human: format_size(rpmb_size),
        })
    }

    pub fn get_keys(&mut self) -> Result<KeysInfo> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        use penumbra::da::extensions::{KeyDeriveId, KeySize};

        let chip = device.devinfo().chip()
            .ok_or_else(|| AppError::Device("Cannot determine chip".to_string()))?;

        let efuse = chip.efuse();
        let sec_fuse_addr = efuse as u64 + 0x60;
        let pubk_addr = efuse as u64 + 0x90;
        let hrid_addr = efuse as u64 + 0x140;

        let progress = |_, _| {};

        let mut pubk = [0u8; 0x20];
        let mut hrid = [0u8; 0x10];
        device.peek(pubk_addr, pubk.len(), &mut pubk[..], progress)
            .map_err(|e| AppError::Device(format!("Failed to read public key: {}", e)))?;
        device.peek(hrid_addr, hrid.len(), &mut hrid[..], progress)
            .map_err(|e| AppError::Device(format!("Failed to read HRID: {}", e)))?;

        let sec_fuse_val = device.read_register(sec_fuse_addr)
            .map_err(|e| AppError::Device(format!("Failed to read SEC fuse: {}", e)))?;

        let rpmb_key = device.derive_key_by_id(KeyDeriveId::Rpmb, KeySize::Key256)
            .map_err(|e| AppError::Device(format!("Failed to derive RPMB key: {}", e)))?;
        let fde_key = device.derive_key_by_id(KeyDeriveId::Fde, KeySize::Key128)
            .map_err(|e| AppError::Device(format!("Failed to derive FDE key: {}", e)))?;
        let tee_key = device.derive_key_by_id(KeyDeriveId::Tee, KeySize::Key256)
            .map_err(|e| AppError::Device(format!("Failed to derive TEE key: {}", e)))?;
        let rot_key = device.derive_key_by_id(KeyDeriveId::Rot, KeySize::Key256)
            .map_err(|e| AppError::Device(format!("Failed to derive ROT key: {}", e)))?;

        Ok(KeysInfo {
            sec_fuse: format!("0x{:X}", sec_fuse_val),
            hrid: hex::encode(hrid),
            public_key: hex::encode(pubk),
            rpmb_key: hex::encode(rpmb_key),
            fde_key: hex::encode(fde_key),
            tee_key: hex::encode(tee_key),
            rot_key: hex::encode(rot_key),
        })
    }

    pub fn get_active_slot(&mut self) -> Result<String> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        let bootctrl = device.get_bootctrl()
            .map_err(|e| AppError::Device(format!("Failed to get boot control: {}. Device may not support A/B slots.", e)))?;

        Ok(format!("{:?}", bootctrl.get_active_slot()))
    }

    pub fn set_active_slot(&mut self, slot: &str) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        use penumbra::hacc::{BootControl, BootPartition, OFFSET_SLOT_SUFFIX, TryWrite};

        let new_slot = match slot.to_uppercase().as_str() {
            "A" => BootPartition::A,
            "B" => BootPartition::B,
            _ => return Err(AppError::Device(format!("Invalid slot: {}. Must be 'A' or 'B'.", slot)).into()),
        };

        let mut bootctrl = device.get_bootctrl()
            .map_err(|e| AppError::Device(format!("Failed to get boot control: {}", e)))?;

        let current_slot = bootctrl.get_active_slot();
        if current_slot == new_slot {
            return Ok(());
        }

        bootctrl.set_active_slot(new_slot);

        let mut new_data = [0u8; OFFSET_SLOT_SUFFIX + size_of::<BootControl>()];
        bootctrl.try_write(&mut new_data[OFFSET_SLOT_SUFFIX..])?;

        device.write_partition("misc", new_data.len(), &new_data[..], |_, _| {})
            .map_err(|e| AppError::Device(format!("Failed to write boot control: {}", e)))?;

        Ok(())
    }

    pub fn peek_memory(&mut self, address: u64, length: usize, output_path: &str) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        let file = std::fs::File::create(output_path)?;
        let mut writer = BufWriter::new(file);

        let mut progress = |read: usize, total: usize| {
            log::info!("Peek progress: {}/{}", read, total);
        };

        device.peek(address, length, &mut writer, &mut progress)
            .map_err(|e| AppError::Device(format!("Peek failed: {}", e)))?;

        writer.flush()?;
        Ok(())
    }

    pub fn poke_memory(&mut self, address: u64, input_path: &str) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        let file = std::fs::File::open(input_path)
            .context(format!("Failed to open input file: {}", input_path))?;
        let metadata = file.metadata()?;
        let mut reader = BufReader::new(file);

        let length = metadata.len() as usize;
        if length == 0 {
            return Err(AppError::Device("Input file is empty".to_string()).into());
        }

        let mut progress = |written: usize, total: usize| {
            log::info!("Poke progress: {}/{}", written, total);
        };

        device.poke(address, length, &mut reader, &mut progress)
            .map_err(|e| AppError::Device(format!("Poke failed: {}", e)))?;

        Ok(())
    }

    pub fn read_register(&mut self, address: u64) -> Result<u32> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        let value = device.read_register(address)
            .map_err(|e| AppError::Device(format!("Register read failed: {}", e)))?;

        Ok(value)
    }

    pub fn write_register(&mut self, address: u64, value: u32) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        device.write_register(address, value)
            .map_err(|e| AppError::Device(format!("Register write failed: {}", e)))?;

        Ok(())
    }

    pub fn rpmb_read(&mut self, region: u8, start_sector: u32, num_sectors: Option<u32>, output_path: &str) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        use penumbra::RpmbRegion;
        let rpmb_region = RpmbRegion::try_from(region).unwrap_or(RpmbRegion::R0);

        let storage = device.get_storage()
            .ok_or_else(|| AppError::Device("Failed to get storage".to_string()))?;
        let rpmb_size = storage.get_rpmb_size();
        if rpmb_size == 0 {
            return Err(AppError::Device("RPMB not supported on this device".to_string()).into());
        }
        let max_sectors = (rpmb_size / 256) as u32;
        let num = num_sectors.unwrap_or_else(|| max_sectors.saturating_sub(start_sector));

        if start_sector.saturating_add(num) > max_sectors {
            return Err(AppError::Device(format!("Out of bounds. Max sectors: {}", max_sectors)).into());
        }

        let file = std::fs::File::create(output_path)?;
        let mut writer = BufWriter::new(file);

        let mut progress = |read: usize, total: usize| {
            log::info!("RPMB read: {}/{}", read, total);
        };

        device.read_rpmb(rpmb_region, start_sector, num, &mut writer, &mut progress)
            .map_err(|e| AppError::Device(format!("RPMB read failed: {}", e)))?;

        writer.flush()?;
        Ok(())
    }

    pub fn rpmb_write(&mut self, region: u8, start_sector: u32, num_sectors: Option<u32>, input_path: &str) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        use penumbra::RpmbRegion;
        let rpmb_region = RpmbRegion::try_from(region).unwrap_or(RpmbRegion::R0);

        let storage = device.get_storage()
            .ok_or_else(|| AppError::Device("Failed to get storage".to_string()))?;
        let rpmb_size = storage.get_rpmb_size();
        if rpmb_size == 0 {
            return Err(AppError::Device("RPMB not supported on this device".to_string()).into());
        }
        let max_sectors = (rpmb_size / 256) as u32;
        let num = num_sectors.unwrap_or_else(|| max_sectors.saturating_sub(start_sector));

        if start_sector.saturating_add(num) > max_sectors {
            return Err(AppError::Device(format!("Out of bounds. Max sectors: {}", max_sectors)).into());
        }

        let file = std::fs::File::open(input_path)?;
        let mut reader = BufReader::new(file);

        let mut progress = |written: usize, total: usize| {
            log::info!("RPMB write: {}/{}", written, total);
        };

        device.write_rpmb(rpmb_region, start_sector, num, &mut reader, &mut progress)
            .map_err(|e| AppError::Device(format!("RPMB write failed: {}", e)))?;

        Ok(())
    }

    pub fn rpmb_erase(&mut self, region: u8, start_sector: u32, num_sectors: Option<u32>) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        use penumbra::RpmbRegion;
        let rpmb_region = RpmbRegion::try_from(region).unwrap_or(RpmbRegion::R0);

        let storage = device.get_storage()
            .ok_or_else(|| AppError::Device("Failed to get storage".to_string()))?;
        let rpmb_size = storage.get_rpmb_size();
        if rpmb_size == 0 {
            return Err(AppError::Device("RPMB not supported on this device".to_string()).into());
        }
        let max_sectors = (rpmb_size / 256) as u32;
        let num = num_sectors.unwrap_or_else(|| max_sectors.saturating_sub(start_sector));

        if start_sector.saturating_add(num) > max_sectors {
            return Err(AppError::Device(format!("Out of bounds. Max sectors: {}", max_sectors)).into());
        }

        let mut progress = |erased: usize, total: usize| {
            log::info!("RPMB erase: {}/{}", erased, total);
        };

        device.erase_rpmb(rpmb_region, start_sector, num, &mut progress)
            .map_err(|e| AppError::Device(format!("RPMB erase failed: {}", e)))?;

        Ok(())
    }

    pub fn rpmb_auth(&mut self, region: u8, key_hex: &str) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        use penumbra::RpmbRegion;
        let rpmb_region = RpmbRegion::try_from(region).unwrap_or(RpmbRegion::R0);

        let key = hex::decode(key_hex)
            .map_err(|e| AppError::Device(format!("Invalid hex key: {}", e)))?;

        device.auth_rpmb(rpmb_region, &key)
            .map_err(|e| AppError::Device(format!("RPMB auth failed: {}", e)))?;

        Ok(())
    }

    pub fn seccfg_set_lock(&mut self, lock: bool) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        use penumbra::hacc::LockState;

        let state = if lock { LockState::Lock } else { LockState::Unlock };
        device.set_seccfg_lock_state(state)
            .map_err(|e| AppError::Device(format!("Seccfg operation failed: {}", e)))?;

        Ok(())
    }

    pub fn efuse_read(&mut self, output_path: &str) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        let file = std::fs::File::create(output_path)?;
        let writer = BufWriter::new(file);

        device.read_efuses(writer)
            .map_err(|e| AppError::Device(format!("eFuse read failed: {}", e)))?;

        Ok(())
    }

    pub fn efuse_write(&mut self, input_path: &str) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        let file = std::fs::File::open(input_path)
            .context(format!("Failed to open eFuse file: {}", input_path))?;
        let size = file.metadata()?.len() as usize;
        let reader = BufReader::new(file);

        device.write_efuses(reader, size)
            .map_err(|e| AppError::Device(format!("eFuse write failed: {}", e)))?;

        Ok(())
    }

    pub fn crash_device(&mut self) -> Result<()> {
        use penumbra::PlProtocol;

        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        let dummy_data = [0u8; 0x100];
        let data_len = dummy_data.len() as u32;

        let port = device.port_mut();
        let mut pl = PlProtocol::new(port);

        pl.send_da(&dummy_data, data_len, 0, data_len)
            .map_err(|e| AppError::Device(format!("Crash send_da failed: {}", e)))?;

        port.reenumerate(0x0E8D, 0x0003)
            .map_err(|e| AppError::Device(format!("Device re-enumeration failed: {}", e)))?;

        let mut pl = PlProtocol::new(port);
        pl.handshake()
            .map_err(|e| AppError::Device(format!("Handshake failed: {}", e)))?;

        Ok(())
    }

    pub fn boot_preloader(&mut self, file_path: &str, address: Option<u32>, raw: bool) -> Result<()> {
        use penumbra::hacc::{Preloader, TryRead};
        use penumbra::port::ConnectionType;
        use penumbra::PlProtocol;

        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        if device.get_connection_type() != ConnectionType::Brom {
            return Err(AppError::Device("Must be in BootROM mode".to_string()).into());
        }

        let data = std::fs::read(file_path)
            .context(format!("Failed to read preloader: {}", file_path))?;

        let (data_slice, jump_addr) = if raw {
            let addr = address.ok_or_else(|| AppError::Device("--address required with --raw".to_string()))?;
            (data.as_slice(), addr)
        } else {
            let preloader = Preloader::try_read(&data)
                .map_err(|e| AppError::Device(format!("Failed to parse preloader: {}", e)))?;
            let gfh_file_info = preloader.gfh().file_info();
            let pl_jump_addr = gfh_file_info.load_addr() + gfh_file_info.jump_offset();
            let addr = address.unwrap_or(pl_jump_addr);
            (preloader.content(), addr)
        };

        let mut pl = PlProtocol::new(device.port_mut());

        pl.exploit()
            .map_err(|e| AppError::Device(format!("Exploit failed: {}", e)))?;

        pl.send_da(data_slice, data_slice.len() as u32, jump_addr, 0)
            .map_err(|e| AppError::Device(format!("send_da failed: {}", e)))?;

        pl.jump_da(jump_addr)
            .map_err(|e| AppError::Device(format!("jump_da failed: {}", e)))?;

        Ok(())
    }

    pub fn rsc_flash(&mut self, partition: &str, file_path: &str) -> Result<()> {
        let device = self.device.as_mut().ok_or(AppError::NotConnected)?;

        device.ensure_da_mode()
            .map_err(|e| AppError::Device(format!("DA mode failed: {}", e)))?;

        let file = std::fs::File::open(file_path)
            .context(format!("Failed to open file: {}", file_path))?;
        let mut reader = BufReader::new(file);
        let file_size = std::fs::metadata(file_path)?.len();

        let part = device.get_partition_active(partition)
            .ok_or_else(|| AppError::Device(format!("Partition '{}' not found", partition)))?;

        if file_size > part.size as u64 {
            return Err(AppError::Device(format!(
                "File size ({}) exceeds partition size ({})", file_size, part.size
            )).into());
        }

        let mut progress = |written: usize, total: usize| {
            log::info!("RSC flash: {}/{}", written, total);
        };

        let part_name = part.name.clone();
        device.with_protocol(|proto, port| {
            let DaProtocol::V5(xflash) = proto else {
                return Err(penumbra::error::PenumbraError::WrongProtocolVersion.into());
            };

            set_rsc_info(xflash, port, &part_name, file_size as usize, &mut reader, &mut progress)
        })
        .map_err(|e| AppError::Device(format!("RSC flash failed: {}", e)))?;

        Ok(())
    }

    pub fn patch_da(input_path: &str, output_path: &str) -> Result<()> {
        use penumbra::hacc::{Da, DaVersion, TryRead, TryWrite};

        let buffer = std::fs::read(input_path)
            .context(format!("Failed to read DA file: {}", input_path))?;

        let mut new_data = buffer.clone();

        let mut da = Da::try_read(&buffer)
            .map_err(|e| AppError::Device(format!("Failed to parse DA file: {}", e)))?;

        log::info!("DA count: {:?}", da.header().da_count());

        for mut entry in da.entries() {
            log::info!(
                "Patching 0x{:X?} (0x{:X?} - {:?})",
                entry.hw_code(),
                entry.hw_sub_code(),
                entry.version()
            );
            match entry.version() {
                DaVersion::V5 => penumbra::da::xflash::patch_da(&mut entry).unwrap(),
                DaVersion::V6 => penumbra::da::xml::patch_da(&mut entry).unwrap(),
                _ => {
                    log::warn!("Unsupported DA version: {:?}", entry.version());
                    continue;
                }
            }

            let start = entry.da1().offset();
            let end = entry.da1().end_offset();
            new_data[start..end].copy_from_slice(entry.da1_code());

            let start = entry.da2().offset();
            let end = entry.da2().end_offset();
            new_data[start..end].copy_from_slice(entry.da2_code());
        }

        let header = da.header_mut();
        let suffix = b"_antumbra\0";
        let desc_bytes = header.desc().as_bytes();
        let copy_len = desc_bytes.len().min(64 - suffix.len());

        let mut new_desc = [0u8; 64];
        new_desc[..copy_len].copy_from_slice(&desc_bytes[..copy_len]);
        new_desc[copy_len..copy_len + suffix.len()].copy_from_slice(suffix);

        header.set_desc(&new_desc);
        header.try_write(&mut new_data)?;

        std::fs::write(output_path, &new_data)?;

        Ok(())
    }
}

fn format_size(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = 1024 * KB;
    const GB: u64 = 1024 * MB;

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
    pub section: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PartitionDetail {
    pub name: String,
    pub address: String,
    pub size: usize,
    pub size_human: String,
    pub section: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct DeviceInfo {
    pub hw_code: u16,
    pub hw_subcode: u16,
    pub chip_name: String,
    pub partitions: usize,
    pub connected: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct StorageInfoResult {
    pub storage_type: String,
    pub total_size: u64,
    pub block_size: u32,
    pub boot1_size: u64,
    pub boot2_size: u64,
    pub user_size: u64,
    pub rpmb_size: u64,
    pub partition_count: usize,
    pub total_size_human: String,
    pub block_size_human: String,
    pub boot1_size_human: String,
    pub boot2_size_human: String,
    pub user_size_human: String,
    pub rpmb_size_human: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct KeysInfo {
    pub sec_fuse: String,
    pub hrid: String,
    pub public_key: String,
    pub rpmb_key: String,
    pub fde_key: String,
    pub tee_key: String,
    pub rot_key: String,
}

pub static DEVICE_MANAGER: once_cell::sync::Lazy<Arc<Mutex<DeviceManager>>> =
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(DeviceManager::new())));
