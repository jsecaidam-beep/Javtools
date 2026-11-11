import React, { useEffect, useRef, useState } from 'react';
import { ContactRound, Download, FileDown, Printer, RotateCcw, Loader2 } from 'lucide-react';
import { downloadBlob } from '../utils/canvasExport';
import { NAMEPLATE_LOGOS, renderNameplate, type NameplateData } from '../utils/nameplateCanvas';
import { canvasToLetterPdf, canvasToPrintPng } from '../utils/nameplatePdf';
import './NameplateEditor.css';

const STORAGE = 'javtools-nameplates-v1';
const initialData: NameplateData = {
  name: 'Nombre y apellido', role: 'Cargo o especialidad', institution: 'Institución',
  nameSize: 56, style: 'institutional', orientation: 'portrait', guides: true,
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
      orientation: value.orientation === 'landscape' ? 'landscape' : 'portrait',
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
  const landscape = data.orientation === 'landscape';
  const orientationLabel = landscape ? 'horizontal' : 'vertical';
  const pageRatio = landscape ? '11 / 8.5' : '8.5 / 11';
  async function save(kind: 'png' | 'pdf') {
    if (!canvas.current || unavailable) return;
    setBusy(kind);
    setNotice('');
    try {
      const blob = kind === 'pdf' ? await canvasToLetterPdf(canvas.current) : await canvasToPrintPng(canvas.current);
      downloadBlob(blob, `identificador-${slug}-carta-${orientationLabel}.${kind}`);
      setNotice(kind === 'pdf' ? `PDF carta ${orientationLabel} listo. Imprime en tamaño real (100 %).` : `Imagen PNG lista: ${canvas.current.width} × ${canvas.current.height} px, 300 ppp, carta ${orientationLabel}.`);
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'No se pudo descargar el archivo.'); }
    finally { setBusy(''); }
  }

  async function print() {
    if (!canvas.current || unavailable) return;
    // Reserve a top-level tab during the click, before awaiting PDF encoding.
    // Safari prints PDF documents reliably here; hidden HTML/PDF frames do not
    // preserve the page geometry or the native PDF print controls.
    const printWindow = window.open('about:blank', '_blank');
    if (!printWindow) {
      setNotice('Permite abrir la pestaña de impresión para JavTools o descarga el PDF e imprímelo desde tu visor.');
      return;
    }
    printWindow.document.title = 'Preparando identificador para imprimir';
    printWindow.document.body.textContent = 'Preparando una hoja carta para imprimir…';
    setBusy('print');
    setNotice(`Preparando el PDF carta ${orientationLabel}. En impresión, usa la misma orientación y tamaño real (100 %).`);
    try {
      const pdf = await canvasToLetterPdf(canvas.current);
      if (printWindow.closed) return;
      const url = URL.createObjectURL(pdf);
      printWindow.location.replace(url);
      // Keep the PDF alive until its tab is closed, including after cancellation
      // or while the print dialog is open. Never remove it on a fixed timer.
      const release = window.setInterval(() => {
        if (printWindow.closed) {
          window.clearInterval(release);
          URL.revokeObjectURL(url);
        }
      }, 1500);
      const started = Date.now();
      let readySamples = 0;
      const ready = window.setInterval(() => {
        if (printWindow.closed) { window.clearInterval(ready); return; }
        try {
          const document = printWindow.document;
          const isPdf = document.contentType === 'application/pdf'
            || !!document.querySelector('embed[type="application/pdf"]');
          readySamples = isPdf && document.readyState === 'complete' ? readySamples + 1 : 0;
          if (readySamples >= 2) {
            window.clearInterval(ready);
            printWindow.focus();
            printWindow.print();
            return;
          }
        } catch { /* Some PDF viewers isolate their document; use their native print command. */ }
        if (Date.now() - started > 8000) window.clearInterval(ready);
      }, 300);
      setNotice(`Abrimos el PDF carta ${orientationLabel} en una pestaña de impresión. Si el diálogo no se abre solo, pulsa ⌘P en Mac o Ctrl+P en Windows. Usa Carta ${orientationLabel} y tamaño real (100 %).`);
    } catch (reason) {
      printWindow.close();
      setNotice(reason instanceof Error ? reason.message : 'No se pudo preparar la impresión. Descarga el PDF para imprimirlo.');
    } finally { setBusy(''); }
  }

  return <div className="nameplate-editor">
    <section className="nameplate-toolbar glass-panel">
      <div><h2><ContactRound size={23} /> Identificadores de mesa</h2><p>Un nombre, dos caras. Hoja carta lista para doblar y colocar en la mesa.</p></div>
      <div className="nameplate-actions">
        <button disabled={unavailable} onClick={() => void save('png')}>{busy === 'png' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Descargar imagen</button>
        <button disabled={unavailable} onClick={() => void save('pdf')}>{busy === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />} Descargar PDF</button>
        <button className="nameplate-primary" disabled={unavailable} onClick={() => void print()}>{busy === 'print' ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} Imprimir</button>
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
          <label htmlFor="nameplate-orientation">Orientación de la hoja</label>
          <select id="nameplate-orientation" value={data.orientation} onChange={event => setData(previous => ({ ...previous, orientation: event.target.value as NameplateData['orientation'] }))}>
            <option value="portrait">Carta vertical · 8.5 × 11 pulgadas</option><option value="landscape">Carta horizontal · 11 × 8.5 pulgadas</option>
          </select>
          <label htmlFor="nameplate-style">Estilo del identificador</label>
          <select id="nameplate-style" value={data.style} onChange={event => setData(previous => ({ ...previous, style: event.target.value as NameplateData['style'] }))}>
            <option value="institutional">ACH · Azul institucional</option><option value="minimal">ACH · Fondo claro</option>
          </select>
          <label htmlFor="nameplate-size">Tamaño del nombre <span>{data.nameSize}</span></label>
          <input id="nameplate-size" type="range" min={32} max={76} value={data.nameSize} onChange={event => setData(previous => ({ ...previous, nameSize: Number(event.target.value) }))} />
          <label className="nameplate-checkbox"><input type="checkbox" checked={data.guides} onChange={event => setData(previous => ({ ...previous, guides: event.target.checked }))} /> Incluir guías de doblez</label>
          <p>Carta {orientationLabel} · {landscape ? '27.94 × 21.59' : '21.59 × 27.94'} cm · 300 ppp.<br />Una hoja por identificador; no requiere impresión a doble cara.</p>
        </section>
        <section className="nameplate-settings glass-panel">
          <h3>Logotipos</h3><p>Selecciona las instituciones que participan en tu evento.</p>
          {NAMEPLATE_LOGOS.map(logo => <label className="nameplate-checkbox" key={logo.id}><input type="checkbox" checked={data.logos[logo.id]} onChange={event => setData(previous => ({ ...previous, logos: { ...previous.logos, [logo.id]: event.target.checked } }))} />{logo.label}</label>)}
        </section>
        <section className="nameplate-fold-note">
          <h3>De la hoja a la mesa</h3>
          <p>El botón Imprimir abre el PDF con las medidas de esta hoja. Usa Carta {orientationLabel} y tamaño real (100 %). Marca el doblez central y dobla las dos pestañas hacia adentro para formar la base.</p>
        </section>
        {!resetConfirmation ? <button className="nameplate-reset" onClick={() => setResetConfirmation(true)}><RotateCcw size={14} /> Restablecer datos</button> : <div className="nameplate-reset-confirm"><p>¿Restablecer el identificador y borrar los datos de esta plantilla?</p><button onClick={() => { setData(initialData); setResetConfirmation(false); setNotice(''); }}>Restablecer</button><button onClick={() => setResetConfirmation(false)}>Cancelar</button></div>}
      </div>
      <section className="nameplate-preview-panel" aria-label="Vista previa del identificador de mesa">
        <div className="nameplate-preview-caption"><strong>Hoja para imprimir</strong><span>Carta {orientationLabel} · {landscape ? '11 × 8.5' : '8.5 × 11'} pulgadas</span></div>
        <div className="nameplate-page" aria-busy={rendering} style={{ aspectRatio: pageRatio }}>
          <canvas ref={canvas} role="img" aria-label={`Hoja carta plegable con dos caras para ${data.name || 'Nombre y apellido'}. ${data.role}. ${data.institution}.`} />
          {rendering && <span className="nameplate-rendering" role="status"><Loader2 size={17} className="animate-spin" /> Preparando hoja…</span>}
        </div>
        <p className="nameplate-preview-note">La cara superior va invertida para que se lea correctamente al doblar la hoja. Las líneas punteadas son guías de doblez.</p>
      </section>
    </div>
  </div>;
}
