import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Download, Upload, Save, RotateCcw, Mail, Eye, EyeOff, Loader2, ImagePlus, Trash2 } from 'lucide-react';
import { downloadBlob, downloadElementAsPng } from '../utils/canvasExport';
import './InvitationEditor.css';

const ASSETS = `${import.meta.env.BASE_URL}assets/invitaciones/`;
const STORAGE_KEY = 'javtools-invitation-v1';
const PROJECT = 'Respuesta humanitaria multisectorial para salvar vidas frente a impactos del choque climático en cuatro municipios de Huehuetenango y Chiquimula';
const DEFAULT_FIELDS = {
  badge: 'INVITACIÓN', title: 'INAUGURACIÓN\nDE OBRAS', region: 'Huehuetenango',
  name: '[NOMBRE DE LA PERSONA]', role: '[CARGO O PUESTO]', institution: 'MSPAS',
  introduction: 'Acción contra el Hambre tiene el agrado de invitarle a la inauguración de:',
  work: '[NOMBRE DE LA OBRA]', day: '[DÍA]', month: '[mes y año]',
  time: '[HORA]', period: '[a. m. / p. m.]',
  location: '[ESTABLECIMIENTO O COMUNIDAD]', address: '[DIRECCIÓN O PUNTO DE ENCUENTRO]',
  closing: 'Será un gusto contar con su presencia.',
  attribution: 'Proyecto implementado por Acción contra el Hambre, financiado por el Fondo Humanitario para Guatemala.',
  project: PROJECT,
};
type Field = keyof typeof DEFAULT_FIELDS;
type BuiltInLogo = 'fhg' | 'ach' | 'ops';
type InvitationTemplate = 'ach' | 'institutional';
type CustomLogo = {
  id: string;
  name: string;
  src: string;
};
type RenderedLogo = {
  id: string;
  name: string;
  src: string;
  alt: string;
  kind: BuiltInLogo | 'custom';
};
type InvitationData = {
  fields: Record<Field, string>;
  visible: Record<Field, boolean>;
  logos: Record<BuiltInLogo, boolean>;
  customLogos: CustomLogo[];
  template: InvitationTemplate;
  format: 'vertical' | 'compact';
};
const LABELS: Record<Field, string> = {
  badge: 'Etiqueta', title: 'Título', region: 'Departamento o región', name: 'Nombre de la persona',
  role: 'Cargo o puesto', institution: 'Institución', introduction: 'Texto de invitación',
  work: 'Nombre de la obra', day: 'Día o fecha', month: 'Mes y año', time: 'Hora',
  period: 'Período u horario adicional', location: 'Lugar o comunidad', address: 'Dirección o punto de encuentro',
  closing: 'Mensaje de cierre', attribution: 'Atribución del financiamiento', project: 'Nombre del proyecto',
};
const GROUPS: { title: string; fields: Field[]; open?: boolean }[] = [
  { title: 'A quién invitamos', fields: ['name', 'role', 'institution'], open: true },
  { title: 'Fecha, hora y lugar', fields: ['day', 'month', 'time', 'period', 'location', 'address'], open: true },
  { title: 'Encabezado y evento', fields: ['badge', 'title', 'region', 'introduction', 'work', 'closing'] },
  { title: 'Proyecto y financiamiento', fields: ['attribution', 'project'] },
];
const MULTILINE: Field[] = ['title', 'introduction', 'work', 'address', 'closing', 'attribution', 'project'];
const MAX_CUSTOM_LOGOS = 6;
const MAX_LOGO_FILE_SIZE = 450_000;
const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const BUILT_IN_LOGOS: Record<BuiltInLogo, Omit<RenderedLogo, 'id'>> = {
  fhg: {
    name: 'Fondo Humanitario para Guatemala (FHG)',
    src: `${ASSETS}fhg-blanco.svg`,
    alt: 'Proyecto financiado por: Fondo Humanitario para Guatemala',
    kind: 'fhg',
  },
  ach: {
    name: 'Acción contra el Hambre',
    src: `${ASSETS}ach-blanco.svg`,
    alt: 'Acción contra el Hambre',
    kind: 'ach',
  },
  ops: {
    name: 'OPS / OMS',
    src: `${ASSETS}ops-blanco.png`,
    alt: 'Organización Panamericana de la Salud y Organización Mundial de la Salud',
    kind: 'ops',
  },
};

function defaults(): InvitationData {
  return {
    fields: { ...DEFAULT_FIELDS },
    visible: Object.fromEntries(Object.keys(DEFAULT_FIELDS).map(key => [key, true])) as Record<Field, boolean>,
    logos: { fhg: true, ach: true, ops: true },
    customLogos: [],
    template: 'ach',
    format: 'vertical',
  };
}

function isSafeLogoSource(value: unknown): value is string {
  return typeof value === 'string'
    && /^data:image\/(png|jpeg|webp|svg\+xml);base64,[a-z0-9+/=]+$/i.test(value)
    && value.length <= 2_100_000;
}

function readableLogoName(filename: string) {
  return filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Logotipo adicional';
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}.`));
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error(`No se pudo leer ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

/** Only accept this editor's fields; imported content is rendered as plain React text. */
function readData(value: unknown): InvitationData {
  if (!value || typeof value !== 'object') throw new Error('El archivo no contiene una invitación válida.');
  const input = value as Partial<InvitationData>;
  if (!input.fields || typeof input.fields !== 'object') throw new Error('El archivo no contiene los campos de la invitación.');
  const next = defaults();
  for (const key of Object.keys(DEFAULT_FIELDS) as Field[]) {
    if (typeof input.fields[key] === 'string') next.fields[key] = input.fields[key].slice(0, 3000);
    if (typeof input.visible?.[key] === 'boolean') next.visible[key] = input.visible[key];
  }
  for (const key of Object.keys(BUILT_IN_LOGOS) as BuiltInLogo[]) {
    if (typeof input.logos?.[key] === 'boolean') next.logos[key] = input.logos[key];
  }
  if (Array.isArray(input.customLogos)) {
    next.customLogos = input.customLogos.slice(0, MAX_CUSTOM_LOGOS).flatMap((candidate, index) => {
      if (!candidate || typeof candidate !== 'object') return [];
      const logo = candidate as Partial<CustomLogo>;
      if (!isSafeLogoSource(logo.src)) return [];
      return [{
        id: typeof logo.id === 'string' ? logo.id.slice(0, 120) : `custom-imported-${index}`,
        name: typeof logo.name === 'string' ? logo.name.slice(0, 80) : 'Logotipo adicional',
        src: logo.src,
      }];
    });
  }
  next.template = input.template === 'institutional' ? 'institutional' : 'ach';
  next.format = input.format === 'compact' ? 'compact' : 'vertical';
  return next;
}

function initialData(): InvitationData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? readData(JSON.parse(saved)) : defaults();
  } catch { return defaults(); }
}

function textSize(text: string, base: number, softLimit: number, minimum: number) {
  return Math.max(minimum, base * Math.min(1, Math.sqrt(softLimit / Math.max(1, text.length))));
}

export function InvitationEditor() {
  const [data, setData] = useState(initialData);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notice, setNotice] = useState('');
  const [dimensions, setDimensions] = useState({ scale: 1, height: 960 });
  const viewport = useRef<HTMLDivElement>(null);
  const artwork = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const customLogoInput = useRef<HTMLInputElement>(null);
  const minHeight = data.format === 'vertical' ? 960 : 720;
  const shown = (key: Field) => data.visible[key] && !!data.fields[key].trim();
  const text = (key: Field) => data.fields[key].trim();
  const hasDate = shown('day') || shown('month');
  const hasTime = shown('time') || shown('period');
  const hasPlace = shown('location') || shown('address');
  const hasRecipient = shown('name') || shown('role') || shown('institution');
  const hasBody = hasRecipient || shown('introduction') || shown('work') || hasDate || hasTime || hasPlace || shown('closing');
  const selectedLogos: RenderedLogo[] = [
    ...(Object.keys(BUILT_IN_LOGOS) as BuiltInLogo[]).flatMap(key => data.logos[key] ? [{ id: key, ...BUILT_IN_LOGOS[key] }] : []),
    ...data.customLogos.map(logo => ({ id: logo.id, name: logo.name, src: logo.src, alt: logo.name, kind: 'custom' as const })),
  ];
  const hasFooter = selectedLogos.length > 0 || shown('attribution') || shown('project');
  const hasHeader = shown('badge') || shown('title') || shown('region');

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch { setNotice('El navegador no pudo guardar el borrador. Puedes usar Guardar editable.'); }
  }, [data]);

  useLayoutEffect(() => {
    const frame = viewport.current;
    const page = artwork.current;
    if (!frame || !page) return;
    const measure = () => setDimensions({ scale: Math.min(1, frame.clientWidth / 540), height: page.offsetHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(page);
    measure();
    return () => observer.disconnect();
  }, []);

  const update = (key: Field, value: string) => setData(prev => ({ ...prev, fields: { ...prev.fields, [key]: value } }));
  const toggle = (key: Field) => setData(prev => ({ ...prev, visible: { ...prev.visible, [key]: !prev.visible[key] } }));
  const slug = (text('work') || 'huehuetenango').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'ach';

  async function addCustomLogos(files?: FileList | null) {
    const supplied = Array.from(files ?? []);
    const remaining = MAX_CUSTOM_LOGOS - data.customLogos.length;
    const accepted = supplied.filter(file => ACCEPTED_LOGO_TYPES.includes(file.type) && file.size <= MAX_LOGO_FILE_SIZE).slice(0, Math.max(0, remaining));
    const rejected = supplied.length - accepted.length;
    try {
      if (!accepted.length) {
        setNotice(remaining <= 0 ? `Puedes usar hasta ${MAX_CUSTOM_LOGOS} logotipos adicionales.` : 'Agrega un PNG, JPG, WebP o SVG de hasta 450 KB.');
        return;
      }
      const additions = await Promise.all(accepted.map(async (file, index) => ({
        id: `custom-${Date.now()}-${index}`,
        name: readableLogoName(file.name),
        src: await fileToDataUrl(file),
      })));
      setData(prev => ({ ...prev, customLogos: [...prev.customLogos, ...additions].slice(0, MAX_CUSTOM_LOGOS) }));
      setNotice(rejected ? `Se agregaron ${additions.length} logo(s). Algunos archivos no cumplían el formato, tamaño o límite.` : `${additions.length} logo(s) agregado(s).`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudieron agregar los logotipos.');
    } finally {
      if (customLogoInput.current) customLogoInput.current.value = '';
    }
  }

  const renameCustomLogo = (id: string, name: string) => setData(prev => ({
    ...prev,
    customLogos: prev.customLogos.map(logo => logo.id === id ? { ...logo, name: name.slice(0, 80) } : logo),
  }));
  const removeCustomLogo = (id: string) => setData(prev => ({ ...prev, customLogos: prev.customLogos.filter(logo => logo.id !== id) }));

  async function exportPng() {
    if (!artwork.current || busy) return;
    setBusy(true);
    setNotice('');
    try {
      await downloadElementAsPng(artwork.current, `invitacion-${slug}.png`, { scale: 2, backgroundColor: data.template === 'institutional' ? '#f5f7f2' : '#005FB6' });
      setNotice('Invitación descargada en PNG.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo descargar la imagen. Inténtalo de nuevo.');
    } finally { setBusy(false); }
  }

  function saveEditable() {
    downloadBlob(new Blob([JSON.stringify({ version: 2, ...data }, null, 2)], { type: 'application/json' }), `invitacion-${slug}.json`);
    setNotice('Editable guardado. Puedes volver a abrirlo aquí para seguir trabajando.');
  }

  async function importEditable(file?: File) {
    if (!file) return;
    try {
      if (file.size > 200000) throw new Error('Selecciona un editable de invitación de menos de 200 KB.');
      setData(readData(JSON.parse(await file.text())));
      setNotice('Editable abierto.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'No se pudo abrir el archivo.'); }
    finally { if (fileInput.current) fileInput.current.value = ''; }
  }

  return (
    <div className="invitation-editor">
      <div className="glass-panel invitation-toolbar">
        <div>
          <h2><Mail size={22} /> Invitaciones</h2>
          <p>Elige la plantilla, edita los datos y suma los logos que el evento necesite.</p>
        </div>
        <div className="invitation-actions">
          <button type="button" onClick={() => fileInput.current?.click()}><Upload size={16} /> Abrir editable</button>
          <button type="button" onClick={saveEditable}><Save size={16} /> Guardar editable</button>
          <button type="button" onClick={exportPng} disabled={busy} className="invitation-primary">{busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}{busy ? 'Generando…' : 'Descargar invitación PNG'}</button>
          <input ref={fileInput} type="file" accept=".json,application/json" onChange={event => importEditable(event.target.files?.[0])} hidden aria-label="Abrir archivo editable de invitación" />
        </div>
      </div>
      {notice && <p role="status" className="invitation-notice">{notice}</p>}
      <div className="invitation-studio">
        <div className="invitation-controls">
          <div className="glass-panel invitation-settings">
            <label htmlFor="invitation-template">Diseño de invitación</label>
            <select id="invitation-template" value={data.template} onChange={event => setData(prev => ({ ...prev, template: event.target.value as InvitationTemplate }))}>
              <option value="ach">Azul institucional</option>
              <option value="institutional">Institucional versátil</option>
            </select>
            <p>La segunda opción toma el azul y verde como acento, sin llevar una identidad ACH en el fondo.</p>
            <label htmlFor="invitation-format" className="invitation-secondary-label">Composición</label>
            <select id="invitation-format" value={data.format} onChange={event => setData(prev => ({ ...prev, format: event.target.value as InvitationData['format'] }))}>
              <option value="vertical">Vertical</option>
              <option value="compact">Compacta</option>
            </select>
            <p>El alto se amplía si el contenido lo necesita. Los campos vacíos también se ocultan.</p>
          </div>
          {GROUPS.map(group => <details key={group.title} open={group.open} className="glass-panel invitation-group">
            <summary>{group.title}</summary>
            <div className="invitation-group-fields">
              {group.fields.map(key => <div key={key} className="invitation-field">
                <div className="invitation-field-heading">
                  <label htmlFor={`invitation-${key}`}>{LABELS[key]}</label>
                  <button type="button" role="switch" aria-checked={data.visible[key]} aria-label={`Mostrar ${LABELS[key].toLowerCase()}`} onClick={() => toggle(key)} className={data.visible[key] ? 'is-visible' : ''} title={data.visible[key] ? 'Ocultar campo' : 'Mostrar campo'}>
                    {data.visible[key] ? <Eye size={14} /> : <EyeOff size={14} />} {data.visible[key] ? 'Visible' : 'Oculto'}
                  </button>
                </div>
                {MULTILINE.includes(key)
                  ? <textarea id={`invitation-${key}`} rows={key === 'project' ? 4 : 2} maxLength={3000} value={data.fields[key]} disabled={!data.visible[key]} onChange={event => update(key, event.target.value)} />
                  : <input id={`invitation-${key}`} maxLength={500} value={data.fields[key]} disabled={!data.visible[key]} onChange={event => update(key, event.target.value)} />}
              </div>)}
            </div>
          </details>)}
          <div className="glass-panel invitation-settings">
            <h3>Logotipos</h3>
            <p>Selecciona los logos institucionales y agrega los de otros socios cuando hagan falta.</p>
            {(Object.keys(BUILT_IN_LOGOS) as BuiltInLogo[]).map(key => <label key={key} className="invitation-logo-option">
              <input type="checkbox" checked={data.logos[key]} onChange={event => setData(prev => ({ ...prev, logos: { ...prev.logos, [key]: event.target.checked } }))} />
              {BUILT_IN_LOGOS[key].name}
            </label>)}
            <div className="invitation-custom-logos">
              <div className="invitation-custom-logo-heading">
                <div><strong>Logos adicionales</strong><span>PNG, JPG, WebP o SVG · hasta 450 KB</span></div>
                <button type="button" onClick={() => customLogoInput.current?.click()} disabled={data.customLogos.length >= MAX_CUSTOM_LOGOS}><ImagePlus size={15} /> Agregar logo</button>
                <input ref={customLogoInput} type="file" accept={ACCEPTED_LOGO_TYPES.join(',')} multiple hidden onChange={event => addCustomLogos(event.target.files)} aria-label="Agregar logotipos adicionales" />
              </div>
              {data.customLogos.length > 0 && <div className="invitation-custom-logo-list">
                {data.customLogos.map(logo => <div className="invitation-custom-logo" key={logo.id}>
                  <div className="invitation-custom-logo-preview"><img src={logo.src} alt="" /></div>
                  <input value={logo.name} onChange={event => renameCustomLogo(logo.id, event.target.value)} aria-label="Nombre del logotipo" maxLength={80} />
                  <button type="button" className="invitation-remove-logo" onClick={() => removeCustomLogo(logo.id)} aria-label={`Quitar ${logo.name}`} title="Quitar logo"><Trash2 size={15} /></button>
                </div>)}
              </div>}
            </div>
          </div>
          {confirmReset ? <div className="invitation-reset-confirm">
            <p>Se reemplazará tu borrador por la plantilla inicial.</p>
            <button type="button" onClick={() => { setData(defaults()); setConfirmReset(false); setNotice('Plantilla restablecida.'); }}>Restablecer</button>
            <button type="button" onClick={() => setConfirmReset(false)}>Cancelar</button>
          </div> : <button type="button" className="invitation-reset" onClick={() => setConfirmReset(true)}><RotateCcw size={15} /> Restablecer plantilla</button>}
          <p className="invitation-draft-note">Tu borrador se conserva en este navegador. Guarda el editable para compartirlo o abrirlo en otro equipo.</p>
        </div>
        <section className="invitation-preview-panel" aria-label="Vista previa de invitación">
          <div className="invitation-preview-caption"><span>Vista previa</span><span>{1080} × {dimensions.height * 2} px</span></div>
          <div ref={viewport} className="invitation-viewport" style={{ height: dimensions.height * dimensions.scale }}>
            <div data-preview-transform style={{ width: 540, transform: `scale(${dimensions.scale})`, transformOrigin: 'top left' }}>
              <div ref={artwork} data-export-surface="invitation" data-export-width="540" className={`invitation-art ${data.template === 'institutional' ? 'invitation-art--versatile' : ''}`} style={{ minHeight }}>
                {data.template === 'ach'
                  ? <img className="invitation-background" src={`${ASSETS}fondo-ach-2160.webp`} alt="" />
                  : <div className="invitation-versatile-background" aria-hidden="true" />}
                <div className="invitation-art-content" style={{ minHeight: minHeight - 76 }}>
                  {hasHeader && <div className="invitation-header">
                    {shown('badge') && <div className="invitation-badge"><span>{text('badge')}</span></div>}
                    {shown('title') && <h3 style={{ fontSize: textSize(text('title'), 45, 30, 28) }}>{text('title')}</h3>}
                    {shown('region') && <p className="invitation-region">{text('region')}</p>}
                  </div>}
                  {hasBody && <div className="invitation-body">
                    {hasRecipient && <div className="invitation-recipient">
                      {shown('name') && <p className="invitation-name">{text('name')}</p>}
                      {(shown('role') || shown('institution')) && <p className="invitation-role">{[shown('role') && text('role'), shown('institution') && text('institution')].filter(Boolean).join(' · ')}</p>}
                    </div>}
                    {shown('introduction') && <p className="invitation-introduction">{text('introduction')}</p>}
                    {shown('work') && <div className="invitation-work">{text('work')}</div>}
                    {(hasDate || hasTime) && <div className="invitation-schedule">
                      {hasDate && <div className="invitation-schedule-cell" data-invitation-block="date">
                        <p className="invitation-small-label">FECHA</p>
                        {shown('day') && <p className="invitation-schedule-main" style={{ fontSize: textSize(text('day'), 48, 7, 23) }}>{text('day')}</p>}
                        {shown('month') && <p className="invitation-schedule-detail">{text('month')}</p>}
                      </div>}
                      {hasTime && <div className="invitation-schedule-cell" data-invitation-block="time">
                        <p className="invitation-small-label">HORA</p>
                        {shown('time') && <p className="invitation-schedule-main" style={{ fontSize: textSize(text('time'), 45, 8, 23) }}>{text('time')}</p>}
                        {shown('period') && <p className="invitation-schedule-detail">{text('period')}</p>}
                      </div>}
                    </div>}
                    {hasPlace && <div className="invitation-place">
                      <p className="invitation-small-label">LUGAR</p>
                      {shown('location') && <p className="invitation-location">{text('location')}</p>}
                      {shown('address') && <p className="invitation-address">{text('address')}</p>}
                    </div>}
                    {shown('closing') && <p className="invitation-closing">{text('closing')}</p>}
                  </div>}
                  {hasFooter && <div className="invitation-footer">
                    {selectedLogos.length > 0 && <div className="invitation-logos">
                      {selectedLogos.map(logo => <div className={`invitation-logo invitation-logo--${logo.kind}`} key={logo.id} title={logo.name}>
                        <img src={logo.src} alt={logo.alt} />
                      </div>)}
                    </div>}
                    {shown('attribution') && <p className="invitation-attribution">{text('attribution')}</p>}
                    {shown('project') && <div className="invitation-project"><p>En el marco del proyecto:</p><p>{text('project')}</p></div>}
                  </div>}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
