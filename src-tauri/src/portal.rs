//! Standard, user-authorized Wayland input and global shortcuts (GNOME/KDE portals).
use ashpd::desktop::{
    global_shortcuts::{GlobalShortcuts, NewShortcut},
    remote_desktop::{DeviceType, KeyState, RemoteDesktop, SelectDevicesOptions},
    Session,
};
use futures_util::StreamExt;
use tauri::{
    async_runtime::{JoinHandle, Mutex},
    Emitter,
};
struct Shortcuts {
    session: Session<GlobalShortcuts>,
    task: JoinHandle<()>,
}
struct Input {
    proxy: RemoteDesktop,
    session: Session<RemoteDesktop>,
}
static SHORTCUTS: Mutex<Option<Shortcuts>> = Mutex::const_new(None);
static VISIBILITY_SHORTCUTS: Mutex<Option<Shortcuts>> = Mutex::const_new(None);
static PANEL_SHORTCUTS: Mutex<Option<Shortcuts>> = Mutex::const_new(None);
static INPUT: Mutex<Option<Input>> = Mutex::const_new(None);
pub fn wayland() -> bool {
    std::env::var_os("WAYLAND_DISPLAY").is_some()
        || std::env::var("XDG_SESSION_TYPE").unwrap_or_default() == "wayland"
}
fn error(error: impl std::fmt::Display) -> String {
    format!("The desktop did not authorize Wayland integration: {error}. Check remote access and shortcut permissions. Dictation remains available in the editor.")
}
fn accelerator(value: &str) -> Result<String, String> {
    let mut parts = Vec::new();
    for part in value.split('+') {
        let part: String = match part.to_lowercase().as_str() {
            "commandorcontrol" | "control" | "ctrl" => "CTRL".into(),
            "shift" => "SHIFT".into(),
            "alt" => "ALT".into(),
            "super" | "command" | "meta" => "LOGO".into(),
            "space" => "space".into(),
            _ => part.into(),
        };
        if part.is_empty() || !part.chars().all(|c: char| c.is_ascii_alphanumeric()) {
            return Err("Invalid keyboard shortcut.".into());
        }
        parts.push(part);
    }
    Ok(parts.join("+"))
}
pub async fn configure(
    app: tauri::AppHandle,
    shortcut: Option<String>,
    action: &'static str,
) -> Result<bool, String> {
    let state = match action {
        "dictation" => &SHORTCUTS,
        "panel" => &PANEL_SHORTCUTS,
        "visibility" => &VISIBILITY_SHORTCUTS,
        _ => return Err("Invalid shortcut action".into()),
    };
    let mut state = state.lock().await;
    if let Some(previous) = state.take() {
        previous.task.abort();
        let _ = previous.session.close().await;
    }
    let Some(shortcut) = shortcut else {
        return Ok(true);
    };
    let proxy = GlobalShortcuts::new().await.map_err(error)?;
    let session = proxy
        .create_session(Default::default())
        .await
        .map_err(error)?;
    let trigger = accelerator(&shortcut)?;
    let id = action;
    let description = match action {
        "visibility" => "GOSU: show or hide the application",
        "panel" => "GOSU: switch between editor and minimal panel",
        _ => "GOSU: start or stop dictation",
    };
    let binding = NewShortcut::new(id, description).preferred_trigger(Some(trigger.as_str()));
    let response = proxy
        .bind_shortcuts(&session, &[binding], None, Default::default())
        .await;
    match response.and_then(|request| request.response()) {
        Ok(response)
            if response
                .shortcuts()
                .iter()
                .any(|shortcut| shortcut.id() == id) => {}
        Ok(_) => {
            let _ = session.close().await;
            return Err("The portal did not register the dictation shortcut.".into());
        }
        Err(e) => {
            let _ = session.close().await;
            return Err(error(e));
        }
    }
    let mut events = proxy.receive_deactivated().await.map_err(error)?;
    let task = tauri::async_runtime::spawn(async move {
        while let Some(event) = events.next().await {
            if event.shortcut_id() == id {
                let _ = app.emit(
                    match action {
                        "visibility" => "app-toggle-visibility",
                        "panel" => "dictation-show",
                        _ => "dictation-toggle",
                    },
                    (),
                );
            }
        }
    });
    *state = Some(Shortcuts { session, task });
    Ok(true)
}
pub async fn authorize() -> Result<(), String> {
    let mut state = INPUT.lock().await;
    if state.is_some() {
        return Ok(());
    }
    let proxy = RemoteDesktop::new().await.map_err(error)?;
    let session = proxy
        .create_session(Default::default())
        .await
        .map_err(error)?;
    let result = async {
        proxy
            .select_devices(
                &session,
                SelectDevicesOptions::default().set_devices(Some(DeviceType::Keyboard.into())),
            )
            .await?
            .response()?;
        let selected = proxy
            .start(&session, None, Default::default())
            .await?
            .response()?;
        if !selected.devices().contains(DeviceType::Keyboard) {
            return Err(ashpd::Error::Portal(ashpd::PortalError::NotAllowed(
                "Keyboard access was not authorized".into(),
            )));
        }
        Ok::<(), ashpd::Error>(())
    }
    .await;
    if let Err(e) = result {
        let _ = session.close().await;
        return Err(error(e));
    }
    *state = Some(Input { proxy, session });
    Ok(())
}
fn keysym(character: char) -> Option<i32> {
    // Never synthesize Enter, Tab or another control key in a terminal or chat.
    let character = if character.is_control() {
        ' '
    } else {
        character
    };
    Some(if character as u32 <= 0xff {
        character as i32
    } else {
        (0x0100_0000 | character as u32) as i32
    })
}
pub async fn insert(text: &str) -> Result<(), String> {
    let mut state = INPUT.lock().await;
    let Some(input) = state.as_ref() else {
        return Err(
            "Authorize keyboard access before dictating. The text remains in the editor.".into(),
        );
    };
    let result = async {
        for character in text.chars() {
            if let Some(key) = keysym(character) {
                input
                    .proxy
                    .notify_keyboard_keysym(
                        &input.session,
                        key,
                        KeyState::Pressed,
                        Default::default(),
                    )
                    .await?;
                input
                    .proxy
                    .notify_keyboard_keysym(
                        &input.session,
                        key,
                        KeyState::Released,
                        Default::default(),
                    )
                    .await?;
            }
        }
        Ok::<(), ashpd::Error>(())
    }
    .await;
    if let Err(e) = result {
        if let Some(input) = state.take() {
            let _ = input.session.close().await;
        }
        return Err(error(e));
    }
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn portable_accelerators_and_unicode_never_press_enter() {
        assert_eq!(
            accelerator("CommandOrControl+Shift+Space").unwrap(),
            "CTRL+SHIFT+space"
        );
        assert_eq!(keysym('\n'), Some(32));
        assert_eq!(keysym('ñ'), Some(241));
        assert_eq!(keysym('你'), Some(0x0100_4f60));
        assert!(accelerator("Control+Space,exec").is_err());
    }
}
