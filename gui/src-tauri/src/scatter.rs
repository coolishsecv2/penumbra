/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use crate::error::AppError;
use penumbra::da::scatter::ScatterFile;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScatterPartitionInfo {
    pub index: String,
    pub partition_name: String,
    pub file_name: Option<String>,
    pub is_download: bool,
    pub partition_type: String,
    pub linear_start_addr: String,
    pub physical_start_addr: String,
    pub partition_size: String,
    pub region: String,
    pub storage: String,
    pub operation_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScatterFileInfo {
    pub platform: String,
    pub project: String,
    pub storage_type: String,
    pub partitions: Vec<ScatterPartitionInfo>,
    pub file_path: String,
}

fn region_to_string(part: &penumbra::da::scatter::ScatterPartition) -> String {
    match part.kind() {
        penumbra::PartitionKind::Ufs(ufs) => format!("UFS_LU{}", ufs as u8),
        penumbra::PartitionKind::Emmc(emmc) => format!("EMMC_{}", format!("{:?}", emmc).to_uppercase()),
        _ => "UNKNOWN".to_string(),
    }
}

pub fn parse_scatter(file_path: &str) -> Result<ScatterFileInfo, AppError> {
    let content = std::fs::read_to_string(file_path)
        .map_err(|e| AppError::device(format!("Failed to read scatter file: {}", e)))?;

    let scatter = if content.trim_start().starts_with("<?xml") || content.trim_start().starts_with("<") {
        ScatterFile::from_xml(&content)
            .map_err(|e| AppError::device(format!("Failed to parse XML scatter: {}", e)))?
    } else {
        ScatterFile::from_yaml(&content)
            .map_err(|e| AppError::device(format!("Failed to parse YAML scatter: {}", e)))?
    };

    let mut partitions: Vec<ScatterPartitionInfo> = scatter
        .partitions()
        .iter()
        .enumerate()
        .map(|(i, p)| {
            let region = region_to_string(p);
            let storage_str = match p.storage {
                penumbra::StorageType::Emmc => "HW_STORAGE_EMMC",
                penumbra::StorageType::Sdmmc => "HW_STORAGE_SDMMC",
                penumbra::StorageType::Ufs => "HW_STORAGE_UFS",
                penumbra::StorageType::Nand
                | penumbra::StorageType::NandSlc
                | penumbra::StorageType::NandMlc
                | penumbra::StorageType::NandTlc
                | penumbra::StorageType::NandAmlc
                | penumbra::StorageType::NandSpi
                | penumbra::StorageType::Nand3dMlc => "HW_STORAGE_NAND",
                penumbra::StorageType::Unknown => "HW_STORAGE_UNKNOWN",
            };

            ScatterPartitionInfo {
                index: format!("SYS{}", i),
                partition_name: p.part.name.clone(),
                file_name: p.path.as_ref().map(|pb| pb.to_string_lossy().to_string()),
                is_download: p.download,
                partition_type: match p.op {
                    penumbra::da::scatter::ScatterOp::Bootloader => "SV5_BL_BIN",
                    penumbra::da::scatter::ScatterOp::Update => "NORMAL_ROM",
                    penumbra::da::scatter::ScatterOp::Invisible => "INVISIBLE",
                    penumbra::da::scatter::ScatterOp::Reserved => "RESERVED",
                    penumbra::da::scatter::ScatterOp::Logic => "LOGIC",
                    penumbra::da::scatter::ScatterOp::Protected => "PROTECTED",
                    penumbra::da::scatter::ScatterOp::BinRegion => "BINREGION",
                    penumbra::da::scatter::ScatterOp::NeedResize => "NEEDRESIZE",
                }
                .to_string(),
                linear_start_addr: format!("0x{:x}", p.part.address),
                physical_start_addr: format!("0x{:x}", p.part.address),
                partition_size: format!("0x{:x}", p.part.size),
                region,
                storage: storage_str.to_string(),
                operation_type: match p.op {
                    penumbra::da::scatter::ScatterOp::Bootloader => "BOOTLOADERS",
                    penumbra::da::scatter::ScatterOp::Invisible => "INVISIBLE",
                    penumbra::da::scatter::ScatterOp::Update => "UPDATE",
                    penumbra::da::scatter::ScatterOp::Protected => "PROTECTED",
                    penumbra::da::scatter::ScatterOp::BinRegion => "BINREGION",
                    penumbra::da::scatter::ScatterOp::Reserved => "RESERVED",
                    penumbra::da::scatter::ScatterOp::Logic => "LOGIC",
                    penumbra::da::scatter::ScatterOp::NeedResize => "NEEDRESIZE",
                }
                .to_string(),
            }
        })
        .collect();

    // Synthesize _b slot partitions for any _a that lacks a _b counterpart
    let existing_names: std::collections::HashSet<String> =
        partitions.iter().map(|p| p.partition_name.clone()).collect();
    let mut extra = Vec::new();
    for p in &partitions {
        if let Some(base) = p.partition_name.strip_suffix("_a") {
            let b_name = format!("{}_b", base);
            if !existing_names.contains(&b_name) {
                extra.push(ScatterPartitionInfo {
                    partition_name: b_name,
                    is_download: true,
                    ..p.clone()
                });
            }
        }
    }
    partitions.extend(extra);

    // Force is_download on _b partitions that have a _a counterpart with a file
    let a_has_file: std::collections::HashSet<String> = partitions
        .iter()
        .filter_map(|p| {
            p.partition_name
                .strip_suffix("_a")
                .filter(|_| p.file_name.is_some())
                .map(String::from)
        })
        .collect();
    let existing: std::collections::HashSet<String> =
        partitions.iter().map(|p| p.partition_name.clone()).collect();
    for p in &mut partitions {
        if !p.is_download {
            if let Some(base) = p.partition_name.strip_suffix("_b") {
                let a_name = format!("{}_a", base);
                if existing.contains(&a_name)
                    && (p.file_name.is_some() || a_has_file.contains(base))
                {
                    p.is_download = true;
                }
            }
        }
    }

    // Detect storage type from first partition
    let storage_type = if partitions.iter().any(|p| p.storage.contains("UFS")) {
        "UFS"
    } else if partitions.iter().any(|p| p.storage.contains("EMMC")) {
        "EMMC"
    } else {
        "UNKNOWN"
    };

    Ok(ScatterFileInfo {
        platform: String::new(),
        project: String::new(),
        storage_type: storage_type.to_string(),
        partitions,
        file_path: file_path.to_string(),
    })
}

pub fn detect_image_files(
    scatter_path: &str,
    partitions: &[ScatterPartitionInfo],
) -> Result<HashMap<String, String>, AppError> {
    let scatter_dir = Path::new(scatter_path)
        .parent()
        .ok_or_else(|| AppError::device("Cannot determine scatter file directory"))?;

    let mut image_map = HashMap::new();

    for partition in partitions {
        if let Some(ref file_name) = partition.file_name {
            let image_path = scatter_dir.join(file_name);
            if image_path.exists() {
                image_map.insert(
                    partition.partition_name.clone(),
                    image_path.to_string_lossy().to_string(),
                );
            }
        }
    }

    // Synthesize _b image entries from _a
    let mut extra = Vec::new();
    for (name, image) in &image_map {
        if let Some(base) = name.strip_suffix("_a") {
            let b_name = format!("{}_b", base);
            if !image_map.contains_key(&b_name) {
                extra.push((b_name, image.clone()));
            }
        }
    }
    for (name, image) in extra {
        image_map.entry(name).or_insert(image);
    }

    Ok(image_map)
}
