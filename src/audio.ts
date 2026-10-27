import {wav} from './core';
export class Capture {
  private ctx?:AudioContext;private stream?:MediaStream;private node?:AudioWorkletNode;
  private parts:Float32Array[]=[];private count=0;private quiet=0;private voiced=false;
  async start(device:string,pause:number,onChunk:(blob:Blob)=>void,onLevel:(n:number)=>void,onEnded:()=>void,threshold=.008){
    try {
      this.stream=await navigator.mediaDevices.getUserMedia({audio:{deviceId:device?{exact:device}:undefined,echoCancellation:true,noiseSuppression:true,channelCount:1}});
      for(const t of this.stream.getTracks())t.onended=onEnded;
      this.ctx=new AudioContext();await this.ctx.audioWorklet.addModule('/capture.js');
      this.node=new AudioWorkletNode(this.ctx,'voice-capture');
      this.node.port.onmessage=(e:MessageEvent<Float32Array>)=>{
        const block=e.data;const rms=Math.sqrt(block.reduce((sum,x)=>sum+x*x,0)/block.length);onLevel(Math.min(1,rms*9));
        this.parts.push(block);this.count+=block.length;
        if(rms>threshold){this.voiced=true;this.quiet=0;}else this.quiet+=block.length/this.ctx!.sampleRate;
        const seconds=this.count/this.ctx!.sampleRate;
        if((this.voiced && this.quiet>pause && seconds>1)||seconds>=18)this.flush(onChunk);
      };
      const gain=this.ctx.createGain();gain.gain.value=0;
      this.ctx.createMediaStreamSource(this.stream).connect(this.node);this.node.connect(gain);gain.connect(this.ctx.destination);await this.ctx.resume();
    }catch(e){await this.stop(()=>{});throw e;}
  }
  private flush(onChunk:(blob:Blob)=>void){
    if(this.voiced && this.ctx){const all=new Float32Array(this.count);let at=0;for(const p of this.parts){all.set(p,at);at+=p.length;}onChunk(wav(all,this.ctx.sampleRate));}
    this.parts=[];this.count=0;this.quiet=0;this.voiced=false;
  }
  async stop(onChunk:(blob:Blob)=>void){
    if(this.node){this.node.port.onmessage=null;this.node.disconnect();}
    this.flush(onChunk);this.stream?.getTracks().forEach(t=>{t.onended=null;t.stop();});await this.ctx?.close();this.ctx=undefined;
  }
}
