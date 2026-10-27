/** Pure product operations shared by the desktop UI and tests. */
export type Snippet={id:string;name:string;text:string};
export type Session={id:string;text:string;original:string;created:number;versions:string[];done:string[];redo?:string[];favorite?:boolean;title?:string;tags?:string};
export type Settings={language:string;mode:'literal'|'clean';pause:number;device:string;shortcut:string;fillers:string;dictionary:string;punctuation:boolean;contrast:boolean;fontSize:number;retentionDays:number;llm:boolean;llmModel:string;sounds:boolean;sensitivity:number;embeddingModel:string};
export type State={sessions:Session[];active:string;settings:Settings;snippets?:Snippet[]};
export const defaults:Settings={language:'es',mode:'clean',pause:1.2,device:'',shortcut:'CommandOrControl+Shift+Space',fillers:'',dictionary:'{}',punctuation:false,contrast:false,fontSize:20,retentionDays:30,llm:false,llmModel:'qwen2.5:1.5b',sounds:false,sensitivity:.008,embeddingModel:'bge-m3'};
export const languages=[['es','Español'],['en','English'],['auto','Automático'],['pt','Português'],['fr','Français'],['de','Deutsch'],['it','Italiano'],['zh','中文'],['ja','日本語'],['ko','한국어'],['ar','العربية'],['hi','हिन्दी'],['bn','বাংলা'],['ru','Русский'],['id','Bahasa Indonesia'],['ur','اردو'],['tr','Türkçe'],['vi','Tiếng Việt'],['ta','தமிழ்'],['te','తెలుగు'],['mr','मराठी'],['fa','فارسی'],['sw','Kiswahili'],['pl','Polski'],['uk','Українська'],['nl','Nederlands'],['th','ไทย'],['tl','Filipino'],['gu','ગુજરાતી'],['pa','ਪੰਜਾਬੀ'],['ro','Română'],['sv','Svenska']];
export function punctuation(text:string,language:string){
 const rules=language==='es'?[[/\bpunto y aparte\b/gi,'\n\n'],[/\bnuevo p[aá]rrafo\b/gi,'\n\n'],[/\bsalto de l[ií]nea\b/gi,'\n'],[/\babre interrogaci[oó]n\b/gi,'¿'],[/\bcierra interrogaci[oó]n\b/gi,'?'],[/\bdos puntos\b/gi,':'],[/\bpunto y coma\b/gi,';'],[/\bcoma\b/gi,','],[/\bpunto final\b/gi,'.']]:language==='en'?[[/\bnew paragraph\b/gi,'\n\n'],[/\bnew line\b/gi,'\n'],[/\bfull stop\b/gi,'.'],[/\bcomma\b/gi,','],[/\bquestion mark\b/gi,'?']]:[];
 let output=text;for(const [re,to] of rules)output=output.replace(re as RegExp,to as string);
 return output.replace(/[ \t]+([,.;:!?])/g,'$1').replace(/[ \t]*\n[ \t]*/g,'\n');
}
export function control(command:string){
 const c=command.trim().replace(/[.!?]+$/,'').toLocaleLowerCase();
 const commands:Record<string,string>={'deshacer':'undo','deshaz eso':'undo','déjalo como estaba':'undo','undo':'undo','rehacer':'redo','redo':'redo','copiar':'copy','copia el texto':'copy','copy text':'copy','pegar':'paste','pega el texto':'paste','paste text':'paste','nuevo dictado':'new','new draft':'new','confirmar cambio':'confirm','aplicar cambio':'confirm','confirm change':'confirm','cancelar cambio':'cancel','cancel change':'cancel','leer texto':'read','read text':'read','detener lectura':'stopRead','stop reading':'stopRead','recordar corrección':'learn','guardar corrección':'learn','modo dictado':'dictate','modo corrección':'edit','marcar favorito':'favorite','quitar favorito':'unfavorite'};
 return commands[c]||'';
}
export function dictionaryOf(value:string):Record<string,string>{try{const x=JSON.parse(value);return x&&typeof x==='object'&&!Array.isArray(x)&&Object.values(x).every(v=>typeof v==='string')?x:{};}catch{return {};}}
export function validateBackup(input:unknown):State{
 const x=input as {schema?:number;state?:State};const s=x?.state;
 if(x?.schema!==2||!s||!Array.isArray(s.sessions)||!s.sessions.length||s.sessions.length>5000||!s.settings||typeof s.settings!=='object')throw Error('Respaldo no válido.');
 const ids=new Set<string>();
 for(const session of s.sessions){
  if(typeof session.id!=='string'||ids.has(session.id)||typeof session.text!=='string'||session.text.length>1_000_000||typeof session.original!=='string'||!Number.isFinite(session.created)||!Array.isArray(session.versions)||session.versions.some(v=>typeof v!=='string')||!Array.isArray(session.done)||session.done.some(v=>typeof v!=='string')||(session.redo!==undefined&&(!Array.isArray(session.redo)||session.redo.some(v=>typeof v!=='string')))||(session.title!==undefined&&typeof session.title!=='string')||(session.tags!==undefined&&typeof session.tags!=='string')||(session.favorite!==undefined&&typeof session.favorite!=='boolean'))throw Error('El respaldo contiene un borrador inválido.');ids.add(session.id);
 }
 if(!ids.has(s.active))throw Error('El borrador activo no existe.');
 const cfg={...defaults,...s.settings,device:''};
 if(!['literal','clean'].includes(cfg.mode)||typeof cfg.language!=='string'||typeof cfg.shortcut!=='string'||typeof cfg.dictionary!=='string'||typeof cfg.fillers!=='string'||!Number.isFinite(cfg.pause)||cfg.pause<.5||cfg.pause>4||!Number.isFinite(cfg.fontSize)||cfg.fontSize<16||cfg.fontSize>32||!Number.isFinite(cfg.retentionDays)||cfg.retentionDays<0||cfg.retentionDays>3650||!Number.isFinite(cfg.sensitivity)||cfg.sensitivity<.002||cfg.sensitivity>.03||typeof cfg.embeddingModel!=='string'||cfg.embeddingModel.length>100||typeof cfg.llmModel!=='string'||cfg.llmModel.length>100||['punctuation','contrast','llm','sounds'].some(k=>typeof (cfg as any)[k]!=='boolean'))throw Error('Preferencias inválidas en el respaldo.');
 if(s.snippets&&(!Array.isArray(s.snippets)||s.snippets.length>1000||s.snippets.some(a=>typeof a.id!=='string'||typeof a.name!=='string'||typeof a.text!=='string'||a.text.length>100000)))throw Error('Plantillas inválidas.');
 return {...s,settings:cfg,snippets:s.snippets||[]};
}
function b64(bytes:Uint8Array){let text='';for(const b of bytes)text+=String.fromCharCode(b);return btoa(text);}
function un64(value:string){return Uint8Array.from(atob(value),c=>c.charCodeAt(0));}
async function key(password:string,salt:Uint8Array,iterations:number){
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:salt as BufferSource,iterations},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function encodeBackup(state:State,password:string){
 const plain=JSON.stringify({schema:2,created:new Date().toISOString(),state});if(new TextEncoder().encode(plain).byteLength>20_000_000)throw Error('El respaldo supera 20 MB. Exporta o limpia versiones antes de respaldarlo.');if(!password)return plain;
 if(password.length<10)throw Error('Usa una contraseña de al menos 10 caracteres.');
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),iterations=600000;
 const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(password,salt,iterations),new TextEncoder().encode(plain));
 return JSON.stringify({format:'voz-aes-gcm-v1',iterations,salt:b64(salt),iv:b64(iv),data:b64(new Uint8Array(data))});
}
export async function decodeBackup(text:string,password:string){
 if(text.length>30_000_000)throw Error('Respaldo demasiado grande (máximo 30 MB).');
 let x=JSON.parse(text);
 if(x.format==='voz-aes-gcm-v1'){
  if(!Number.isInteger(x.iterations)||x.iterations<100000||x.iterations>2000000||typeof x.data!=='string')throw Error('Formato cifrado inválido.');
  try{const salt=un64(x.salt),iv=un64(x.iv);if(salt.length!==16||iv.length!==12)throw Error();const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:iv as BufferSource},await key(password,salt,x.iterations),un64(x.data) as BufferSource);x=JSON.parse(new TextDecoder().decode(raw));}catch{throw Error('Contraseña incorrecta o respaldo dañado.');}
 }
 return validateBackup(x);
}
