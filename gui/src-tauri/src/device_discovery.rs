/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2026 coolishsec0175
*/

use std::collections::HashSet;
use std::io;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use serde::Serialize;

use crate::error::AppError;

const MTK_VID: u16 = 0x0E8D;
const PORT_WAIT_TIMEOUT: Duration = Duration::from_secs(120);
const PORT_POLL_INTERVAL: Duration = Duration::from_millis(250);

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UdevProgressEvent {
    pub status: String,
    pub message: String,
}

fn emit_udev_progress(app: Option<&AppHandle>, status: &str, message: &str) {
    if let Some(handle) = app {
        let _ = handle.emit(
            "device:udev-status",
            UdevProgressEvent {
                status: status.to_string(),
                message: message.to_string(),
            },
        );
    }
    log::info!("[udev] {}: {}", status, message);
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct PortCandidate {
    device: String,
    description: String,
    hwid: String,
    vid: Option<u16>,
    pid: Option<u16>,
}

enum PortSearchResult {
    Openable(PortCandidate),
    NothingFound {
        permission_denied: Option<PortCandidate>,
    },
}

trait PortDiscovery {
    fn list_candidates(&self) -> Vec<PortCandidate>;
    fn try_open(&self, device: &str) -> Result<(), anyhow::Error>;
}

struct SystemPortDiscovery;

impl PortDiscovery for SystemPortDiscovery {
    fn list_candidates(&self) -> Vec<PortCandidate> {
        let mut ports: Vec<PortCandidate> = serialport::available_ports()
            .unwrap_or_default()
            .into_iter()
            .map(|info| {
                let (description, hwid, vid, pid) = match info.port_type {
                    serialport::SerialPortType::UsbPort(usb) => (
                        usb.product.unwrap_or_default(),
                        usb.serial_number.unwrap_or_default(),
                        Some(usb.vid),
                        Some(usb.pid),
                    ),
                    _ => (String::new(), String::new(), None, None),
                };
                PortCandidate {
                    device: info.port_name,
                    description,
                    hwid,
                    vid,
                    pid,
                }
            })
            .collect();
        ports.sort_by(|a, b| a.device.cmp(&b.device));
        ports
    }

    fn try_open(&self, device: &str) -> Result<(), anyhow::Error> {
        let _ = serialport::new(device, 115_200)
            .timeout(Duration::from_millis(250))
            .open()?;
        Ok(())
    }
}

/// Returns `true` if `error` is a permission-denied error.
pub fn is_permission_error(error: &anyhow::Error) -> bool {
    if let Some(io_err) = error.downcast_ref::<io::Error>() {
        if io_err.kind() == io::ErrorKind::PermissionDenied {
            return true;
        }
        #[cfg(unix)]
        {
            if let Some(os_err) = io_err.raw_os_error() {
                if os_err == libc::EACCES || os_err == libc::EPERM {
                    return true;
                }
            }
        }
    }

    let msg = format!("{error:#}").to_lowercase();
    msg.contains("permission denied") || msg.contains("access is denied") || msg.contains("access denied")
}

fn find_new_port(previous: &HashSet<String>, discovery: &dyn PortDiscovery) -> PortSearchResult {
    let mut permission_denied: Option<PortCandidate> = None;

    for candidate in discovery.list_candidates() {
        if previous.contains(&candidate.device) {
            continue;
        }

        match discovery.try_open(&candidate.device) {
            Ok(()) => return PortSearchResult::Openable(candidate),
            Err(e) if is_permission_error(&e) => {
                permission_denied = Some(candidate);
                continue;
            }
            Err(_) => continue,
        }
    }

    PortSearchResult::NothingFound { permission_denied }
}

/// Scan all serial ports and return the best MTK preloader candidate that can be opened,
/// or `None` if no candidate found.
fn find_existing_mtk_port() -> Option<String> {
    let discovery = SystemPortDiscovery;
    let previous: HashSet<String> = HashSet::new();
    match find_new_port(&previous, &discovery) {
        PortSearchResult::Openable(candidate) => Some(candidate.device),
        _ => None,
    }
}

/// Wait up to `timeout` for a new MTK preloader serial port to appear.
/// Automatically installs udev rules on Linux if a permission-denied device is detected.
fn wait_for_port(
    auto_udev: bool,
    timeout: Duration,
    poll_interval: Duration,
    app: Option<&AppHandle>,
    cancel: Option<&Arc<AtomicBool>>,
) -> Result<String, AppError> {
    let discovery = SystemPortDiscovery;
    let previous_devices: HashSet<String> = discovery
        .list_candidates()
        .into_iter()
        .map(|c| c.device)
        .collect();
    let mut tried_udev_for: HashSet<String> = HashSet::new();
    let deadline = Instant::now() + timeout;

    loop {
        if let Some(c) = cancel {
            if c.load(Ordering::Relaxed) {
                return Err(AppError::Connection("Connection cancelled".to_string()));
            }
        }

        match find_new_port(&previous_devices, &discovery) {
            PortSearchResult::Openable(candidate) => {
                emit_udev_progress(app, "port_found", &candidate.device);
                return Ok(candidate.device);
            }
            PortSearchResult::NothingFound {
                permission_denied: Some(denied),
            } => {
                if !tried_udev_for.contains(&denied.device) {
                    tried_udev_for.insert(denied.device.clone());
                    if auto_udev {
                        emit_udev_progress(
                            app,
                            "installing_udev",
                            &format!(
                                "Permission denied opening {}. Installing udev rules...",
                                denied.device
                            ),
                        );
                        auto_install_linux_rule(app);
                    } else {
                        emit_udev_progress(
                            app,
                            "permission_denied",
                            &format!(
                                "Permission denied opening {}. Run with auto-udev enabled.",
                                denied.device
                            ),
                        );
                    }
                }
            }
            PortSearchResult::NothingFound {
                permission_denied: None,
            } => {}
        }

        if Instant::now() >= deadline {
            let msg = format!(
                "Timed out after {:.0}s waiting for MTK preloader serial port",
                timeout.as_secs_f64()
            );
            emit_udev_progress(app, "timeout", &msg);
            return Err(AppError::Connection(msg));
        }

        std::thread::sleep(poll_interval);
    }
}

/// Attempt to open a serial port. If the open fails due to permission errors on Linux,
/// install udev rules and retry once.
fn open_with_udev_recovery(device: &str, app: Option<&AppHandle>) -> Result<(), AppError> {
    match serialport::new(device, 115_200)
        .timeout(Duration::from_millis(250))
        .open()
    {
        Ok(_) => Ok(()),
        Err(e) => {
            let err = anyhow::Error::new(e);
            if is_permission_error(&err) {
                emit_udev_progress(
                    app,
                    "retry_udev",
                    &format!("Permission denied on {device}, installing udev rules..."),
                );
                auto_install_linux_rule(app);
                serialport::new(device, 115_200)
                    .timeout(Duration::from_millis(250))
                    .open()
                    .map_err(|e| AppError::Connection(format!("Still cannot open {device}: {e}")))?;
                Ok(())
            } else {
                Err(AppError::Connection(format!("Failed to open {device}: {err}")))
            }
        }
    }
}

/// Ensure udev rules for MediaTek devices are installed.
///
/// Scans all available serial ports. If any MTK device (VID 0x0E8D) is detected but
/// cannot be opened due to permission errors, installs udev rules automatically.
///
/// Returns `Ok(true)` if rules were installed, `Ok(false)` if already present or no
/// MTK device found.
pub fn ensure_udev_rules(app: Option<&AppHandle>) -> Result<bool, AppError> {
    let discovery = SystemPortDiscovery;
    let candidates = discovery.list_candidates();
    let mut needs_udev = false;

    for candidate in &candidates {
        if candidate.vid != Some(MTK_VID) {
            continue;
        }

        match discovery.try_open(&candidate.device) {
            Ok(()) => {
                emit_udev_progress(app, "port_ok", &candidate.device);
            }
            Err(e) if is_permission_error(&e) => {
                emit_udev_progress(
                    app,
                    "port_permission_denied",
                    &format!(
                        "MTK device at {} needs udev rules",
                        candidate.device
                    ),
                );
                needs_udev = true;
            }
            Err(_) => {}
        }
    }

    if needs_udev {
        emit_udev_progress(app, "installing_udev", "Installing MediaTek udev rules...");
        auto_install_linux_rule(app);
        emit_udev_progress(app, "udev_done", "Udev rules installed");
        return Ok(true);
    }

    Ok(false)
}

/// Find an MTK preloader port (either already connected or wait for one).
///
/// If a port is already available, returns it immediately.
/// Otherwise, waits up to the default timeout for one to appear.
/// Automatically installs udev rules on permission errors.
pub fn find_or_wait_preloader_port(
    app: Option<&AppHandle>,
    cancel: Option<&Arc<AtomicBool>>,
) -> Result<String, AppError> {
    if let Some(port) = find_existing_mtk_port() {
        return Ok(port);
    }

    emit_udev_progress(
        app,
        "waiting",
        "No MTK preloader port found. Waiting for device...",
    );

    wait_for_port(true, PORT_WAIT_TIMEOUT, PORT_POLL_INTERVAL, app, cancel)
}

// ── Linux udev management ──────────────────────────────────────────────────────

#[cfg(target_os = "linux")]
const UDEV_RULE_PATH: &str = "/etc/udev/rules.d/99-mediatek-preloader.rules";

#[cfg(target_os = "linux")]
const UDEV_RULES_CONTENT: &str = r#"# MediaTek Preloader / BROM / Download Agent
# Common IDs: 0e8d:2000 preloader, 0e8d:0003 DA/BROM

SUBSYSTEM=="usb", ATTR{idVendor}=="0e8d", MODE="0666", TAG+="uaccess"
SUBSYSTEM=="tty", ATTRS{idVendor}=="0e8d", MODE="0666", TAG+="uaccess"
"#;

#[cfg(target_os = "linux")]
pub fn auto_install_linux_rule(app: Option<&AppHandle>) -> bool {
    emit_udev_progress(app, "udev_write", "Writing udev rules...");

    let existing = std::fs::read_to_string(UDEV_RULE_PATH).ok();

    if existing.as_deref() == Some(UDEV_RULES_CONTENT) {
        emit_udev_progress(app, "udev_skip", "Udev rules already installed.");
        return false;
    }

    let result = std::process::Command::new("sudo")
        .args(["tee", UDEV_RULE_PATH])
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .and_then(|mut child| {
            use std::io::Write;
            if let Some(mut stdin) = child.stdin.take() {
                stdin.write_all(UDEV_RULES_CONTENT.as_bytes())?;
            }
            child.wait()?;
            Ok(())
        });

    match result {
        Ok(()) => {
            emit_udev_progress(app, "udev_reload", "Reloading udev rules...");
            let _ = std::process::Command::new("sudo")
                .args(["udevadm", "control", "--reload-rules"])
                .status();
            let _ = std::process::Command::new("sudo")
                .args(["udevadm", "trigger"])
                .status();
            emit_udev_progress(app, "udev_success", "Udev rules installed and reloaded.");
            true
        }
        Err(e) => {
            emit_udev_progress(
                app,
                "udev_error",
                &format!("Failed to install udev rules: {e}"),
            );
            false
        }
    }
}

#[cfg(not(target_os = "linux"))]
pub fn auto_install_linux_rule(_app: Option<&AppHandle>) -> bool {
    emit_udev_progress(
        _app,
        "udev_unsupported",
        "Automatic udev setup is only supported on Linux. Fix permissions manually.",
    );
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    struct FakeDiscovery {
        ports: Vec<PortCandidate>,
        permission_denied: HashSet<String>,
    }

    impl FakeDiscovery {
        fn new(ports: Vec<PortCandidate>) -> Self {
            Self {
                ports,
                permission_denied: HashSet::new(),
            }
        }

        #[allow(dead_code)]
        fn with_permission_denied(mut self, devices: &[&str]) -> Self {
            for d in devices {
                self.permission_denied.insert(d.to_string());
            }
            self
        }
    }

    impl PortDiscovery for FakeDiscovery {
        fn list_candidates(&self) -> Vec<PortCandidate> {
            self.ports.clone()
        }

        fn try_open(&self, device: &str) -> Result<(), anyhow::Error> {
            if self.permission_denied.contains(device) {
                return Err(anyhow::Error::new(io::Error::new(
                    io::ErrorKind::PermissionDenied,
                    "Permission denied",
                )));
            }
            Ok(())
        }
    }

    #[test]
    fn find_new_port_finds_new_device() {
        let candidate = PortCandidate {
            device: "/dev/ttyACM0".into(),
            description: "Preloader".into(),
            hwid: "USB".into(),
            vid: Some(0x0E8D),
            pid: Some(0x2000),
        };
        let discovery = FakeDiscovery::new(vec![candidate.clone()]);

        let result = find_new_port(&HashSet::new(), &discovery);

        match result {
            PortSearchResult::Openable(c) => assert_eq!(c, candidate),
            _ => panic!("expected Openable"),
        }
    }

    #[test]
    fn find_new_port_skips_known_devices() {
        let candidate = PortCandidate {
            device: "/dev/ttyACM0".into(),
            description: "Preloader".into(),
            hwid: "USB".into(),
            vid: None,
            pid: None,
        };
        let discovery = FakeDiscovery::new(vec![candidate]);
        let previous: HashSet<String> = ["/dev/ttyACM0".into()].into_iter().collect();

        let result = find_new_port(&previous, &discovery);

        match result {
            PortSearchResult::NothingFound {
                permission_denied: None,
            } => {}
            _ => panic!("expected NothingFound"),
        }
    }

    #[test]
    fn find_new_port_reports_permission_candidate() {
        let candidate = PortCandidate {
            device: "/dev/ttyACM0".into(),
            description: "Preloader".into(),
            hwid: "USB".into(),
            vid: Some(0x0E8D),
            pid: Some(0x2000),
        };
        let discovery =
            FakeDiscovery::new(vec![candidate.clone()]).with_permission_denied(&["/dev/ttyACM0"]);

        let result = find_new_port(&HashSet::new(), &discovery);

        match result {
            PortSearchResult::NothingFound {
                permission_denied: Some(denied),
            } => assert_eq!(denied, candidate),
            _ => panic!("expected NothingFound with permission_denied"),
        }
    }

    #[test]
    fn is_permission_error_works() {
        let err = anyhow::Error::new(io::Error::new(io::ErrorKind::PermissionDenied, "nope"));
        assert!(is_permission_error(&err));

        let err = anyhow::anyhow!("could not open port: Permission denied");
        assert!(is_permission_error(&err));

        let err = anyhow::anyhow!("Access is denied");
        assert!(is_permission_error(&err));

        let err = anyhow::anyhow!("device busy");
        assert!(!is_permission_error(&err));
    }
}
