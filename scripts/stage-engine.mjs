/** Stage the runtime next to the raw release binary as well as bundled installers. */
import {cp,mkdir,access,rm} from 'node:fs/promises';
import {resolve,dirname,join,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function stageEngine({root=project,args=[],env=process.env}={}){
 const source=join(root,'engine-dist','gosu-engine');
 await access(join(source,process.platform==='win32'?'gosu-engine.exe':'gosu-engine'));
 let target=env.CARGO_BUILD_TARGET;
 for(let i=0;i<args.length;i++){if(args[i]==='--target')target=args[i+1];else if(args[i].startsWith('--target='))target=args[i].slice(9);}
 const base=env.CARGO_TARGET_DIR?(isAbsolute(env.CARGO_TARGET_DIR)?env.CARGO_TARGET_DIR:resolve(root,'src-tauri',env.CARGO_TARGET_DIR)):join(root,'src-tauri','target');
 const destination=join(base,...(target?[target]:[]),args.includes('--debug')?'debug':'release','engine');
 await rm(destination,{recursive:true,force:true});await mkdir(destination,{recursive:true});await cp(source,destination,{recursive:true,force:true,verbatimSymlinks:true});
 console.log('Motor preparado junto al binario:',destination);
 console.log('Para distribuir, utiliza preferentemente el instalador completo de bundle/.');
 return destination;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await stageEngine({args:process.argv.slice(2)});
