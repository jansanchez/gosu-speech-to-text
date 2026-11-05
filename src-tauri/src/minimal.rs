use serde::{Deserialize, Serialize};
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Destination {
    pub id: String,
    pub app: String,
    pub name: String,
    pub terminal: bool,
    pub pid: u64,
}
// Minimal window and same-user local shortcut bridge. No network listener.

#[tauri::command]
pub async fn minimal_window(window: tauri::WebviewWindow, mode: String) -> Result<(), String> {
    if !["overlay", "hide", "editor"].contains(&mode.as_str()) {
        return Err("Modo de ventana inválido".into());
    }
    let result = (|| -> tauri::Result<()> {
        match mode.as_str() {
            "overlay" => {
                window.set_focusable(false)?;
                window.set_min_size(Some(tauri::LogicalSize::new(380., 180.)))?;
                window.set_decorations(false)?;
                window.set_resizable(true)?;
                window.set_always_on_top(true)?;
                window.set_skip_taskbar(true)?;
                window.set_size(tauri::LogicalSize::new(460., 220.))?;
                if let Some(monitor) = window.current_monitor()? {
                    let area = monitor.work_area();
                    let scale = monitor.scale_factor();
                    let width = (460. * scale) as i32;
                    let height = (220. * scale) as i32;
                    let _ = window.set_position(tauri::PhysicalPosition::new(
                        area.position.x + (area.size.width as i32 - width) / 2,
                        area.position.y
                            + (area.size.height as i32
                                - height
                                - (area.size.height as f64 * 0.15) as i32)
                                .max(0),
                    ));
                }
                window.show()?;
            }
            "hide" => window.hide()?,
            "editor" => {
                window.set_focusable(true)?;
                window.set_decorations(true)?;
                window.set_resizable(true)?;
                window.set_always_on_top(false)?;
                window.set_skip_taskbar(false)?;
                window.set_min_size(Some(tauri::LogicalSize::new(430., 600.)))?;
                window.set_size(tauri::LogicalSize::new(1180., 820.))?;
                window.center()?;
                window.show()?;
                window.set_focus()?;
            }
            _ => unreachable!(),
        }
        Ok(())
    })();
    result.map_err(|e| e.to_string())?;
    #[cfg(target_os = "linux")]
    if mode != "hide" && crate::hyprland::available() {
        let overlay = mode == "overlay";
        if let Err(error) =
            tauri::async_runtime::spawn_blocking(move || crate::hyprland::present_window(overlay))
                .await
                .map_err(|e| e.to_string())?
        {
            eprintln!("Ventana mínima: {error}");
        }
    }
    Ok(())
}
#[tauri::command]
pub async fn dictation_shortcut(
    app: tauri::AppHandle,
    shortcut: Option<String>,
    panel: Option<bool>,
    action: Option<String>,
) -> Result<bool, String> {
    let action = match action.as_deref() {
        Some("visibility") => "visibility",
        Some("panel") => "panel",
        Some("dictation") => "dictation",
        None if panel.unwrap_or(false) => "panel",
        None => "dictation",
        _ => return Err("Acción de atajo inválida".into()),
    };
    #[cfg(target_os = "linux")]
    {
        if crate::hyprland::available() {
            return tauri::async_runtime::spawn_blocking(move || {
                crate::hyprland::configure_shortcut(shortcut.as_deref(), action)
            })
            .await
            .map_err(|e| e.to_string())?;
        }
        if crate::portal::wayland() {
            return crate::portal::configure(app, shortcut, action).await;
        }
        Ok(false)
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = (app, shortcut, action);
        Ok(false)
    }
}
// Recording can start from GOSU itself; only the portal needs prior authorization.
#[tauri::command]
pub async fn dictation_prepare() -> Result<(), String> {
    #[cfg(target_os = "linux")]
    if crate::portal::wayland() && !crate::hyprland::available() {
        crate::portal::authorize().await?;
    }
    Ok(())
}
#[tauri::command]
pub async fn dictation_target(window: tauri::WebviewWindow) -> Result<Destination, String> {
    #[cfg(target_os = "linux")]
    {
        let _ = window;
        if crate::hyprland::available() {
            return tauri::async_runtime::spawn_blocking(crate::hyprland::capture)
                .await
                .map_err(|e| e.to_string())?;
        }
        if crate::portal::wayland() {
            crate::portal::authorize().await?;
            return Ok(Destination {
                id: "wayland-active".into(),
                app: "Portal Wayland".into(),
                name: "Campo activo".into(),
                terminal: false,
                pid: 0,
            });
        }
        tauri::async_runtime::spawn_blocking(crate::platform::capture_destination)
            .await
            .map_err(|e| e.to_string())?
    }
    #[cfg(windows)]
    {
        crate::windows_destination(window)
    }
    #[cfg(target_os = "macos")]
    {
        let _ = window;
        tauri::async_runtime::spawn_blocking(crate::platform::capture_destination)
            .await
            .map_err(|e| e.to_string())?
    }
    #[cfg(not(any(target_os = "linux", target_os = "macos", windows)))]
    {
        let _ = window;
        Err("La integración de este sistema no está disponible.".into())
    }
}
#[tauri::command]
pub async fn dictation_insert(
    window: tauri::WebviewWindow,
    target_id: String,
    text: String,
) -> Result<(), String> {
    if text.len() > 1_000_000 {
        return Err("El dictado es demasiado largo para insertarlo de una vez.".into());
    }
    #[cfg(target_os = "linux")]
    {
        let _ = window;
        if crate::portal::wayland() && !crate::hyprland::available() {
            if target_id != "wayland-active" {
                return Err("El destino no corresponde a esta sesión de escritorio.".into());
            }
            let _ = crate::copy_text(text.clone());
            return crate::portal::insert(&text).await;
        }
        tauri::async_runtime::spawn_blocking(move || {
            crate::copy_text(text)?;
            if crate::hyprland::available() {
                crate::hyprland::paste(Some(&target_id), true)
            } else {
                crate::platform::paste_destination(&target_id)
            }
        })
        .await
        .map_err(|e| e.to_string())?
    }
    #[cfg(windows)]
    {
        crate::windows_insert(window, target_id, text).await
    }
    #[cfg(target_os = "macos")]
    {
        let _ = window;
        tauri::async_runtime::spawn_blocking(move || {
            crate::copy_text(text)?;
            crate::platform::paste_destination(&target_id)
        })
        .await
        .map_err(|e| e.to_string())?
    }
    #[cfg(not(any(target_os = "linux", target_os = "macos", windows)))]
    {
        let _ = (window, target_id, text);
        Err("Usa Copiar y pega el texto en el destino.".into())
    }
}

#[cfg(target_os = "linux")]
mod bridge {
    use std::{
        io::{Read, Write},
        os::unix::{
            fs::{FileTypeExt, PermissionsExt},
            net::{UnixListener, UnixStream},
        },
        path::PathBuf,
        sync::atomic::{AtomicBool, Ordering},
        time::Duration,
    };
    use tauri::Emitter;
    static RUNNING: AtomicBool = AtomicBool::new(false);
    fn path() -> Result<PathBuf, String> {
        let root = std::env::var_os("XDG_RUNTIME_DIR").ok_or("Falta XDG_RUNTIME_DIR.")?;
        Ok(PathBuf::from(root)
            .join("gosu-speech-to-text")
            .join("control.sock"))
    }
    pub fn send(command: &str) -> Result<(), String> {
        let mut stream = UnixStream::connect(path()?)
            .map_err(|_| "GOSU no está abierto. Inicia la aplicación primero.".to_owned())?;
        stream
            .set_write_timeout(Some(Duration::from_secs(2)))
            .map_err(|e| e.to_string())?;
        stream
            .write_all(command.as_bytes())
            .map_err(|e| e.to_string())
    }
    pub fn start(app: &tauri::AppHandle) -> Result<(), String> {
        let socket = path()?;
        let directory = socket.parent().unwrap();
        if let Ok(metadata) = std::fs::symlink_metadata(directory) {
            if !metadata.is_dir() || metadata.file_type().is_symlink() {
                return Err("La ruta de control de GOSU no es un directorio seguro.".into());
            }
        } else {
            std::fs::create_dir(directory).map_err(|e| e.to_string())?;
        }
        std::fs::set_permissions(directory, std::fs::Permissions::from_mode(0o700))
            .map_err(|e| e.to_string())?;
        if let Ok(metadata) = std::fs::symlink_metadata(&socket) {
            if !metadata.file_type().is_socket() {
                return Err("La ruta de control está ocupada por otro archivo.".into());
            }
            if UnixStream::connect(&socket).is_ok() {
                return Err("Ya hay una instancia de GOSU escuchando atajos.".into());
            }
            std::fs::remove_file(&socket).map_err(|e| e.to_string())?;
        }
        let listener = UnixListener::bind(&socket).map_err(|e| e.to_string())?;
        std::fs::set_permissions(&socket, std::fs::Permissions::from_mode(0o600))
            .map_err(|e| e.to_string())?;
        listener.set_nonblocking(true).map_err(|e| e.to_string())?;
        RUNNING.store(true, Ordering::SeqCst);
        let app = app.clone();
        std::thread::spawn(move || {
            while RUNNING.load(Ordering::SeqCst) {
                if let Ok((mut stream, _)) = listener.accept() {
                    let _ = stream.set_read_timeout(Some(Duration::from_millis(500)));
                    let mut data = [0u8; 16];
                    if let Ok(length) = stream.read(&mut data) {
                        if &data[..length] == b"toggle\n" {
                            let _ = app.emit("dictation-toggle", ());
                        }
                        if &data[..length] == b"visibility\n" {
                            let _ = app.emit("app-toggle-visibility", ());
                        }
                        if &data[..length] == b"show\n" {
                            let _ = app.emit("dictation-show", ());
                        }
                    }
                } else {
                    std::thread::sleep(Duration::from_millis(50));
                }
            }
            let _ = std::fs::remove_file(socket);
        });
        Ok(())
    }
    pub fn stop() {
        RUNNING.store(false, Ordering::SeqCst);
        let _ = crate::hyprland::configure_shortcut(None, "dictation");
        let _ = crate::hyprland::configure_shortcut(None, "panel");
        let _ = crate::hyprland::configure_shortcut(None, "visibility");
    }
}
pub fn handle_cli() -> bool {
    let command = if std::env::args().any(|arg| arg == "--toggle-visibility") {
        "visibility\n"
    } else if std::env::args().any(|arg| arg == "--show-minimal") {
        "show\n"
    } else if std::env::args().any(|arg| arg == "--toggle-minimal") {
        "toggle\n"
    } else {
        return false;
    };
    #[cfg(target_os = "linux")]
    if let Err(error) = bridge::send(command) {
        eprintln!("{error}");
    }
    #[cfg(not(target_os = "linux"))]
    let _ = command;
    true
}
pub fn start(app: &tauri::AppHandle) {
    #[cfg(target_os = "linux")]
    if let Err(error) = bridge::start(app) {
        eprintln!("Control mínimo: {error}");
    }
    #[cfg(not(target_os = "linux"))]
    let _ = app;
}
pub fn stop() {
    #[cfg(target_os = "linux")]
    bridge::stop();
}
