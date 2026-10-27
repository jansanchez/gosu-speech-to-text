import {pipeline,env} from '@huggingface/transformers';
import {get,set} from 'idb-keyval';
import {Capture} from '../src/audio';
import {edit,clean} from '../src/core';
import {control,languages,punctuation,dictionaryOf,defaults,encodeBackup,decodeBackup} from '../src/product';
import {importRecording} from '../src/import-audio';
env.allowLocalModels=false;env.backends.onnx.wasm.wasmPaths=chrome.runtime.getURL('ort/');env.backends.onnx.wasm.numThreads=1;env.backends.onnx.wasm.proxy=false;
const $=id=>document.getElementById(id),status=text=>{$('status').textContent=text;};
let recognizer,capture,recording=false,working=false,importing=false,paused=false,privateMode=false,normalState,selection=[0,0],save=Promise.resolve(),queueSave=Promise.resolve();
const stored=await chrome.storage.local.get(['workspace','draft','versions']);
let state=stored.workspace||{draft:stored.draft||'',versions:stored.versions||[],redo:[],done:[],settings:{...defaults},templates:[]};state.settings={...defaults,...state.settings};state.redo||=[];state.done||=[];state.templates||=[];
let pending=await get('voz-extension-audio')||[];paused=!!pending.length;
for(const [code,name] of languages){const option=document.createElement('option');option.value=code;option.textContent=name;$('language').append(option);}
function render(){ $('draft').value=state.draft;$('language').value=state.settings.language;$('fillers').value=state.settings.fillers;$('dictionary').value=state.settings.dictionary;$('contrast').checked=state.settings.contrast;$('punctuation').checked=state.settings.punctuation;$('treatment').value=state.settings.mode;document.body.classList.toggle('high-contrast',state.settings.contrast);$('pending').textContent=`${pending.length} fragmentos pendientes${privateMode?' · sesión privada en memoria':''}`;$('templates').replaceChildren();for(const t of state.templates){const row=document.createElement('div'),insert=document.createElement('button'),remove=document.createElement('button');insert.textContent=t.name;insert.onclick=()=>{if(working||recording)return;const [a,b]=selection;change(state.draft.slice(0,a)+t.text+state.draft.slice(b));};remove.textContent='Eliminar';remove.onclick=()=>{state.templates=state.templates.filter(x=>x.id!==t.id);void persist();render();};row.append(insert,remove);$('templates').append(row);}}
function persist(){if(privateMode)return Promise.resolve();const workspace=structuredClone(state);save=save.catch(()=>{}).then(()=>chrome.storage.local.set({workspace}));return save;}
function savePending(){render();if(privateMode)return Promise.resolve();const jobs=[...pending];queueSave=queueSave.catch(()=>{}).then(()=>set('voz-extension-audio',jobs));return queueSave;}
function change(text){state.versions=[...state.versions,state.draft].slice(-50);state.redo=[];state.draft=text;render();void persist().catch(e=>status('No se pudo guardar: '+e));}
function undo(){if(state.versions.length){state.redo.push(state.draft);state.draft=state.versions.pop();render();void persist();}}
function redo(){if(state.redo.length){state.versions.push(state.draft);state.draft=state.redo.pop();render();void persist();}}
$('draft').oninput=()=>{state.draft=$('draft').value;void persist().catch(e=>status('No se pudo guardar: '+e));};$('draft').onselect=()=>{selection=[$('draft').selectionStart,$('draft').selectionEnd];};
$('punctuation').onchange=()=>{state.settings.punctuation=$('punctuation').checked;void persist();};$('treatment').onchange=()=>{state.settings.mode=$('treatment').value;void persist();};
$('language').onchange=()=>{state.settings.language=$('language').value;void persist();};
$('rules').onclick=()=>{try{const dictionary=JSON.parse($('dictionary').value);if(!dictionary||Array.isArray(dictionary)||typeof dictionary!=='object'||Object.values(dictionary).some(v=>typeof v!=='string'))throw Error('El diccionario debe ser un objeto de texto a texto.');state.settings.dictionary=$('dictionary').value;state.settings.fillers=$('fillers').value;void persist();status('Reglas confirmadas. Se aplicarán a nuevos tramos.');}catch(e){status(String(e));}};
$('contrast').onchange=()=>{state.settings.contrast=$('contrast').checked;render();void persist();};
$('load').onclick=async()=>{try{$('load').disabled=true;status('Preparando modelo local…');recognizer=await pipeline('automatic-speech-recognition','onnx-community/whisper-tiny',{device:'wasm',dtype:'q8',progress_callback:p=>{if(p.status==='progress')status(`Descargando ${p.file}: ${Math.round(p.progress||0)} %`);}});$('mic').disabled=false;status(pending.length?'Modelo listo. Pulsa Reintentar pendientes.':'Modelo listo. Puedes dictar.');}catch(e){status('No se pudo cargar: '+e);$('load').disabled=false;}};
async function accept(blob,options){pending.push({id:crypto.randomUUID(),blob,...options});try{await savePending();if(!paused)void drain();}catch(e){paused=true;status('No se pudo guardar el audio: '+e);}}
async function drain(){if(working||!recognizer)return;working=true;try{while(pending.length&&!paused){const job=pending[0];try{
 if(!state.done.includes(job.id)){
  const decoder=new AudioContext();let decoded;try{decoded=await decoder.decodeAudioData(await job.blob.arrayBuffer());}finally{await decoder.close();}
  const offline=new OfflineAudioContext(1,Math.ceil(decoded.duration*16000),16000),source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();const audio=await offline.startRendering();
  const result=await recognizer(audio.getChannelData(0),{...(job.settings.language==='auto'?{}:{language:job.settings.language}),task:'transcribe'});
  if(job.mode==='edit'){
   if(state.draft!==job.snapshot)throw Error('El texto cambió. El audio queda pendiente; vuelve a corregir sobre el texto actual.');
   const action=control(result.text);
   if(action==='undo')undo();else if(action==='redo')redo();else if(action==='copy')await copy();else if(action==='read')read();else if(action==='stopRead')speechSynthesis.cancel();
   else{const r=edit(job.snapshot,result.text,job.selection);if(r.changed)change(r.text);status(r.message);}
  }else{const raw=job.settings.punctuation?punctuation(result.text,job.settings.language):result.text;const text=job.settings.mode==='literal'?raw:clean(raw,job.settings.fillers.split(',').filter(Boolean),dictionaryOf(job.settings.dictionary));if(text)change(state.draft+(state.draft?' ':'')+text);status(text?'Tramo transcrito y guardado.':'No se detectó voz.');}
  state.done=[...state.done,job.id].slice(-2000);
 }
 await persist();pending=pending.filter(x=>x.id!==job.id);await savePending();
 }catch(e){paused=true;status('Cola pausada: '+e);break;}}}finally{working=false;}}
let onChunk;
$('mic').onclick=async()=>{try{if(recording){recording=false;$('mic').textContent='Empezar a dictar';await capture.stop(onChunk);return;}if(importing)return;
 const options={mode:$('mode').value,settings:{...state.settings,punctuation:$('punctuation').checked},snapshot:state.draft,selection:[...selection]};let submitted=false;
 onChunk=blob=>{if(options.mode==='edit'&&submitted)return;submitted=true;void accept(blob,options);if(options.mode==='edit'&&recording){recording=false;$('mic').textContent='Empezar a dictar';void capture.stop(()=>{});}};
 capture=new Capture();await capture.start('',options.settings.pause,onChunk,()=>{},()=>{recording=false;$('mic').textContent='Empezar a dictar';status('Micrófono desconectado.');},options.settings.sensitivity);recording=true;$('mic').textContent='Terminar';status('Escuchando. Haz una pausa entre ideas.');}catch(e){status('No se pudo acceder al micrófono: '+e);}};
async function copy(){await navigator.clipboard.writeText(state.draft);status('Copiado. Usa Ctrl+V / Cmd+V.');}
$('copy').onclick=()=>void copy().catch(e=>status(String(e)));$('undo').onclick=undo;$('redo').onclick=redo;
$('retry').onclick=()=>{if(!recognizer){status('Primero carga el modelo.');return;}paused=false;void drain();};
$('discard').onclick=async()=>{if(working||recording||importing)return;if(confirm('¿Eliminar los audios pendientes?')){pending=[];paused=false;await savePending();}};
$('insert').onclick=async()=>{if(recording||working||importing){status('Termina el dictado antes de insertar.');return;}try{const r=await chrome.runtime.sendMessage({type:'insert',text:state.draft});status(r.error||'Texto insertado. Revisa el resultado.');}catch(e){status(String(e));}};
$('private').onclick=async()=>{if(recording||working||importing||pending.length){status('Termina el dictado y resuelve los audios pendientes primero.');return;}await save;if(privateMode){state=normalState;privateMode=false;normalState=null;}else{normalState=structuredClone(state);privateMode=true;state={...structuredClone(state),draft:'',versions:[],redo:[],done:[]};}render();$('private').textContent=privateMode?'Salir de sesión privada':'Sesión privada';status(privateMode?'Sesión privada: no se guarda automáticamente.':'Sesión privada cerrada.');};
$('save-template').onclick=()=>{const name=$('template-name').value.trim();if(!name||!state.draft)return;state.templates.push({id:crypto.randomUUID(),name,text:state.draft});$('template-name').value='';render();void persist();};
function download(name,text){const u=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),10000);}
$('backup').onclick=async()=>{try{const id=crypto.randomUUID(),session={id,text:state.draft,original:state.draft,created:Date.now(),versions:state.versions,done:[]};download('gosu-speech-to-text-extension-respaldo.gosu',await encodeBackup({sessions:[session],active:id,settings:state.settings,snippets:state.templates},$('password').value));status('Respaldo descargado. Sin contraseña se exporta sin cifrar.');}catch(e){status(String(e));}};
$('restore').onchange=async e=>{const f=e.target.files?.[0];e.target.value='';if(!f||working||recording||pending.length)return;try{const backup=await decodeBackup(await f.text(),$('password').value);if(!confirm('¿Reemplazar el borrador y preferencias por el respaldo?'))return;const active=backup.sessions.find(x=>x.id===backup.active);state={draft:active.text,versions:active.versions,redo:[],done:[],settings:backup.settings,templates:backup.snippets||[]};render();await persist();status('Restaurado el borrador activo y sus preferencias. Los demás borradores permanecen en el archivo de respaldo.');}catch(e){status(String(e));}};
$('import-audio').onchange=async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;if(!recognizer||recording||working||importing||pending.length){status('Carga el modelo y resuelve el audio pendiente primero.');return;}importing=true;paused=true;try{await importRecording(f,blob=>accept(blob,{mode:'dictate',settings:{...state.settings},snapshot:state.draft,selection:[0,0]}),status);paused=false;void drain();}catch(e){if(!pending.length)paused=false;status(String(e));}finally{importing=false;}};
function read(){if(!('speechSynthesis' in window)){status('Lectura no disponible.');return;}speechSynthesis.cancel();const voices=speechSynthesis.getVoices().filter(v=>v.localService);if(!voices.length){status('No hay voces locales disponibles en el sistema.');return;}const voice=new SpeechSynthesisUtterance(state.draft);voice.lang=state.settings.language==='auto'?'':state.settings.language;voice.voice=voices.find(v=>v.lang.startsWith(state.settings.language))||voices[0];speechSynthesis.speak(voice);}
$('read').onclick=read;$('stop-read').onclick=()=>speechSynthesis.cancel();
$('clear').onclick=async()=>{if(recording||working||importing)return;if(confirm('¿Borrar texto, versiones y audio pendiente?')){state.draft='';state.versions=[];state.redo=[];state.done=[];pending=[];paused=false;render();await persist();await savePending();}};
window.addEventListener('keydown',e=>{if(e.ctrlKey&&e.altKey&&e.code==='KeyC'){e.preventDefault();void copy().catch(err=>status(String(err)));}});
window.addEventListener('beforeunload',e=>{if(recording||working||importing||privateMode){e.preventDefault();e.returnValue='';}});
render();if(pending.length)status('Se recuperaron audios pendientes. Carga el modelo y pulsa Reintentar.');
