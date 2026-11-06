#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod engine;
mod engine_paths;
#[cfg(target_os = "linux")]
mod hyprland;
#[cfg(target_os = "linux")]
mod linux_microphone;
mod minimal;
#[cfg(not(windows))]
mod platform;
#[cfg(target_os = "linux")]
mod portal;
use tauri::Manager;

#[cfg(windows)]
use std::sync::atomic::{AtomicIsize, Ordering};
static CLIPBOARD: std::sync::Mutex<Option<arboard::Clipboard>> = std::sync::Mutex::new(None);
#[cfg(windows)]
static TARGET: AtomicIsize = AtomicIsize::new(0);

#[tauri::command]
fn remember_target(window: tauri::WebviewWindow) -> Result<(), String> {
    #[cfg(windows)]
    unsafe {
        let hwnd = windows_sys::Win32::UI::WindowsAndMessaging::GetForegroundWindow() as isize;
        let own = window.hwnd().map_err(|e| e.to_string())?.0 as isize;
        // Starting inside GOSU Speech to Text must not destroy the previously remembered target.
        if hwnd != own && hwnd != 0 {
            TARGET.store(hwnd, Ordering::SeqCst);
        }
    }
    #[cfg(not(windows))]
    {
        let _ = window;
        let _ = platform::remember();
    }
    Ok(())
}
#[tauri::command]
fn copy_text(text: String) -> Result<(), String> {
    let mut clipboard = CLIPBOARD.lock().map_err(|e| e.to_string())?;
    if clipboard.is_none() {
        *clipboard = Some(arboard::Clipboard::new().map_err(|e| e.to_string())?);
    }
    clipboard
        .as_mut()
        .unwrap()
        .set_text(text)
        .map_err(|e| e.to_string())
}

#[cfg(windows)]
fn native_paste(text: String, hwnd: isize, own: isize, activate: bool) -> Result<(), String> {
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
        GetAsyncKeyState, SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP,
        VK_CONTROL, VK_LWIN, VK_MENU, VK_RWIN, VK_SHIFT,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, IsWindow, SetForegroundWindow,
    };
    if hwnd == 0 || hwnd == own {
        return Err("Select a field in the other application and use Ctrl+Alt+V there. The draft remains saved.".into());
    }
    copy_text(text)?;
    // On shortcut release, other modifiers may still be held: wait rather than injecting a wrong combination.
    for _ in 0..100 {
        let held = unsafe {
            [VK_CONTROL, VK_SHIFT, VK_MENU, VK_LWIN, VK_RWIN]
                .iter()
                .any(|k| GetAsyncKeyState(*k as i32) < 0)
        };
        if !held {
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(20));
    }
    unsafe {
        if [VK_CONTROL, VK_SHIFT, VK_MENU, VK_LWIN, VK_RWIN]
            .iter()
            .any(|k| GetAsyncKeyState(*k as i32) < 0)
        {
            return Err(
                "Release the shortcut keys and try again. The text is already copied.".into(),
            );
        }
        if IsWindow(hwnd as _) == 0 {
            return Err(
                "The destination window no longer exists. Use Ctrl+V in the correct destination."
                    .into(),
            );
        }
        if activate && GetForegroundWindow() as isize != hwnd {
            if SetForegroundWindow(hwnd as _) == 0 {
                return Err(
                    "Windows did not allow activating the destination. The text is copied: use Ctrl+V."
                        .into(),
                );
            }
            std::thread::sleep(std::time::Duration::from_millis(180));
        }
        if GetForegroundWindow() as isize != hwnd {
            return Err("The active window changed. No keys were sent; use Ctrl+V in the correct destination.".into());
        }
        fn key(vk: u16, up: bool) -> INPUT {
            INPUT {
                r#type: INPUT_KEYBOARD,
                Anonymous: INPUT_0 {
                    ki: KEYBDINPUT {
                        wVk: vk,
                        wScan: 0,
                        dwFlags: if up { KEYEVENTF_KEYUP } else { 0 },
                        time: 0,
                        dwExtraInfo: 0,
                    },
                },
            }
        }
        let mut inputs = vec![key(VK_CONTROL, false)];
        if windows_terminal(hwnd) {
            inputs.push(key(VK_SHIFT, false));
        }
        inputs.extend([key(0x56, false), key(0x56, true)]);
        if windows_terminal(hwnd) {
            inputs.push(key(VK_SHIFT, true));
        }
        inputs.push(key(VK_CONTROL, true));
        let count = SendInput(
            inputs.len() as u32,
            inputs.as_ptr(),
            std::mem::size_of::<INPUT>() as i32,
        );
        if count != inputs.len() as u32 {
            // Best-effort release after partial injection; do not claim successful paste.
            let releases = [key(0x56, true), key(VK_CONTROL, true)];
            SendInput(
                releases.len() as u32,
                releases.as_ptr(),
                std::mem::size_of::<INPUT>() as i32,
            );
            return Err("Windows did not accept simulated paste. The text is copied; paste manually with Ctrl+V. Check whether the destination is running as administrator.".into());
        }
    }
    Ok(())
}

#[tauri::command]
async fn paste_target(text: String, window: tauri::WebviewWindow) -> Result<(), String> {
    #[cfg(not(windows))]
    {
        let _ = window;
        copy_text(text)?;
        tauri::async_runtime::spawn_blocking(|| platform::paste(true))
            .await
            .map_err(|e| e.to_string())?
    }
    #[cfg(windows)]
    {
        let hwnd = TARGET.load(Ordering::SeqCst);
        let own = window.hwnd().map_err(|e| e.to_string())?.0 as isize;
        tauri::async_runtime::spawn_blocking(move || native_paste(text, hwnd, own, true))
            .await
            .map_err(|e| e.to_string())?
    }
}
#[tauri::command]
async fn paste_here(text: String, window: tauri::WebviewWindow) -> Result<(), String> {
    #[cfg(not(windows))]
    {
        let _ = window;
        copy_text(text)?;
        tauri::async_runtime::spawn_blocking(|| platform::paste(false))
            .await
            .map_err(|e| e.to_string())?
    }
    #[cfg(windows)]
    {
        let hwnd =
            unsafe { windows_sys::Win32::UI::WindowsAndMessaging::GetForegroundWindow() } as isize;
        let own = window.hwnd().map_err(|e| e.to_string())?.0 as isize;
        tauri::async_runtime::spawn_blocking(move || native_paste(text, hwnd, own, false))
            .await
            .map_err(|e| e.to_string())?
    }
}
fn main() {
    if minimal::handle_cli() {
        return;
    }
    let app = tauri::Builder::default()
        .manage(engine::Engine::default())
        .setup(|app| {
            #[cfg(target_os = "linux")]
            linux_microphone::install(app)?;
            minimal::start(app.handle());
            engine::start(app.handle());
            Ok(())
        })
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            minimal::minimal_window,
            minimal::dictation_target,
            minimal::dictation_prepare,
            minimal::dictation_insert,
            minimal::dictation_shortcut,
            remember_target,
            copy_text,
            paste_target,
            paste_here,
            engine::engine_restart,
            engine::engine_connection,
            engine::engine_health,
            engine::engine_transcribe,
            engine::engine_diagnostics,
            engine::engine_rewrite,
            engine::engine_search
        ])
        .build(tauri::generate_context!())
        .expect("Could not start GOSU Speech to Text");
    app.run(|handle, event| {
        if let tauri::RunEvent::Exit = event {
            minimal::stop();
            engine::stop(&handle.state::<engine::Engine>());
            let _ = CLIPBOARD.lock().map(|mut c| c.take());
        }
    });
}

#[cfg(windows)]
fn windows_class(hwnd: isize) -> String {
    let mut name = [0u16; 256];
    let size = unsafe {
        windows_sys::Win32::UI::WindowsAndMessaging::GetClassNameW(
            hwnd as _,
            name.as_mut_ptr(),
            name.len() as i32,
        )
    };
    String::from_utf16_lossy(&name[..size.max(0) as usize])
}
#[cfg(windows)]
fn windows_app(hwnd: isize) -> String {
    use windows_sys::Win32::{
        Foundation::CloseHandle,
        System::Threading::{
            OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION,
        },
        UI::WindowsAndMessaging::GetWindowThreadProcessId,
    };
    let mut pid = 0;
    unsafe {
        GetWindowThreadProcessId(hwnd as _, &mut pid);
    }
    if pid == 0 {
        return windows_class(hwnd);
    }
    let handle = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid) };
    if handle.is_null() {
        return windows_class(hwnd);
    }
    let mut path = vec![0u16; 32768];
    let mut length = path.len() as u32;
    let result = unsafe { QueryFullProcessImageNameW(handle, 0, path.as_mut_ptr(), &mut length) };
    unsafe {
        CloseHandle(handle);
    }
    if result == 0 {
        return windows_class(hwnd);
    }
    let path = String::from_utf16_lossy(&path[..length as usize]);
    std::path::Path::new(&path)
        .file_stem()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_else(|| windows_class(hwnd))
}
#[cfg(windows)]
fn windows_terminal(hwnd: isize) -> bool {
    let class = format!("{} {}", windows_class(hwnd), windows_app(hwnd)).to_lowercase();
    [
        "cascadia",
        "windowsterminal",
        "wezterm",
        "mintty",
        "alacritty",
        "ghostty",
    ]
    .iter()
    .any(|name| class.contains(name))
}
#[cfg(windows)]
fn windows_destination(window: tauri::WebviewWindow) -> Result<minimal::Destination, String> {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowThreadProcessId,
    };
    let hwnd = unsafe { GetForegroundWindow() } as isize;
    let own = window.hwnd().map_err(|e| e.to_string())?.0 as isize;
    if hwnd == 0 || hwnd == own {
        return Err("Focus a field in another application and press the shortcut.".into());
    }
    let mut pid = 0;
    unsafe {
        GetWindowThreadProcessId(hwnd as _, &mut pid);
    }
    if pid == 0 {
        return Err("Could not identify the destination window.".into());
    }
    TARGET.store(hwnd, Ordering::SeqCst);
    let app = windows_app(hwnd);
    Ok(minimal::Destination {
        id: format!("windows:{hwnd}:{pid}"),
        name: app.clone(),
        app,
        terminal: windows_terminal(hwnd),
        pid: u64::from(pid),
    })
}
#[cfg(windows)]
async fn windows_insert(
    window: tauri::WebviewWindow,
    expected: String,
    text: String,
) -> Result<(), String> {
    let hwnd = TARGET.load(Ordering::SeqCst);
    let own = window.hwnd().map_err(|e| e.to_string())?.0 as isize;
    tauri::async_runtime::spawn_blocking(move || {
        let mut pid = 0;
        unsafe {
            windows_sys::Win32::UI::WindowsAndMessaging::GetWindowThreadProcessId(
                hwnd as _, &mut pid,
            );
        }
        if expected != format!("windows:{hwnd}:{pid}") || pid == 0 {
            return Err(
                "The destination window changed or closed. The text remains in GOSU.".into(),
            );
        }
        native_paste(text, hwnd, own, true)
    })
    .await
    .map_err(|e| e.to_string())?
}
