//! Optional native paste adapters. Clipboard fallback remains available everywhere.
use std::{process::Command,sync::Mutex};
static TARGET:Mutex<Option<String>>=Mutex::new(None);
fn run(program:&str,args:&[&str])->Result<String,String>{
    let mut child=Command::new(program).args(args).stdout(std::process::Stdio::piped()).stderr(std::process::Stdio::piped()).spawn().map_err(|e|format!("No se pudo ejecutar {program}: {e}. El texto permanece copiado."))?;
    let deadline=std::time::Instant::now()+std::time::Duration::from_secs(30);
    loop{if child.try_wait().map_err(|e|e.to_string())?.is_some(){break;}if std::time::Instant::now()>deadline{let _=child.kill();let _=child.wait();return Err(format!("{program} no respondió a tiempo. El texto sigue copiado."));}std::thread::sleep(std::time::Duration::from_millis(30));}
    let output=child.wait_with_output().map_err(|e|e.to_string())?;
    if !output.status.success(){return Err(format!("{program}: {}. El texto permanece copiado.",String::from_utf8_lossy(&output.stderr).trim()));}
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_owned())
}
#[cfg(target_os="linux")]
fn active()->Result<String,String>{
    if std::env::var("XDG_SESSION_TYPE").unwrap_or_default()=="wayland"||std::env::var("WAYLAND_DISPLAY").is_ok()||std::env::var("DISPLAY").is_err(){return Err("En Wayland usa Copiar y Ctrl+V; el pegado entre aplicaciones depende del compositor.".into());}
    run("xdotool",&["getactivewindow"])
}
#[cfg(target_os="macos")]
fn active()->Result<String,String>{run("osascript",&["-e","tell application \"System Events\" to get bundle identifier of first application process whose frontmost is true"])}
#[cfg(not(any(target_os="linux",target_os="macos")))]
fn active()->Result<String,String>{Err("Utiliza el portapapeles de tu sistema.".into())}
fn external(id:&str)->Result<bool,String>{
    #[cfg(target_os="linux")]{let pid=run("xdotool",&["getwindowpid",id])?;return Ok(pid!=std::process::id().to_string());}
    #[cfg(target_os="macos")]{return Ok(id!="org.voz.prototype");}
    #[cfg(not(any(target_os="linux",target_os="macos")))]{let _=id;Ok(false)}
}
pub fn remember()->Result<(),String>{
    let id=active()?;
    if external(&id)?{*TARGET.lock().map_err(|e|e.to_string())?=Some(id);}
    Ok(())
}
pub fn paste(activate:bool)->Result<(),String>{
    let id=if activate{TARGET.lock().map_err(|e|e.to_string())?.clone().ok_or("No hay un destino recordado. Usa el atajo en la aplicación de destino o pega manualmente.".to_owned())?}else{active()?};
    if !external(&id)?{return Err("Selecciona otra aplicación. El texto está copiado.".into());}
    #[cfg(target_os="linux")]{
        if !id.chars().all(|c|c.is_ascii_digit()){return Err("Destino X11 no válido.".into());}
        if activate{run("xdotool",&["windowactivate","--sync",&id])?;}
        std::thread::sleep(std::time::Duration::from_millis(150));
        if active()?!=id{return Err("El destino cambió. No se enviaron teclas.".into());}
        run("xdotool",&["key","--clearmodifiers","ctrl+v"])?;
        return Ok(());
    }
    #[cfg(target_os="macos")]{
        if !id.chars().all(|c|c.is_ascii_alphanumeric()||".-_".contains(c)){return Err("Identificador de aplicación no válido.".into());}
        if activate{let script=format!("tell application id \"{id}\" to activate");run("osascript",&["-e",&script])?;}
        #[link(name="ApplicationServices",kind="framework")]
        extern "C"{fn CGEventSourceFlagsState(state_id:i32)->u64;}
        let modifiers=(1u64<<17)|(1u64<<18)|(1u64<<19)|(1u64<<20);
        for _ in 0..100{if unsafe{CGEventSourceFlagsState(0)}&modifiers==0{break;}std::thread::sleep(std::time::Duration::from_millis(20));}
        if unsafe{CGEventSourceFlagsState(0)}&modifiers!=0{return Err("Suelta las teclas del atajo y repite. El texto está copiado.".into());}
        std::thread::sleep(std::time::Duration::from_millis(150));
        if active()?!=id{return Err("Cambió la aplicación activa. Pega manualmente.".into());}
        run("osascript",&["-e","tell application \"System Events\" to keystroke \"v\" using command down"])?;
        return Ok(());
    }
    #[cfg(not(any(target_os="linux",target_os="macos")))]Err("Texto copiado. Pega manualmente en el destino.".into())
}
