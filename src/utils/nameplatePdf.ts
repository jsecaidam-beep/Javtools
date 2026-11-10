const LETTER_WIDTH_PT = 792;
const LETTER_HEIGHT_PT = 612;

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  if (!canvas.width || !canvas.height) {
    return Promise.reject(new Error('La hoja no tiene un tamaño válido para exportar.'));
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('No se pudo generar la hoja. Vuelve a intentarlo.')),
      type,
      quality,
    );
  });
}

/** Embed the full sheet without margins in a landscape US Letter PDF. */
export async function canvasToLetterPdf(canvas: HTMLCanvasElement): Promise<Blob> {
  const jpeg = await canvasBlob(canvas, 'image/jpeg', 0.98);
  const imageBuffer = await jpeg.arrayBuffer();
  const imageBytes = new Uint8Array(imageBuffer);
  if (imageBytes.length < 4 || imageBytes[0] !== 0xff || imageBytes[1] !== 0xd8) {
    throw new Error('No se pudo preparar la imagen del PDF.');
  }

  const encoder = new TextEncoder();
  const parts: BlobPart[] = [];
  const offsets: number[] = [0];
  let length = 0;
  const appendText = (text: string) => {
    const bytes = encoder.encode(text);
    parts.push(bytes);
    length += bytes.byteLength;
  };
  const startObject = (id: number) => {
    offsets[id] = length;
    appendText(`${id} 0 obj\n`);
  };

  appendText('%PDF-1.4\n');
  const binaryMarker = new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]);
  parts.push(binaryMarker);
  length += binaryMarker.byteLength;

  startObject(1);
  appendText('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  startObject(2);
  appendText('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  startObject(3);
  appendText(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${LETTER_WIDTH_PT} ${LETTER_HEIGHT_PT}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`);
  startObject(4);
  appendText(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBuffer.byteLength} >>\nstream\n`);
  parts.push(imageBuffer);
  length += imageBuffer.byteLength;
  appendText('\nendstream\nendobj\n');
  startObject(5);
  const content = `q\n${LETTER_WIDTH_PT} 0 0 ${LETTER_HEIGHT_PT} 0 0 cm\n/Im0 Do\nQ\n`;
  appendText(`<< /Length ${encoder.encode(content).byteLength} >>\nstream\n${content}endstream\nendobj\n`);

  const xrefOffset = length;
  appendText('xref\n0 6\n0000000000 65535 f \n');
  for (let id = 1; id <= 5; id++) {
    appendText(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  }
  appendText(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  return new Blob(parts, { type: 'application/pdf' });
}

/** Keep the original PNG pixels and declare 300 dpi for physical printing. */
export async function canvasToPrintPng(canvas: HTMLCanvasElement): Promise<Blob> {
  const png = await canvasBlob(canvas, 'image/png');
  const bytes = new Uint8Array(await png.arrayBuffer());
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 45 || !signature.every((byte, index) => bytes[index] === byte)) {
    throw new Error('No se pudo preparar el PNG para impresión.');
  }
  const input = new DataView(bytes.buffer);
  const chunkType = (offset: number) => String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
  if (input.getUint32(8) !== 13 || chunkType(8) !== 'IHDR') {
    throw new Error('El PNG no tiene una cabecera válida.');
  }

  const resolution = new Uint8Array(21);
  const resolutionView = new DataView(resolution.buffer);
  resolutionView.setUint32(0, 9);
  resolution.set([112, 72, 89, 115], 4); // pHYs
  const pixelsPerMetre = Math.round(300 / 0.0254);
  resolutionView.setUint32(8, pixelsPerMetre);
  resolutionView.setUint32(12, pixelsPerMetre);
  resolution[16] = 1; // Pixels per metre, rather than an unspecified unit.
  let crc = 0xffffffff;
  for (const byte of resolution.subarray(4, 17)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  resolutionView.setUint32(17, (crc ^ 0xffffffff) >>> 0);

  const parts: BlobPart[] = [bytes.slice(0, 33), resolution];
  let foundEnd = false;
  for (let offset = 33; offset < bytes.length;) {
    if (offset + 12 > bytes.length) throw new Error('El PNG está incompleto.');
    const end = offset + input.getUint32(offset) + 12;
    if (end > bytes.length) throw new Error('El PNG está incompleto.');
    const type = chunkType(offset);
    if (type !== 'pHYs') parts.push(bytes.slice(offset, end));
    offset = end;
    if (type === 'IEND') {
      foundEnd = true;
      break;
    }
  }
  if (!foundEnd) throw new Error('El PNG está incompleto.');
  return new Blob(parts, { type: 'image/png' });
}
