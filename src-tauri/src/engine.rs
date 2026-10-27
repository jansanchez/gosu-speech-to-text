use std::{io::{BufRead,BufReader},process::{Child,Command,Stdio},sync::Mutex};
use tauri::Manager;
use crate::engine_paths;
use std::io::Write;
#[derive(Clone,serde::Serialize,serde::Deserialize)]
pub struct Connection {pub base_url:String,pub token:String}
#[derive(Default)]
pub struct Engine {child:Mutex<Option<Child>>,connection:Mutex<Option<Connection>>,error:Mutex<Option<String>>}
#[tauri::command]
pub fn engine_connection(state:tauri::State<Engine>)->Result<Connection,String>{
    if let Some(e)=state.error.lock().unwrap().as_ref(){return Err(e.clone());}
    state.connection.lock().unwrap().clone().ok_or("Iniciando motor local…".into())
}
pub fn start(app:&tauri::AppHandle){
    let result=(||->Result<Child,String>{
        let log_dir=app.path().app_log_dir().map_err(|e|e.to_string())?;
        std::fs::create_dir_all(&log_dir).map_err(|e|e.to_string())?;
        let mut log=std::fs::File::create(log_dir.join("engine.log")).map_err(|e|e.to_string())?;
        let _=writeln!(log,"GOSU: preparando proceso del motor.");
        let mut command;
        if cfg!(debug_assertions){
            let compiled=std::path::Path::new(env!("CARGO_MANIFEST_DIR")).parent().unwrap().to_path_buf();
            let mut candidates=vec![compiled];
            if let Ok(cwd)=std::env::current_dir(){candidates.push(cwd.clone());if let Some(parent)=cwd.parent(){candidates.push(parent.to_path_buf());}}
            let root=engine_paths::development_root(&candidates)?;
            let python=engine_paths::require_python(&root)?;
            let _=writeln!(log,"Proyecto: {}\nPython: {}",root.display(),python.display());
            command=Command::new(python);command.args(["-u","-m","server.engine"]).current_dir(root);
        }else{
            let executable=std::env::current_exe().map_err(|e|e.to_string())?;
            let resources=app.path().resource_dir().ok();
            let path=engine_paths::release_engine(resources.as_deref(),&executable)?;
            let _=writeln!(log,"Motor incluido: {}",path.display());
            command=Command::new(path);
        }
        command.env("PYTHONIOENCODING","utf-8").env("PYTHONUNBUFFERED","1").env("VOZ_MANAGED","1").stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(log);
        #[cfg(windows)] {use std::os::windows::process::CommandExt;command.creation_flags(0x08000000);}
        let program=command.get_program().to_string_lossy().into_owned();
        let directory=command.get_current_dir().map(|p|p.display().to_string()).unwrap_or_else(||"directorio heredado".into());
        command.spawn().map_err(|e|format!("No se pudo iniciar el motor: {e}. Ejecutable: {program}. Directorio: {directory}"))
    })();
    match result {
        Ok(mut child)=>{
            let output=child.stdout.take().unwrap();
            *app.state::<Engine>().child.lock().unwrap()=Some(child);
            let handle=app.clone();
            std::thread::spawn(move||{
                let mut reader=BufReader::new(output);let mut line=String::new();
                match reader.read_line(&mut line).and_then(|_|serde_json::from_str::<Connection>(&line).map_err(std::io::Error::other)) {
                    Ok(c)=>{*handle.state::<Engine>().connection.lock().unwrap()=Some(c);}
                    Err(_)=>{*handle.state::<Engine>().error.lock().unwrap()=Some("El motor no pudo iniciar. Revisa las dependencias o reinstala el paquete.".into());return;}
                }
                loop {line.clear();if reader.read_line(&mut line).unwrap_or(0)==0{break;}}
                *handle.state::<Engine>().error.lock().unwrap()=Some("El motor se cerró. Reinicia GOSU Speech to Text para recuperarlo.".into());
            });
        }
        Err(e)=>{if let Ok(directory)=app.path().app_log_dir(){if let Ok(mut log)=std::fs::OpenOptions::new().create(true).append(true).open(directory.join("engine.log")){let _=writeln!(log,"Error de arranque: {e}");}}*app.state::<Engine>().error.lock().unwrap()=Some(e);}
    }
}
pub fn stop(engine:&Engine){if let Some(mut c)=engine.child.lock().unwrap().take(){let _=c.kill();let _=c.wait();}}

// Loopback requests use the native process, avoiding WebView network policies
// and system HTTP proxies. The model service remains bound to 127.0.0.1.
fn connection(app:&tauri::AppHandle)->Result<Connection,String>{
    engine_connection(app.state::<Engine>())
}
fn client(seconds:u64)->Result<reqwest::Client,String>{
    reqwest::Client::builder().no_proxy().timeout(std::time::Duration::from_secs(seconds))
        .build().map_err(|e|e.to_string())
}
async fn response_json(response:reqwest::Response)->Result<serde_json::Value,String>{
    let status=response.status();
    let body:serde_json::Value=response.json().await.map_err(|e|format!("Respuesta del motor no válida: {e}"))?;
    if !status.is_success(){return Err(body.get("detail").map(|d|d.as_str().map(str::to_owned).unwrap_or_else(||d.to_string())).unwrap_or_else(||format!("Motor: HTTP {status}")));}
    Ok(body)
}
#[tauri::command]
pub async fn engine_health(app:tauri::AppHandle)->Result<serde_json::Value,String>{
    let c=connection(&app)?;
    let response=client(3)?.get(format!("{}/health",c.base_url)).send().await
        .map_err(|e|format!("El motor aún no responde: {e}. Consulta Diagnóstico del motor."))?;
    response_json(response).await
}
#[tauri::command]
pub async fn engine_transcribe(app:tauri::AppHandle,audio:Vec<u8>,language:String,vocabulary:String)->Result<serde_json::Value,String>{
    if audio.len()>5_000_000{return Err("Fragmento demasiado grande.".into());}
    let c=connection(&app)?;
    let file=reqwest::multipart::Part::bytes(audio).file_name("chunk.wav").mime_str("audio/wav").map_err(|e|e.to_string())?;
    let form=reqwest::multipart::Form::new().part("file",file).text("language",language).text("vocabulary",vocabulary);
    let response=client(180)?.post(format!("{}/transcribe",c.base_url)).header("X-Voz-Token",c.token).multipart(form).send().await
        .map_err(|e|format!("No se pudo transcribir: {e}"))?;
    response_json(response).await
}
#[tauri::command]
pub fn engine_diagnostics(app:tauri::AppHandle)->Result<String,String>{
    let path=app.path().app_log_dir().map_err(|e|e.to_string())?.join("engine.log");
    let bytes=std::fs::read(&path).map_err(|e|format!("{}: {e}",path.display()))?;
    let tail=String::from_utf8_lossy(&bytes[bytes.len().saturating_sub(16000)..]);
    Ok(format!("Registro: {}\n\n{}",path.display(),if tail.is_empty(){"El motor todavía no escribió mensajes."}else{&tail}))
}

#[tauri::command]
pub async fn engine_rewrite(app:tauri::AppHandle,text:String,instruction:String,model:String)->Result<serde_json::Value,String>{
    let c=connection(&app)?;
    let response=client(210)?.post(format!("{}/rewrite",c.base_url)).header("X-Voz-Token",c.token)
        .json(&serde_json::json!({"text":text,"instruction":instruction,"model":model})).send().await
        .map_err(|e|format!("El editor local no responde: {e}"))?;
    response_json(response).await
}

#[tauri::command]
pub async fn engine_search(app:tauri::AppHandle,query:String,documents:serde_json::Value,model:String)->Result<serde_json::Value,String>{
    let c=connection(&app)?;
    let response=client(300)?.post(format!("{}/search",c.base_url)).header("X-Voz-Token",c.token)
        .json(&serde_json::json!({"query":query,"documents":documents,"model":model})).send().await.map_err(|e|e.to_string())?;
    response_json(response).await
}
