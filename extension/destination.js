// These two functions must be self-contained: Chrome serializes them into the target tab.
export function captureDestination(){
 const el=document.activeElement;
 const field=el instanceof HTMLTextAreaElement||(el instanceof HTMLInputElement&&['text','search','url','tel'].includes(el.type));
 if(field){window.__vozDestination={kind:'field',el,start:el.selectionStart,end:el.selectionEnd,value:el.value};return;}
 const editable=el instanceof HTMLElement&&(el.isContentEditable||['true','plaintext-only',''].includes(el.getAttribute('contenteditable')));
 const selection=window.getSelection();
 if(editable&&selection?.rangeCount){const range=selection.getRangeAt(0);if(el.contains(range.commonAncestorContainer)){
   // Complex editors maintain their own document model; do not mutate them.
   if(el.querySelector('[data-lexical-editor], [data-slate-node], [class*=ProseMirror], [role=grid]')||el.closest('[data-slate-editor], .ProseMirror, [data-lexical-editor], .kix-appview-editor')){window.__vozDestination=null;return;}
   window.__vozDestination={kind:'editable',el,html:el.innerHTML,range:range.cloneRange()};return;
 }}
 window.__vozDestination=null;
}
export function insertDestination(text){
 const d=window.__vozDestination;
 if(!d?.el?.isConnected)return 'El campo ya no está disponible. Usa Copiar.';
 const el=d.el;
 if(d.kind==='field'){
  if(el.value!==d.value)return 'El campo cambió. No se sobrescribió nada. Usa Copiar.';
  if(el.readOnly||el.disabled)return 'El campo está bloqueado.';
  if(d.start==null||d.end==null)return 'Este campo no admite selección. Usa Copiar.';
  const next=el.value.slice(0,d.start)+text+el.value.slice(d.end);
  const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto,'value').set.call(el,next);
  el.focus();el.setSelectionRange(d.start+text.length,d.start+text.length);
  el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));
 }else{
  if(el.innerHTML!==d.html||!el.contains(d.range.commonAncestorContainer))return 'El editor cambió. Usa Copiar.';
  if(!el.isContentEditable&& !['true','plaintext-only',''].includes(el.getAttribute('contenteditable')))return 'El editor ya no es editable.';
  el.focus();const selection=window.getSelection();selection.removeAllRanges();selection.addRange(d.range);
  if(typeof document.execCommand!=='function'||!document.execCommand('insertText',false,text))return 'Este editor requiere pegar manualmente. Usa Copiar.';
 }
 window.__vozDestination=null;return null;
}
