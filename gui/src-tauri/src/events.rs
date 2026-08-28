/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use serde::Serialize;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressPayload {
    pub current: usize,
    pub total: usize,
    pub operation: String,
    pub partition: String,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletePayload {
    pub success: bool,
    pub error: Option<String>,
    pub operation: String,
    pub partition: String,
}

pub fn emit_progress(
    app: &AppHandle,
    current: usize,
    total: usize,
    operation: &str,
    partition: &str,
) {
    let percentage = if total > 0 {
        (current as f64 / total as f64 * 100.0).min(100.0)
    } else {
        0.0
    };

    let _ = app.emit(
        "operation:progress",
        ProgressPayload {
            current,
            total,
            operation: operation.to_string(),
            partition: partition.to_string(),
            percentage,
        },
    );
}

pub fn emit_complete(
    app: &AppHandle,
    success: bool,
    error: Option<String>,
    operation: &str,
    partition: &str,
) {
    let _ = app.emit(
        "operation:complete",
        CompletePayload {
            success,
            error,
            operation: operation.to_string(),
            partition: partition.to_string(),
        },
    );
}
