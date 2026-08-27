/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod device;
mod error;

use error::AppError;

fn main() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::connect_device,
            commands::disconnect_device,
            commands::list_partitions,
            commands::flash_partition,
            commands::read_partition,
            commands::erase_partition,
            commands::format_partition,
            commands::reboot_device,
            commands::shutdown_device,
            commands::force_fastboot,
            commands::flash_scatter,
            commands::get_device_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Penumbra GUI");
}
