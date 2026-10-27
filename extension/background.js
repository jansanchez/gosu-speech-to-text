import {captureDestination,insertDestination} from './destination';
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(sender.id!==chrome.runtime.id)return;
 (async()=>{
  if(message.type==='open'){
   const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
   if(tab?.id){
    try{await chrome.scripting.executeScript({target:{tabId:tab.id},func:captureDestination});await chrome.storage.session.set({target:tab.id});}catch{await chrome.storage.session.remove('target');}
   }
   const url=chrome.runtime.getURL('recorder.html'),{recorder}=await chrome.storage.session.get('recorder');
   if(recorder){try{const previous=await chrome.tabs.get(recorder);if(previous.url===url){await chrome.tabs.update(recorder,{active:true});return {ok:true};}}catch{}}
   const created=await chrome.tabs.create({url});if(created.id)await chrome.storage.session.set({recorder:created.id});return {ok:true};
  }
  if(message.type==='insert'){
   if(typeof message.text!=='string'||message.text.length>100000)return {error:'Texto inválido.'};
   const {target}=await chrome.storage.session.get('target');if(!target)return {error:'No hay un campo de destino. Usa Copiar.'};
   const results=await chrome.scripting.executeScript({target:{tabId:target},args:[message.text],func:insertDestination
   });
   const error=results[0]?.result;if(error)return {error};await chrome.tabs.update(target,{active:true});return {ok:true};
  }
  return {error:'Acción desconocida.'};
 })().then(respond).catch(e=>respond({error:String(e)}));return true;
});
