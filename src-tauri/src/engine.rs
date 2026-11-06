use crate::engine_paths;
use std::{
    io::{BufRead, BufReader, Read, Write},
    process::{Child, Command, Stdio},
    sync::{mpsc, Mutex},
    time::Duration,
};
use tauri::Manager;

const HANDSHAKE_TIMEOUT: Duration = Duration::from_secs(90);
const HANDSHAKE_LIMIT: u64 = 16_384;

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct Connection {
    pub base_url: String,
    pub token: String,
}

#[derive(Default)]
struct Runtime {
    child: Option<Child>,
    connection: Option<Connection>,
    error: Option<String>,
    generation: u64,
}
impl Runtime {
    fn stop(&mut self) {
        self.generation = self.generation.wrapping_add(1);
        self.connection = None;
        if let Some(mut child) = self.child.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
    fn fail(&mut self, generation: u64, error: String) {
        // A reader belonging to an earlier process must never poison its replacement.
        if self.generation == generation {
            self.stop();
            self.error = Some(error);
        }
    }
}
#[derive(Default)]
pub struct Engine {
    runtime: Mutex<Runtime>,
}

#[tauri::command]
pub fn engine_connection(state: tauri::State<Engine>) -> Result<Connection, String> {
    let runtime = state.runtime.lock().map_err(|e| e.to_string())?;
    if let Some(error) = &runtime.error {
        return Err(error.clone());
    }
    runtime
        .connection
        .clone()
        .ok_or("Starting local engine…".into())
}

fn read_connection(reader: &mut impl BufRead) -> Result<Connection, String> {
    let mut line = String::new();
    reader
        .take(HANDSHAKE_LIMIT + 1)
        .read_line(&mut line)
        .map_err(|e| e.to_string())?;
    if line.len() as u64 > HANDSHAKE_LIMIT {
        return Err("Engine handshake is too large.".into());
    }
    let connection: Connection =
        serde_json::from_str(&line).map_err(|_| "Invalid engine handshake.".to_owned())?;
    let url = tauri::Url::parse(&connection.base_url).map_err(|e| e.to_string())?;
    if url.scheme() != "http"
        || url.host_str() != Some("127.0.0.1")
        || url.port().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.path() != "/"
        || url.query().is_some()
        || url.fragment().is_some()
        || connection.token.is_empty()
        || connection.token.len() > 1024
    {
        return Err("Invalid local engine connection.".into());
    }
    Ok(connection)
}

fn spawn(app: &tauri::AppHandle) -> Result<Child, String> {
    let log_dir = app.path().app_log_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&log_dir).map_err(|e| e.to_string())?;
    let mut log = std::fs::File::create(log_dir.join("engine.log")).map_err(|e| e.to_string())?;
    let _ = writeln!(log, "GOSU: preparing the engine process.");
    let mut command;
    if cfg!(debug_assertions) {
        let compiled = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .to_path_buf();
        let mut candidates = vec![compiled];
        if let Ok(cwd) = std::env::current_dir() {
            candidates.push(cwd.clone());
            if let Some(parent) = cwd.parent() {
                candidates.push(parent.to_path_buf());
            }
        }
        let root = engine_paths::development_root(&candidates)?;
        let python = engine_paths::require_python(&root)?;
        let _ = writeln!(
            log,
            "Project: {}\nPython: {}",
            root.display(),
            python.display()
        );
        command = Command::new(python);
        command
            .args(["-u", "-m", "server.engine"])
            .current_dir(root);
    } else {
        let executable = std::env::current_exe().map_err(|e| e.to_string())?;
        let resources = app.path().resource_dir().ok();
        let path = engine_paths::release_engine(resources.as_deref(), &executable)?;
        let _ = writeln!(log, "Bundled engine: {}", path.display());
        command = Command::new(path);
    }
    command
        .env("PYTHONIOENCODING", "utf-8")
        .env("PYTHONUNBUFFERED", "1")
        .env("VOZ_MANAGED", "1")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(log);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    command.spawn().map_err(|e| {
        format!(
            "Could not start the engine: {e}. Executable: {}",
            command.get_program().to_string_lossy()
        )
    })
}

fn launch(app: &tauri::AppHandle) -> Result<(), String> {
    let state = app.state::<Engine>();
    let mut runtime = state.runtime.lock().map_err(|e| e.to_string())?;
    runtime.stop();
    runtime.error = None;
    let mut child = match spawn(app) {
        Ok(child) => child,
        Err(error) => {
            runtime.error = Some(error.clone());
            return Err(error);
        }
    };
    let output = child.stdout.take().ok_or("Engine output is missing.")?;
    runtime.child = Some(child);
    let generation = runtime.generation;
    let (sender, receiver) = mpsc::channel();
    // Reading a pipe blocks. A separate supervisor enforces the handshake deadline.
    std::thread::spawn(move || {
        let mut reader = BufReader::new(output);
        let connection = read_connection(&mut reader);
        let valid = connection.is_ok();
        if sender.send(connection).is_err() || !valid {
            return;
        }
        // Drain bounded blocks instead of accumulating unbounded log lines.
        let mut buffer = [0; 4096];
        while reader.read(&mut buffer).unwrap_or(0) != 0 {}
        let _ = sender.send(Err(
            "The engine exited. Select Restart engine to recover it.".into(),
        ));
    });
    let handle = app.clone();
    std::thread::spawn(move || {
        let connection = receiver.recv_timeout(HANDSHAKE_TIMEOUT).unwrap_or_else(|_| Err("The engine did not start within 90 seconds. Check diagnostics and select Restart engine.".into()));
        {
            let state = handle.state::<Engine>();
            let Ok(mut runtime) = state.runtime.lock() else {
                return;
            };
            if runtime.generation != generation {
                return;
            }
            match connection {
                Ok(connection) => runtime.connection = Some(connection),
                Err(error) => {
                    runtime.fail(generation, error);
                    return;
                }
            }
        }
        if let Ok(Err(error)) = receiver.recv() {
            if let Ok(mut runtime) = handle.state::<Engine>().runtime.lock() {
                runtime.fail(generation, error);
            }
        }
    });
    Ok(())
}
pub fn start(app: &tauri::AppHandle) {
    let _ = launch(app);
}
pub fn stop(engine: &Engine) {
    if let Ok(mut runtime) = engine.runtime.lock() {
        runtime.stop();
    }
}
#[tauri::command]
pub async fn engine_restart(app: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || launch(&app))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn old_process_cannot_break_a_restarted_engine() {
        let mut runtime = Runtime::default();
        let old = runtime.generation;
        runtime.stop();
        runtime.fail(old, "old failure".into());
        assert!(runtime.error.is_none());
        let current = runtime.generation;
        runtime.fail(current, "current failure".into());
        assert_eq!(runtime.error.as_deref(), Some("current failure"));
    }
    #[test]
    fn handshake_accepts_only_a_bounded_loopback_connection() {
        fn parse(s: &str) -> Result<Connection, String> {
            read_connection(&mut std::io::Cursor::new(s.as_bytes()))
        }
        assert!(parse(r#"{"base_url":"http://127.0.0.1:43210","token":"secret"}"#).is_ok());
        for url in [
            "https://example.com",
            "http://localhost:1234",
            "http://127.0.0.1:1234/path",
            "http://user@127.0.0.1:1234",
        ] {
            assert!(parse(&format!(r#"{{"base_url":"{url}","token":"secret"}}"#)).is_err());
        }
        assert!(parse(&"x".repeat(HANDSHAKE_LIMIT as usize + 1)).is_err());
        assert!(parse("").is_err());
    }
}

// Loopback requests use the native process, avoiding WebView network policies
// and system HTTP proxies. The model service remains bound to 127.0.0.1.
fn connection(app: &tauri::AppHandle) -> Result<Connection, String> {
    engine_connection(app.state::<Engine>())
}
fn client(seconds: u64) -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .no_proxy()
        .timeout(std::time::Duration::from_secs(seconds))
        .build()
        .map_err(|e| e.to_string())
}
async fn response_json(response: reqwest::Response) -> Result<serde_json::Value, String> {
    let status = response.status();
    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Invalid engine response: {e}"))?;
    if !status.is_success() {
        return Err(body
            .get("detail")
            .map(|d| {
                d.as_str()
                    .map(str::to_owned)
                    .unwrap_or_else(|| d.to_string())
            })
            .unwrap_or_else(|| format!("Engine: HTTP {status}")));
    }
    Ok(body)
}
#[tauri::command]
pub async fn engine_health(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let c = connection(&app)?;
    let response = client(3)?
        .get(format!("{}/health", c.base_url))
        .send()
        .await
        .map_err(|e| format!("The engine is not responding yet: {e}. See Engine diagnostics."))?;
    response_json(response).await
}
#[tauri::command]
pub async fn engine_transcribe(
    app: tauri::AppHandle,
    audio: Vec<u8>,
    language: String,
    vocabulary: String,
) -> Result<serde_json::Value, String> {
    if audio.len() > 5_000_000 {
        return Err("Chunk is too large.".into());
    }
    let c = connection(&app)?;
    let file = reqwest::multipart::Part::bytes(audio)
        .file_name("chunk.wav")
        .mime_str("audio/wav")
        .map_err(|e| e.to_string())?;
    let form = reqwest::multipart::Form::new()
        .part("file", file)
        .text("language", language)
        .text("vocabulary", vocabulary);
    let response = client(180)?
        .post(format!("{}/transcribe", c.base_url))
        .header("X-Voz-Token", c.token)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Could not transcribe: {e}"))?;
    response_json(response).await
}
#[tauri::command]
pub fn engine_diagnostics(app: tauri::AppHandle) -> Result<String, String> {
    let path = app
        .path()
        .app_log_dir()
        .map_err(|e| e.to_string())?
        .join("engine.log");
    let bytes = std::fs::read(&path).map_err(|e| format!("{}: {e}", path.display()))?;
    let tail = String::from_utf8_lossy(&bytes[bytes.len().saturating_sub(16000)..]);
    Ok(format!(
        "Log: {}\n\n{}",
        path.display(),
        if tail.is_empty() {
            "The engine has not written any messages yet."
        } else {
            &tail
        }
    ))
}

#[tauri::command]
pub async fn engine_rewrite(
    app: tauri::AppHandle,
    text: String,
    instruction: String,
    model: String,
) -> Result<serde_json::Value, String> {
    let c = connection(&app)?;
    let response = client(210)?
        .post(format!("{}/rewrite", c.base_url))
        .header("X-Voz-Token", c.token)
        .json(&serde_json::json!({"text":text,"instruction":instruction,"model":model}))
        .send()
        .await
        .map_err(|e| format!("The local editor is not responding: {e}"))?;
    response_json(response).await
}

#[tauri::command]
pub async fn engine_search(
    app: tauri::AppHandle,
    query: String,
    documents: serde_json::Value,
    model: String,
) -> Result<serde_json::Value, String> {
    let c = connection(&app)?;
    let response = client(300)?
        .post(format!("{}/search", c.base_url))
        .header("X-Voz-Token", c.token)
        .json(&serde_json::json!({"query":query,"documents":documents,"model":model}))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    response_json(response).await
}
