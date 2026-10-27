import {spawnSync} from 'node:child_process';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {prepareDesktop} from './prepare-desktop.mjs';
import {stageEngine} from './stage-engine.mjs';
const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function buildDesktop({root=project,args=process.argv.slice(2),spawn=spawnSync,prepare=prepareDesktop,stage=stageEngine}={}){
 prepare({root,bundle:true});
 // Forward all npm arguments to Tauri, not to the staging helper.
 const result=spawn(process.execPath,[join(root,'node_modules','@tauri-apps','cli','tauri.js'),'build','--config','src-tauri/tauri.release.conf.json',...args],{cwd:root,stdio:'inherit'});
 if(result.status!==0)throw Error('Falló la compilación Tauri: '+(result.error?.message||'revisa la salida anterior'));
 await stage({root,args});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{await buildDesktop();}catch(error){console.error(error.message);process.exitCode=1;}}
