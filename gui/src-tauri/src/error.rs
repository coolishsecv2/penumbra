/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use serde::{Deserialize, Serialize};

/// Error categories for better error classification and user guidance
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCategory {
    Network,
    Permission,
    FileSystem,
    Validation,
    Command,
    Unknown,
}

impl ErrorCategory {
    pub fn unknown() -> Self {
        ErrorCategory::Unknown
    }
}

/// Comprehensive error type for all application errors
#[derive(Debug, thiserror::Error, Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum AppError {
    #[error("Device not connected")]
    #[serde(rename = "device_not_connected")]
    NotConnected,

    #[error("Connection failed: {message}")]
    #[serde(rename = "connection")]
    Connection {
        message: String,
        #[serde(default = "ErrorCategory::unknown")]
        category: ErrorCategory,
        #[serde(skip_serializing_if = "Option::is_none")]
        suggestion: Option<String>,
    },

    #[error("Device error: {message}")]
    #[serde(rename = "device")]
    Device {
        message: String,
        #[serde(default = "ErrorCategory::unknown")]
        category: ErrorCategory,
        #[serde(skip_serializing_if = "Option::is_none")]
        suggestion: Option<String>,
    },

    #[error("IO error: {message}")]
    #[serde(rename = "io")]
    Io {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<i32>,
    },

    #[error("Anyhow error: {0}")]
    Anyhow(#[from] anyhow::Error),

    #[error("Operation cancelled")]
    #[serde(rename = "cancelled")]
    Cancelled,
}

impl AppError {
    /// Create a new Connection error
    pub fn connection(message: impl Into<String>) -> Self {
        AppError::Connection {
            message: message.into(),
            category: ErrorCategory::Unknown,
            suggestion: None,
        }
    }

    /// Create a new Device error
    pub fn device(message: impl Into<String>) -> Self {
        AppError::Device {
            message: message.into(),
            category: ErrorCategory::Unknown,
            suggestion: None,
        }
    }

    /// Create a new Command error (alias for connection)
    pub fn command(message: impl Into<String>) -> Self {
        AppError::connection(message)
    }

    /// Get the error category
    pub fn category(&self) -> ErrorCategory {
        match self {
            AppError::NotConnected => ErrorCategory::Command,
            AppError::Connection { category, .. } => category.clone(),
            AppError::Device { category, .. } => category.clone(),
            AppError::Io { .. } => ErrorCategory::FileSystem,
            AppError::Anyhow(_) => ErrorCategory::Unknown,
            AppError::Cancelled => ErrorCategory::Command,
        }
    }

    /// Get the suggestion for this error
    pub fn suggestion(&self) -> Option<String> {
        match self {
            AppError::Connection { suggestion, .. } => suggestion.clone(),
            AppError::Device { suggestion, .. } => suggestion.clone(),
            AppError::Io { message, code } => {
                let lower = message.to_lowercase();
                if *code == Some(5)
                    || lower.contains("access denied")
                    || lower.contains("permission denied")
                {
                    Some("Run as Administrator or check file permissions".to_string())
                } else if lower.contains("sharing violation")
                    || lower.contains("error code 32")
                    || lower.contains("being used by another process")
                {
                    Some("Close other instances of Penumbra and try again".to_string())
                } else {
                    None
                }
            }
            _ => None,
        }
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        let code = err.raw_os_error();
        let msg = err.to_string();
        let lower = msg.to_lowercase();

        if code == Some(5)
            || lower.contains("access denied")
            || lower.contains("permission denied")
        {
            return AppError::Io {
                message: msg,
                code,
            };
        }

        if lower.contains("sharing violation")
            || lower.contains("error code 32")
            || lower.contains("being used by another process")
        {
            return AppError::Io {
                message: msg,
                code,
            };
        }

        AppError::Io { message: msg, code }
    }
}

impl From<anyhow::Error> for AppError {
    fn from(err: anyhow::Error) -> Self {
        let err_str = err.to_string();
        let err_lower = err_str.to_lowercase();

        if err_lower.contains("sharing violation")
            || err_lower.contains("error code 32")
            || err_lower.contains("being used by another process")
        {
            return AppError::Connection {
                message: err_str,
                category: ErrorCategory::Permission,
                suggestion: Some("Close other instances of Penumbra and try again".to_string()),
            };
        }

        if err_lower.contains("access denied")
            || err_lower.contains("error code 5")
            || err_lower.contains("permission denied")
        {
            return AppError::Connection {
                message: err_str,
                category: ErrorCategory::Permission,
                suggestion: Some("Run as Administrator or check antivirus settings".to_string()),
            };
        }

        if err_lower.contains("network")
            || err_lower.contains("connection")
            || err_lower.contains("timeout")
            || err_lower.contains("dns")
        {
            return AppError::Connection {
                message: err_str,
                category: ErrorCategory::Network,
                suggestion: Some("Check your USB connection and try again".to_string()),
            };
        }

        if err_lower.contains("no mtk device found")
            || err_lower.contains("no device found")
            || err_lower.contains("device not found")
        {
            return AppError::Connection {
                message: err_str,
                category: ErrorCategory::Command,
                suggestion: Some(
                    "Ensure the device is connected in Preloader or BROM mode".to_string(),
                ),
            };
        }

        if err_lower.contains("disk full")
            || err_lower.contains("insufficient disk space")
            || err_lower.contains("no space left")
        {
            return AppError::Device {
                message: err_str,
                category: ErrorCategory::FileSystem,
                suggestion: Some("Free up disk space and try again".to_string()),
            };
        }

        AppError::Device {
            message: err_str,
            category: ErrorCategory::Unknown,
            suggestion: None,
        }
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
