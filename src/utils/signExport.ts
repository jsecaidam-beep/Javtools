function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  if (!canvas.width || !canvas.height) return Promise.reject(new Error('El rótulo no tiene un tamaño válido.'));
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo exportar el rótulo.')), type, quality));
}
function validSize(value: number) { return Number.isFinite(value) && value >= 5 && value <= 300; }

/** Full artwork, one PDF page, the exact physical size chosen in the editor. */
export async function canvasToSignPdf(canvas: HTMLCanvasElement, widthCm: number, heightCm: number): Promise<Blob> {
  if (!validSize(widthCm) || !validSize(heightCm)) throw new Error('Indica un tamaño entre 5 y 300 cm.');
  const widthPt = Number((widthCm * 72 / 2.54).toFixed(5)), heightPt = Number((heightCm * 72 / 2.54).toFixed(5));
  const jpeg = await canvasBlob(canvas, 'image/jpeg', 0.99);
  const image = await jpeg.arrayBuffer(), bytes = new Uint8Array(image);
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('No se pudo preparar la imagen del PDF.');
  const encoder = new TextEncoder(), parts: BlobPart[] = [], offsets: number[] = [0];
  let length = 0;
  const append = (content: string) => { const data = encoder.encode(content); parts.push(data); length += data.byteLength; };
  const object = (id: number) => { offsets[id] = length; append(`${id} 0 obj\n`); };
  append('%PDF-1.4\n');
  const marker = new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]); parts.push(marker); length += marker.byteLength;
  object(1); append('<< /Type /Catalog /Pages 2 0 R /ViewerPreferences << /PrintScaling /None /PickTrayByPDFSize true >> >>\nendobj\n');
  object(2); append('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  object(3); append(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${widthPt} ${heightPt}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`);
  object(4); append(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.byteLength} >>\nstream\n`);
  parts.push(image); length += image.byteLength; append('\nendstream\nendobj\n');
  object(5); const commands = `q\n${widthPt} 0 0 ${heightPt} 0 0 cm\n/Im0 Do\nQ\n`;
  append(`<< /Length ${encoder.encode(commands).byteLength} >>\nstream\n${commands}endstream\nendobj\n`);
  const xref = length; append('xref\n0 6\n0000000000 65535 f \n');
  for (let id = 1; id <= 5; id++) append(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: 'application/pdf' });
}

/** A physical-resolution chunk preserves the chosen centimetres in print apps. */
export async function canvasToSignPng(canvas: HTMLCanvasElement, widthCm: number, heightCm: number): Promise<Blob> {
  if (!validSize(widthCm) || !validSize(heightCm)) throw new Error('Indica un tamaño entre 5 y 300 cm.');
  const png = await canvasBlob(canvas, 'image/png'), bytes = new Uint8Array(await png.arrayBuffer());
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((byte, i) => bytes[i] === byte) || bytes.length < 45) throw new Error('No se pudo generar el PNG.');
  const chunk = new Uint8Array(21), view = new DataView(chunk.buffer);
  view.setUint32(0, 9); chunk.set([112, 72, 89, 115], 4);
  view.setUint32(8, Math.round(canvas.width / (widthCm / 100)));
  view.setUint32(12, Math.round(canvas.height / (heightCm / 100))); chunk[16] = 1;
  let crc = 0xffffffff;
  for (const byte of chunk.subarray(4, 17)) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  view.setUint32(17, (crc ^ 0xffffffff) >>> 0);
  const parts: BlobPart[] = [bytes.slice(0, 33), chunk], input = new DataView(bytes.buffer);
  let complete = false;
  for (let offset = 33; offset < bytes.length;) {
    if (offset + 12 > bytes.length) throw new Error('El PNG está incompleto.');
    const end = offset + input.getUint32(offset) + 12;
    if (end > bytes.length) throw new Error('El PNG está incompleto.');
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    if (type !== 'pHYs') parts.push(bytes.slice(offset, end)); offset = end;
    if (type === 'IEND') { complete = true; break; }
  }
  if (!complete) throw new Error('El PNG está incompleto.');
  return new Blob(parts, { type: 'image/png' });
}
