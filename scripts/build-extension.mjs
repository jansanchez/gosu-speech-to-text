import {build} from 'esbuild';
import {mkdir,copyFile,readdir,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';import {dirname,resolve} from 'node:path';
const out='extension-dist';await rm(out,{recursive:true,force:true});await mkdir(out+'/ort',{recursive:true});
await build({entryPoints:['extension/recorder.js','extension/popup.js','extension/background.js'],outdir:out,bundle:true,format:'esm',platform:'browser',target:'chrome120',splitting:true,chunkNames:'chunks/[name]-[hash]'});
for(const name of ['manifest.json','popup.html','recorder.html','extension.css'])await copyFile('extension/'+name,out+'/'+name);
await copyFile('public/capture.js',out+'/capture.js');
const req=createRequire(resolve('node_modules/@huggingface/transformers/package.json'));
const ort=dirname(req.resolve('onnxruntime-web'));
for(const name of await readdir(ort)){if(name.endsWith('.wasm')||name.endsWith('.mjs'))await copyFile(ort+'/'+name,out+'/ort/'+name);}
await mkdir(out+'/notices',{recursive:true});
for(const pkg of ['@huggingface/transformers','onnxruntime-web','onnxruntime-common']){
 const base=resolve('node_modules',pkg);
 try{for(const name of await readdir(base)){if(/license|notice/i.test(name)&&!name.includes('/')){try{await copyFile(base+'/'+name,out+'/notices/'+pkg.replaceAll('/','-')+'-'+name);}catch{}}}}catch{}
}
for(const name of await readdir('vendor-notices'))await copyFile('vendor-notices/'+name,out+'/notices/'+name);
await copyFile('THIRD-PARTY.md',out+'/notices/THIRD-PARTY.md');
console.log('Extension ready:',out);
