import React,{useEffect,useId,useRef,useState} from 'react';
export const PHOTO_SHAPES=[
 {id:'organic',name:'Nube',path:'M7 30 C12 10 27 12 39 15 C53 20 58 5 74 9 C94 12 98 31 95 51 C93 70 79 75 65 72 C49 68 43 89 26 87 C8 85 0 61 7 30 Z'},
 {id:'pebble',name:'Gota orgánica',path:'M30 5 C48 -2 71 8 69 28 C66 45 93 45 96 64 C102 84 78 95 54 97 C30 101 8 94 6 75 C3 60 16 48 14 34 C10 20 14 10 30 5 Z'},
 {id:'hourglass',name:'Onda',path:'M12 7 C26 0 40 12 57 9 C76 7 89 -1 95 14 C103 33 85 41 87 54 C88 68 105 85 89 94 C73 103 53 95 36 97 C17 100 0 92 5 76 C9 59 18 55 12 42 C5 28 -1 15 12 7 Z'},
 {id:'wave',name:'Lazo',path:'M11 8 C27 -2 40 14 55 10 C73 7 94 -2 97 17 C102 35 85 46 88 61 C92 78 101 98 82 96 C63 95 53 84 38 91 C21 98 0 102 4 82 C9 62 16 54 9 39 C2 25 0 16 11 8 Z'},
 {id:'soft',name:'Isla',path:'M9 18 C21 2 39 5 53 9 C70 13 87 3 95 22 C101 38 90 48 94 66 C100 87 95 99 78 96 C59 91 51 88 35 93 C14 99 -1 96 3 74 C7 56 -3 36 9 18 Z'},
 {id:'bean',name:'Semilla',path:'M55 4 C76 -2 95 10 97 34 C100 59 88 84 68 93 C48 103 11 100 4 81 C-3 61 20 50 29 37 C39 24 27 10 55 4 Z'},
 {id:'arch',name:'Arco',path:'M3 97 L3 47 C3 -12 97 -12 97 47 L97 97 Z'},
 {id:'capsule',name:'Cápsula',path:'M50 2 C78 2 97 21 97 49 C97 80 78 98 50 98 C21 98 3 80 3 49 C3 21 21 2 50 2 Z'},
 {id:'window',name:'Ventana',path:'M12 3 H88 Q97 3 97 12 V88 Q97 97 88 97 H12 Q3 97 3 88 V12 Q3 3 12 3 Z'},
 {id:'petal',name:'Pétalo',path:'M47 3 H90 Q97 3 97 10 V53 Q97 97 53 97 H10 Q3 97 3 90 V47 Q3 3 47 3 Z'},
];
export function VacancyPhoto({shape,src,x,y,zoom,onMove}:{shape:string;src:string;x:number;y:number;zoom:number;onMove:(x:number,y:number)=>void}){
 const id=useId().replace(/:/g,''),host=useRef<HTMLDivElement>(null),drag=useRef<{px:number;py:number;x:number;y:number}|null>(null);
 const [box,setBox]=useState({w:300,h:450}),[ratio,setRatio]=useState(1);
 useEffect(()=>{const r=new ResizeObserver(([e])=>setBox({w:e.contentRect.width,h:e.contentRect.height}));if(host.current)r.observe(host.current);return()=>r.disconnect()},[]);
 useEffect(()=>{let live=true;if(src){const image=new Image();image.onload=()=>{if(live)setRatio(image.naturalWidth/image.naturalHeight)};image.src=src}return()=>{live=false}},[src]);
 const path=PHOTO_SHAPES.find(s=>s.id===shape)?.path||PHOTO_SHAPES[0].path;
 const w=Math.max(box.w,box.h*ratio)*zoom/box.w*100,h=Math.max(box.h,box.w/ratio)*zoom/box.h*100;
 return <div ref={host} className={`vacancy-photo photo-${shape} svg-photo`} onPointerDown={e=>{if(!src)return;drag.current={px:e.clientX,py:e.clientY,x,y};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{const d=drag.current;if(!d)return;const scale=e.currentTarget.getBoundingClientRect().width/box.w;const dx=(e.clientX-d.px)/scale,dy=(e.clientY-d.py)/scale;onMove(Math.max(0,Math.min(100,d.x-dx/Math.max((w/100-1)*box.w,25)*100)),Math.max(0,Math.min(100,d.y-dy/Math.max((h/100-1)*box.h,25)*100)))}} onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}}>
 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" aria-label="Recorte de fotografía"><defs><clipPath id={`photo-${id}`}><path d={path}/></clipPath><linearGradient id={`empty-${id}`} x2="1" y2="1"><stop stopColor="#e4f1da"/><stop offset="1" stopColor="#b6d8e9"/></linearGradient></defs><path d={path} fill={`url(#empty-${id})`}/>{src&&<image href={src} x={(100-w)*x/100} y={(100-h)*y/100} width={w} height={h} preserveAspectRatio="none" clipPath={`url(#photo-${id})`}/>}<path d={path} fill="none" stroke="white" strokeWidth="4" vectorEffect="non-scaling-stroke"/></svg>
 {!src&&<div className="svg-photo-label"><span>Tu fotografía<br/>va aquí</span><small>SUBE · ENCUADRA · CREA</small></div>}
 </div>
}
