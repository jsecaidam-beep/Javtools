import { SIGN_GLYPHS } from './signGlyphs';

export type SignTextId = 'category' | 'title' | 'location' | 'beneficiaryLabel' | 'families' | 'familiesLabel' | 'inhabitants' | 'inhabitantsLabel' | 'financeLabel' | 'donor' | 'costLabel' | 'cost' | 'logoCaption' | 'slogan' | 'projectIntro' | 'projectText';
export type SignSectionId = 'header' | 'beneficiaries' | 'finance' | 'logos' | 'slogan' | 'project';
export type SignText = { text: string; visible: boolean; fontSize: number; dx: number; dy: number };
export type SignLogo = { src: string; name: string; visible: boolean; scale: number; dx: number; dy: number };
export type SignData = {
  version: 1;
  texts: Record<SignTextId, SignText>;
  logos: [SignLogo, SignLogo];
  sections: Record<SignSectionId, boolean>;
  widthCm: number;
  heightCm: number;
  blue: string;
  green: string;
  motifOpacity: number;
};

export const SIGN_SECTIONS: { id: SignSectionId; label: string }[] = [
  { id: 'header', label: 'Encabezado y ubicación' },
  { id: 'beneficiaries', label: 'Personas beneficiadas' },
  { id: 'finance', label: 'Financiamiento' },
  { id: 'logos', label: 'Logos y atribución' },
  { id: 'slogan', label: 'Mensaje central' },
  { id: 'project', label: 'Nombre del proyecto' },
];

export const SIGN_TEXT_FIELDS: { id: SignTextId; label: string; section: SignSectionId }[] = [
  { id: 'category', label: 'Tipo de mejoramiento', section: 'header' },
  { id: 'title', label: 'Nombre de la obra o centro', section: 'header' },
  { id: 'location', label: 'Ubicación', section: 'header' },
  { id: 'beneficiaryLabel', label: 'Título del cuadro de personas', section: 'beneficiaries' },
  { id: 'families', label: 'Cantidad de familias', section: 'beneficiaries' },
  { id: 'familiesLabel', label: 'Etiqueta de familias', section: 'beneficiaries' },
  { id: 'inhabitants', label: 'Cantidad de habitantes', section: 'beneficiaries' },
  { id: 'inhabitantsLabel', label: 'Etiqueta de habitantes', section: 'beneficiaries' },
  { id: 'financeLabel', label: 'Título del cuadro de financiamiento', section: 'finance' },
  { id: 'donor', label: 'Texto de financiamiento', section: 'finance' },
  { id: 'costLabel', label: 'Etiqueta del monto', section: 'finance' },
  { id: 'cost', label: 'Monto y moneda', section: 'finance' },
  { id: 'logoCaption', label: 'Texto sobre los logos', section: 'logos' },
  { id: 'slogan', label: 'Mensaje principal', section: 'slogan' },
  { id: 'projectIntro', label: 'Introducción del proyecto', section: 'project' },
  { id: 'projectText', label: 'Nombre completo del proyecto', section: 'project' },
];

const BASE = import.meta.env.BASE_URL;
const DEFAULT_LOGO_SOURCES = [`${BASE}assets/invitaciones/fhg-blanco.svg`, `${BASE}assets/invitaciones/ach-blanco.svg`];
const field = (text: string, fontSize: number, visible = true): SignText => ({ text, visible, fontSize, dx: 0, dy: 0 });
export const DEFAULT_SIGN_DATA: SignData = {
  version: 1,
  texts: {
    category: field('MEJORA SANITARIA', 31),
    title: field('CENTRO DE SALUD\nCHIQUIMULA', 57),
    location: field('Municipio de Chiquimula,\nDepartamento de Chiquimula,\nGuatemala.', 25),
    beneficiaryLabel: field('PERSONAS\nBENEFICIADAS', 15),
    families: field('560', 48),
    familiesLabel: field('Familias', 14),
    inhabitants: field('2,820', 48),
    inhabitantsLabel: field('Habitantes', 14),
    financeLabel: field('FINANCIAMIENTO\nDEL PROYECTO', 15),
    donor: field('Fondo Humanitario para Guatemala\n(por medio de Acción Contra el Hambre)', 13),
    costLabel: field('Costo Total del Proyecto', 14),
    cost: field('Q. 127,611.00', 34),
    // Keep this caption editable separately from the donor logo.
    logoCaption: field('Proyecto financiado por:', 23),
    slogan: field('POR LA SALUD\nY EL BIENESTAR\nDE TU FAMILIA', 46),
    projectIntro: field('Intervención realizada en el marco del proyecto', 15),
    projectText: field('Respuesta humanitaria multisectorial para salvar vidas frente a impactos del\nchoque climático en cuatro municipios de Huehuetenango y Chiquimula', 19),
  },
  logos: [
    { src: DEFAULT_LOGO_SOURCES[0], name: 'Fondo Humanitario para Guatemala', visible: true, scale: 1, dx: 0, dy: 0 },
    { src: DEFAULT_LOGO_SOURCES[1], name: 'Acción contra el Hambre', visible: true, scale: 1, dx: 0, dy: 0 },
  ],
  sections: { header: true, beneficiaries: true, finance: true, logos: true, slogan: true, project: true },
  widthCm: 75, heightCm: 100, blue: '#005FB6', green: '#52AE32', motifOpacity: 0.16,
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function finite(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
function boolean(value: unknown, fallback: boolean) { return typeof value === 'boolean' ? value : fallback; }
function text(value: unknown, fallback: string, max = 2400) { return typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, max) : fallback; }
function color(value: unknown, fallback: string) { return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value : fallback; }

function logoSource(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback;
  if (DEFAULT_LOGO_SOURCES.includes(value)) return value;
  // Project imports cannot turn the editor into a remote-image fetcher.
  // Uploaded SVGs are used only as inert image resources, never inserted as HTML.
  return /^data:image\/(?:png|jpeg|webp|svg\+xml);base64,[A-Za-z\d+/=\r\n]+$/.test(value) && value.length <= 14_000_000 ? value : fallback;
}

/** Restore complete, bounded editor state without trusting imported JSON. */
export function sanitizeSignData(value: unknown): SignData {
  const source = record(value), texts = record(source.texts), sections = record(source.sections);
  const output = structuredClone(DEFAULT_SIGN_DATA);
  for (const { id } of SIGN_TEXT_FIELDS) {
    const item = record(texts[id]), defaults = DEFAULT_SIGN_DATA.texts[id];
    output.texts[id] = {
      text: text(item.text, defaults.text), visible: boolean(item.visible, defaults.visible),
      fontSize: finite(item.fontSize, defaults.fontSize, 8, 120),
      dx: finite(item.dx, 0, -400, 400), dy: finite(item.dy, 0, -400, 400),
    };
  }
  for (const { id } of SIGN_SECTIONS) output.sections[id] = boolean(sections[id], true);
  for (const index of [0, 1] as const) {
    const item = record(Array.isArray(source.logos) ? source.logos[index] : null), defaults = DEFAULT_SIGN_DATA.logos[index];
    output.logos[index] = {
      src: logoSource(item.src, defaults.src), name: text(item.name, defaults.name, 160),
      visible: boolean(item.visible, true), scale: finite(item.scale, 1, 0.25, 2.5),
      dx: finite(item.dx, 0, -400, 400), dy: finite(item.dy, 0, -400, 400),
    };
  }
  output.widthCm = finite(source.widthCm, 75, 5, 300);
  output.heightCm = finite(source.heightCm, 100, 5, 300);
  output.blue = color(source.blue, DEFAULT_SIGN_DATA.blue);
  output.green = color(source.green, DEFAULT_SIGN_DATA.green);
  output.motifOpacity = finite(source.motifOpacity, DEFAULT_SIGN_DATA.motifOpacity, 0, 0.5);
  return output;
}

const escapeXml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!);
const assetCache = new Map<string, Promise<string>>();
function assetDataUrl(source: string) {
  if (source.startsWith('data:')) return Promise.resolve(source);
  if (!assetCache.has(source)) {
    const pending = fetch(source, { signal: AbortSignal.timeout(15000) }).then(async response => {
      if (!response.ok) throw new Error('No se pudo cargar un recurso del rótulo. Recarga la página.');
      let bytes = new Uint8Array(await response.arrayBuffer());
      if (source === DEFAULT_LOGO_SOURCES[0]) {
        // Use the donor mark without its fixed caption; the editor draws that
        // caption as a separate, editable field. The original asset stays intact.
        const document = new DOMParser().parseFromString(new TextDecoder().decode(bytes), 'image/svg+xml');
        document.querySelectorAll('path[transform]').forEach(path => {
          const matrix = /matrix\(1,0,0,-1,[^,]+,([^)]+)\)/.exec(path.getAttribute('transform') || '');
          if (matrix && Number(matrix[1]) < 60) path.remove();
        });
        document.documentElement.setAttribute('height', '192.91797');
        document.documentElement.setAttribute('viewBox', '0 60 830.905 192.91797');
        document.documentElement.setAttribute('overflow', 'hidden');
        bytes = new TextEncoder().encode(new XMLSerializer().serializeToString(document.documentElement));
      }
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
      const mime = source.endsWith('.woff2') || source.includes('.woff2?') ? 'font/woff2' : 'image/svg+xml';
      return `data:${mime};base64,${btoa(binary)}`;
    }).catch(reason => { assetCache.delete(source); throw reason; });
    assetCache.set(source, pending);
  }
  return assetCache.get(source)!;
}

type VectorFont = { em: number; glyphs: Record<string, { d: string; w: number }>; kern: Record<string, number> };
const fontFor = (bold = true): VectorFont => bold ? SIGN_GLYPHS.futura : SIGN_GLYPHS.roboto;
function measure(content: string, size: number, bold = true) {
  const font = fontFor(bold); let width = 0, previous = '';
  for (const char of content) { width += (font.kern[previous + char] || 0) + (font.glyphs[char] || font.glyphs['?']).w; previous = char; }
  return width * size / font.em;
}
function wrapLines(content: string, size: number, maxWidth: number, bold = true): string[] {
  const lines: string[] = [];
  for (const paragraph of content.split(/\r?\n/)) {
    if (!paragraph.trim()) { lines.push(''); continue; }
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate, size, bold) <= maxWidth) { line = candidate; continue; }
      if (line) lines.push(line);
      line = '';
      for (const character of word) {
        if (line && measure(line + character, size, bold) > maxWidth) { lines.push(line); line = ''; }
        line += character;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}
type Box = { x: number; y: number; width: number; height: number; align?: 'left' | 'center'; bold?: boolean; color?: string; lineHeight?: number };
function fitText(content: string, desired: number, box: Box) {
  let size = desired, lines: string[] = [];
  do {
    lines = wrapLines(content, size, box.width, box.bold !== false);
    if (lines.length * size * (box.lineHeight ?? 1.12) <= box.height || size <= 1) break;
    size -= 0.5;
  } while (size > 0);
  return { size, lines };
}
const RING = 'M59.59 210.18h-.02c-15.26 0-28.39-12.45-27.62-28.39 1.03-21.2 19.78-24.24 26.21-33.71.3-.47.81-.78 1.41-.78s1.11.31 1.41.78c6.43 9.48 25.19 12.52 26.22 33.72.77 15.94-12.36 28.38-27.62 28.39M111.33 181c0-28.58-23.17-51.75-51.75-51.75S7.84 152.42 7.84 181s23.17 51.75 51.75 51.75 51.75-23.17 51.75-51.75';
function outlinedLine(line: string, x: number, baseline: number, size: number, bold: boolean, brandPor: boolean) {
  const font = fontFor(bold), scale = size / font.em;
  const por = brandPor ? /\bPOR\b/.exec(line)?.index : undefined;
  let position = x, previous = '', output = '', offset = 0;
  for (const char of line) {
    position += (font.kern[previous + char] || 0) * scale;
    const glyph = font.glyphs[char] || font.glyphs['?'];
    if (por !== undefined && offset === por + 1 && char === 'O') {
      const ringScale = size * .804 / 103.5;
      const center = position + size * .443;
      const top = baseline - size * .779;
      output += `<g data-brand-por="true" transform="translate(${center - 59.59 * ringScale} ${top - 129.25 * ringScale}) scale(${ringScale})"><path d="${RING}"/><path data-brand-leaf="true" d="${LEAF}"/></g>`;
    } else if (glyph.d) output += `<path d="${glyph.d}" transform="translate(${position} ${baseline}) scale(${scale} ${-scale})"/>`;
    position += glyph.w * scale; previous = char; offset += char.length;
  }
  return output;
}

const LEAF = 'M59.57 115.83c.89 0 1.69-.49 2.1-1.29 2.99-5.29 10.4-10.08 18.24-15.16 4.09-2.64 8.2-5.53 12.07-8.3 16.54-11.85 27.16-30.39 27.16-51.32 0-.66-.01-1.33-.03-1.99l-.02-.75-.74.08c-12.92 1.45-24.95 6.78-34.92 15.45.05-1.02.07-2.03.07-3.02 0-19.44-8.55-37.36-23.45-49.16l-.48-.38-.48.38c-14.9 11.8-23.45 29.72-23.45 49.16 0 .98.02 1.99.07 3.02-9.96-8.67-22-14-34.92-15.45l-.74-.08-.02.75c-.02.66-.03 1.32-.03 1.99 0 20.92 10.62 39.47 27.16 51.32 3.87 2.77 7.99 5.66 12.07 8.3 7.84 5.07 15.25 9.87 18.24 15.16.41.8 1.21 1.29 2.1 1.29';

/** Self-contained vector SVG. Letter outlines preserve the official fonts in Safari and print exports. */
export async function renderSignSvg(input: SignData): Promise<string> {
  const data = sanitizeSignData(input);
  const logos = await Promise.all(data.logos.map(logo => data.sections.logos && logo.visible ? assetDataUrl(logo.src) : Promise.resolve('')));
  const blue = data.blue, green = data.green;
  const pieces: string[] = [];
  const write = (id: SignTextId, box: Box) => {
    const item = data.texts[id];
    if (!item.visible || !item.text.trim()) return '';
    const { size, lines } = fitText(item.text, item.fontSize, box);
    const centered = box.align === 'center', leading = size * (box.lineHeight ?? 1.12);
    const x = (centered ? box.x + box.width / 2 : box.x) + item.dx;
    const top = box.y + (box.height - lines.length * leading) / 2 + item.dy;
    const paths = lines.map((line, index) => outlinedLine(line, centered ? x - measure(line, size, box.bold !== false) / 2 : x, top + size * .86 + index * leading, size, box.bold !== false, id === 'slogan')).join('');
    const text = `<g data-text="${id}" data-content="${escapeXml(item.text)}" aria-label="${escapeXml(item.text)}" fill="${box.color ?? '#ffffff'}">${paths}</g>`;
    pieces.push(text);
    return text;
  };
  const divider = (x: number, y: number, h: number) => `<path d="M${x} ${y}v${h}" stroke="${blue}" stroke-width="1.2" opacity=".6"/>`;
  const circle = (x: number, y: number, inner: string) => `<g transform="translate(${x},${y})"><circle r="34" fill="${blue}"/>${inner}</g>`;
  const people = '<g fill="#fff"><circle cx="0" cy="-10" r="8"/><circle cx="-16" cy="-6" r="6"/><circle cx="16" cy="-6" r="6"/><path d="M-10 19v-8a10 10 0 0 1 20 0v8a30 30 0 0 1-20 0M-23 14V8a7 7 0 0 1 11-6c-2 4-2 9-2 15a24 24 0 0 1-9-3M23 14V8a7 7 0 0 0-11-6c2 4 2 9 2 15a24 24 0 0 0 9-3"/></g>';
  const coins = `<g fill="#fff" stroke="${blue}" stroke-width="1"><ellipse cx="7" cy="-15" rx="13" ry="5"/><path d="M-6-15v6c0 7 26 7 26 0v-6M-6-7v6c0 7 26 7 26 0v-6M-6 1v6c0 7 26 7 26 0V1"/><ellipse cx="-11" cy="7" rx="13" ry="5"/><path d="M-24 7v6c0 7 26 7 26 0V7M-24 15v6c0 7 26 7 26 0v-6"/></g>`;

  if (data.sections.header) {
    const category = data.texts.category;
    const tallHeader = wrapLines(data.texts.title.text, data.texts.title.fontSize, 724).length > 2;
    const categoryY = tallHeader ? 40 : 119;
    if (category.visible && category.text.trim()) {
      const box = { x: 92, y: categoryY, width: 710, height: 39, lineHeight: 1.02 };
      const fitted = fitText(category.text, category.fontSize, box);
      const width = Math.min(727, Math.max(...fitted.lines.map(line => measure(line, fitted.size))) + 14);
      pieces.push(`<rect x="${87 + category.dx}" y="${categoryY + category.dy}" width="${width}" height="39" fill="${green}"/>`);
      write('category', box);
    }
    write('title', { x: 92, y: tallHeader ? 85 : 167, width: 724, height: tallHeader ? 198 : 116, lineHeight: 1.13 });
    write('location', { x: 94, y: 290, width: 700, height: 78, bold: false, lineHeight: 1.08 });
  }

  if (data.sections.beneficiaries) {
    pieces.push(`<g data-section="beneficiaries"><rect x="104" y="402" width="713" height="102" rx="17" fill="#ffffff" fill-opacity=".94"/>${circle(157, 453, people)}</g>`);
    const showLabel = data.texts.beneficiaryLabel.visible;
    if (showLabel && (data.texts.families.visible || data.texts.familiesLabel.visible)) pieces.push(divider(352, 419, 70));
    if ((data.texts.families.visible || data.texts.familiesLabel.visible) && (data.texts.inhabitants.visible || data.texts.inhabitantsLabel.visible)) pieces.push(divider(568, 419, 70));
    write('beneficiaryLabel', { x: 202, y: 428, width: 140, height: 47, color: blue });
    write('families', { x: 367, y: 422, width: 183, height: 50, align: 'center', color: blue });
    write('familiesLabel', { x: 367, y: 476, width: 183, height: 18, align: 'center', color: blue, bold: false });
    write('inhabitants', { x: 587, y: 422, width: 212, height: 50, align: 'center', color: blue });
    write('inhabitantsLabel', { x: 587, y: 476, width: 212, height: 18, align: 'center', color: blue, bold: false });
  }
  if (data.sections.finance) {
    pieces.push(`<g data-section="finance"><rect x="104" y="521" width="713" height="102" rx="17" fill="#ffffff" fill-opacity=".94"/>${circle(157, 572, coins)}</g>`);
    if (data.texts.financeLabel.visible && data.texts.donor.visible) pieces.push(divider(347, 537, 69));
    if (data.texts.donor.visible && (data.texts.cost.visible || data.texts.costLabel.visible)) pieces.push(divider(578, 537, 69));
    write('financeLabel', { x: 202, y: 548, width: 137, height: 48, color: blue });
    write('donor', { x: 356, y: 546, width: 214, height: 53, color: blue, bold: false, align: 'center', lineHeight: 1.18 });
    write('costLabel', { x: 592, y: 541, width: 210, height: 18, color: blue, bold: false, align: 'center' });
    write('cost', { x: 590, y: 562, width: 214, height: 39, color: blue, align: 'center' });
  }
  if (data.sections.logos) {
    write('logoCaption', { x: 132, y: 644, width: 370, height: 30 });
    const visible = data.logos.filter(logo => logo.visible).length;
    if (visible === 2) pieces.push('<path d="M516 675v96" stroke="#ffffff" stroke-width="2" opacity=".9"/>');
    data.logos.forEach((logo, index) => {
      if (!logo.visible || !logos[index]) return;
      const box = index === 0 ? { x: 130, y: 666, width: 355, height: 114 } : { x: 550, y: 658, width: 219, height: 128 };
      const width = box.width * logo.scale, height = box.height * logo.scale;
      const x = box.x + (box.width - width) / 2 + logo.dx, y = box.y + (box.height - height) / 2 + logo.dy;
      pieces.push(`<image data-logo="${index}" aria-label="${escapeXml(logo.name)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" href="${escapeXml(logos[index])}"/>`);
    });
  }
  if (data.sections.slogan) {
    write('slogan', { x: 153, y: 874, width: 594, height: 154, align: 'center', lineHeight: 1.18 });
  }
  if (data.sections.project) {
    const hasIntro = data.texts.projectIntro.visible && !!data.texts.projectIntro.text.trim();
    const hasProject = data.texts.projectText.visible && !!data.texts.projectText.text.trim();
    if (hasIntro || hasProject) pieces.push('<rect x="94" y="1069" width="713" height="86" rx="14" fill="#ffffff" fill-opacity=".94"/>');
    write('projectIntro', { x: 112, y: 1082, width: 677, height: 19, align: 'center', color: blue });
    write('projectText', { x: 111, y: hasIntro ? 1101 : 1081, width: 679, height: hasIntro ? 42 : 62, align: 'center', color: blue, lineHeight: 1.08 });
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${data.widthCm}cm" height="${data.heightCm}cm" viewBox="0 0 900 1200" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(data.texts.title.text)}"><defs><linearGradient id="sign-bg" x1="0" y1=".25" x2="1" y2=".25"><stop offset="0" stop-color="${blue}"/><stop offset=".45" stop-color="${blue}"/><stop offset="1" stop-color="${green}"/></linearGradient><linearGradient id="sign-bottom" x1=".2" y1="0" x2=".8" y2="1"><stop stop-color="${blue}" stop-opacity="0"/><stop offset="1" stop-color="${green}" stop-opacity=".7"/></linearGradient><clipPath id="sign-clip"><rect width="900" height="1200"/></clipPath></defs><g clip-path="url(#sign-clip)"><rect width="900" height="1200" fill="url(#sign-bg)"/><rect width="900" height="1200" fill="url(#sign-bottom)"/><g fill="#ffffff" opacity="${data.motifOpacity}"><path d="${LEAF}" transform="translate(-225 270) scale(5)"/><path d="${LEAF}" transform="translate(552 750) rotate(180) scale(5)"/><circle cx="850" cy="-90" r="230" fill="none" stroke="#ffffff" stroke-width="98"/><circle cx="75" cy="1180" r="210" fill="none" stroke="#ffffff" stroke-width="100"/></g>${pieces.join('')}</g></svg>`;
}

/** Rasterizes the same SVG shown in preview; no alternative export layout. */
export async function renderSignCanvas(svg: string, width = 2700): Promise<HTMLCanvasElement> {
  const documentSvg = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
  const physicalWidth = parseFloat(documentSvg.getAttribute('width') || '75');
  const physicalHeight = parseFloat(documentSvg.getAttribute('height') || '100');
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(Math.min(7200, Math.max(900, width)));
  canvas.height = Math.round(canvas.width * physicalHeight / physicalWidth);
  if (canvas.height > 12000) { canvas.width = Math.round(canvas.width * 12000 / canvas.height); canvas.height = 12000; }
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo preparar la imagen del rótulo.');
  const source = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const picture = new Image();
      const timeout = window.setTimeout(() => reject(new Error('El rótulo tarda demasiado en generarse.')), 20000);
      picture.onload = () => { window.clearTimeout(timeout); resolve(picture); };
      picture.onerror = () => { window.clearTimeout(timeout); reject(new Error('No se pudo convertir el rótulo en imagen.')); };
      picture.src = source;
    });
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally { URL.revokeObjectURL(source); }
}
