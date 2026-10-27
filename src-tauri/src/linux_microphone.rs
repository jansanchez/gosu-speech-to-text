// Linux WebKitGTK audio capture permissions for GOSU.
use tauri::Manager;
use webkit2gtk::glib::Cast;
use webkit2gtk::{PermissionRequestExt, SettingsExt, UserMediaPermissionRequestExt, WebViewExt};

fn trusted_page(uri: &str) -> bool {
    let Ok(url) = tauri::Url::parse(uri) else { return false };
    if !url.username().is_empty() || url.password().is_some() { return false; }
    let bundled = url.scheme() == "tauri" && url.host_str() == Some("localhost")
        && url.port().is_none();
    let dev = cfg!(debug_assertions) && url.scheme() == "http"
        && matches!(url.host_str(), Some("127.0.0.1") | Some("localhost"))
        && url.port() == Some(1420);
    bundled || dev
}

pub fn install(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let window = app.get_webview_window("main").ok_or("Missing main window")?;
    window.with_webview(|native| {
        let view = native.inner();
        if let Some(settings) = view.settings() {
            settings.set_enable_media_stream(true);
        }
        view.connect_permission_request(|view, request| {
            let Some(media) = request.downcast_ref::<webkit2gtk::UserMediaPermissionRequest>() else {
                return false; // Leave unrelated permissions to WebKit.
            };
            let trusted = view.uri().map(|uri| trusted_page(uri.as_str())).unwrap_or(false);
            if trusted && media.is_for_audio_device() && !media.is_for_video_device() {
                request.allow();
                eprintln!("GOSU: microphone permission granted to app page");
            } else {
                request.deny();
                eprintln!("GOSU: media permission denied (origin or capture type)");
            }
            true
        });
    })?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::trusted_page;
    #[test]
    fn origin_policy() {
        assert!(trusted_page("tauri://localhost/index.html"));
        assert!(!trusted_page("tauri://localhost.evil.example/"));
        assert!(!trusted_page("https://example.com/"));
        assert!(!trusted_page("http://localhost:9999/"));
        assert!(!trusted_page("tauri://user@localhost/"));
        assert_eq!(trusted_page("http://127.0.0.1:1420/"), cfg!(debug_assertions));
    }
}
