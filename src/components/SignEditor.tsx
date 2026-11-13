import React, { useEffect, useRef, useState } from 'react';
import { PanelsTopLeft, Download, FileDown, Upload, RotateCcw, Eye, EyeOff, Loader2, Save, ImagePlus, ChevronDown, Maximize2 } from 'lucide-react';
import { downloadBlob } from '../utils/canvasExport';
import { DEFAULT_SIGN_DATA, SIGN_SECTIONS, SIGN_TEXT_FIELDS, sanitizeSignData, renderSignSvg, renderSignCanvas, type SignData, type SignTextId, type SignSectionId } from '../utils/signRenderer';
import { canvasToSignPdf, canvasToSignPng } from '../utils/signExport';
import './SignEditor.css';

const STORAGE = 'javtools-signs-v1';
const cloneDefault = () => sanitizeSignData(JSON.parse(JSON.stringify(DEFAULT_SIGN_DATA)));
function restore() { try { const stored = localStorage.getItem(STORAGE); return stored ? sanitizeSignData(JSON.parse(stored)) : cloneDefault(); } catch { return cloneDefault(); } }
const presetData = [
  { name: 'Chiquimula', title: 'CENTRO DE SALUD\nCHIQUIMULA', location: 'Municipio de Chiquimula,\nDepartamento de Chiquimula,\nGuatemala.', families: '560', inhabitants: '2,820', cost: 'Q. 127,611.00' },
  { name: 'Camotán', title: 'CENTRO DE SALUD\nCAMOTÁN', location: 'Municipio de Camotán,\nDepartamento de Chiquimula,\nGuatemala.', families: '600', inhabitants: '2,208', cost: 'Q. 89,690.41' },
  { name: 'San Antonio', title: 'PUESTO DE SALUD\nSAN ANTONIO\nLA LIBERTAD', location: 'Municipio de Camotán,\nDepartamento de Chiquimula,\nGuatemala.', families: '995', inhabitants: '2,486', cost: 'Q. 139,000.00' },
];

async function uploadedLogo(file: File): Promise<string> {
  if (file.size > 6 * 1024 * 1024) throw new Error('El logo debe pesar menos de 6 MB.');
  if (!/\.(svg|png|jpe?g|webp)$/i.test(file.name)) throw new Error('Usa un logo SVG, PNG, JPG o WebP.');
  if (/\.svg$/i.test(file.name)) {
    const doc = new DOMParser().parseFromString(await file.text(), 'image/svg+xml');
    if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg') throw new Error('Ese SVG no es válido. Prueba con otro archivo.');
    doc.documentElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const unsafe = (value: string) => /javascript:|https?:|file:|@import|expression\s*\(/i.test(value) || Array.from(value.matchAll(/url\(\s*['" ]?(.*?)['" ]?\s*\)/gi)).some(match => !match[1].trim().replace(/^['"]|['"]$/g, '').startsWith('#'));
    doc.querySelectorAll('script, foreignObject, iframe, object, embed').forEach(node => node.remove());
    doc.querySelectorAll('style').forEach(node => { if (unsafe(node.textContent || '')) node.remove(); });
    doc.querySelectorAll('*').forEach(node => Array.from(node.attributes).forEach(attr => {
      if (!attr.name.startsWith('xmlns') && (/^on/i.test(attr.name) || unsafe(attr.value) || ((attr.localName === 'href') && !attr.value.startsWith('#') && !attr.value.startsWith('data:image/')))) node.removeAttribute(attr.name);
    }));
    const text = new XMLSerializer().serializeToString(doc.documentElement);
    return `data:image/svg+xml;base64,${btoa(Array.from(new TextEncoder().encode(text), b => String.fromCharCode(b)).join(''))}`;
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('No pudimos abrir ese logo.')); image.src = objectUrl; });
    const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar el logo.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally { URL.revokeObjectURL(objectUrl); }
}

export function SignEditor() {
  const [data, setData] = useState<SignData>(restore);
  const [svg, setSvg] = useState('');
  const [rendering, setRendering] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<'content' | 'logos' | 'design'>('content');
  const [selected, setSelected] = useState<SignTextId>('title');
  const [resolution, setResolution] = useState(3600);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmPreset, setConfirmPreset] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const version = useRef(0);
  const preview = useRef<HTMLDivElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const logoInputs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    const current = ++version.current;
    setRendering(true); setError('');
    const timer = window.setTimeout(() => {
      void renderSignSvg(data).then(result => { if (version.current === current) { setSvg(result); setRendering(false); } }).catch(reason => { if (version.current === current) { setError(reason instanceof Error ? reason.message : 'No se pudo preparar el rótulo.'); setRendering(false); } });
      try { localStorage.setItem(STORAGE, JSON.stringify(data)); } catch { setNotice('La vista y las descargas funcionan. Guarda el proyecto para conservar tus cambios: el almacenamiento de este navegador está lleno.'); }
    }, 120);
    return () => { window.clearTimeout(timer); version.current++; };
  }, [data]);
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setExpanded(false); setConfirmReset(false); setConfirmPreset(null); } }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, []);

  function updateText(id: SignTextId, patch: Partial<SignData['texts'][SignTextId]>) { setData(previous => ({ ...previous, texts: { ...previous.texts, [id]: { ...previous.texts[id], ...patch } } })); }
  function toggleSection(id: SignSectionId) { setData(previous => ({ ...previous, sections: { ...previous.sections, [id]: !previous.sections[id] } })); }
  const unavailable = rendering || !!error || !!busy || !svg;
  const slug = data.texts.title.text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'obra';
  const previewSource = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : undefined;
  async function save(kind: 'png' | 'pdf' | 'svg') {
    if (unavailable) return;
    setBusy(kind); setNotice('');
    try {
      let blob: Blob;
      if (kind === 'svg') blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      else {
        const canvas = await renderSignCanvas(svg, resolution);
        blob = kind === 'png' ? await canvasToSignPng(canvas, data.widthCm, data.heightCm) : await canvasToSignPdf(canvas, data.widthCm, data.heightCm);
      }
      downloadBlob(blob, `rotulo-${slug}-${data.widthCm}x${data.heightCm}cm.${kind}`);
      setNotice(kind === 'svg' ? 'SVG vectorial descargado. Puedes ampliarlo sin perder nitidez y ajustar sus elementos en un editor vectorial.' : `${kind.toUpperCase()} descargado en ${data.widthCm} × ${data.heightCm} cm. Comprueba el tamaño con tu imprenta antes de producir.`);
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'No se pudo descargar el rótulo.'); }
    finally { setBusy(''); }
  }
  function saveProject() { downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `proyecto-rotulo-${slug}.json`); setNotice('Proyecto guardado con sus textos, logos y ajustes. Puedes volver a abrirlo aquí.'); }
  async function openProject(file?: File) {
    if (!file) return;
    try {
      if (file.size > 32 * 1024 * 1024) throw new Error('El proyecto supera el tamaño permitido de 32 MB.');
      const parsed = JSON.parse(await file.text());
      if (parsed?.version !== 1 || !parsed?.texts || !parsed?.logos) throw new Error('Ese archivo no es un proyecto de rótulo de JavTools.');
      setData(sanitizeSignData(parsed)); setNotice('Proyecto abierto.');
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'No se pudo abrir ese proyecto.'); }
    if (projectInput.current) projectInput.current.value = '';
  }
  async function changeLogo(index: 0 | 1, file?: File) {
    if (!file) return;
    setBusy(`logo${index}`);
    try { const src = await uploadedLogo(file); setData(previous => { const logos = [...previous.logos] as SignData['logos']; logos[index] = { ...logos[index], src, name: file.name, visible: true }; return { ...previous, logos }; }); setNotice('Logo actualizado. Se conserva su proporción original.'); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : 'No se pudo cargar el logo.'); }
    finally { setBusy(''); if (logoInputs[index].current) logoInputs[index].current!.value = ''; }
  }
  function updateLogo(index: 0 | 1, patch: Partial<SignData['logos'][number]>) { setData(previous => { const logos = [...previous.logos] as SignData['logos']; logos[index] = { ...logos[index], ...patch }; return { ...previous, logos }; }); }
  function applyPreset(index: number) { const preset = presetData[index]; const next = cloneDefault(); (['title', 'location', 'families', 'inhabitants', 'cost'] as const).forEach(id => { next.texts[id].text = preset[id]; }); setData(next); setConfirmPreset(null); setNotice(`Ejemplo de ${preset.name} cargado con los datos del PDF de referencia.`); }
  const currentText = data.texts[selected];

  return <div className="sign-editor">
    <header className="sign-toolbar glass-panel"><div><span className="sign-kicker">OBRAS QUE DEJAN HUELLA</span><h2><PanelsTopLeft size={25} /> Creador de rótulos</h2><p>La identidad de tus obras, con cada detalle en tus manos.</p></div><div className="sign-actions"><button disabled={unavailable} onClick={() => void save('png')}>{busy === 'png' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} PNG</button><button disabled={unavailable} onClick={() => void save('pdf')}>{busy === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />} PDF para imprimir</button><button className="sign-primary" disabled={unavailable} onClick={() => void save('svg')}>{busy === 'svg' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} SVG vectorial</button></div></header>
    {notice && <div className="sign-notice" role="status">{notice}<button aria-label="Cerrar aviso" onClick={() => setNotice('')}>×</button></div>}
    {error && <p className="sign-error" role="alert">{error}</p>}
    <div className="sign-workspace">
      <aside className="sign-controls glass-panel"><div className="sign-tabs" role="tablist" aria-label="Ajustes del rótulo">{([{ id: 'content', label: 'Textos' }, { id: 'logos', label: 'Logos' }, { id: 'design', label: 'Diseño' }] as const).map(item => <button key={item.id} role="tab" aria-selected={tab === item.id} aria-controls={`sign-panel-${item.id}`} id={`sign-tab-${item.id}`} onClick={() => setTab(item.id)}>{item.label}</button>)}</div>
        {tab === 'content' && <div id="sign-panel-content" role="tabpanel" aria-labelledby="sign-tab-content" className="sign-panel">
          <p className="sign-hint">Edita cada texto. El ojo permite ocultarlo sin borrarlo.</p>
          {SIGN_SECTIONS.map(section => <details className="sign-section" key={section.id} open><summary><span>{section.label}</span><ChevronDown size={15} /></summary><div className="sign-section-body"><label className="sign-section-toggle"><input type="checkbox" checked={data.sections[section.id]} onChange={() => toggleSection(section.id)} /> Mostrar este bloque</label>{SIGN_TEXT_FIELDS.filter(field => field.section === section.id).map(field => <div className={`sign-field ${data.texts[field.id].visible ? '' : 'is-hidden'}`} key={field.id}><div className="sign-field-label"><label htmlFor={`sign-${field.id}`}>{field.label}</label><button type="button" className="sign-eye" aria-label={`${data.texts[field.id].visible ? 'Ocultar' : 'Mostrar'} ${field.label}`} aria-pressed={data.texts[field.id].visible} onClick={() => updateText(field.id, { visible: !data.texts[field.id].visible })}>{data.texts[field.id].visible ? <Eye size={15} /> : <EyeOff size={15} />}</button></div><textarea id={`sign-${field.id}`} rows={['title','location','slogan','projectText'].includes(field.id) ? 3 : 1} maxLength={field.id === 'projectText' ? 1200 : 400} value={data.texts[field.id].text} onFocus={() => setSelected(field.id)} onChange={event => updateText(field.id, { text: event.target.value })} /></div>)}</div></details>)}
        </div>}
        {tab === 'logos' && <div id="sign-panel-logos" role="tabpanel" aria-labelledby="sign-tab-logos" className="sign-panel"><p className="sign-hint">Reemplaza cualquiera de los dos logos. Usa versiones blancas o transparentes para el fondo azul.</p>{data.logos.map((logo, index) => <section className="sign-logo-card" key={index}><div className="sign-logo-heading"><h3>Logo {index + 1}</h3><button className="sign-eye" aria-label={`${logo.visible ? 'Ocultar' : 'Mostrar'} logo ${index + 1}`} aria-pressed={logo.visible} onClick={() => updateLogo(index as 0 | 1, { visible: !logo.visible })}>{logo.visible ? <Eye size={17} /> : <EyeOff size={17} />}</button></div><div className="sign-logo-preview"><img src={logo.src} alt={`Logo ${index + 1}: ${logo.name}`} /></div><p className="sign-logo-name">{logo.name}</p><input ref={logoInputs[index]} type="file" className="sign-file-input" accept=".png,.jpg,.jpeg,.webp,.svg" aria-label={`Archivo del logo ${index + 1}`} onChange={event => void changeLogo(index as 0 | 1, event.target.files?.[0])} /><button className="sign-wide-button" disabled={!!busy} onClick={() => logoInputs[index].current?.click()}><ImagePlus size={16} /> Cambiar logo {index + 1}</button><label>Tamaño del logo <output>{Math.round(logo.scale * 100)} %</output><input aria-label={`Tamaño del logo ${index + 1}`} type="range" min="0.4" max="1.4" step="0.05" value={logo.scale} onChange={event => updateLogo(index as 0 | 1, { scale: Number(event.target.value) })} /></label><div className="sign-number-row"><label>Horizontal<input type="number" min="-250" max="250" value={logo.dx} onChange={event => updateLogo(index as 0 | 1, { dx: Number(event.target.value) })} aria-label={`Posición horizontal del logo ${index + 1}`} /></label><label>Vertical<input type="number" min="-250" max="250" value={logo.dy} onChange={event => updateLogo(index as 0 | 1, { dy: Number(event.target.value) })} aria-label={`Posición vertical del logo ${index + 1}`} /></label></div><button className="sign-subtle" onClick={() => updateLogo(index as 0 | 1, { ...DEFAULT_SIGN_DATA.logos[index] })}>Recuperar logo original</button></section>)}</div>}
        {tab === 'design' && <div id="sign-panel-design" role="tabpanel" aria-labelledby="sign-tab-design" className="sign-panel"><section className="sign-section-body"><h3>Formato de impresión</h3><div className="sign-number-row"><label>Ancho (cm)<input type="number" min="10" max="300" step="1" value={data.widthCm} onChange={event => setData(previous => ({ ...previous, widthCm: Math.max(10, Math.min(300, Number(event.target.value) || 10)) }))} /></label><label>Alto (cm)<input type="number" min="10" max="300" step="1" value={data.heightCm} onChange={event => setData(previous => ({ ...previous, heightCm: Math.max(10, Math.min(300, Number(event.target.value) || 10)) }))} /></label></div><p className="sign-hint">El original mide 75 × 100 cm. La composición conserva sus proporciones al cambiar el formato.</p><label htmlFor="sign-resolution">Resolución de PNG y PDF</label><select id="sign-resolution" value={resolution} onChange={event => setResolution(Number(event.target.value))}><option value={1800}>Ligera · 1,800 px de ancho</option><option value={3600}>Alta · 3,600 px de ancho</option><option value={5400}>Máxima · 5,400 px de ancho</option></select><p className="sign-hint">El SVG conserva los vectores a cualquier tamaño. El PDF y el PNG son imágenes de alta resolución.</p></section><section className="sign-section-body"><h3>Fondo e identidad</h3><div className="sign-number-row"><label>Azul<input type="color" value={data.blue} onChange={event => setData(previous => ({ ...previous, blue: event.target.value }))} /></label><label>Verde<input type="color" value={data.green} onChange={event => setData(previous => ({ ...previous, green: event.target.value }))} /></label></div><label>Formas del fondo <output>{Math.round(data.motifOpacity * 100)} %</output><input type="range" min="0" max="0.4" step="0.01" value={data.motifOpacity} onChange={event => setData(previous => ({ ...previous, motifOpacity: Number(event.target.value) }))} /></label></section><section className="sign-section-body"><h3>Ajuste de cada texto</h3><label htmlFor="sign-selected">Elemento</label><select id="sign-selected" value={selected} onChange={event => setSelected(event.target.value as SignTextId)}>{SIGN_TEXT_FIELDS.map(field => <option key={field.id} value={field.id}>{field.label}</option>)}</select><label>Tamaño del texto <output>{currentText.fontSize} px</output><input aria-label="Tamaño del texto seleccionado" type="range" min="9" max="90" step="1" value={currentText.fontSize} onChange={event => updateText(selected, { fontSize: Number(event.target.value) })} /></label><div className="sign-number-row"><label>Horizontal<input type="number" min="-300" max="300" value={currentText.dx} onChange={event => updateText(selected, { dx: Number(event.target.value) })} /></label><label>Vertical<input type="number" min="-300" max="300" value={currentText.dy} onChange={event => updateText(selected, { dy: Number(event.target.value) })} /></label></div><button className="sign-subtle" onClick={() => updateText(selected, { fontSize: DEFAULT_SIGN_DATA.texts[selected].fontSize, dx: 0, dy: 0 })}>Restablecer tamaño y posición</button></section></div>}
        <footer className="sign-project-tools"><button onClick={saveProject}><Save size={15} /> Guardar proyecto</button><button onClick={() => projectInput.current?.click()}><Upload size={15} /> Abrir proyecto</button><input ref={projectInput} type="file" className="sign-file-input" accept=".json" onChange={event => void openProject(event.target.files?.[0])} aria-label="Abrir proyecto de rótulo" /><button className="sign-subtle" onClick={() => setConfirmReset(true)}><RotateCcw size={14} /> Restablecer</button></footer>
      </aside>
      <section className={`sign-preview-area ${expanded ? 'sign-preview-expanded' : ''}`} ref={preview} aria-label="Vista previa del rótulo"><div className="sign-preview-heading"><div><span className="sign-kicker">TU RÓTULO EN TIEMPO REAL</span><p>{data.widthCm} × {data.heightCm} cm <span>·</span> {rendering ? 'Actualizando…' : 'Listo para descargar'}</p></div><button aria-label={expanded ? 'Cerrar vista ampliada' : 'Ampliar vista previa'} aria-pressed={expanded} onClick={() => setExpanded(!expanded)}><Maximize2 size={17} /> {expanded ? 'Cerrar' : 'Ampliar'}</button></div><div className="sign-artboard" style={{ aspectRatio: `${data.widthCm} / ${data.heightCm}` }}>{previewSource && <img src={previewSource} alt="Vista previa del rótulo de obra con los textos, cifras y logos personalizados" />}{rendering && !svg && <div className="sign-loading"><Loader2 size={26} className="animate-spin" /> Preparando tu rótulo…</div>}</div><div className="sign-preview-note"><span><Eye size={14} /> Misma composición en la vista y las descargas</span><span>Los cambios se guardan en este navegador.</span></div><section className="sign-presets"><h3>Partir de un ejemplo</h3><p>Los tres rótulos del documento que compartiste.</p><div>{presetData.map((preset, index) => <button key={preset.name} onClick={() => setConfirmPreset(index)}>{preset.name}</button>)}</div></section></section>
    </div>
    {(confirmReset || confirmPreset !== null) && <div className="sign-modal-backdrop"><section className="sign-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="sign-confirm-title"><h3 id="sign-confirm-title">{confirmReset ? '¿Restablecer el rótulo?' : `¿Cargar el ejemplo de ${presetData[confirmPreset!].name}?`}</h3><p>Esto reemplaza los textos, logos y ajustes actuales. Puedes guardar tu proyecto antes de continuar.</p><div><button onClick={() => { setConfirmReset(false); setConfirmPreset(null); }}>Cancelar</button><button className="sign-primary" onClick={() => { if (confirmReset) { setData(cloneDefault()); setConfirmReset(false); } else applyPreset(confirmPreset!); }}>Continuar</button></div></section></div>}
  </div>;
}
