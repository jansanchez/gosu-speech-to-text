//! Optional native paste adapters. Clipboard fallback remains available everywhere.
use std::{io::Read, process::Command, sync::Mutex};
static TARGET: Mutex<Option<String>> = Mutex::new(None);
pub(crate) fn run(program: &str, args: &[&str]) -> Result<String, String> {
    let mut child = Command::new(program)
        .args(args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Could not run {program}: {e}. The text remains copied."))?;
    let stdout = child.stdout.take().ok_or("Could not read output.")?;
    let stderr = child.stderr.take().ok_or("Could not read diagnostics.")?;
    fn read(pipe: impl Read) -> std::io::Result<Vec<u8>> {
        let mut data = Vec::new();
        pipe.take(2_000_001).read_to_end(&mut data)?;
        Ok(data)
    }
    let output = std::thread::spawn(move || read(stdout));
    let errors = std::thread::spawn(move || read(stderr));
    let deadline = std::time::Instant::now()
        + std::time::Duration::from_secs(if program == "hyprctl" { 5 } else { 30 });
    loop {
        if child.try_wait().map_err(|e| e.to_string())?.is_some() {
            break;
        }
        if std::time::Instant::now() > deadline {
            let _ = child.kill();
            let _ = child.wait();
            return Err(format!("{program} timed out. The text remains copied."));
        }
        std::thread::sleep(std::time::Duration::from_millis(30));
    }
    let status = child.wait().map_err(|e| e.to_string())?;
    let output = output
        .join()
        .map_err(|_| "Could not read output.")?
        .map_err(|e| e.to_string())?;
    let errors = errors
        .join()
        .map_err(|_| "Could not read diagnostics.")?
        .map_err(|e| e.to_string())?;
    if output.len() > 2_000_000 || errors.len() > 2_000_000 {
        return Err("System response is too large.".into());
    }
    if !status.success() {
        return Err(format!(
            "{program}: {}. The text remains copied.",
            String::from_utf8_lossy(if errors.is_empty() { &output } else { &errors }).trim()
        ));
    }
    Ok(String::from_utf8_lossy(&output).trim().to_owned())
}
#[cfg(target_os = "linux")]
fn active() -> Result<String, String> {
    if std::env::var("XDG_SESSION_TYPE").unwrap_or_default() == "wayland"
        || std::env::var("WAYLAND_DISPLAY").is_ok()
        || std::env::var("DISPLAY").is_err()
    {
        return Err(
            "On Wayland use Copy and Ctrl+V; pasting between applications depends on the compositor."
                .into(),
        );
    }
    run("xdotool", &["getactivewindow"])
}
#[cfg(target_os = "macos")]
fn active() -> Result<String, String> {
    run("osascript",&["-e","tell application \"System Events\" to get bundle identifier of first application process whose frontmost is true"])
}
#[cfg(not(any(target_os = "linux", target_os = "macos")))]
fn active() -> Result<String, String> {
    Err("Use your system clipboard.".into())
}
fn external(id: &str) -> Result<bool, String> {
    #[cfg(target_os = "linux")]
    {
        let pid = run("xdotool", &["getwindowpid", id])?;
        return Ok(pid != std::process::id().to_string());
    }
    #[cfg(target_os = "macos")]
    {
        return Ok(id != "org.voz.prototype");
    }
    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    {
        let _ = id;
        Ok(false)
    }
}
pub fn remember() -> Result<(), String> {
    #[cfg(target_os = "linux")]
    if crate::hyprland::available() {
        crate::hyprland::capture()?;
        return Ok(());
    }

    let id = active()?;
    if external(&id)? {
        *TARGET.lock().map_err(|e| e.to_string())? = Some(id);
    }
    Ok(())
}
pub fn paste(activate: bool) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    if crate::hyprland::available() {
        return crate::hyprland::paste(None, activate);
    }

    let id = if activate {
        TARGET.lock().map_err(|e|e.to_string())?.clone().ok_or("No remembered destination. Use the shortcut in the destination application or paste manually.".to_owned())?
    } else {
        active()?
    };
    if !external(&id)? {
        return Err("Select another application. The text is copied.".into());
    }
    #[cfg(target_os = "linux")]
    {
        if !id.chars().all(|c| c.is_ascii_digit()) {
            return Err("Invalid X11 destination.".into());
        }
        if activate {
            run("xdotool", &["windowactivate", "--sync", &id])?;
        }
        std::thread::sleep(std::time::Duration::from_millis(150));
        if active()? != id {
            return Err("The destination changed. No keys were sent.".into());
        }
        let class = run("xprop", &["-id", &id, "WM_CLASS"]).unwrap_or_default();
        let keys = if crate::hyprland::terminal(&class) {
            "ctrl+shift+v"
        } else {
            "ctrl+v"
        };
        run("xdotool", &["key", "--clearmodifiers", keys])?;
        return Ok(());
    }
    #[cfg(target_os = "macos")]
    {
        if !id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || ".-_".contains(c))
        {
            return Err("Invalid application identifier.".into());
        }
        if activate {
            let script = format!("tell application id \"{id}\" to activate");
            run("osascript", &["-e", &script])?;
        }
        #[link(name = "ApplicationServices", kind = "framework")]
        extern "C" {
            fn CGEventSourceFlagsState(state_id: i32) -> u64;
        }
        let modifiers = (1u64 << 17) | (1u64 << 18) | (1u64 << 19) | (1u64 << 20);
        for _ in 0..100 {
            if unsafe { CGEventSourceFlagsState(0) } & modifiers == 0 {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(20));
        }
        if unsafe { CGEventSourceFlagsState(0) } & modifiers != 0 {
            return Err("Release the shortcut keys and try again. The text is copied.".into());
        }
        std::thread::sleep(std::time::Duration::from_millis(150));
        if active()? != id {
            return Err("The active application changed. Paste manually.".into());
        }
        run(
            "osascript",
            &[
                "-e",
                "tell application \"System Events\" to keystroke \"v\" using command down",
            ],
        )?;
        return Ok(());
    }
    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    Err("Text copied. Paste manually in the destination.".into())
}

/// Capture identity and application metadata without reading document contents.
pub fn capture_destination() -> Result<crate::minimal::Destination, String> {
    let id = active()?;
    if !external(&id)? {
        return Err("Focus another application and press the shortcut.".into());
    }
    #[cfg(target_os = "linux")]
    {
        let pid = run("xdotool", &["getwindowpid", &id])?
            .parse::<u64>()
            .map_err(|e| e.to_string())?;
        let class = run("xprop", &["-id", &id, "WM_CLASS"])?;
        let app = class
            .split('"')
            .filter(|part| !part.trim().is_empty())
            .nth(3)
            .unwrap_or("X11 application")
            .to_owned();
        *TARGET.lock().map_err(|e| e.to_string())? = Some(id.clone());
        return Ok(crate::minimal::Destination {
            id: format!("x11:{id}:{pid}"),
            name: app.clone(),
            terminal: crate::hyprland::terminal(&app),
            app,
            pid,
        });
    }
    #[cfg(target_os = "macos")]
    {
        *TARGET.lock().map_err(|e| e.to_string())? = Some(id.clone());
        Ok(crate::minimal::Destination {
            id: format!("macos:{id}"),
            name: id.clone(),
            app: id,
            terminal: false,
            pid: 0,
        })
    }
    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    Err("Could not detect the destination.".into())
}
pub fn paste_destination(expected: &str) -> Result<(), String> {
    let target = TARGET
        .lock()
        .map_err(|e| e.to_string())?
        .clone()
        .ok_or("No remembered destination.")?;
    #[cfg(target_os = "linux")]
    {
        let pid = run("xdotool", &["getwindowpid", &target])?;
        if expected != format!("x11:{target}:{pid}") {
            return Err("The destination window changed or closed.".into());
        }
    }
    #[cfg(target_os = "macos")]
    if expected != format!("macos:{target}") {
        return Err("The destination application changed.".into());
    }
    paste(true)
}

#[cfg(test)]
mod tests {
    #[test]
    fn command_output_larger_than_a_pipe_is_drained() {
        let value = super::run("sh", &["-c", "printf '%0100000d' 0"]).unwrap();
        assert_eq!(value.len(), 100000);
    }
}
