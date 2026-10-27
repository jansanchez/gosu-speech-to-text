import {wav} from './core';
/** Decode once, then resample one small segment at a time. Never sends the source file remotely. */
export async function importRecording(file:File,onChunk:(blob:Blob)=>Promise<void>,progress:(text:string)=>void){
 if(file.size>40_000_000)throw Error('El archivo supera 40 MB. Divide la grabación antes de importarla.');
 const decoder=new AudioContext();let audio:AudioBuffer;
 try{audio=await decoder.decodeAudioData(await file.arrayBuffer());}finally{await decoder.close();}
 if(audio.duration>1800)throw Error('Máximo 30 minutos por archivo.');
 for(let start=0;start<audio.duration;start+=18){
  const count=Math.min(Math.round(18*audio.sampleRate),audio.length-Math.round(start*audio.sampleRate));
  const segment=new AudioBuffer({numberOfChannels:1,length:count,sampleRate:audio.sampleRate});
  const mono=segment.getChannelData(0);for(let c=0;c<audio.numberOfChannels;c++){const src=audio.getChannelData(c);for(let i=0;i<count;i++)mono[i]+=src[Math.round(start*audio.sampleRate)+i]/audio.numberOfChannels;}
  const offline=new OfflineAudioContext(1,Math.ceil(count/audio.sampleRate*16000),16000),source=offline.createBufferSource();source.buffer=segment;source.connect(offline.destination);source.start();
  const rendered=await offline.startRendering();await onChunk(wav(rendered.getChannelData(0),16000));progress(`Audio importado: ${Math.min(100,Math.round((start+18)/audio.duration*100))} %`);
 }
}
