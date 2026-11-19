'use strict';
let monitor=null,closeProgram=null,updateProgram=null;
function openTV(){
 if(monitor&&!monitor.closed&&updateProgram){
  if(confirm('¿Aplicar el montaje actual a la televisión? La reproducción comenzará desde el primer clip.')){updateProgram();report('Montaje actualizado en televisión')}
  return;
 }
 stop();closeProgram?.();monitor=window.open('','rastro_program','popup,width=1080,height=640');
 if(!monitor){report('Permite ventanas emergentes para abrir la televisión');return}
 const win=monitor,doc=win.document;
 doc.open();doc.write('<!doctype html><html lang="es"><title>RASTRO VISUAL · Televisión</title><style>*{box-sizing:border-box}body{margin:0;background:black;display:grid;height:100vh;place-items:center;overflow:hidden}canvas{width:100vw;height:100vh;object-fit:contain}button{position:absolute;padding:16px 25px;background:#92d7ff;border:0;border-radius:8px;font:600 16px sans-serif}body.live{cursor:none}</style><canvas></canvas><button>Iniciar a pantalla completa</button></html>');doc.close();
 const canvas=doc.querySelector('canvas'),btn=doc.querySelector('button');let model=structuredClone(p),list=sequence(model),duration=total(list),bank=new Map(assets);
 let song=model.music&&!model.mute?new win.Audio(bank.get(model.music).src):null;if(song)song.loop=true;
 let start=0,id=0;
 function resize(){const scale=Math.min(3840,Math.max(win.innerWidth,win.innerHeight)*win.devicePixelRatio);const wide=model.orientation==='wide';canvas.width=Math.round(scale*(wide?1:9/16));canvas.height=Math.round(scale*(wide?9/16:1));draw(canvas,model,list,start?(win.performance.now()-start)/1000%duration:0,bank)}
 function loop(now){draw(canvas,model,list,(now-start)/1000%duration,bank);id=win.requestAnimationFrame(loop)}
 function begin(){if(start)return;btn.remove();doc.body.className='live';start=win.performance.now();if(song)audioAt(song,0);id=win.requestAnimationFrame(loop)}
 btn.onclick=()=>{doc.documentElement.requestFullscreen().catch(()=>report('Televisión en ventana · pantalla completa no disponible'));begin()};
 updateProgram=()=>{song?.pause();model=structuredClone(p);list=sequence(model);duration=total(list);bank=new Map(assets);song=model.music&&!model.mute?new win.Audio(bank.get(model.music).src):null;if(song)song.loop=true;if(start){start=win.performance.now();if(song)audioAt(song,0)}resize()};
 closeProgram=()=>{updateProgram=null;$('tv').textContent='▣　Modo televisión';win.cancelAnimationFrame(id);song?.pause();win.removeEventListener('resize',resize);bank.clear();closeProgram=null};
 win.addEventListener('pagehide',closeProgram,{once:true});win.addEventListener('resize',resize);resize();win.focus();report('Mueve la ventana al monitor y pulsa Iniciar. Para actualizarla, vuelve a pulsar Aplicar a TV.');$('tv').textContent='▣　Aplicar a TV';
}
$('tv').onclick=openTV;
function formats(audio){
 if(!window.MediaRecorder)return [];
 return [['MP4 · H.264','video/mp4;codecs=avc1'+(audio?',mp4a.40.2':'')],['WebM · VP9','video/webm;codecs=vp9'+(audio?',opus':'')],['WebM · VP8','video/webm;codecs=vp8'+(audio?',opus':'')]].filter(([,mime])=>MediaRecorder.isTypeSupported(mime));
}
let job=null;
$('export').onclick=()=>{stop();const opts=formats(p.music&&!p.mute);if(!p.music||p.mute)opts.push(["WebM · por fotogramas (sin audio)","frames"]);$('format').replaceChildren(...opts.map(([label,value])=>new Option(label,value)));$('record').disabled=!opts.length;$('message').textContent=opts.length?'':'Ningún codificador compatible con este montaje.';$('progress').value=0;$('dialog').showModal()};
$('cancel').onclick=()=>job?job.abort():$('dialog').close();$('dialog').oncancel=e=>{if(job){e.preventDefault();job.abort()}};
$('record').onclick=async()=>{
 if(job)return;const controller=new AbortController();job=controller;const signal=controller.signal;
 const canvas=document.createElement('canvas'),long=+$('size').value,fps=+$('fps').value,mime=$('format').value;
 canvas.width=p.orientation==='wide'?long:long*9/16;canvas.height=p.orientation==='wide'?long*9/16:long;
 let stream,ctx,source,rec,timer=0,frameId=0,blob,reason='';
 const hidden=()=>{if(document.hidden){reason='Grabación interrumpida al ocultar la pestaña.';controller.abort()}};
 $('cancel').textContent='Cancelar';$('record').disabled=true;$('message').textContent='Preparando grabación…';$('progress').value=0;
 try{
  document.addEventListener('visibilitychange',hidden);
  if(mime==='frames'){
   $('message').textContent='Codificando fotogramas…';
   const result=await exportFrames(canvas,fps,signal);download(result,'RASTRO-VISUAL.webm');$('message').textContent='Vídeo generado · '+(result.size/1048576).toFixed(1)+' MB';return;
  }
  draw(canvas,p,seq,0,assets);stream=canvas.captureStream(fps);
  if(p.music&&!p.mute){
   ctx=new AudioContext();await ctx.resume();const data=await (await fetch(assets.get(p.music).src)).arrayBuffer();const buffer=await ctx.decodeAudioData(data);
   source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;const dest=ctx.createMediaStreamDestination();source.connect(dest);stream.addTrack(dest.stream.getAudioTracks()[0]);
  }
  signal.throwIfAborted();rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:long===3840?32000000:10000000});
  const chunks=[];
  await new Promise((resolve,reject)=>{
   let stored=0;rec.ondataavailable=e=>{stored+=e.data.size;if(stored>512*1024*1024){reason='Grabación detenida al alcanzar 512 MiB. Divide el montaje.';controller.abort()}else if(e.data.size)chunks.push(e.data)};
   rec.onerror=e=>reject(e.error||Error('Fallo del codificador'));
   rec.onstop=resolve;const finish=()=>{if(rec.state!=='inactive')rec.stop()};
   signal.addEventListener('abort',finish,{once:true});rec.start(500);source?.start();
   const begin=performance.now();$('message').textContent='Grabando '+canvas.width+' × '+canvas.height+' · '+fps+' fps';
   function render(now){if(signal.aborted||rec.state==='inactive')return;try{const t=(now-begin)/1000;draw(canvas,p,seq,Math.min(t,lengthSec-.001),assets);$('progress').value=t/lengthSec;if(t>=lengthSec)finish();else frameId=requestAnimationFrame(render)}catch(e){reject(e)}}
   frameId=requestAnimationFrame(render);timer=setTimeout(finish,lengthSec*1000+120);
  });
  signal.throwIfAborted();blob=new Blob(chunks,{type:rec.mimeType});if(!blob.size)throw Error('El codificador generó un archivo vacío');
  download(blob,'RASTRO-VISUAL.'+(mime.includes('mp4')?'mp4':'webm'));$('progress').value=1;$('message').textContent='Vídeo generado · '+(blob.size/1048576).toFixed(1)+' MB';
 }catch(e){$('message').textContent=signal.aborted?(reason||'Exportación cancelada.'):'Error de exportación · '+e.message+'. Prueba WebM, Full HD o menos FPS.'}
 finally{clearTimeout(timer);cancelAnimationFrame(frameId);document.removeEventListener('visibilitychange',hidden);if(rec&&rec.state!=='inactive')rec.stop();stream?.getTracks().forEach(t=>t.stop());source?.disconnect();if(ctx)await ctx.close();canvas.width=canvas.height=1;job=null;$('record').disabled=false;$('cancel').textContent='Cerrar'}
};
