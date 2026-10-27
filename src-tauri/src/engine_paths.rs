//! Resolve exact runtime paths and report missing files without guessing dependencies.
use std::path::{Path,PathBuf};
pub fn python_path(root:&Path)->PathBuf{root.join(if cfg!(windows){".venv/Scripts/python.exe"}else{".venv/bin/python"})}
pub fn development_root(candidates:&[PathBuf])->Result<PathBuf,String>{
 for root in candidates{if root.join("server/engine.py").is_file()&&root.join("package.json").is_file(){return Ok(root.clone());}}
 Err(format!("No se encontró la carpeta del proyecto. Rutas comprobadas: {}. Abre una terminal en el proyecto y ejecuta npm run desktop.",candidates.iter().map(|p|p.display().to_string()).collect::<Vec<_>>().join("; ")))
}
pub fn require_python(root:&Path)->Result<PathBuf,String>{
 let path=python_path(root);
 if !path.is_file(){return Err(format!("Falta el entorno Python del proyecto: {}. Desde {} ejecuta npm run desktop (prepara el entorno automáticamente) o py -3.12 scripts/configurar.py --dev.",path.display(),root.display()));}
 Ok(path)
}
pub fn release_engine(resources:Option<&Path>,executable:&Path)->Result<PathBuf,String>{
 let names=if cfg!(windows){["gosu-engine.exe","voz-engine.exe"]}else{["gosu-engine","voz-engine"]};
 let mut paths=Vec::new();
 for root in resources.into_iter().chain(executable.parent()){
  for name in names{for directory in [root.join("engine"),root.join("engine/gosu-engine")]{let path=directory.join(name);if path.is_file(){return Ok(path);}paths.push(path);}}
 }
 Err(format!("No se encontró el motor incluido. Rutas comprobadas: {}. Si abriste el EXE de target/release, necesita la carpeta engine al lado; no copies solo el EXE. Genera el paquete con npm run desktop:build o instala el paquete completo.",paths.iter().map(|p|p.display().to_string()).collect::<Vec<_>>().join("; ")))
}
#[cfg(test)]
mod tests{
 use super::*;
 fn temp()->PathBuf{let path=std::env::temp_dir().join(format!("gosu-path-test-{}-{}",std::process::id(),std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));std::fs::create_dir_all(&path).unwrap();path}
 #[test]fn missing_python_reports_the_actual_path(){let root=temp();let error=require_python(&root).unwrap_err();assert!(error.contains(&python_path(&root).display().to_string()));assert!(error.contains("npm run desktop"));std::fs::remove_dir_all(root).unwrap();}
 #[test]fn moved_debug_build_can_use_a_valid_runtime_source_root(){let root=temp();std::fs::create_dir_all(root.join("server")).unwrap();std::fs::write(root.join("server/engine.py"),"").unwrap();std::fs::write(root.join("package.json"),"{}").unwrap();assert_eq!(development_root(&[root.join("missing"),root.clone()]).unwrap(),root);std::fs::remove_dir_all(root).unwrap();}
 #[test]fn release_binary_finds_its_adjacent_engine(){let root=temp();std::fs::create_dir_all(root.join("engine")).unwrap();let file=root.join(if cfg!(windows){"engine/gosu-engine.exe"}else{"engine/gosu-engine"});std::fs::write(&file,"").unwrap();assert_eq!(release_engine(Some(&root.join("missing")),&root.join("app.exe")).unwrap(),file);std::fs::remove_dir_all(root).unwrap();}
}
