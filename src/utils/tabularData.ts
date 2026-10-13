/** Read CSV/TSV without splitting commas or newlines inside quoted cells. */
export function parseDelimitedText(text: string): string[][] {
  const firstLine = text.split(/\r?\n/).find(line => /[,;\t]/.test(line)) || '';
  const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else if (quoted || !cell.trim()) quoted = !quoted;
      else cell += char;
    } else if (!quoted && (char === delimiter || char === '\n')) {
      row.push(cell.trim()); cell = '';
      if (char === '\n') { if (row.some(Boolean)) rows.push(row); row = []; }
    } else if (char !== '\r' || quoted) cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

/** Preserve Latin American decimal commas and common thousands separators. */
export function parseNumericValue(value: string): number {
  let number = value.replace(/[^\d,.-]/g, '');
  if (number.includes(',') && number.includes('.')) {
    number = number.lastIndexOf(',') > number.lastIndexOf('.')
      ? number.replace(/\./g, '').replace(',', '.') : number.replace(/,/g, '');
  } else if (number.includes(',')) {
    number = /^-?\d{1,3}(,\d{3})+$/.test(number) ? number.replace(/,/g, '') : number.replace(',', '.');
  }
  return number ? Number(number) : NaN;
}
