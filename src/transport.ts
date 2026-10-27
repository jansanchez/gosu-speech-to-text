import {invoke,isTauri} from '@tauri-apps/api/core';
export type Health={ready:boolean;model:string;state?:string;error?:string};
export type Recognition={text:string;words:{text:string;review:boolean}[];language:string};
export async function engineHealth(baseUrl:string):Promise<Health>{
 if(isTauri())return invoke<Health>('engine_health');
 const response=await fetch(baseUrl+'/health',{signal:AbortSignal.timeout(3000)});
 if(!response.ok)throw Error(`Motor: HTTP ${response.status}`);
 return response.json();
}
export async function transcribeAudio(blob:Blob,language:string,vocabulary:string,baseUrl:string,token:string):Promise<Recognition>{
 if(isTauri())return invoke<Recognition>('engine_transcribe',{audio:Array.from(new Uint8Array(await blob.arrayBuffer())),language,vocabulary});
 const form=new FormData();form.append('file',blob,'chunk.wav');form.append('language',language);form.append('vocabulary',vocabulary);
 const response=await fetch(baseUrl+'/transcribe',{method:'POST',headers:{'X-Voz-Token':token},body:form,signal:AbortSignal.timeout(180000)});
 if(!response.ok){const detail=await response.json().catch(()=>({detail:`Motor: HTTP ${response.status}`}));throw Error(detail.detail||'Error al transcribir');}
 return response.json();
}

export async function rewriteText(text:string,instruction:string,model:string,baseUrl:string,token:string):Promise<{text:string}>{
 if(isTauri())return invoke('engine_rewrite',{text,instruction,model});
 const r=await fetch(baseUrl+'/rewrite',{method:'POST',headers:{'Content-Type':'application/json','X-Voz-Token':token},body:JSON.stringify({text,instruction,model}),signal:AbortSignal.timeout(210000)});
 if(!r.ok){const error=await r.json().catch(()=>({detail:'Error del editor local'}));throw Error(error.detail);}
 return r.json();
}

export async function searchMeaning(query:string,documents:{id:string;text:string}[],model:string,baseUrl:string,token:string):Promise<{results:{id:string;score:number}[]}>{
 if(isTauri())return invoke('engine_search',{query,documents,model});
 const response=await fetch(baseUrl+'/search',{method:'POST',headers:{'Content-Type':'application/json','X-Voz-Token':token},body:JSON.stringify({query,documents,model}),signal:AbortSignal.timeout(300000)});
 if(!response.ok){const error=await response.json().catch(()=>({detail:'Error de búsqueda local'}));throw Error(error.detail);}
 return response.json();
}
