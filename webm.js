// WebM silencioso de cadencia constante. Cada WebP con pérdida aporta un
// fotograma clave VP8. Los clústeres llevan marcas de tiempo en milisegundos.
const WebMFrames=(()=>{
 const bytes=v=>Uint8Array.from(v),uint=v=>{const a=[];do{a.unshift(v%256);v=Math.floor(v/256)}while(v);return bytes(a)};
 function size(n){let len=1;while(n>=2**(7*len)-1)len++;const out=new Uint8Array(len);for(let i=len-1;i>=0;i--){out[i]=n%256;n=Math.floor(n/256)}out[0]|=1<<(8-len);return out}
 function element(id,...parts){const payload=new Blob(parts);return new Blob([uint(id),size(payload.size),payload])}
 const n=(id,v)=>element(id,uint(v));
 function writer(w,h,fps){
  const clusters=[];let blocks=[],start=0,count=0,used=0;
  const flush=()=>{if(blocks.length)clusters.push(element(0x1f43b675,n(0xe7,start),...blocks));blocks=[]};
  return {
   add(webp){
    const view=new DataView(webp.buffer,webp.byteOffset,webp.byteLength);
    let at=12;while(at+8<=webp.length && view.getUint32(at)!==0x56503820){const len=view.getUint32(at+4,true);at+=8+len+(len%2)}
    if(at+8>webp.length)throw Error('El navegador no genera WebP VP8');
    const length=view.getUint32(at+4,true),packet=webp.subarray(at+8,at+8+length);
    if(packet.length!==length)throw Error('Fotograma incompleto');
    const now=Math.round(count++*1000/fps);if(now-start>=2000){flush();start=now}
    const dt=now-start;blocks.push(element(0xa3,bytes([0x81,dt>>8,dt&255,128]),packet));used+=packet.length;
    if(used>512*1024*1024)throw Error('El vídeo supera 512 MiB. Divide el proyecto o usa grabación en tiempo real');
   },
   finish(){flush();const duration=new ArrayBuffer(8);new DataView(duration).setFloat64(0,count*1000/fps);
    const head=element(0x1a45dfa3,n(0x4286,1),n(0x42f7,1),n(0x42f2,4),n(0x42f3,8),element(0x4282,'webm'),n(0x4287,2),n(0x4285,2));
    const info=element(0x1549a966,n(0x2ad7b1,1000000),element(0x4489,duration),element(0x4d80,'RASTRO VISUAL'),element(0x5741,'RASTRO VISUAL'));
    const track=element(0x1654ae6b,element(0xae,n(0xd7,1),n(0x73c5,1),n(0x83,1),element(0x86,'V_VP8'),n(0x23e383,Math.round(1e9/fps)),element(0xe0,n(0xb0,w),n(0xba,h))));
    return new Blob([head,element(0x18538067,info,track,...clusters)],{type:'video/webm'})
   }
  };
 }
 return {writer};
})();
async function exportFrames(canvas,fps,signal){
 const mux=WebMFrames.writer(canvas.width,canvas.height,fps),count=Math.ceil(lengthSec*fps);
 for(let i=0;i<count;i++){
  signal.throwIfAborted();draw(canvas,p,seq,i/fps,assets);
  const blob=await new Promise((ok,bad)=>canvas.toBlob(b=>b?ok(b):bad(Error('Fotograma vacío')),'image/webp',.85));
  mux.add(new Uint8Array(await blob.arrayBuffer()));$('progress').value=(i+1)/count;
 }
 signal.throwIfAborted();return mux.finish();
}
