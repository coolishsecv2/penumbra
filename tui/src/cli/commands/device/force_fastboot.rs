/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use anyhow::Result;
use clap::Args;
use penumbra::Device;
use penumbra::da::protocol::BootMode;

use crate::cli::DeviceCommand;
use crate::cli::common::{CONN_DA, CommandMetadata};
use crate::cli::state::PersistedDeviceState;

impl CommandMetadata for ForceFastbootArgs {
    fn about() -> &'static str {
        "Force the device into fastboot mode."
    }

    fn long_about() -> &'static str {
        "Force the device into fastboot mode. This command will attempt to reboot \
         the device into fastboot mode even if the device is in an unresponsive state. \
         Useful for recovering devices that are stuck or not booting properly."
    }
}

#[derive(Args, Debug)]
pub struct ForceFastbootArgs {
    /// Timeout in seconds to wait for device reconnection
    #[arg(short, long, default_value_t = 10)]
    pub timeout: u64,
}

impl DeviceCommand for ForceFastbootArgs {
    fn run(&self, dev: &mut Device, state: &mut PersistedDeviceState) -> Result<()> {
        log::info!("Forcing device into fastboot mode...");

        // Enter DA mode if not already
        dev.enter_da_mode()?;

        state.connection_type = CONN_DA;
        state.flash_mode = 1;

        // Reboot to fastboot
        dev.reboot(BootMode::Fastboot)?;

        log::info!("Device rebooting to fastboot mode (timeout: {}s)", self.timeout);
        println!("Force fastboot: Device rebooting to fastboot mode...");

        // Wait a moment for the device to reboot
        std::thread::sleep(std::time::Duration::from_secs(2));

        println!("Force fastboot: Done. Device should now be in fastboot mode.");

        Ok(())
    }
}
