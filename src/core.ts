export type Edit = { text: string; message: string; changed: boolean; choices?:[number,number][] };
export function clean(text: string, fillers: string[], dictionary: Record<string,string>) {
  let result = text;
  for (const [from,to] of Object.entries(dictionary)) {
    if (!from.trim()) continue;
    result = result.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${escape(from)}(?![\\p{L}\\p{N}_])`, 'giu'), () => to);
  }
  // Only explicit, user-configured fillers: never infer personal rules.
  for (const filler of fillers.filter(x=>x.trim())) {
    result = result.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${escape(filler.trim())}(?![\\p{L}\\p{N}_])[, ]*`, 'giu'), '');
  }
  return result.replace(/ {2,}/g,' ').trim();
}
function escape(s:string) { return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
export function edit(text:string, command:string, selection?:[number,number]):Edit {
  const c=command.trim().replace(/[.!?]+$/,'').replace(/^replace (.+?) with (.+)$/i,'cambia $1 por $2').replace(/^delete (?:the )?last sentence$/i,'borra la última frase').replace(/^delete selection$/i,'borra selección').replace(/^new paragraph$/i,'nuevo párrafo').replace(/^make (?:it )?a list$/i,'pon en lista');
  const range=selection && selection[1]>selection[0] ? selection : [0,text.length];
  const before=text.slice(0,range[0]), target=text.slice(range[0],range[1]), after=text.slice(range[1]);
  let result=target;
  if (/^(borra|elimina) (la )?selecci[oó]n$/i.test(c)) {
    if (!selection || selection[0]===selection[1]) return {text,message:'Selecciona primero el texto que quieres borrar.',changed:false};
    result='';
  } else if (/^(borra|elimina) (la )?[uú]ltima frase$/i.test(c)) {
    result=target.trimEnd().replace(/[^.!?\n]+[.!?]*$/u,'').trimEnd();
  } else if (/^(nuevo p[aá]rrafo|salto de p[aá]rrafo)$/i.test(c)) result=target+'\n\n';
  else if (/^(pon|convierte) (eso |esto |la selecci[oó]n )?(en |como )?(una )?lista$/i.test(c)) {
    result=target.split(/\n+|(?<=[.!?])\s+/).filter(Boolean).map(s=>'• '+s.replace(/^•\s*/, '')).join('\n');
  } else {
    const m=c.match(/^(?:cambia|reemplaza)\s+(.+?)\s+por\s+(.+)$/i);
    if (!m) return {text,message:'Orden no reconocida. Prueba «cambia mañana por jueves», «borra la última frase» o «deshacer».',changed:false};
    const re=new RegExp(`(?<![\\p{L}\\p{N}_])${escape(m[1])}(?![\\p{L}\\p{N}_])`,'giu');
    const matches=[...target.matchAll(re)];
    if (matches.length!==1) return {text,choices:matches.length?matches.map(m=>[range[0]+m.index!,range[0]+m.index!+m[0].length] as [number,number]):undefined,message:matches.length ? `Hay ${matches.length} coincidencias. Selecciona una y repite la orden.` : 'No encontré ese texto. No hice cambios.',changed:false};
    result=target.replace(re,()=>m[2]);
  }
  const next=before+result+after;
  return {text:next,message:next!==text?'Corrección aplicada. Puedes deshacerla.':'No había texto que modificar.',changed:next!==text};
}
export function wav(samples:Float32Array, rate:number):Blob {
  const b=new ArrayBuffer(44+samples.length*2), d=new DataView(b);
  function str(at:number,s:string){for(let i=0;i<s.length;i++)d.setUint8(at+i,s.charCodeAt(i));}
  str(0,'RIFF');d.setUint32(4,b.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');d.setUint32(16,16,true);d.setUint16(20,1,true);d.setUint16(22,1,true);d.setUint32(24,rate,true);d.setUint32(28,rate*2,true);d.setUint16(32,2,true);d.setUint16(34,16,true);str(36,'data');d.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++){const s=Math.max(-1,Math.min(1,samples[i]));d.setInt16(44+i*2,s<0?s*32768:s*32767,true);}
  return new Blob([b],{type:'audio/wav'});
}
