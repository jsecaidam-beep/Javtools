import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, Copy, Download, Save, Upload } from 'lucide-react';
import { downloadBlob, downloadElementAsPng } from '../utils/canvasExport';
import './PostsEditor.css';

const ASSETS = `${import.meta.env.BASE_URL}assets/invitaciones/`;
const KEY = 'javtools-inauguraciones-v1';
const COMPONENTS = ['WASH', 'Salud y nutrición', 'Transferencias', 'CFM', 'Multisectorial'] as const;
const EMPTY = { work: '', community: '', municipality: '', department: 'Chiquimula', date: '', component: 'WASH', description: '', credit: '', format: 'portrait', layout: 'editorial', positionX: 50, positionY: 50 };
type Fields = typeof EMPTY;
type Photo = { name: string; src: string; x: number; y: number };
const LIMITS: Partial<Record<keyof Fields, number>> = { work: 120, community: 90, municipality: 70, department: 70, description: 260, credit: 100, date: 10 };
function parseFields(value: unknown): Fields {
  if (!value || typeof value !== 'object') throw new Error('El editable no contiene los datos de una inauguración.');
  const input = value as Record<string, unknown>;
  const next = { ...EMPTY };
  for (const key of Object.keys(EMPTY) as (keyof Fields)[]) {
    if (typeof next[key] === 'string' && typeof input[key] === 'string') (next as Record<string, unknown>)[key] = (input[key] as string).slice(0, LIMITS[key] || 100);
  }
  next.format = next.format === 'square' ? 'square' : 'portrait';
  next.layout = next.layout === 'photo' ? 'photo' : 'editorial';
  next.component = COMPONENTS.includes(next.component as typeof COMPONENTS[number]) ? next.component : 'WASH';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(next.date)) next.date = '';
  return next;
}
function initialFields(): Fields { try { return parseFields(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { return { ...EMPTY }; } }
function formattedDate(value: string) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' });
}
async function readPhoto(file: File): Promise<Photo> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error(`«${file.name}»: usa una foto JPG, PNG o WebP.`);
  if (file.size > 25 * 1024 * 1024) throw new Error(`«${file.name}» supera 25 MB.`);
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('No se pudo leer la foto.')); reader.readAsDataURL(file);
  });
  const image = new Image();
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error(`No se pudo abrir «${file.name}».`)); image.src = src; });
  const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas'); canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('No se pudo preparar la foto.');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { name: file.name, src: canvas.toDataURL('image/jpeg', .9), x: 50, y: 50 };
}

export function PostsEditor() {
  const [fields, setFields] = useState(initialFields);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [active, setActive] = useState(0);
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const art = useRef<HTMLDivElement>(null), viewport = useRef<HTMLDivElement>(null), editable = useRef<HTMLInputElement>(null);
  const photo = photos[active];
  const height = fields.format === 'square' ? 540 : 675;
  const location = [fields.community.trim(), fields.municipality.trim(), fields.department.trim()].filter(Boolean).join(', ');
  const ready = !!photo && !!fields.work.trim() && !!fields.municipality.trim() && !!fields.department.trim();
  const update = (key: keyof Fields, value: string) => setFields(prev => ({ ...prev, [key]: value }));
  const caption = [
    fields.work.trim() && location ? `Inauguración de ${fields.work.trim()} en ${location}.` : '',
    formattedDate(fields.date), fields.description.trim(),
    'Proyecto implementado por Acción contra el Hambre, con el financiamiento del Fondo Humanitario para Guatemala (FHG).',
    fields.credit.trim() ? `Fotografía: ${fields.credit.trim()}` : '',
  ].filter(Boolean).join('\n\n');

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(fields)); } catch { setNotice('No se pudo guardar el borrador en este navegador. Usa Guardar editable.'); } }, [fields]);
  useLayoutEffect(() => {
    const frame = viewport.current; if (!frame) return;
    const observer = new ResizeObserver(() => setScale(Math.min(1, frame.clientWidth / 540)));
    observer.observe(frame); setScale(Math.min(1, frame.clientWidth / 540)); return () => observer.disconnect();
  }, []);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setNotice('');
    const remaining = 12 - photos.length;
    const selected = Array.from(files).slice(0, remaining);
    const results = await Promise.allSettled(selected.map(readPhoto));
    const loaded = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
    setPhotos(prev => [...prev, ...loaded]);
    const errors = results.flatMap(result => result.status === 'rejected' ? [result.reason.message] : []);
    setNotice([loaded.length ? `${loaded.length} fotos cargadas. Selecciona cada foto para ajustar su encuadre.` : '', ...errors, files.length > remaining ? 'Puedes trabajar con hasta 12 fotos por serie.' : ''].filter(Boolean).join(' '));
    setBusy(false);
  }
  function framePhoto(axis: 'x' | 'y', value: number) { setPhotos(prev => prev.map((item, i) => i === active ? { ...item, [axis]: value } : item)); }
  async function exportPng() {
    if (!art.current || !ready || busy) return;
    setBusy(true); setNotice('');
    try {
      await downloadElementAsPng(art.current, `inauguracion-${fields.municipality.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}-${active + 1}.png`, { scale: 2, backgroundColor: '#005FB6' });
      setNotice(`Post ${active + 1} descargado en PNG. Selecciona otra foto para continuar la serie.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'No se pudo exportar el post.'); } finally { setBusy(false); }
  }
  function save() {
    downloadBlob(new Blob([JSON.stringify({ type: 'javtools-inauguracion', version: 1, fields, photos, active })], { type: 'application/json' }), 'inauguracion-editable.json');
    setNotice('Editable guardado con los textos, fotos y encuadres de la serie.');
  }
  async function load(file?: File) {
    if (!file) return; setBusy(true);
    try {
      if (file.size > 45 * 1024 * 1024) throw new Error('El editable supera 45 MB.');
      const input = JSON.parse(await file.text());
      if (input.type !== 'javtools-inauguracion' || input.version !== 1 || !Array.isArray(input.photos) || input.photos.length > 12) throw new Error('Selecciona un editable de inauguración de Javtools.');
      const nextFields = parseFields(input.fields);
      const nextPhotos: Photo[] = await Promise.all(input.photos.map(async (item: Photo) => {
        if (!item || typeof item.src !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(item.src) || typeof item.name !== 'string') throw new Error('El editable contiene una foto no válida.');
        const image = new Image(); await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('El editable contiene una foto dañada.')); image.src = item.src; });
        return { name: item.name.slice(0, 200), src: item.src, x: Number.isFinite(item.x) ? Math.min(100, Math.max(0, item.x)) : 50, y: Number.isFinite(item.y) ? Math.min(100, Math.max(0, item.y)) : 50 };
      }));
      setFields(nextFields); setPhotos(nextPhotos); setActive(0); setNotice('Serie abierta.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'No se pudo abrir el editable.'); }
    finally { setBusy(false); if (editable.current) editable.current.value = ''; }
  }

  return <section className="posts-editor">
    <header className="posts-toolbar glass-panel"><div><span className="studio-eyebrow">COMUNICACIÓN EN TERRITORIO</span><h2><Camera size={23} /> Posts · Inauguración de obras</h2><p>Una serie de fotos, una misma identidad. FHG + Acción contra el Hambre.</p></div><div className="posts-actions"><button disabled={busy} onClick={() => editable.current?.click()}><Upload size={15}/> Abrir editable</button><button disabled={busy} onClick={save}><Save size={15}/> Guardar editable</button><button className="posts-primary" disabled={busy || !ready} onClick={exportPng}><Download size={15}/>{busy ? 'Preparando…' : 'Descargar post PNG'}</button><input ref={editable} type="file" accept=".json" hidden aria-label="Abrir editable de inauguración" onChange={e => load(e.target.files?.[0])}/></div></header>
    {notice && <p className="posts-notice" role="status">{notice}</p>}
    <div className="posts-studio"><div className="posts-controls">
      <div className="posts-panel glass-panel"><h3>01 / Ubicación de la obra</h3><label>Ubicación rápida<select aria-label="Ubicación rápida" value="" onChange={e => { const places: Record<string, Partial<Fields>> = { huehue: { department: 'Huehuetenango', municipality: '' }, chiquimula: { department: 'Chiquimula', municipality: 'Chiquimula' }, camotan: { department: 'Chiquimula', municipality: 'Camotán' }, other: { department: '', municipality: '' } }; setFields(prev => ({ ...prev, ...places[e.target.value] })); }}><option value="" disabled>Elegir ubicación…</option><option value="huehue">Huehuetenango</option><option value="chiquimula">Chiquimula</option><option value="camotan">Camotán</option><option value="other">Otro lugar</option></select></label>
      {(['department', 'municipality', 'community'] as const).map((key, i) => <label key={key}>{['Departamento', 'Municipio', 'Comunidad o establecimiento'][i]}<input value={fields[key]} maxLength={LIMITS[key]} onChange={e => update(key, e.target.value)} /></label>)}
      <label>Fecha de inauguración (opcional)<input type="date" value={fields.date} onChange={e => update('date', e.target.value)}/></label></div>
      <div className="posts-panel glass-panel"><h3>02 / La obra y su contexto</h3><label>Nombre de la obra<textarea rows={3} placeholder="Ej.: Mejoramiento del puesto de salud" maxLength={120} value={fields.work} onChange={e => update('work', e.target.value)}/></label><label>Componente<select value={fields.component} onChange={e => update('component', e.target.value)}>{COMPONENTS.map(value => <option key={value}>{value}</option>)}</select></label><label>Descripción para el pie de publicación<textarea rows={4} maxLength={260} value={fields.description} placeholder="Describe qué se inauguró, con quiénes y qué servicios ofrece, según la información verificada." onChange={e => update('description', e.target.value)}/></label><label>Crédito fotográfico (opcional)<input value={fields.credit} maxLength={100} onChange={e => update('credit', e.target.value)}/></label></div>
      <div className="posts-panel glass-panel"><h3>03 / Fotos y composición</h3><label className="posts-upload"><Upload size={19}/> {photos.length ? 'Agregar fotos a la serie' : 'Subir fotos de la inauguración'}<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || photos.length >= 12} onChange={e => { addPhotos(e.target.files); e.target.value = ''; }}/></label><p>Hasta 12 fotos JPG, PNG o WebP. Se procesan en tu navegador.</p>
      {!!photos.length && <><div className="posts-thumbnails">{photos.map((item, i) => <button key={`${i}-${item.name}`} aria-label={`Seleccionar foto ${i + 1}`} aria-pressed={i === active} onClick={() => setActive(i)}><img src={item.src} alt={item.name}/><span>{i + 1}</span></button>)}</div><button disabled={busy} onClick={() => { setPhotos(prev => prev.filter((_, i) => i !== active)); setActive(Math.max(0, active - 1)); }}>Quitar foto seleccionada</button>{(['x', 'y'] as const).map(axis => <label key={axis}>Encuadre {axis === 'x' ? 'horizontal' : 'vertical'}<input type="range" min={0} max={100} value={photo?.[axis] ?? 50} onChange={e => framePhoto(axis, Number(e.target.value))}/></label>)}</>}
      <label>Formato<select value={fields.format} onChange={e => update('format', e.target.value)}><option value="portrait">Post vertical · 1080 × 1350</option><option value="square">Cuadrado · 1080 × 1080</option></select></label><label>Composición<select value={fields.layout} onChange={e => update('layout', e.target.value)}><option value="editorial">Editorial · titular sobre azul ACH</option><option value="photo">Fotografía protagonista</option></select></label><p>Los logos originales de FHG y ACH se incluyen en todas las piezas.</p></div>
      <div className="posts-panel glass-panel"><h3>Pie de publicación</h3><textarea aria-label="Pie de publicación" rows={9} value={caption} readOnly/><button disabled={!ready} onClick={async () => { try { await navigator.clipboard.writeText(caption); setNotice('Pie de publicación copiado.'); } catch { setNotice('Selecciona el texto del pie de publicación para copiarlo.'); } }}><Copy size={15}/> Copiar texto</button></div>
    </div><aside className="posts-preview-panel"><div className="posts-preview-heading"><strong>Vista previa</strong><span>{fields.format === 'square' ? '1080 × 1080' : '1080 × 1350'} px</span></div>
      <div ref={viewport} className="posts-viewport" data-preview-viewport style={{ height: height * scale }}><div data-preview-transform style={{ width: 540, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
      <div ref={art} className={`posts-art posts-layout-${fields.layout}`} data-export-surface="posts" style={{ height }}>
        <div className="posts-art-heading"><span className="posts-kicker">INAUGURACIÓN DE OBRAS</span><h3 style={{ fontSize: fields.work.length > 85 ? 23 : fields.work.length > 55 ? 27 : 34 }}>{fields.work.trim() || 'Nombre de la obra'}</h3><span className="posts-component">{fields.component}</span></div>
        <div className="posts-photo">{photo ? <img src={photo.src} alt="Fotografía de la inauguración" style={{ objectPosition: `${photo.x}% ${photo.y}%` }}/> : <div className="posts-photo-empty"><Camera size={48}/><span>Tu fotografía aquí</span></div>}</div>
        <div className="posts-location"><strong>{fields.community.trim()}</strong><span>{[fields.municipality.trim() || 'Municipio', fields.department.trim() || 'Departamento'].join(' · ')}</span>{fields.date && <small>{formattedDate(fields.date)}</small>}</div>
        <footer className="posts-art-footer"><div className="posts-logos"><img src={`${ASSETS}fhg-blanco.svg`} alt="Fondo Humanitario para Guatemala"/><img src={`${ASSETS}ach-blanco.svg`} alt="Acción contra el Hambre"/></div><p>Con el financiamiento del Fondo Humanitario para Guatemala.<br/>Implementado por Acción contra el Hambre.</p></footer>
      </div></div></div>
      {!!photos.length && <div className="posts-pagination"><button aria-label="Foto anterior" disabled={active === 0} onClick={() => setActive(active - 1)}><ChevronLeft size={18}/></button><span>Foto {active + 1} de {photos.length}</span><button aria-label="Foto siguiente" disabled={active === photos.length - 1} onClick={() => setActive(active + 1)}><ChevronRight size={18}/></button></div>}
      {!ready && <p className="posts-required">Para descargar, agrega una foto y completa nombre de la obra, municipio y departamento.</p>}
      <p className="posts-draft-note">Los textos se conservan en este navegador. Guarda el editable para conservar también las fotografías y sus encuadres.</p>
    </aside></div>
  </section>;
}
