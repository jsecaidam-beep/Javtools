import html2canvas from 'html2canvas-pro';

export interface ExportPngOptions {
  scale?: number;
  backgroundColor?: string | null;
}

export async function urlToBase64(url: string): Promise<string> {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;
  const response = await fetch(url, { mode: 'cors', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('No se pudo cargar la imagen. Súbela desde tu equipo y reintenta.');
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(blob);
  });
}

/** Use load events instead of decode(), which can reject usable images in WebKit. */
function waitForImage(image: HTMLImageElement): Promise<void> {
  if (image.complete) {
    return image.naturalWidth > 0 ? Promise.resolve() : Promise.reject(new Error('Imagen no disponible'));
  }
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      image.removeEventListener('load', onLoad);
      image.removeEventListener('error', onError);
    };
    const onLoad = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error('Imagen no disponible')); };
    const timeout = setTimeout(() => { cleanup(); reject(new Error('La imagen tarda demasiado en cargar')); }, 15000);
    image.addEventListener('load', onLoad);
    image.addEventListener('error', onError);
  });
}

async function inlineLoadedImage(image: HTMLImageElement): Promise<string> {
  await waitForImage(image);
  try {
    // Capture the pixels already displayed. No second HTTP request is needed.
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 3200 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la imagen');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const source = canvas.toDataURL('image/png');
    if (source === 'data:,') throw new Error('No se pudo preparar la imagen');
    return source;
  } catch {
    // A remote image without canvas access may still allow a CORS fetch.
    return urlToBase64(image.currentSrc || image.src);
  }
}

async function renderElement(element: HTMLElement, options?: ExportPngOptions): Promise<HTMLCanvasElement> {
  if (!element) throw new Error('No se encontró el documento para exportar.');
  await document.fonts.ready;
  // Reuse loaded image pixels, including uploaded logos and bundled photos.
  const images = Array.from(element.querySelectorAll('img'));
  const imageSources = await Promise.all(images.map(async (img) => {
    try {
      return await inlineLoadedImage(img);
    } catch {
      const label = img.alt?.trim() || 'Imagen del documento';
      throw new Error(`No se pudo preparar «${label}». Comprueba que esa imagen se vea en la portada o reemplázala desde Foto/Logos.`);
    }
  }));
  const width = Number(element.dataset.exportWidth) || element.offsetWidth;
  const height = Number(element.dataset.exportHeight) || element.offsetHeight;
  return html2canvas(element, {
    scale: element.dataset.exportHeight ? 5 : options?.scale || 2,
    width, height,
    windowWidth: Math.max(1280, window.innerWidth),
    useCORS: true,
    allowTaint: false,
    backgroundColor: options?.backgroundColor ?? null,
    logging: false,
    imageTimeout: 15000,
    onclone: async (_doc, clone) => {
      clone.style.width = `${width}px`;
      clone.style.minWidth = `${width}px`;
      clone.style.maxWidth = `${width}px`;
      clone.style.height = `${height}px`;
      clone.style.minHeight = '0';
      clone.style.transform = 'none';
      clone.style.boxShadow = 'none';
      clone.style.border = 'none';
      clone.style.borderRadius = '0';
      const clonedImages = Array.from(clone.querySelectorAll('img'));
      await Promise.all(clonedImages.map(async (img, i) => {
        img.removeAttribute('crossorigin');
        img.src = imageSources[i];
        await waitForImage(img);
      }));
      // Turn off editing transitions in the cloned artwork.
      [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))].forEach(el => {
        el.style.transition = 'none';
        el.style.animation = 'none';
        el.style.backdropFilter = 'none';
      });
      if (clone.scrollHeight > clone.clientHeight + 2) {
        throw new Error('El contenido supera el tamaño de la hoja. Reduce el texto o selecciona Oficio.');
      }
    },
  });
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo generar el PNG.')), 'image/png');
  });
}

/** Add physical print resolution so Word recognizes Carta/Oficio in inches. */
async function setPrintDpi(blob: Blob, dpi: number): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk.set([112, 72, 89, 115], 4); // pHYs
  view.setUint32(8, Math.round(dpi / 0.0254));
  view.setUint32(12, Math.round(dpi / 0.0254));
  chunk[16] = 1;
  let crc = 0xffffffff;
  for (const byte of chunk.slice(4, 17)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  view.setUint32(17, (crc ^ 0xffffffff) >>> 0);
  const parts: BlobPart[] = [bytes.slice(0, 33), chunk];
  const input = new DataView(bytes.buffer);
  for (let offset = 33; offset < bytes.length;) {
    const end = offset + input.getUint32(offset) + 12;
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    if (type !== 'pHYs') parts.push(bytes.slice(offset, end));
    offset = end;
  }
  return new Blob(parts, { type: 'image/png' });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Safari needs the object URL to remain alive after the asynchronous render.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function downloadElementAsPng(element: HTMLElement, fileName = 'imagen-ach.png', options?: ExportPngOptions): Promise<boolean> {
  const canvas = await renderElement(element, options);
  const blob = await canvasToPngBlob(canvas);
  downloadBlob(element.dataset.exportHeight ? await setPrintDpi(blob, 300) : blob, fileName.endsWith('.png') ? fileName : `${fileName}.png`);
  return true;
}

export async function copyElementAsPngToClipboard(element: HTMLElement, options?: ExportPngOptions): Promise<boolean> {
  if (!navigator.clipboard?.write || !window.ClipboardItem) throw new Error('Este navegador no permite copiar imágenes. Usa Descargar PNG.');
  // Supply a promise while the click's user activation is still active (Safari).
  const png = renderElement(element, options).then(canvasToPngBlob).then(blob => element.dataset.exportHeight ? setPrintDpi(blob, 300) : blob);
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
  return true;
}
