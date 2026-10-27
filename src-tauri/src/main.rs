#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#[cfg(target_os = "linux")]
mod linux_microphone;
mod engine;
mod engine_paths;
#[cfg(not(windows))]
mod platform;
use tauri::Manager;

use std::sync::atomic::{AtomicIsize, Ordering};
static CLIPBOARD: std::sync::Mutex<Option<arboard::Clipboard>> = std::sync::Mutex::new(None);
static TARGET: AtomicIsize = AtomicIsize::new(0);

#[tauri::command]
fn remember_target(window: tauri::WebviewWindow) -> Result<(), String> {
    #[cfg(windows)] unsafe {
        let hwnd = windows_sys::Win32::UI::WindowsAndMessaging::GetForegroundWindow() as isize;
        let own = window.hwnd().map_err(|e|e.to_string())?.0 as isize;
        // Starting inside GOSU Speech to Text must not destroy the previously remembered target.
        if hwnd != own && hwnd != 0 { TARGET.store(hwnd, Ordering::SeqCst); }
    }
    #[cfg(not(windows))] {let _ = window;let _=platform::remember();}
    Ok(())
}
#[tauri::command]
fn copy_text(text: String) -> Result<(), String> {
    let mut clipboard = CLIPBOARD.lock().map_err(|e|e.to_string())?;
    if clipboard.is_none() { *clipboard = Some(arboard::Clipboard::new().map_err(|e|e.to_string())?); }
    clipboard.as_mut().unwrap().set_text(text).map_err(|e|e.to_string())
}

#[cfg(windows)]
fn native_paste(text: String, hwnd: isize, own: isize, activate: bool) -> Result<(), String> {
    use windows_sys::Win32::UI::WindowsAndMessaging::{IsWindow,GetForegroundWindow,SetForegroundWindow};
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState,SendInput,INPUT,INPUT_0,INPUT_KEYBOARD,KEYBDINPUT,KEYEVENTF_KEYUP,VK_CONTROL,VK_SHIFT,VK_MENU,VK_LWIN,VK_RWIN};
    if hwnd == 0 || hwnd == own { return Err("Selecciona un campo en la otra aplicación y usa Ctrl+Alt+V allí. El borrador sigue guardado.".into()); }
    copy_text(text)?;
    // On shortcut release, other modifiers may still be held: wait rather than injecting a wrong combination.
    for _ in 0..100 {
        let held=unsafe{[VK_CONTROL,VK_SHIFT,VK_MENU,VK_LWIN,VK_RWIN].iter().any(|k|GetAsyncKeyState(*k as i32)<0)};
        if !held {break;}
        std::thread::sleep(std::time::Duration::from_millis(20));
    }
    unsafe {
        if [VK_CONTROL,VK_SHIFT,VK_MENU,VK_LWIN,VK_RWIN].iter().any(|k|GetAsyncKeyState(*k as i32)<0) {
            return Err("Suelta las teclas del atajo y vuelve a intentarlo. El texto ya está copiado.".into());
        }
        if IsWindow(hwnd as _) == 0 { return Err("La ventana de destino ya no existe. Usa Ctrl+V en el destino correcto.".into()); }
        if activate && GetForegroundWindow() as isize != hwnd {
            if SetForegroundWindow(hwnd as _) == 0 { return Err("Windows no permitió activar el destino. El texto está copiado: usa Ctrl+V.".into()); }
            std::thread::sleep(std::time::Duration::from_millis(180));
        }
        if GetForegroundWindow() as isize != hwnd { return Err("Cambió la ventana activa. No se enviaron teclas; usa Ctrl+V en el destino correcto.".into()); }
        fn key(vk:u16,up:bool)->INPUT {
            INPUT{r#type:INPUT_KEYBOARD,Anonymous:INPUT_0{ki:KEYBDINPUT{wVk:vk,wScan:0,dwFlags:if up{KEYEVENTF_KEYUP}else{0},time:0,dwExtraInfo:0}}}
        }
        let inputs=[key(VK_CONTROL,false),key(0x56,false),key(0x56,true),key(VK_CONTROL,true)];
        let count=SendInput(inputs.len() as u32,inputs.as_ptr(),std::mem::size_of::<INPUT>() as i32);
        if count!=inputs.len() as u32 {
            // Best-effort release after partial injection; do not claim successful paste.
            let releases=[key(0x56,true),key(VK_CONTROL,true)];
            SendInput(releases.len() as u32,releases.as_ptr(),std::mem::size_of::<INPUT>() as i32);
            return Err("Windows no aceptó el pegado simulado. El texto está copiado; usa Ctrl+V manualmente. Revisa si el destino se ejecuta como administrador.".into());
        }
    }
    Ok(())
}

#[tauri::command]
async fn paste_target(text: String, window: tauri::WebviewWindow) -> Result<(), String> {
    #[cfg(not(windows))] { let _=window;copy_text(text)?;tauri::async_runtime::spawn_blocking(||platform::paste(true)).await.map_err(|e|e.to_string())? }
    #[cfg(windows)] {
        let hwnd=TARGET.load(Ordering::SeqCst);
        let own=window.hwnd().map_err(|e|e.to_string())?.0 as isize;
        tauri::async_runtime::spawn_blocking(move || native_paste(text,hwnd,own,true)).await.map_err(|e|e.to_string())?
    }
}
#[tauri::command]
async fn paste_here(text: String, window: tauri::WebviewWindow) -> Result<(), String> {
    #[cfg(not(windows))] { let _=window;copy_text(text)?;tauri::async_runtime::spawn_blocking(||platform::paste(false)).await.map_err(|e|e.to_string())? }
    #[cfg(windows)] {
        let hwnd=unsafe{windows_sys::Win32::UI::WindowsAndMessaging::GetForegroundWindow()} as isize;
        let own=window.hwnd().map_err(|e|e.to_string())?.0 as isize;
        tauri::async_runtime::spawn_blocking(move || native_paste(text,hwnd,own,false)).await.map_err(|e|e.to_string())?
    }
}
fn main() {
    let app = tauri::Builder::default()
        .manage(engine::Engine::default())
        .setup(|app| {
            #[cfg(target_os = "linux")]
            linux_microphone::install(app)?;
            engine::start(app.handle()); Ok(())
        })
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![remember_target,copy_text,paste_target,paste_here,engine::engine_connection,engine::engine_health,engine::engine_transcribe,engine::engine_diagnostics,engine::engine_rewrite,engine::engine_search])
        .build(tauri::generate_context!()).expect("No se pudo iniciar GOSU Speech to Text");
    app.run(|handle,event| {if let tauri::RunEvent::Exit = event {engine::stop(&handle.state::<engine::Engine>()); let _ = CLIPBOARD.lock().map(|mut c|c.take());}});
}
