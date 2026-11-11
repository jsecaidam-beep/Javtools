export type NameplateLogoId = 'fhg' | 'ach' | 'ops' | 'mspas';
export type NameplateData = {
  name: string;
  role: string;
  institution: string;
  nameSize: number;
  style: 'institutional' | 'minimal';
  orientation: 'portrait' | 'landscape';
  guides: boolean;
  logos: Record<NameplateLogoId, boolean>;
};

const BASE = `${import.meta.env.BASE_URL}assets/identificadores/`;
export const NAMEPLATE_LOGOS: { id: NameplateLogoId; label: string; file: string; whiteFile: string; background?: string }[] = [
  { id: 'fhg', label: 'Fondo Humanitario para Guatemala', file: 'fhg-blanco.svg', whiteFile: 'fhg-blanco.svg', background: '#005FB6' },
  { id: 'ach', label: 'Acción contra el Hambre', file: 'ach-color.svg', whiteFile: '../invitaciones/ach-blanco.svg' },
  { id: 'ops', label: 'OPS / OMS', file: 'ops-color.png', whiteFile: '../invitaciones/ops-blanco.png' },
  { id: 'mspas', label: 'Ministerio de Salud Pública y Asistencia Social', file: 'mspas-color.png', whiteFile: 'mspas-blanco.png' },
];

const FONT = '"Invitation Futura", "Jost Variable", "Jost", Arial, sans-serif';
const BODY_FONT = '"Roboto Variable", "Roboto", Arial, sans-serif';

const imageCache = new Map<string, Promise<HTMLImageElement>>();
function loadLogo(file: string) {
  const source = BASE + file;
  if (!imageCache.has(source)) {
    const pending = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => { imageCache.delete(source); reject(new Error(`No se pudo cargar el logo ${file}. Recarga la página y vuelve a intentar.`)); };
      image.src = source;
    });
    imageCache.set(source, pending);
  }
  return imageCache.get(source)!;
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.trim().split(/\s+/)) {
    if (!word) continue;
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) { line = candidate; continue; }
    if (line) { lines.push(line); line = ''; }
    // A long unbroken name must fit too; do not clip it at the page edge.
    for (const character of word) {
      if (line && context.measureText(line + character).width > maxWidth) { lines.push(line); line = ''; }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function textBlock(context: CanvasRenderingContext2D, text: string, size: number, bold: boolean, maxLines: number, maxWidth: number) {
  let current = size;
  let lines: string[] = [];
  do {
    context.font = `${bold ? 700 : 400} ${current}px ${bold ? FONT : BODY_FONT}`;
    lines = wrapText(context, text, maxWidth);
    if (lines.length <= maxLines || current <= 16) break;
    current -= 1;
  } while (current > 0);
  return { lines, size: current, bold, height: lines.length * current * 1.16 };
}

type TextBlock = ReturnType<typeof textBlock>;
function paintText(context: CanvasRenderingContext2D, block: TextBlock, y: number, color: string, centerX: number) {
  context.fillStyle = color;
  context.font = `${block.bold ? 700 : 400} ${block.size}px ${block.bold ? FONT : BODY_FONT}`;
  context.textBaseline = 'middle';
  for (const [index, line] of block.lines.entries()) {
    context.fillText(line, centerX, y + block.size * 1.16 * (index + 0.5));
  }
}

export async function renderNameplate(canvas: HTMLCanvasElement, data: NameplateData): Promise<void> {
  const WIDTH = data.orientation === 'landscape' ? 1100 : 850;
  const HEIGHT = data.orientation === 'landscape' ? 850 : 1100;
  const TAB = data.orientation === 'landscape' ? 90 : 135;
  const FACE = (HEIGHT - 2 * TAB) / 2;
  await document.fonts.ready;
  await document.fonts.load(`700 56px ${FONT}`);
  const enabled = NAMEPLATE_LOGOS.filter(logo => data.logos[logo.id]);
  const dark = data.style === 'institutional';
  const images = await Promise.all(enabled.map(logo => loadLogo(dark ? logo.whiteFile : logo.file)));
  const surface = document.createElement('canvas');
  surface.width = WIDTH * 3;
  surface.height = HEIGHT * 3;
  const context = surface.getContext('2d');
  if (!context) throw new Error('Tu navegador no pudo preparar la hoja.');
  context.scale(3, 3);
  context.fillStyle = '#fff';
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.textAlign = 'center';

  function face(y: number, inverted: boolean) {
    if (!context) return;
    context.save();
    context.translate(inverted ? WIDTH : 0, inverted ? y + FACE : y);
    if (inverted) context.rotate(Math.PI);
    const ink = dark ? '#ffffff' : '#005FB6';
    if (dark) {
      const background = context.createLinearGradient(0, 90, WIDTH, FACE);
      background.addColorStop(0, '#005FB6');
      background.addColorStop(.7, '#005FB6');
      background.addColorStop(1, '#176f87');
      context.fillStyle = background;
      context.fillRect(24, 10, WIDTH - 48, FACE - 20);
      context.fillStyle = '#52AE32';
      context.fillRect(40, FACE - 25, WIDTH - 80, 7);
      context.fillRect(40, images.length ? 127 : 75, 8, FACE - (images.length ? 178 : 126));
    } else {
      context.fillStyle = '#005FB6'; context.fillRect(40, FACE - 22, (WIDTH - 80) * .77, 5);
      context.fillStyle = '#52AE32'; context.fillRect(40 + (WIDTH - 80) * .77, FACE - 22, (WIDTH - 80) * .23, 5);
    }
    const slotWidth = Math.min(225, (WIDTH - 120) / Math.max(1, images.length));
    const rowWidth = slotWidth * images.length;
    images.forEach((image, index) => {
      if (!dark && enabled[index].background) {
        context.fillStyle = enabled[index].background!;
        context.fillRect((WIDTH - rowWidth) / 2 + slotWidth * index + 4, 14, slotWidth - 8, 74);
      }
      const maximumWidth = slotWidth - 24;
      const maximumHeight = 58;
      const scale = Math.min(maximumWidth / image.naturalWidth, maximumHeight / image.naturalHeight);
      const w = image.naturalWidth * scale;
      const h = image.naturalHeight * scale;
      context.drawImage(image, (WIDTH - rowWidth) / 2 + slotWidth * index + (slotWidth - w) / 2, 22 + (maximumHeight - h) / 2, w, h);
    });

    const name = data.name.trim() || 'Nombre y apellido';
    let factor = 1;
    let blocks: TextBlock[] = [];
    const top = images.length ? 102 : 34;
    const available = FACE - top - 38;
    do {
      blocks = [textBlock(context, name, data.nameSize * factor, true, 3, WIDTH - 100)];
      if (data.role.trim()) blocks.push(textBlock(context, data.role, 28 * factor, false, 2, WIDTH - 100));
      if (data.institution.trim()) blocks.push(textBlock(context, data.institution, 24 * factor, false, 2, WIDTH - 100));
      const height = blocks.reduce((sum, block) => sum + block.height, 0) + (blocks.length - 1) * 9;
      if (height <= available || factor <= .5) break;
      factor -= .05;
    } while (factor > 0);
    const gaps = (blocks.length - 1) * 9;
    const textHeight = blocks.reduce((sum, block) => sum + block.height, 0);
    if (textHeight + gaps > available) {
      const scale = (available - gaps) / textHeight;
      blocks = blocks.map(block => ({ ...block, size: block.size * scale, height: block.height * scale }));
    }
    const totalHeight = blocks.reduce((sum, block) => sum + block.height, 0) + gaps;
    let textY = top + (available - totalHeight) / 2;
    blocks.forEach((block, index) => {
      paintText(context, block, textY, index === 0 ? ink : dark ? '#ffffff' : '#263d4c', WIDTH / 2);
      textY += block.height + 9;
    });
    context.restore();
  }

  // One Letter sheet, two outward faces and two support tabs.
  face(TAB, true);
  face(HEIGHT / 2, false);
  if (data.guides) {
    context.save();
    context.strokeStyle = '#a8b0b7';
    context.lineWidth = .6;
    context.setLineDash([5, 5]);
    [TAB, HEIGHT / 2, HEIGHT - TAB].forEach(y => {
      context.beginPath(); context.moveTo(20, y); context.lineTo(WIDTH - 20, y); context.stroke();
    });
    context.fillStyle = '#69747d';
    context.font = `400 9px ${BODY_FONT}`;
    context.textBaseline = 'middle';
    context.fillText('PESTAÑA DE APOYO · DOBLAR HACIA ADENTRO', WIDTH / 2, TAB / 2);
    context.fillText('PESTAÑA DE APOYO · DOBLAR HACIA ADENTRO', WIDTH / 2, HEIGHT - TAB / 2);
    context.restore();
  }
  // Render offscreen first so edits never leave an incomplete exported sheet.
  canvas.width = surface.width;
  canvas.height = surface.height;
  const output = canvas.getContext('2d');
  if (!output) throw new Error('Tu navegador no pudo mostrar la hoja.');
  output.drawImage(surface, 0, 0);
}
