// Canvas compartido por el editor, la salida de programa y el grabador.
const FX = {fade:'Fundido cruzado', slide:'Desplazamiento lateral', zoom:'Zoom cinematográfico', blur:'Desenfoque progresivo', mix:'Zoom y fundido'};
const presets = {
  Prensa:{seconds:8,effects:['fade','mix'],color:'#112736',transition:.85},
  Cinematográfico:{seconds:7,effects:['zoom','fade','mix'],color:'#171e28',transition:1.15},
  Institucional:{seconds:9,effects:['fade','slide'],color:'#102e49',transition:.8},
  Dinámico:{seconds:4,effects:['slide','zoom','blur','mix'],color:'#152a3c',transition:.48}
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>t*t*(3-2*t);
const baseClip=()=>({fit:'safe',zoom:1,x:.5,y:.5,effect:'fade',caption:''});
const fresh=()=>({version:1,style:'Prensa',general:8,orientation:'wide',intro:'',outro:'',mute:false,logo:null,music:null,clips:[]});
function sequence(p){
  const card=text=>({card:text,duration:3,effect:'fade'});
  return [...(p.intro?[card(p.intro)]:[]),...p.clips,...(p.outro?[card(p.outro)]:[])];
}
const total=seq=>seq.reduce((sum,c)=>sum+c.duration,0);
const clock=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
function lines(ctx,text,width){
  const result=[];let line='';
  for(const word of text.split(/\s+/)){
    const joined=line?line+' '+word:word;
    if(line && ctx.measureText(joined).width>width){result.push(line);line=word}else line=joined;
  }
  result.push(line);return result;
}
function slate(g,w,h,title){
  g.fillStyle='#102637';g.fillRect(0,0,w,h);g.strokeStyle='#234458';g.lineWidth=1;
  const step=Math.max(12,w/20);
  for(let i=0;i<w+h;i+=step){g.beginPath();g.moveTo(i,0);g.lineTo(i-h,h);g.stroke()}
  g.fillStyle='#113044';g.fillRect(w*.075,h*.18,w*.85,h*.64);
  g.fillStyle='#78d2ff';g.fillRect(w*.075,h*.18,w*.008,h*.64);
  g.font='bold '+w*.018+'px monospace';g.fillText('RASTRO  /  NEWS DISPLAY',w*.13,h*.32);
  g.fillStyle='#e8f4fc';g.font='bold '+w*(title?.044:.08)+'px sans-serif';
  const rows=title?lines(g,title,w*.73):['RASTRO VISUAL'];
  rows.forEach((v,i)=>g.fillText(v,w*.13,h*.53+(i-(rows.length-1)/2)*w*.055,w*.74));
  if(!title){g.fillStyle='#a6c0d0';g.font=w*.026+'px sans-serif';g.fillText('Importa imágenes para comenzar',w*.13,h*.67)}
}
// Fondo de baja resolución calculado una vez por orientación y recurso.
function backdrop(a,w,h){
  const key=w>h?'land':'port';if(a[key])return a[key];
  const b=document.createElement('canvas');b.width=w>h?256:144;b.height=w>h?144:256;
  const g=b.getContext('2d'),im=a.image,k=Math.max(b.width/im.width,b.height/im.height)*1.25;
  g.filter='blur(7px)';g.drawImage(im,(b.width-im.width*k)/2,(b.height-im.height*k)/2,im.width*k,im.height*k);
  a[key]=b;return b;
}
function frame(g,w,h,c,u,p,assets){
  if(c.card){slate(g,w,h,c.card);return}
  const a=assets.get(c.asset),im=a.image;
  g.fillStyle=presets[p.style].color;g.fillRect(0,0,w,h);
  g.save();g.globalAlpha*=.36;g.drawImage(backdrop(a,w,h),0,0,w,h);g.restore();
  const bottom=c.caption?h*.17:0, usable=h-bottom, margin=.95;
  let k=Math.min(w/im.width,usable/im.height)*margin, px=.5,py=.5;
  if(c.fit==='scroll'){k=w*margin/im.width;py=smooth(clamp((u-.10)/.80,0,1))}
  if(c.fit==='ken'){k*=1+.065*smooth(u);px=.35+.3*u}
  if(c.fit==='manual'){k*=c.zoom;px=c.x;py=c.y}
  const iw=k*im.width,ih=k*im.height;
  g.save();g.beginPath();g.rect(0,0,w,usable);g.clip();g.drawImage(im,(w-iw)*px,(usable-ih)*(c.fit==='scroll'&&ih<usable?.5:py),iw,ih);g.restore();
  if(c.caption){g.fillStyle='#0d2032';g.fillRect(0,usable,w,bottom);g.fillStyle='#83d4ff';g.fillRect(w*.04,usable+bottom*.2,w*.004,bottom*.6);g.fillStyle='#fff';g.font='600 '+Math.min(w,h)*.045+'px sans-serif';g.fillText(c.caption,w*.062,usable+bottom*.63,w*.9)}
}
function draw(canvas,p,seq,t,assets){
  const g=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  if(!seq.length){slate(g,w,h,'');return}
  let i=0;while(i<seq.length-1 && t>=seq[i].duration)t-=seq[i++].duration;
  const c=seq[i],next=seq[(i+1)%seq.length],len=presets[p.style].transition;
  frame(g,w,h,c,clamp(t/c.duration,0,1),p,assets);
  const a=smooth(clamp((t-c.duration+len)/len,0,1));
  if(a && seq.length>1){
    g.save();g.globalAlpha=a;
    if(c.effect==='slide')g.translate((1-a)*w*.18,0);
    if(['zoom','mix'].includes(c.effect)){const k=1+(1-a)*(c.effect==='zoom'?.09:.035);g.translate(w*(1-k)/2,h*(1-k)/2);g.scale(k,k)}
    if(c.effect==='blur')g.filter='blur('+((1-a)*w*.005)+'px)';
    // Compose the incoming frame first so its opaque background fades as one layer.
    const layer=canvas._layer ||= document.createElement('canvas');
    if(layer.width!==w || layer.height!==h){layer.width=w;layer.height=h}
    frame(layer.getContext('2d'),w,h,next,0,p,assets);g.drawImage(layer,0,0);g.restore();
  }
  if(p.logo){const im=assets.get(p.logo).image,k=Math.min(w*.13/im.width,h*.09/im.height);g.drawImage(im,w*.97-im.width*k,h*.035,im.width*k,im.height*k)}
}
