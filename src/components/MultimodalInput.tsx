import React,{useState} from 'react';
import {ClipboardPaste,Table2,Upload,ArrowRight} from 'lucide-react';
import {TableData,TableCell} from '../types/table';
import {parseDelimitedText,parseNumericValue} from '../utils/tabularData';
export const MultimodalInput:React.FC<{onTableGenerated:(data:TableData)=>void}>=({onTableGenerated})=>{
 const [text,setText]=useState('');const [title,setTitle]=useState('Tabla de datos');const [error,setError]=useState('');
 function load(matrix:string[][]){
  if(matrix.length<2||matrix[0].length<2){setError('Pega una tabla con encabezados y al menos una fila.');return;}
  const width=Math.max(...matrix.map(r=>r.length));const headers=Array.from({length:width},(_,i)=>matrix[0][i]||`Columna ${i+1}`);
  onTableGenerated({title,headers,rows:matrix.slice(1).map((r,i)=>({id:`row-${Date.now()}-${i}`,cells:headers.map((_,c)=>({id:`cell-${i}-${c}`,value:r[c]||'',align:Number.isFinite(parseNumericValue(r[c]||''))?'right':'left',badgeColor:'none'}))})),source:'Datos proporcionados por el usuario',tableStylePreset:'ach-official'});setError('');
 }
 function paste(e:React.ClipboardEvent<HTMLTextAreaElement>){
  const html=e.clipboardData.getData('text/html');if(!html.includes('<table'))return;
  const doc=new DOMParser().parseFromString(html,'text/html');const table=doc.querySelector('table');if(!table)return;
  e.preventDefault();const trs=Array.from(table.querySelectorAll('tr'));setText(trs.map(tr=>Array.from(tr.querySelectorAll('td,th')).map(c=>c.textContent?.trim()||'').join('\t')).join('\n'));
  const head=trs[0];if(!head||trs.length<2){setError('La tabla debe incluir encabezados y datos.');return;}
  const grid:TableCell[][]=[];
  trs.slice(1).forEach((tr,r)=>{grid[r] ||= [];let col=0;Array.from(tr.querySelectorAll('td,th')).forEach(node=>{while(grid[r][col])col++;const td=node as HTMLTableCellElement;const rs=td.rowSpan||1,cs=td.colSpan||1;const value=td.textContent?.trim()||'';grid[r][col]={id:`office-${r}-${col}`,value,rowSpan:rs>1?rs:undefined,colSpan:cs>1?cs:undefined,align:Number.isFinite(parseNumericValue(value))?'right':'left',badgeColor:'none',bgColor:td.style.backgroundColor||undefined,isBold:!!td.querySelector('b,strong')};for(let rr=r;rr<r+rs;rr++){grid[rr] ||= [];for(let cc=col;cc<col+cs;cc++)if(rr!==r||cc!==col)grid[rr][cc]={id:`span-${rr}-${cc}`,value:'',isSpannedChild:true};}col+=cs;});});
  const headers=Array.from(head.querySelectorAll('td,th')).flatMap(n=>Array.from({length:(n as HTMLTableCellElement).colSpan||1},()=>n.textContent?.trim()||''));const width=Math.max(headers.length,...grid.map(r=>r.length));while(headers.length<width)headers.push(`Columna ${headers.length+1}`);
  onTableGenerated({title,headers,rows:grid.map((cells,i)=>({id:`office-row-${i}`,cells:Array.from({length:width},(_,c)=>cells[c]||{id:`empty-${i}-${c}`,value:''})})),source:'Tabla pegada desde Office',tableStylePreset:'ach-official'});setError('');
 }
 return <section className="glass-panel rounded-2xl p-5"><div className="flex items-center gap-3 mb-4"><ClipboardPaste size={21}/><div><h2 className="font-bold">Importa tus datos</h2><p className="text-xs text-slate-400">Pega desde Excel o Word, o abre un archivo CSV/TSV. El procesamiento se hace en tu navegador.</p></div></div><label className="text-xs block mb-2">Título de la tabla<input aria-label="Título de la tabla importada" className="glass-input block w-full p-2 mt-1" value={title} onChange={e=>setTitle(e.target.value)}/></label><textarea className="glass-input w-full p-3 text-xs" rows={5} value={text} onChange={e=>setText(e.target.value)} onPaste={paste} placeholder={'Municipio\tFamilias\nJocotán\t85\nChiquimula\t120'} aria-label="Datos CSV o TSV"/><div className="flex gap-3 mt-4 flex-wrap"><button className="studio-primary" onClick={()=>load(parseDelimitedText(text))}><Table2 size={15}/> Usar datos <ArrowRight size={14}/></button><label className="studio-secondary"><Upload size={15}/> Abrir CSV/TSV<input type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={async e=>{const f=e.target.files?.[0];if(f){const t=await f.text();setText(t);load(parseDelimitedText(t));}e.target.value='';}}/></label></div>{error&&<p role="alert" className="text-xs text-red-600 mt-3">{error}</p>}</section>;
};
