/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 Shomy
*/

use std::fs;
use std::path::PathBuf;
use std::sync::Arc;

use anyhow::Result;
use config::{Config, Environment, File};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Clone, Serialize)]
pub struct GuiConfig {
    #[serde(default)]
    pub theme: String,
    #[serde(default)]
    pub log_level: String,
    #[serde(default)]
    pub save_device_paths: bool,
}

impl Default for GuiConfig {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            log_level: "info".to_string(),
            save_device_paths: true,
        }
    }
}

#[derive(Debug, Default, Deserialize, Clone, Serialize)]
pub struct AuthConfig {
    pub online_auth: bool,
    pub endpoint: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
}

#[derive(Debug, Default, Deserialize, Clone, Serialize)]
pub struct AntumbraConfig {
    pub gui: GuiConfig,
    pub auth: AuthConfig,
}

impl AntumbraConfig {
    pub fn load() -> Result<Arc<Self>> {
        let mut builder = Config::builder();
        let defaults = Self::default();

        builder = builder.set_default("gui.theme", defaults.gui.theme)?;
        builder = builder.set_default("gui.log_level", defaults.gui.log_level)?;
        builder = builder.set_default("gui.save_device_paths", defaults.gui.save_device_paths)?;
        builder = builder.set_default("auth.online_auth", defaults.auth.online_auth)?;
        builder = builder.set_default("auth.endpoint", defaults.auth.endpoint)?;
        builder = builder.set_default("auth.username", defaults.auth.username)?;
        builder = builder.set_default("auth.password", defaults.auth.password)?;

        if let Some(path) = Self::get_path() {
            builder = builder.add_source(File::from(path).required(false));
        }

        builder = builder.add_source(Environment::with_prefix("PENUMBRA"));
        let (cfg, parsed) = match builder.build().and_then(|c| c.try_deserialize::<Self>()) {
            Ok(cfg) => (cfg, true),
            Err(e) => {
                log::warn!("Could not read config ({e})");
                (Self::default(), false)
            }
        };

        if parsed {
            let _ = cfg.save();
        }

        Ok(Arc::new(cfg))
    }

    pub fn save(&self) -> Result<()> {
        if let Some(path) = Self::get_path() {
            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent)?;
            }

            let toml_string = toml::to_string_pretty(self)?;
            fs::write(path, toml_string)?;
        }
        Ok(())
    }

    fn get_path() -> Option<PathBuf> {
        dirs::config_dir().map(|p| p.join("penumbra/config.toml"))
    }
}
