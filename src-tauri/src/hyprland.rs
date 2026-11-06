//! Hyprland integration: explicit window identity, terminal-aware paste and owned binds.
use crate::minimal::Destination;
use serde_json::Value;
use std::sync::{Mutex, OnceLock};

static DESTINATION: Mutex<Option<Destination>> = Mutex::new(None);
static BIND: Mutex<Option<Binding>> = Mutex::new(None);
static VISIBILITY_BIND: Mutex<Option<Binding>> = Mutex::new(None);
static PANEL_BIND: Mutex<Option<Binding>> = Mutex::new(None);
struct Binding {
    slot: &'static str,
    spec: String,
    fingerprint: Value,
    modern: bool,
}

pub fn available() -> bool {
    std::env::var_os("HYPRLAND_INSTANCE_SIGNATURE").is_some()
}
fn command(args: &[&str]) -> Result<String, String> {
    crate::platform::run("hyprctl", args)
}
fn json(args: &[&str]) -> Result<Value, String> {
    serde_json::from_str(&command(args)?).map_err(|e| format!("Invalid Hyprland response: {e}"))
}
fn modern() -> bool {
    static MODERN: OnceLock<bool> = OnceLock::new();
    *MODERN.get_or_init(|| command(&["eval", "assert(hl and hl.dsp and hl.bind)"]).is_ok())
}
fn quote(value: &str) -> String {
    serde_json::to_string(value).unwrap()
}
fn dispatch(legacy: &str, args: &str, lua: &str) -> Result<String, String> {
    if modern() {
        command(&["eval", &format!("hl.dispatch({lua})")])
    } else {
        command(&["dispatch", legacy, args])
    }
}
pub fn terminal(app: &str) -> bool {
    let app = app.to_lowercase();
    [
        "wezterm",
        "kitty",
        "alacritty",
        "foot",
        "konsole",
        "gnome-terminal",
        "org.gnome.ptyxis",
        "ghostty",
        "xterm",
        "terminator",
        "tilix",
        "org.gnome.console",
        "rio",
    ]
    .iter()
    .any(|name| app.contains(name))
}
fn own_class(app: &str) -> bool {
    matches!(app, "org.voz.prototype" | "gosu-speech-to-text")
}
fn destination(value: &Value) -> Result<Destination, String> {
    let id = value["address"].as_str().unwrap_or_default();
    let app = value["class"].as_str().unwrap_or_default();
    let pid = value["pid"].as_u64().unwrap_or(0);
    if !id.starts_with("0x")
        || id.len() < 3
        || !id[2..].chars().all(|c| c.is_ascii_hexdigit())
        || pid == 0
    {
        return Err(
            "No destination window detected. Focus the field and press the shortcut.".into(),
        );
    }
    if pid == u64::from(std::process::id()) || own_class(app) {
        return Err(
            "Focus a field in another application and press the shortcut to dictate there.".into(),
        );
    }
    Ok(Destination {
        id: id.into(),
        app: app.into(),
        name: app.into(),
        terminal: terminal(app),
        pid,
    })
}
pub fn capture() -> Result<Destination, String> {
    let result = destination(&json(&["-j", "activewindow"])?);
    // Clear stale targets when capture fails, rather than reusing a previous window.
    *DESTINATION.lock().map_err(|e| e.to_string())? = result.as_ref().ok().cloned();
    result
}
pub fn paste(expected: Option<&str>, activate: bool) -> Result<(), String> {
    let target = if activate {
        DESTINATION
            .lock()
            .map_err(|e| e.to_string())?
            .clone()
            .ok_or("No remembered destination.")?
    } else {
        destination(&json(&["-j", "activewindow"])?)?
    };
    if expected.is_some_and(|id| id != target.id) {
        return Err("The destination changed. The text is preserved in GOSU.".into());
    }
    let clients = json(&["-j", "clients"])?;
    let exists = clients.as_array().is_some_and(|items| {
        items.iter().any(|item| {
            item["address"].as_str() == Some(&target.id)
                && item["pid"].as_u64() == Some(target.pid)
                && item["class"].as_str() == Some(&target.app)
        })
    });
    if !exists {
        return Err(
            "The destination window no longer exists. The text is preserved in GOSU.".into(),
        );
    }
    if activate {
        let selector = format!("address:{}", target.id);
        dispatch(
            "focuswindow",
            &selector,
            &format!("hl.dsp.focus({{window={}}})", quote(&selector)),
        )?;
    }
    std::thread::sleep(std::time::Duration::from_millis(120));
    let active = destination(&json(&["-j", "activewindow"])?)?;
    if active.id != target.id || active.pid != target.pid {
        return Err("Focus changed. Text was not inserted.".into());
    }
    let mods = if target.terminal {
        "CTRL SHIFT"
    } else {
        "CTRL"
    };
    let selector = format!("address:{}", target.id);
    let result = dispatch(
        "sendshortcut",
        &format!("{mods},V,{selector}"),
        &format!(
            "hl.dsp.send_shortcut({{mods={},key=\"V\",window={}}})",
            quote(&mods.replace(' ', " + ")),
            quote(&selector)
        ),
    )?;
    if result.trim() != "ok" {
        return Err(format!("Hyprland did not confirm insertion: {result}"));
    }
    Ok(())
}
fn shortcut(value: &str) -> Result<(String, u64, String), String> {
    let mut mods = Vec::new();
    let mut mask = 0;
    let mut key = None;
    for part in value.split('+') {
        match part.to_lowercase().as_str() {
            "commandorcontrol" | "control" | "ctrl" => {
                mods.push("CTRL");
                mask |= 4;
            }
            "shift" => {
                mods.push("SHIFT");
                mask |= 1;
            }
            "alt" => {
                mods.push("ALT");
                mask |= 8;
            }
            "super" | "meta" | "command" => {
                mods.push("SUPER");
                mask |= 64;
            }
            _ if key.is_none()
                && !part.is_empty()
                && part.chars().all(|c| c.is_ascii_alphanumeric()) =>
            {
                key = Some(part.to_string())
            }
            _ => return Err(
                "The shortcut must include modifiers and a key, for example Control+Shift+Space."
                    .into(),
            ),
        }
    }
    let key = key.ok_or("The shortcut key is missing.")?;
    if mask == 0 {
        return Err("Use at least one modifier for the global shortcut.".into());
    }
    Ok((mods.join(" "), mask, key))
}
fn matches(bind: &Value, mask: u64, key: &str) -> bool {
    bind["modmask"].as_u64() == Some(mask)
        && bind["key"]
            .as_str()
            .is_some_and(|v| v.eq_ignore_ascii_case(key))
}
fn remove_owned(binding: Binding) {
    let slot = binding.slot;
    if binding.modern {
        let _=command(&["eval",&format!("if _G.{slot} and _G.{slot}.pid=={} then _G.{slot}.binding:unbind(); _G.{slot}=nil end",std::process::id())]);
        return;
    }
    let Ok(binds) = json(&["-j", "binds"]) else {
        return;
    };
    let Ok((_, mask, key)) = shortcut(&binding.spec) else {
        return;
    };
    let Some(items) = binds.as_array() else {
        return;
    };
    let matching: Vec<_> = items
        .iter()
        .filter(|value| matches(value, mask, &key))
        .collect();
    // Never remove a key that the user has rebound while GOSU was running.
    if matching.len() == 1 && *matching[0] == binding.fingerprint {
        let (mods, _, _) = shortcut(&binding.spec).unwrap();
        let _ = command(&["keyword", "unbind", &format!("{mods},{key}")]);
    }
}
pub fn configure_shortcut(value: Option<&str>, action: &str) -> Result<bool, String> {
    if !available() {
        return Ok(false);
    }
    let (slot, state, flag) = match action {
        "dictation" => ("__gosu_dictation", &BIND, "--toggle-minimal"),
        "panel" => ("__gosu_panel", &PANEL_BIND, "--show-minimal"),
        "visibility" => ("__gosu_visibility", &VISIBILITY_BIND, "--toggle-visibility"),
        _ => return Err("Invalid shortcut action".into()),
    };
    let mut binding = state.lock().map_err(|e| e.to_string())?;
    if let Some(previous) = binding.take() {
        remove_owned(previous);
    }
    let Some(value) = value else { return Ok(true) };
    let (mods, mask, key) = shortcut(value)?;
    let executable = std::env::current_exe().map_err(|e| e.to_string())?;
    let executable = executable.to_string_lossy().into_owned();
    if executable.chars().any(|c| c.is_control()) {
        return Err("The executable path contains unsupported characters.".into());
    }
    if modern() {
        let previous = command(&[
            "repl",
            &format!(
                "_G.{slot} and _G.{slot}.exe=={} and _G.{slot}.pid or 0",
                quote(&executable)
            ),
        ])?;
        if let Ok(pid) = previous.trim().parse::<u32>() {
            if pid != 0
                && (pid == std::process::id()
                    || !std::path::Path::new(&format!("/proc/{pid}")).exists())
            {
                command(&[
                    "eval",
                    &format!("if _G.{slot} then _G.{slot}.binding:unbind();_G.{slot}=nil end"),
                ])?;
            }
        }
    }
    let binds = json(&["-j", "binds"])?;
    if binds
        .as_array()
        .is_some_and(|items| items.iter().any(|bind| matches(bind, mask, &key)))
    {
        return Err(
            "The shortcut is already in use in Hyprland. Choose another in Settings.".into(),
        );
    }
    let shell = format!("'{}' {flag}", executable.replace('\'', "'\\''"));
    let result = if modern() {
        let chord = format!("{} + {}", mods.replace(' ', " + "), key.to_uppercase());
        command(&["eval",&format!("_G.{slot}={{pid={},exe={},binding=hl.bind({},hl.dsp.exec_cmd({}),{{release=true}})}}",std::process::id(),quote(&executable),quote(&chord),quote(&shell))])?
    } else {
        command(&["keyword", "bindr", &format!("{mods},{key},exec,{shell}")])?
    };
    if result.trim() != "ok" {
        return Err(format!(
            "Could not register the shortcut in Hyprland: {result}"
        ));
    }
    let binds = json(&["-j", "binds"])?;
    let fingerprint = binds
        .as_array()
        .and_then(|items| items.iter().find(|bind| matches(bind, mask, &key)))
        .cloned()
        .ok_or("Hyprland did not register the shortcut.")?;
    *binding = Some(Binding {
        slot,
        spec: value.into(),
        fingerprint,
        modern: modern(),
    });
    Ok(true)
}

fn overlay_window(clients: &Value) -> Result<Value, String> {
    let items = clients.as_array().ok_or("Invalid window list.")?;
    if let Some(window) = items
        .iter()
        .find(|item| item["pid"].as_u64() == Some(u64::from(std::process::id())))
    {
        return Ok(window.clone());
    }
    let mut matches = items.iter().filter(|item| {
        ["org.voz.prototype", "gosu-speech-to-text"]
            .iter()
            .any(|class| {
                item["class"].as_str() == Some(*class)
                    || item["initialClass"].as_str() == Some(*class)
            })
    });
    let window = matches.next().ok_or("The GOSU window was not found.")?;
    if matches.next().is_some() {
        return Err("Multiple GOSU windows found; the panel cannot be identified.".into());
    }
    Ok(window.clone())
}
pub fn present_window(overlay: bool) -> Result<(), String> {
    let (width, height) = if overlay { (460, 220) } else { (1180, 820) };
    let mut result = Err("The GOSU window was not found.".to_owned());
    for _ in 0..20 {
        result = overlay_window(&json(&["-j", "clients"])?);
        if result.is_ok() {
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(50));
    }
    let window = result?;
    let address = window["address"]
        .as_str()
        .ok_or("Invalid window address.")?;
    if !address.starts_with("0x") || !address[2..].chars().all(|c| c.is_ascii_hexdigit()) {
        return Err("Invalid window address.".into());
    }
    let selector = format!("address:{address}");
    dispatch(
        "setfloating",
        &selector,
        &format!(
            "hl.dsp.window.float({{window={},action=\"set\"}})",
            quote(&selector)
        ),
    )?;
    let workspace = json(&["-j", "activeworkspace"])?;
    if let Some(id) = workspace["id"].as_i64() {
        if id > 0 {
            dispatch(
                "movetoworkspacesilent",
                &format!("{id},{selector}"),
                &format!(
                    "hl.dsp.window.move({{window={},workspace={},follow=false}})",
                    quote(&selector),
                    quote(&id.to_string())
                ),
            )?;
        }
    }
    dispatch(
        "resizewindowpixel",
        &format!("exact {width} {height},{selector}"),
        &format!(
            "hl.dsp.window.resize({{window={},x={width},y={height},relative=false}})",
            quote(&selector)
        ),
    )?;
    if let Some(monitor) = json(&["-j", "monitors"])?.as_array().and_then(|items| {
        items
            .iter()
            .find(|item| item["focused"].as_bool() == Some(true))
    }) {
        let scale = monitor["scale"].as_f64().unwrap_or(1.0).max(0.1);
        let x = monitor["x"].as_i64().unwrap_or(0)
            + (monitor["width"].as_f64().unwrap_or(1920.) / scale) as i64 / 2
            - width / 2;
        let logical_height = monitor["height"].as_f64().unwrap_or(1080.) / scale;
        let y = monitor["y"].as_i64().unwrap_or(0)
            + if overlay {
                (logical_height as i64 - height - (logical_height * 0.15) as i64).max(0)
            } else {
                ((logical_height as i64 - height) / 2).max(0)
            };
        dispatch(
            "movewindowpixel",
            &format!("exact {x} {y},{selector}"),
            &format!(
                "hl.dsp.window.move({{window={},x={x},y={y},relative=false}})",
                quote(&selector)
            ),
        )?;
        if overlay && modern() {
            command(&[
                "eval",
                &format!(
                    "hl.dispatch(hl.dsp.window.alter_zorder({{window={},mode=\"top\"}}))",
                    quote(&selector)
                ),
            ])?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn shortcut_is_validated_and_terminal_paste_uses_a_distinct_chord() {
        assert_eq!(
            shortcut("CommandOrControl+Shift+Space").unwrap(),
            ("CTRL SHIFT".into(), 5, "Space".into())
        );
        for invalid in ["Space", "Ctrl+Space,exec,anything", "Ctrl+", "Ctrl+A+B"] {
            assert!(shortcut(invalid).is_err());
        }
        assert!(terminal("org.wezfurlong.wezterm"));
        assert!(terminal("com.mitchellh.ghostty"));
        assert!(!terminal("firefox"));
    }
    #[test]
    #[ignore = "Requires an isolated org.gosu.IntegrationTest window and GOSU_TEST_OUTPUT"]
    fn paste_into_isolated_test_window() {
        let target = capture().unwrap();
        let terminal = std::env::var_os("GOSU_TEST_TERMINAL").is_some();
        let expected = if terminal {
            "org.gosu.IntegrationTest.wezterm"
        } else {
            "org.gosu.IntegrationTest"
        };
        assert_eq!(
            target.app, expected,
            "Refusing to write into a real user application"
        );
        assert_eq!(target.terminal, terminal);
        let output = std::env::var("GOSU_TEST_OUTPUT").expect("Missing test output path");
        let text = "GOSU: inserción áéíóú ñ 你好";
        crate::copy_text(text.into()).unwrap();
        paste(Some(&target.id), true).unwrap();
        for _ in 0..30 {
            if std::fs::read_to_string(&output).unwrap_or_default() == text {
                return;
            }
            std::thread::sleep(std::time::Duration::from_millis(50));
        }
        panic!("Test field did not receive the text");
    }
    #[test]
    fn overlay_identifies_webkit_window_and_rejects_ambiguity() {
        for class in ["org.voz.prototype", "gosu-speech-to-text"] {
            let window = serde_json::json!({"pid":999999,"class":class,"address":"0xabc"});
            assert_eq!(
                overlay_window(&serde_json::json!([window.clone()])).unwrap()["address"],
                "0xabc"
            );
            assert!(overlay_window(&serde_json::json!([window.clone(), window])).is_err());
        }
        assert!(overlay_window(&serde_json::json!([{"pid":999999,"class":"wezterm"}])).is_err());
    }
    #[test]
    fn empty_and_own_windows_are_not_destinations() {
        assert!(destination(&serde_json::json!({})).is_err());
        assert!(destination(&serde_json::json!({"address":"0x123","pid":std::process::id(),"class":"org.voz.prototype"})).is_err());
        assert!(destination(
            &serde_json::json!({"address":"0x123","pid":999999,"class":"gosu-speech-to-text"})
        )
        .is_err());
        let target =
            destination(&serde_json::json!({"address":"0xabc","pid":999999,"class":"firefox"}))
                .unwrap();
        assert!(!target.terminal);
    }
}
