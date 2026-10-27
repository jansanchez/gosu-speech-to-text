import test from 'node:test';import assert from 'node:assert/strict';
import {Window} from 'happy-dom';import 'fake-indexeddb/auto';
import {get,clear} from 'idb-keyval';
// Native UI contract: capture + IndexedDB are real; Rust IPC and recognition are simulated.
(globalThis as any).isTauri=true;
const win=new Window({url:'http://127.0.0.1:1420'});
for(const key of ['window','document','navigator','HTMLElement','HTMLTextAreaElement','Event','MouseEvent','KeyboardEvent','MutationObserver'])Object.defineProperty(globalThis,key,{value:key==='window'?win:(win as any)[key],configurable:true});
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
class Context{sampleRate=16000;destination={};audioWorklet={addModule:async()=>{}};createGain(){return {gain:{value:0},connect(){}}}createMediaStreamSource(){return {connect(){}}}async resume(){}async close(){}}
let node:any;
class Node{port={onmessage:null as any};constructor(){node=this}connect(){}disconnect(){}}
(globalThis as any).AudioContext=Context;(globalThis as any).AudioWorkletNode=Node;
Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>({getTracks:()=>[{stop(){},onended:null}]}),enumerateDevices:async()=>[]}});
let clipboard='';Object.defineProperty(navigator,'clipboard',{value:{writeText:async(text:string)=>{clipboard=text;}}});
const React=await import('react');const {createRoot}=await import('react-dom/client');const {default:App}=await import('../src/App.tsx');
let rewriteResult='No enviar 42 mensajes hoy.',nativeReady=false,fail=false,calls=0;const replies=['Mañana revisaré el documento.','cambia Mañana por Hoy','Otro tramo.'];
(win as any).__TAURI_INTERNALS__={transformCallback:()=>1,unregisterCallback:()=>{},invoke:async(cmd:string,args:any)=>{
 if(cmd==='engine_connection')return {base_url:'http://127.0.0.1:43210',token:'local-test'};
 if(cmd==='engine_health'){if(!nativeReady)throw Error('motor no disponible');return {ready:true,model:'native-fake'};}
 if(cmd==='engine_transcribe'){assert.equal(args.language,'es');assert.ok(args.audio.length>44);assert.deepEqual(args.audio.slice(0,4),[82,73,70,70]);calls++;if(fail)throw Error('sin conexión nativa');return {text:replies.shift()||'Recuperado.',words:[],language:'es'};}
 if(cmd==='engine_rewrite'){assert.equal(args.model,'qwen2.5:1.5b');return {text:rewriteResult};}
 if(cmd==='copy_text')clipboard=args.text;
 return null;
}};
(globalThis as any).fetch=()=>{throw Error('Native desktop must not use WebView fetch for the engine');};
const container=document.createElement('div');document.body.append(container);let root=createRoot(container);
async function step(fn:()=>any){await React.act(async()=>{await fn();await new Promise(r=>setTimeout(r,35));});}
function button(text:string){const b=[...container.querySelectorAll('button')].find(x=>x.textContent?.includes(text));assert.ok(b,'Missing button '+text);return b!;}
function click(text:string){button(text).click()}
async function input(el:HTMLInputElement|HTMLTextAreaElement,value:string){const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:(win as any).HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value')!.set!.call(el,value);el.dispatchEvent(new win.Event('input',{bubbles:true}) as any);}
async function audio(){await step(()=>{node.port.onmessage({data:new Float32Array(16000).fill(.1)});node.port.onmessage({data:new Float32Array(24000)});});await step(()=>{});}
test('native IPC dictation, correction, clipboard and pending audio recovery without WebView fetch',async()=>{
 await clear();await step(()=>root.render(React.createElement(App)));
 assert.match(container.textContent||'',/Motor sin conexión/);
 await step(()=>click('Empezar a dictar'));assert.equal(node,undefined,'Must not capture before engine readiness');
 nativeReady=true;await step(()=>click('Comprobar motor'));
 assert.match(container.textContent||'',/Motor listo/);
 await step(()=>click('Empezar a dictar'));await audio();await step(()=>click('Terminar'));
 assert.equal((container.querySelector('#draft') as HTMLTextAreaElement).value,'Mañana revisaré el documento.');
 await step(()=>click('Corregir'));await step(()=>click('Dictar corrección'));await audio();
 assert.equal((container.querySelector('#draft') as HTMLTextAreaElement).value,'Hoy revisaré el documento.');
 await step(()=>{(container.querySelector('button.header-copy') as HTMLButtonElement).click();});assert.equal(clipboard,'Hoy revisaré el documento.');
 assert.ok(button('Dictar corrección')); // one command automatically stops capture
 await step(()=>click('Dictar'));fail=true;
 await step(()=>click('Empezar a dictar'));await audio();await step(()=>click('Terminar'));
 assert.equal((await get<any[]>('voz-jobs'))!.length,1);
 const before=calls;fail=false;await step(()=>click('Reintentar'));await step(()=>{});
 assert.equal(calls,before+1);assert.equal((await get<any[]>('voz-jobs'))!.length,0);
 assert.match((container.querySelector('#draft') as HTMLTextAreaElement).value,/Otro tramo/);
 await step(()=>root.unmount());root=createRoot(container);await step(()=>root.render(React.createElement(App)));await step(()=>{});
 assert.match((container.querySelector('#draft') as HTMLTextAreaElement).value,/Hoy revisaré/);
 await step(()=>root.unmount());
});

test('natural proposals require confirmation; learned rules require consent; private content never persists',async()=>{
 await clear();root=createRoot(container);await step(()=>root.render(React.createElement(App)));
 await step(()=>input(container.querySelector('#draft')!,'No enviar 42 mensajes.'));
 const details=container.querySelector('.workbench details') as HTMLDetailsElement;
 await step(()=>{details.open=true;details.dispatchEvent(new win.Event('toggle') as any);});
 const llm=[...container.querySelectorAll('label')].find(a=>a.textContent?.includes('Activar propuestas con Ollama'))!.querySelector('input')!;
 await step(()=>llm.click());
 const prompt=container.querySelector('.natural-command input') as HTMLInputElement;
 await step(()=>input(prompt,'Hazlo más claro'));await step(()=>click('Preparar propuesta local'));
 assert.equal((container.querySelector('#draft') as HTMLTextAreaElement).value,'No enviar 42 mensajes.');
 assert.ok(container.querySelector('.proposal'));
 await step(()=>input(container.querySelector('#draft')!,'No enviar 42 mensajes. Añadido manual.'));
 await step(()=>click('Confirmar cambio'));assert.match(container.textContent||'',/El borrador cambió/);
 await step(()=>click('Cancelar cambio'));await step(()=>click('Preparar propuesta local'));
 replies.push('confirmar cambio');await step(()=>click('Corregir'));await step(()=>click('Dictar corrección'));await audio();
 assert.equal((container.querySelector('#draft') as HTMLTextAreaElement).value,rewriteResult);
 replies.push('cambia hoy por mañana');await step(()=>click('Dictar corrección'));await audio();
 assert.equal((await get<any>('voz-state')).settings.dictionary,'{}');
 await step(()=>click('Recordar esta corrección'));assert.equal(JSON.parse((await get<any>('voz-state')).settings.dictionary).hoy,'mañana');
 const normal=(container.querySelector('#draft') as HTMLTextAreaElement).value;
 await step(()=>click('Sesión privada'));await step(()=>input(container.querySelector('#draft')!,'Texto privado que no se guarda'));
 const stored=await get<any>('voz-state');assert.equal(stored.sessions.find((x:any)=>x.id===stored.active).text,normal);assert.ok(!JSON.stringify(stored).includes('Texto privado'));
 assert.equal((await get<any[]>('voz-jobs'))?.length||0,0);
 await step(()=>click('Salir de sesión privada'));assert.equal((container.querySelector('#draft') as HTMLTextAreaElement).value,normal);
 await step(()=>root.unmount());
});

test('retry after a failed transcript save persists the result before removing its audio',async()=>{
 await clear();root=createRoot(container);await step(()=>root.render(React.createElement(App)));
 const proto=(globalThis as any).IDBObjectStore.prototype,original=proto.put;
 try{
  proto.put=function(value:any,key:any){if(key==='voz-state')throw Error('QuotaExceededError simulated');return original.call(this,value,key);};
  replies.push('Resultado recuperable.');await step(()=>click('Empezar a dictar'));await audio();await step(()=>click('Terminar'));
  assert.equal((await get<any[]>('voz-jobs'))!.length,1);
  proto.put=original;await step(()=>click('Reintentar'));await step(()=>{});
  const saved=await get<any>('voz-state');assert.equal(saved.sessions.find((a:any)=>a.id===saved.active).text,'Resultado recuperable.');
  assert.equal((await get<any[]>('voz-jobs'))!.length,0);
 }finally{proto.put=original;await step(()=>root.unmount());}
});
