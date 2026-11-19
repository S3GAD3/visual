'use strict';
const $=id=>document.getElementById(id), report=t=>$('status').textContent=t;
let p=fresh(),assets=new Map(),selected=-1,pos=0,playing=false,anchor=0,raf=0,seq=[],lengthSec=0,track=null,busy=false;
const uid=()=>crypto.randomUUID();
const readData=f=>new Promise((ok,bad)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>bad(Error('No se pudo leer el archivo'));r.readAsDataURL(f)});
async function imageAsset(src,name){
  if(!/^data:image\/(jpeg|png|webp);base64,/i.test(src))throw Error('Formato de imagen no admitido');
  const image=new Image();image.src=src;await image.decode();
  const thumb=document.createElement('canvas');thumb.width=144;thumb.height=80;const k=Math.min(144/image.width,80/image.height);
  thumb.getContext('2d').drawImage(image,(144-image.width*k)/2,(80-image.height*k)/2,image.width*k,image.height*k);
  return {src,name,image,thumb:thumb.toDataURL('image/webp',.65)};
}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),60000)}
function stop(){playing=false;cancelAnimationFrame(raf);track?.pause();$('play').textContent='▶'}
function audioAt(el,t){if(!el)return;const align=()=>{if(Number.isFinite(el.duration)&&el.duration>0)el.currentTime=t%el.duration};if(el.readyState)align();else el.addEventListener('loadedmetadata',align,{once:true});el.play().catch(()=>report('No se pudo reproducir la música'))}
function paint(){draw($('preview'),p,seq,pos,assets);$('seek').value=pos;$('time').textContent=clock(pos)+' / '+clock(lengthSec)}
function tick(now){if(!playing)return;pos=((now-anchor)/1000)%lengthSec;paint();raf=requestAnimationFrame(tick)}
function play(){if(playing){stop();return}if(!lengthSec)return;playing=true;anchor=performance.now()-pos*1000;if(!p.mute)audioAt(track,pos);$('play').textContent='Ⅱ';raf=requestAnimationFrame(tick)}
function garbage(){const used=new Set([...p.clips.map(c=>c.asset),p.logo,p.music]);for(const k of assets.keys())if(!used.has(k))assets.delete(k)}
function select(i){selected=i;stop();pos=(p.intro?3:0)+total(p.clips.slice(0,i));refresh()}
const clipFields=['duration','effect','fit','zoom','x','y','caption'];
function refresh(){
  seq=sequence(p);lengthSec=total(seq);pos=clamp(pos,0,Math.max(0,lengthSec-.001));$('seek').max=lengthSec||1;
  const c=p.clips[selected];$('clip').disabled=!c;
  for(const key of clipFields)if(c)$(key).value=c[key];
  $('manual').hidden=c?.fit!=='manual';
  for(const key of ['style','general','orientation','intro','outro'])$(key).value=p[key];$('mute').checked=p.mute;
  const vertical=p.orientation==='tall';const v=$('preview'),w=vertical?540:960,h=vertical?960:540;
  if(v.width!==w||v.height!==h){v.width=w;v.height=h}
  $('ratio').textContent=vertical?'9:16':'16:9';$('count').textContent=p.clips.length+' clips · '+clock(lengthSec);
  const strip=$('strip'),media=$('media');strip.replaceChildren();media.replaceChildren();const seen=new Set();
  p.clips.forEach((s,i)=>{const a=assets.get(s.asset),img=new Image();img.src=a.thumb;img.alt=a.name;
    if(!seen.has(s.asset)){const m=img.cloneNode();m.title=a.name;m.onclick=()=>select(i);media.append(m);seen.add(s.asset)}
    const b=document.createElement('button');b.append(img,document.createTextNode((i+1)+' · '+s.duration+' s'));b.title=a.name;b.draggable=true;b.classList.toggle('selected',selected===i);b.onclick=()=>select(i);
    b.ondragstart=e=>e.dataTransfer.setData('text/rastro-index',String(i));b.ondragover=e=>e.preventDefault();b.ondrop=e=>{e.preventDefault();const val=e.dataTransfer.getData('text/rastro-index');if(/^\d+$/.test(val))move(Number(val),i)};strip.append(b)});
  if(!p.clips.length)strip.textContent='Las imágenes aparecerán aquí en orden de reproducción.';
  for(const key of ['duplicate','remove','auto'])$(key).disabled=!c;
  $('left').disabled=!c||selected===0;$('right').disabled=!c||selected===p.clips.length-1;
  for(const key of ['tv','export','play','full'])$(key).disabled=!lengthSec;
  paint();
}
function move(a,b){if(a<0||a>=p.clips.length||b<0||b>=p.clips.length)return;p.clips.splice(b,0,p.clips.splice(a,1)[0]);select(b)}
async function transaction(work){if(busy)return;busy=true;stop();document.querySelector('main').inert=true;document.querySelector('header').inert=true;
 try{await work()}catch(e){report('Error · '+e.message)}finally{busy=false;document.querySelector('main').inert=false;document.querySelector('header').inert=false;refresh()}}
async function importFiles(files){await transaction(async()=>{let n=0,bad=0;for(const f of files){try{const id=uid();assets.set(id,await imageAsset(await readData(f),f.name));p.clips.push({...baseClip(),duration:p.general,asset:id});n++}catch{bad++}}if(selected<0&&n)selected=0;report(n+' imágenes importadas'+(bad?' · '+bad+' archivos omitidos':''))})}
$('files').onchange=e=>{importFiles([...e.target.files]);e.target.value=''};
$('drop').ondragover=e=>e.preventDefault();$('drop').ondrop=e=>{e.preventDefault();importFiles([...e.dataTransfer.files])};
for(const [k,v] of Object.entries(FX))$('effect').add(new Option(v,k));
$('left').onclick=()=>move(selected,selected-1);$('right').onclick=()=>move(selected,selected+1);
$('duplicate').onclick=()=>{p.clips.splice(selected+1,0,{...p.clips[selected]});select(selected+1)};
$('remove').onclick=()=>{p.clips.splice(selected,1);garbage();select(Math.min(selected,p.clips.length-1))};
$('reset').onclick=()=>{Object.assign(p.clips[selected],baseClip(),{duration:p.general});select(selected)};
for(const key of clipFields)$(key).onchange=()=>{const c=p.clips[selected];if(!c)return;c[key]=['duration','x','y','zoom'].includes(key)?clamp(Number($(key).value),Number($(key).min),Number($(key).max)):$(key).value;select(selected)};
$('style').onchange=()=>{p.style=$('style').value;p.general=presets[p.style].seconds;refresh();report('Estilo seleccionado. Aplica el montaje automático para ajustar todos los clips.')};
$('general').onchange=()=>{stop();p.general=clamp(+$('general').value,2,600);p.clips.forEach(c=>c.duration=p.general);refresh()};
$('auto').onclick=()=>{stop();const style=presets[p.style];p.clips.forEach((c,i)=>{const im=assets.get(c.asset).image;const ratio=p.orientation==='tall'?9/16:16/9;const pages=ratio*im.height/im.width;
 c.fit=pages>2.4?'scroll':p.style==='Cinematográfico'?'ken':'safe';c.duration=Math.min(600,Math.max(p.general,c.fit==='scroll'?Math.ceil(pages*4):0));c.effect=style.effects[i%style.effects.length]});pos=0;refresh();report('Montaje aplicado · '+clock(lengthSec))};
for(const key of ['intro','outro','orientation'])$(key).onchange=()=>{stop();p[key]=$(key).value;refresh()};
$('mute').onchange=()=>{stop();p.mute=$('mute').checked;refresh()};
function setTrack(){if(track){track.pause();track.removeAttribute('src');track.load()}track=p.music?new Audio(assets.get(p.music).src):null;if(track)track.loop=true}
async function audioAsset(src,name){
 if(!/^data:(audio\/[\w.+-]+|video\/mp4);base64,/i.test(src))throw Error('Formato de música no admitido');
 const a=new Audio();await new Promise((ok,bad)=>{a.onloadedmetadata=ok;a.onerror=()=>bad(Error('Música incompatible'));a.src=src});return {src,name};
}
for(const key of ['logo','music']){
 $(key).onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;transaction(async()=>{const src=await readData(f),id=uid();assets.set(id,key==='logo'?await imageAsset(src,f.name):await audioAsset(src,f.name));p[key]=id;garbage();if(key==='music')setTrack();report(f.name+' incorporado')})};
 $(key==='logo'?'clearLogo':'clearMusic').onclick=()=>{stop();p[key]=null;garbage();if(key==='music')setTrack();refresh()};
}
$('play').onclick=play;$('seek').oninput=()=>{stop();pos=+$('seek').value;paint()};
$('full').onclick=async()=>{try{await document.querySelector('.stage').requestFullscreen();if(!playing)play()}catch(e){report(e.message)}};
$('save').onclick=()=>{const data={...p,assets:Object.fromEntries([...assets].map(([id,{name,src}])=>[id,{name,src}]))};download(new Blob([JSON.stringify(data)],{type:'application/json'}),'Montaje.rastro');report('Proyecto descargado con sus archivos')};
$('open').onclick=()=>$('project').click();
$('project').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;transaction(async()=>{
 const d=JSON.parse(await f.text());const fail=()=>{throw Error('Proyecto RASTRO no válido')};
 const num=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
 if(d.version!==1||!Object.hasOwn(presets,d.style)||!Array.isArray(d.clips)||!['wide','tall'].includes(d.orientation)||!num(d.general,2,600)||typeof d.intro!=='string'||typeof d.outro!=='string'||typeof d.mute!=='boolean')fail();
 const nextAssets=new Map();for(const id of new Set([...d.clips.map(c=>c.asset),d.logo,d.music].filter(Boolean))){const a=d.assets[id];if(!a||typeof a.name!=='string')fail();nextAssets.set(id,id===d.music?await audioAsset(a.src,a.name):await imageAsset(a.src,a.name))}
 for(const c of d.clips)if(!nextAssets.get(c.asset)?.image||!num(c.duration,2,600)||!Object.hasOwn(FX,c.effect)||!['safe','manual','scroll','ken'].includes(c.fit)||!num(c.zoom,1,3)||!num(c.x,0,1)||!num(c.y,0,1)||typeof c.caption!=='string')fail();
 if(d.logo&&!nextAssets.get(d.logo)?.image)fail();delete d.assets;p=d;assets=nextAssets;setTrack();pos=0;selected=p.clips.length?0:-1;report('Proyecto recuperado · '+f.name)
 })};
document.addEventListener('keydown',e=>{if(busy||$('dialog').open||/INPUT|SELECT|BUTTON|TEXTAREA/.test(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();play()}if(p.clips.length&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();select(clamp(selected+(e.key==='ArrowRight'?1:-1),0,p.clips.length-1))}});
refresh();
$('storePreset').onclick=()=>{try{localStorage.setItem('rastro.visual.preset',JSON.stringify({style:p.style,general:p.general,orientation:p.orientation}));report('Ajuste guardado en este navegador')}catch{report('El navegador ha bloqueado el almacenamiento del ajuste')}};
$('loadPreset').onclick=()=>{try{const v=JSON.parse(localStorage.getItem('rastro.visual.preset'));if(!v||!Object.hasOwn(presets,v.style)||!Number.isFinite(v.general)||v.general<2||v.general>600||!['wide','tall'].includes(v.orientation))throw Error();stop();p.style=v.style;p.general=v.general;p.orientation=v.orientation;refresh();report('Ajuste recuperado. Pulsa Montaje automático para aplicarlo a los clips.')}catch{report('No hay un ajuste válido guardado en este navegador')}};
