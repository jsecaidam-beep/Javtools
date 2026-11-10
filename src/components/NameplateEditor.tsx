import React, { useEffect, useRef, useState } from 'react';
import { ContactRound, Download, FileDown, Printer, RotateCcw, Loader2 } from 'lucide-react';
import { downloadBlob } from '../utils/canvasExport';
import { NAMEPLATE_LOGOS, renderNameplate, type NameplateData } from '../utils/nameplateCanvas';
import { canvasToLetterPdf, canvasToPrintPng } from '../utils/nameplatePdf';
import './NameplateEditor.css';

const STORAGE = 'javtools-nameplates-v1';
const initialData: NameplateData = {
  name: 'Nombre y apellido', role: 'Cargo o especialidad', institution: 'Institución',
  nameSize: 56, style: 'institutional', guides: true,
  logos: { fhg: true, ach: true, ops: true, mspas: true },
};
function restore(): NameplateData {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE) || 'null');
    if (!value || typeof value !== 'object') return initialData;
    return {
      name: typeof value.name === 'string' ? value.name.slice(0, 160) : initialData.name,
      role: typeof value.role === 'string' ? value.role.slice(0, 180) : initialData.role,
      institution: typeof value.institution === 'string' ? value.institution.slice(0, 180) : initialData.institution,
      nameSize: typeof value.nameSize === 'number' && Number.isFinite(value.nameSize) ? Math.max(32, Math.min(76, value.nameSize)) : 56,
      style: value.style === 'minimal' ? 'minimal' : 'institutional',
      guides: typeof value.guides === 'boolean' ? value.guides : true,
      logos: Object.fromEntries(NAMEPLATE_LOGOS.map(logo => [logo.id, typeof value.logos?.[logo.id] === 'boolean' ? value.logos[logo.id] : true])) as NameplateData['logos'],
    };
  } catch { return initialData; }
}

export function NameplateEditor() {
  const [data, setData] = useState<NameplateData>(restore);
  const [rendering, setRendering] = useState(true);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [resetConfirmation, setResetConfirmation] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderVersion = useRef(0);

  useEffect(() => {
    const version = ++renderVersion.current;
    setRendering(true);
    setError('');
    try { localStorage.setItem(STORAGE, JSON.stringify(data)); } catch { /* The editor and downloads work when storage is full. */ }
    const temporary = document.createElement('canvas');
    void renderNameplate(temporary, data).then(() => {
      if (version !== renderVersion.current || !canvas.current) return;
      canvas.current.width = temporary.width;
      canvas.current.height = temporary.height;
      canvas.current.getContext('2d')?.drawImage(temporary, 0, 0);
      setRendering(false);
    }).catch(reason => {
      if (version !== renderVersion.current) return;
      setError(reason instanceof Error ? reason.message : 'No se pudo preparar el identificador.');
      setRendering(false);
    });
    return () => { renderVersion.current++; };
  }, [data]);

  const slug = data.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 65) || 'mesa';
  const unavailable = rendering || !!error || !!busy;
  async function save(kind: 'png' | 'pdf') {
    if (!canvas.current || unavailable) return;
    setBusy(kind);
    setNotice('');
    try {
      const blob = kind === 'pdf' ? await canvasToLetterPdf(canvas.current) : await canvasToPrintPng(canvas.current);
      downloadBlob(blob, `identificador-${slug}-carta.${kind}`);
      setNotice(kind === 'pdf' ? 'PDF tamaño carta listo. Imprime en tamaño real (100 %), sin ajustar a la página.' : 'Imagen PNG lista: 3300 × 2550 px, 300 ppp, tamaño carta horizontal.');
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'No se pudo descargar el archivo.'); }
    finally { setBusy(''); }
  }

  function print() {
    if (!canvas.current || unavailable) return;
    setNotice('En impresión, usa papel Carta, orientación horizontal, escala 100 % y desactiva encabezados y pies.');
    const frame = document.createElement('iframe');
    frame.title = 'Imprimir identificador de mesa';
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
    document.body.appendChild(frame);
    const printDocument = frame.contentDocument;
    if (!printDocument || !frame.contentWindow) { frame.remove(); setNotice('No se pudo abrir la impresión. Descarga el PDF para imprimirlo.'); return; }
    printDocument.open();
    printDocument.write('<!doctype html><html lang="es"><head><title>Identificador de mesa</title><style>@page{size:letter landscape;margin:0}html,body{margin:0;padding:0;width:11in;height:8.5in}img{display:block;width:11in;height:8.5in;max-width:none;print-color-adjust:exact;-webkit-print-color-adjust:exact}</style></head><body></body></html>');
    printDocument.close();
    const image = printDocument.createElement('img');
    image.alt = 'Identificador de mesa, hoja carta horizontal';
    image.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    };
    image.onerror = () => { setNotice('No se pudo preparar la impresión. Descarga el PDF para imprimirlo.'); frame.remove(); };
    image.src = canvas.current.toDataURL('image/png');
    printDocument.body.appendChild(image);
    // Keep the print surface alive while Safari's print dialog is open.
    window.setTimeout(() => frame.remove(), 180_000);
  }

  return <div className="nameplate-editor">
    <section className="nameplate-toolbar glass-panel">
      <div><h2><ContactRound size={23} /> Identificadores de mesa</h2><p>Un nombre, dos caras. Hoja carta lista para doblar y colocar en la mesa.</p></div>
      <div className="nameplate-actions">
        <button disabled={unavailable} onClick={() => void save('png')}>{busy === 'png' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Descargar imagen</button>
        <button disabled={unavailable} onClick={() => void save('pdf')}>{busy === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />} Descargar PDF</button>
        <button className="nameplate-primary" disabled={unavailable} onClick={print}><Printer size={16} /> Imprimir</button>
      </div>
    </section>
    {notice && <p className="nameplate-notice" role="status">{notice}</p>}
    {error && <p className="nameplate-error" role="alert">{error}</p>}
    <div className="nameplate-studio">
      <div className="nameplate-controls">
        <section className="nameplate-settings glass-panel">
          <h3>Los datos de la persona</h3>
          <label htmlFor="nameplate-name">Nombre y apellido</label>
          <textarea id="nameplate-name" rows={2} maxLength={160} value={data.name} onChange={event => setData(previous => ({ ...previous, name: event.target.value }))} />
          <label htmlFor="nameplate-role">Cargo o especialidad <span>Opcional</span></label>
          <input id="nameplate-role" maxLength={180} value={data.role} onChange={event => setData(previous => ({ ...previous, role: event.target.value }))} />
          <label htmlFor="nameplate-institution">Institución <span>Opcional</span></label>
          <input id="nameplate-institution" maxLength={180} value={data.institution} onChange={event => setData(previous => ({ ...previous, institution: event.target.value }))} />
          <p>Los mismos datos se repiten en ambas caras. El nombre se ajusta automáticamente para mantenerse dentro de la hoja.</p>
        </section>
        <section className="nameplate-settings glass-panel">
          <h3>Diseño y tamaño</h3>
          <label htmlFor="nameplate-style">Estilo del identificador</label>
          <select id="nameplate-style" value={data.style} onChange={event => setData(previous => ({ ...previous, style: event.target.value as NameplateData['style'] }))}>
            <option value="institutional">ACH · Azul institucional</option><option value="minimal">ACH · Fondo claro</option>
          </select>
          <label htmlFor="nameplate-size">Tamaño del nombre <span>{data.nameSize}</span></label>
          <input id="nameplate-size" type="range" min={32} max={76} value={data.nameSize} onChange={event => setData(previous => ({ ...previous, nameSize: Number(event.target.value) }))} />
          <label className="nameplate-checkbox"><input type="checkbox" checked={data.guides} onChange={event => setData(previous => ({ ...previous, guides: event.target.checked }))} /> Incluir guías de doblez</label>
          <p>Carta horizontal · 27.94 × 21.59 cm · 300 ppp.<br />Una hoja por identificador; no requiere impresión a doble cara.</p>
        </section>
        <section className="nameplate-settings glass-panel">
          <h3>Logotipos</h3><p>Selecciona las instituciones que participan en tu evento.</p>
          {NAMEPLATE_LOGOS.map(logo => <label className="nameplate-checkbox" key={logo.id}><input type="checkbox" checked={data.logos[logo.id]} onChange={event => setData(previous => ({ ...previous, logos: { ...previous.logos, [logo.id]: event.target.checked } }))} />{logo.label}</label>)}
        </section>
        <section className="nameplate-fold-note">
          <h3>De la hoja a la mesa</h3>
          <p>Imprime al 100 % en carta horizontal, sin encabezados ni pies. Marca el doblez central y dobla las dos pestañas hacia adentro para formar la base. Los nombres quedan visibles en lados opuestos.</p>
        </section>
        {!resetConfirmation ? <button className="nameplate-reset" onClick={() => setResetConfirmation(true)}><RotateCcw size={14} /> Restablecer datos</button> : <div className="nameplate-reset-confirm"><p>¿Restablecer el identificador y borrar los datos de esta plantilla?</p><button onClick={() => { setData(initialData); setResetConfirmation(false); setNotice(''); }}>Restablecer</button><button onClick={() => setResetConfirmation(false)}>Cancelar</button></div>}
      </div>
      <section className="nameplate-preview-panel" aria-label="Vista previa del identificador de mesa">
        <div className="nameplate-preview-caption"><strong>Hoja para imprimir</strong><span>Carta horizontal · 11 × 8.5 pulgadas</span></div>
        <div className="nameplate-page" aria-busy={rendering}>
          <canvas ref={canvas} role="img" aria-label={`Hoja carta plegable con dos caras para ${data.name || 'Nombre y apellido'}. ${data.role}. ${data.institution}.`} />
          {rendering && <span className="nameplate-rendering" role="status"><Loader2 size={17} className="animate-spin" /> Preparando hoja…</span>}
        </div>
        <p className="nameplate-preview-note">La cara superior va invertida para que se lea correctamente al doblar la hoja. Las líneas punteadas son guías de doblez.</p>
      </section>
    </div>
  </div>;
}
