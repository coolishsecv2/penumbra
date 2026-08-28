/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod auth;
mod commands;
mod config;
mod device;
mod error;
mod helpers;

use error::AppError;

fn main() {
    env_logger::init();

    // Load config
    let cfg = config::AntumbraConfig::load().unwrap_or_else(|e| {
        log::warn!("Failed to load config: {}", e);
        std::sync::Arc::new(config::AntumbraConfig::default())
    });

    // Initialize auth
    if let Err(e) = auth::init_auth(cfg.clone()) {
        log::warn!("Auth initialization failed (non-fatal): {}", e);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            // Connection
            commands::connect_device,
            commands::disconnect_device,
            commands::list_partitions,
            commands::get_device_info,
            // Flash operations
            commands::flash_partition,
            commands::read_partition,
            commands::erase_partition,
            commands::format_partition,
            commands::flash_scatter,
            commands::write_offset,
            commands::read_offset,
            commands::write_all,
            commands::read_all,
            // Device info
            commands::get_partition_table,
            commands::get_storage_info,
            commands::get_keys,
            commands::get_active_slot,
            commands::set_active_slot,
            // Memory operations
            commands::peek_memory,
            commands::poke_memory,
            commands::read_register,
            commands::write_register,
            // RPMB
            commands::rpmb_read,
            commands::rpmb_write,
            commands::rpmb_erase,
            commands::rpmb_auth,
            // Security
            commands::seccfg_lock,
            commands::seccfg_unlock,
            commands::efuse_read,
            commands::efuse_write,
            // Device control
            commands::reboot_device,
            commands::shutdown_device,
            commands::force_fastboot,
            commands::crash_device,
            commands::boot_preloader,
            commands::rsc_flash,
            // CLI (no device needed)
            commands::patch_da,
            // Config
            commands::get_config,
            commands::save_config,
            // Logo
            commands::get_logo,
            commands::get_logo_ascii,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Penumbra GUI");
}
