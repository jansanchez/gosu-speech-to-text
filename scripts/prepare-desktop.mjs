/** Prepare the local Python runtime before Tauri dev; no model download here. */
import {existsSync,renameSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function prepareDesktop({root=project,platform=process.platform,spawn=spawnSync,exists=existsSync,rename=renameSync,log=console.log,bundle=false}={}){
 if(!exists(join(root,'server','engine.py'))||!exists(join(root,'package.json')))throw Error('No se encontró el proyecto completo en '+root);
 const env={...process.env,PYTHONIOENCODING:'utf-8',PYTHONUNBUFFERED:'1'};
 const python=join(root,'.venv',platform==='win32'?'Scripts':'bin',platform==='win32'?'python.exe':'python');
 const invoke=(file,args,quiet=false)=>spawn(file,args,{cwd:root,env,windowsHide:true,stdio:quiet?'pipe':'inherit',encoding:'utf8',timeout:quiet?60000:undefined});
 const checked=(file,args)=>{const result=invoke(file,args);if(result.status!==0)throw Error('Falló '+file+' '+args.join(' ')+': '+(result.error?.message||'revisa la salida anterior'));};
 if(!exists(python)){
  log('Falta el entorno Python del proyecto: '+python);
  let executable,args;
  const candidates=platform==='win32'?[['py.exe',['-3.12']],['python.exe',[]]]:[['python3.12',[]],['python3',[]]];
  for(const [file,prefix] of candidates){const check=invoke(file,[...prefix,'-c','import sys;print("%s.%s"%sys.version_info[:2])'],true);if(check.status===0&&String(check.stdout).trim()==='3.12'){executable=file;args=prefix;break;}}
  if(!executable)throw Error('No encontré Python 3.12. Instálalo y repite npm run desktop; en Windows comprueba py -3.12 --version.');
  const directory=join(root,'.venv');
  if(exists(directory)){const backup=directory+'.before-startup-'+Date.now();rename(directory,backup);log('Entorno incompleto conservado en: '+backup);}
  checked(executable,[...args,'-m','venv','.venv']);
  if(!exists(python))throw Error('Python no creó el ejecutable esperado: '+python);
 }
 // Import packages without loading model weights or starting a blocking stdin watcher.
 const probe=invoke(python,['-c','import fastapi,uvicorn,faster_whisper'],true);
 if(probe.status!==0){
  log('Preparando dependencias del motor en '+python);
  checked(python,['-m','ensurepip','--upgrade']);
  checked(python,['-m','pip','install','-r','server/requirements-build.txt']);
  const verified=invoke(python,['-c','import fastapi,uvicorn,faster_whisper'],true);
  if(verified.status!==0)throw Error('No se pudo cargar el motor desde '+python+'\n'+(verified.stderr||verified.error?.message||'Consulta INSTALAR-WINDOWS.md.'));
 }
 if(bundle){log('Empaquetando el motor para este sistema antes del instalador…');checked(python,['scripts/build-engine.py']);}
 log('Runtime preparado: '+python);
 return python;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{prepareDesktop({bundle:process.argv.includes('--bundle')});}catch(error){console.error('\nGOSU Speech to Text: '+error.message);process.exitCode=1;}
}
