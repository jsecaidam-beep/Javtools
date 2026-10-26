import React,{useLayoutEffect,useRef} from 'react';
import {CoverData} from '../types/brand';
import {DEFAULT_LOGOS} from '../constants/brandAssets';
import {DynamicLogoRenderer} from './AchLogos';
import './ModernCoverArtwork.css';
export const MODERN_COVERS=[{id:'aurora-cover',name:'Aurora',desc:'Degradado azul · foto panorámica'},{id:'orbit-cover',name:'Órbita',desc:'Fotografía orgánica · gran titular'},{id:'editorial-cover',name:'Editorial',desc:'Blanco · verde · composición limpia'},{id:'panorama-cover',name:'Horizonte',desc:'Fotografía protagonista · banda azul'}];
export function ModernCoverArtwork({data}:{data:CoverData}){
 const box=useRef<HTMLDivElement>(null),heading=useRef<HTMLHeadingElement>(null);
 useLayoutEffect(()=>{const fit=()=>{if(!heading.current||!box.current)return;let size=data.title.length>100?23:data.title.length>60?28:36;heading.current.style.fontSize=size+'px';while(box.current.scrollHeight>box.current.clientHeight+1&&size>16){size--;heading.current.style.fontSize=size+'px'}};fit();void document.fonts.ready.then(fit)},[data]);
 const logos=[DEFAULT_LOGOS.find(l=>l.type==='ach')!,...data.logos.filter(l=>l.type!=='ach'&&l.id!=='logo-ach')];
 const base=({blue:'#005FB6',green:'#317F29',orange:'#C65E00',darkBlue:'#003366',white:'#F3F7F0',charcoal:'#1E293B',custom:data.headerBgCustom||'#005FB6'} as Record<string,string>)[data.themeColor];
 const background=data.style==='editorial-cover'?undefined:data.themeColor==='white'?'linear-gradient(135deg,#fff,#e9f4e3)':`radial-gradient(ellipse at 100% 70%,#52ae3275,transparent 65%),linear-gradient(140deg,#003e7e,${base} 55%,#008ba9)`;
 return <div style={{background,color:data.themeColor==='white'?'#005FB6':undefined}} className={`cover-modern ${data.style} ${data.showPhoto===false?'cover-no-photo':''} ${data.themeColor==='white'?'cover-light':''}`}>
 <div className="cover-modern-art" aria-hidden="true"><i/><b/></div>
 <div className="cover-modern-logos" style={{gridTemplateColumns:`repeat(${Math.min(logos.length,4)},minmax(0,1fr))`}}>{logos.map(logo=><div key={logo.id}><DynamicLogoRenderer logo={logo} variant="color" overrideColorMode="color" className="cover-partner-logo"/></div>)}</div>
 <div className="cover-modern-body"><div className="cover-modern-copy" ref={box}>{data.showCategoryPill!==false&&data.categoryPill&&<span className="cover-modern-kicker">{data.categoryPill}</span>}<h1 ref={heading}>{data.title}</h1><div className="cover-modern-rule"/>{data.showSubtitle!==false&&data.subtitle&&<p className="cover-modern-subtitle">{data.subtitle}</p>}<div className="cover-modern-meta">{data.showProjectCode!==false&&data.projectCode&&<span>Proyecto / {data.projectCode}</span>}{data.showInternalCode!==false&&data.internalCode&&<span>Código / {data.internalCode}</span>}{data.showLocation!==false&&data.location&&<strong>{data.location}</strong>}{data.showDate!==false&&data.date&&<span>{data.date}</span>}</div></div>
 {data.showPhoto!==false&&<div className="cover-modern-photo"><img src={data.photoUrl} alt="Fotografía de portada" crossOrigin="anonymous"/></div>}</div>
 {data.showAuthorBlock!==false&&(data.authorName||data.authorRole||data.authorBase)&&<div className="cover-modern-author" data-page-author><b>{data.authorName}</b><span>{[data.authorRole,data.authorBase].filter(Boolean).join(' · ')}</span></div>}
 <div className="cover-modern-foot"><span>ACCIÓN CONTRA EL HAMBRE</span><span>JUNTOS, CONTRA EL HAMBRE ↗</span></div>
 </div>
}
