import test from 'node:test';import assert from 'node:assert/strict';
import {Window} from 'happy-dom';import 'fake-indexeddb/auto';
import {get,clear} from 'idb-keyval';
// Real React state + IndexedDB; only device capture and recognition are substituted.
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
let fail=false,calls=0;const replies=['Mañana revisaré el documento.','cambia Mañana por Hoy','Otro tramo.'];
(globalThis as any).fetch=async(url:string,options:any)=>{if(url.endsWith('/health'))return {ok:true,json:async()=>({ready:true,model:'fake'})};assert.equal(options.headers['X-Voz-Token'],'local-test');calls++;if(fail)throw Error('sin conexión');return {ok:true,json:async()=>({text:replies.shift()||'Recuperado.',words:[],language:'es'})};};
const container=document.createElement('div');document.body.append(container);let root=createRoot(container);
async function step(fn:()=>any){await React.act(async()=>{await fn();await new Promise(r=>setTimeout(r,35));});}
function button(text:string){const b=[...container.querySelectorAll('button')].find(x=>x.textContent?.includes(text));assert.ok(b,'Missing button '+text);return b!;}
function click(text:string){button(text).click()}
async function input(el:HTMLInputElement|HTMLTextAreaElement,value:string){const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:(win as any).HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value')!.set!.call(el,value);el.dispatchEvent(new win.Event('input',{bubbles:true}) as any);}
async function audio(){await step(()=>{node.port.onmessage({data:new Float32Array(16000).fill(.1)});node.port.onmessage({data:new Float32Array(24000)});});await step(()=>{});}
test('dictate, correct by voice, recover failed audio and reload saved history',async()=>{
 await clear();await step(()=>root.render(React.createElement(App)));
 await step(()=>click('Preferencias'));
 await step(()=>input(container.querySelector('input[type=password]')!,'local-test'));
 await step(()=>click('Listo'));
 await step(()=>click('Empezar a dictar'));await audio();await step(()=>click('Terminar'));
 assert.equal((container.querySelector('#draft') as HTMLTextAreaElement).value,'Mañana revisaré el documento.');
 await step(()=>click('Corregir'));await step(()=>click('Dictar corrección'));await audio();
 assert.equal((container.querySelector('#draft') as HTMLTextAreaElement).value,'Hoy revisaré el documento.');
 await step(()=>{(container.querySelector('button.header-copy') as HTMLButtonElement).click();});assert.equal(clipboard,'Hoy revisaré el documento.');clipboard='';await step(()=>window.dispatchEvent(new win.KeyboardEvent('keydown',{ctrlKey:true,altKey:true,code:'KeyC',bubbles:true}) as any));assert.equal(clipboard,'Hoy revisaré el documento.');
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
