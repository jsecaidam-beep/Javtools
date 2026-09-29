import { TableData, BadgeColor } from '../types/table';

export const SEVERITY_PALETTE: Record<BadgeColor, { bg: string; text: string; textDark: string; softBg: string; border: string }> = {
  none: { bg: 'transparent', text: '#1E293B', textDark: '#1E293B', softBg: 'transparent', border: 'transparent' },
  blue: { bg: '#005FB6', text: '#FFFFFF', textDark: '#004A8F', softBg: '#EBF4FC', border: '#004A8F' },
  green: { bg: '#52AE32', text: '#FFFFFF', textDark: '#2E7D32', softBg: '#EAF6E5', border: '#3E8C22' },
  orange: { bg: '#EE7203', text: '#FFFFFF', textDark: '#C2410C', softBg: '#FEF3E7', border: '#BA5600' },
  gray: { bg: '#707070', text: '#FFFFFF', textDark: '#374151', softBg: '#F3F4F6', border: '#505050' },
  red: { bg: '#ED1C24', text: '#FFFFFF', textDark: '#B91C1C', softBg: '#FEE2E2', border: '#B91C1C' },
  yellow: { bg: '#FFF200', text: '#000000', textDark: '#854D0E', softBg: '#FEFCE8', border: '#D4C800' },
  purple: { bg: '#8B5CF6', text: '#FFFFFF', textDark: '#6D28D9', softBg: '#F3E8FF', border: '#7C3AED' },
};

export function generateWordTableHtml(tableData: TableData): string {
  const { title, subtitle, headers, headerBgColors, rows, notes, source } = tableData;
  const highlightStyle = tableData.highlightStyle || 'soft-pastel'; // Default to soft-pastel (clean, professional Excel-like fill)

  // Smart column widths strictly constrained to 100% to fit Word / A4 margins without spilling over
  const colCount = Math.max(1, headers.length);
  let colWidths: number[] = [];
  if (colCount === 1) {
    colWidths = [100];
  } else if (colCount === 2) {
    colWidths = [45, 55];
  } else {
    const col0 = Math.min(30, Math.max(22, Math.round((100 / colCount) * 1.35)));
    const rest = 100 - col0;
    const eachRest = Math.floor((rest / (colCount - 1)) * 10) / 10;
    colWidths = [col0, ...Array(colCount - 1).fill(eachRest)];
    const sum = colWidths.reduce((a, b) => a + b, 0);
    colWidths[0] += Math.round((100 - sum) * 10) / 10;
  }

  let html = `
<div class="WordSection1" style="font-family: 'Futura', 'Trebuchet MS', Arial, sans-serif; margin: 0; padding: 0; width: 100% !important; max-width: 100% !important; box-sizing: border-box;">
  <!-- ACH Header block with brand colors -->
  <div style="margin-bottom: 8px; border-left: 5px solid #005FB6; padding-left: 10px; width: 100%;">
    <div style="font-size: 8.5pt; color: #005FB6; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase;">
      ACCIÓN CONTRA EL HAMBRE | ACTION AGAINST HUNGER
    </div>
    <div style="font-size: 13pt; color: #111827; font-weight: bold; margin-top: 2px;">
      ${escapeHtml(title || 'Tabla Humanitaria ACH')}
    </div>
    ${subtitle ? `<div style="font-size: 8.5pt; color: #707070; margin-top: 1px;">${escapeHtml(subtitle)}</div>` : ''}
  </div>

  <!-- Table with strict 100% fit to page margins for MS Word / Outlook (No margin overflow) -->
  <table border="1" cellpadding="0" cellspacing="0" width="100%" style="width: 100% !important; max-width: 100% !important; table-layout: fixed !important; mso-table-layout-alt: fixed !important; border-collapse: collapse; border: 1.5px solid #005FB6; font-family: 'Futura', 'Trebuchet MS', Arial, sans-serif; font-size: 8.5pt; margin-top: 6px; margin-bottom: 8px; background-color: #ffffff; box-sizing: border-box; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
    <colgroup>
      ${colWidths.map((w) => `<col style="width: ${w}%;" width="${w}%" />`).join('\n      ')}
    </colgroup>
    <thead>
      <tr style="background-color: #005FB6; color: #FFFFFF; font-weight: bold; mso-line-height-rule: exactly;">
        ${headers
          .map((h, hIdx) => {
            const hBg = headerBgColors?.[hIdx] || '#005FB6';
            const isDark = hBg !== '#FFF200' && hBg !== '#FFFFFF' && hBg !== '#FFFDE6';
            const hTextColor = isDark ? '#FFFFFF' : '#000000';
            const w = colWidths[hIdx] || Math.round(100 / colCount);
            return `
          <th style="width: ${w}%; max-width: ${w}%; padding: 6px 7px; font-family: 'Futura', 'Trebuchet MS', Arial, sans-serif; font-size: 8.5pt; font-weight: bold; color: ${hTextColor}; background-color: ${hBg}; border: 1px solid #707070; text-align: left; vertical-align: middle; word-wrap: break-word !important; word-break: break-word !important; overflow-wrap: break-word !important; white-space: normal !important;">
            ${escapeHtml(h)}
          </th>`;
          })
          .join('')}
      </tr>
    </thead>
    <tbody>
`;

  rows.forEach((row, rowIndex) => {
    const isEven = rowIndex % 2 === 0;
    const defaultRowBg = isEven ? '#FFFFFF' : '#F6F9FD';
    const rowBg = row.rowBgColor || defaultRowBg;

    html += `      <tr style="background-color: ${rowBg}; mso-line-height-rule: exactly;">\n`;

    row.cells.forEach((cell, cellColIdx) => {
      // Skip cells that are covered by another cell's rowSpan/colSpan
      if (cell.isSpannedChild) return;

      const align = cell.align || 'left';
      const badge = cell.badgeColor || 'none';
      const rowSpanAttr = cell.rowSpan && cell.rowSpan > 1 ? ` rowspan="${cell.rowSpan}"` : '';
      const colSpanAttr = cell.colSpan && cell.colSpan > 1 ? ` colspan="${cell.colSpan}"` : '';

      // Accurate width summing all spanned columns
      const cSpan = cell.colSpan || 1;
      let cellWidth = 0;
      for (let k = 0; k < cSpan; k++) {
        cellWidth += colWidths[cellColIdx + k] || (100 / colCount);
      }
      cellWidth = Math.min(100, Math.round(cellWidth * 10) / 10);

      let cellContent = escapeHtml(cell.value || '');
      let cellBg = cell.bgColor;
      let cellFg = cell.textColor;
      let isBold = Boolean(cell.isBold);

      // Handle severity highlights based on highlightStyle setting
      if (badge !== 'none' && highlightStyle !== 'clean-none') {
        const pal = SEVERITY_PALETTE[badge];
        if (highlightStyle === 'soft-pastel') {
          // Elegant soft pastel tint: Seamless full cell fill, readable dark text
          cellBg = pal.softBg;
          cellFg = pal.textDark;
          isBold = true;
          cellContent = escapeHtml(cell.value || '');
        } else if (highlightStyle === 'colored-text') {
          // Pure colored text without any boxes or background tint
          cellFg = pal.textDark;
          isBold = true;
          cellContent = `<span style="color: ${pal.textDark}; font-weight: bold;">● ${escapeHtml(cell.value || '')}</span>`;
        } else if (highlightStyle === 'full-cell') {
          // Solid corporate fill
          cellBg = pal.bg;
          cellFg = pal.text;
          isBold = true;
          cellContent = escapeHtml(cell.value || '');
        } else {
          // Subtle pill without harsh double borders
          cellContent = `
            <span style="display: inline-block; background-color: ${pal.softBg}; color: ${pal.textDark}; border: 1px solid ${pal.border}; padding: 2px 7px; border-radius: 3px; font-weight: bold; font-size: 8pt; text-align: center;">
              ${escapeHtml(cell.value || '')}
            </span>
          `;
        }
      }

      // If it's a progress bar
      if (cell.isProgressBar) {
        const percent = Math.min(100, Math.max(0, cell.progressPercent ?? parseInt(cell.value) ?? 50));
        const barColor = badge === 'orange' ? '#EE7203' : badge === 'green' ? '#52AE32' : badge === 'yellow' ? '#FFF200' : '#005FB6';
        cellContent = `
          <div style="font-size: 8pt; font-weight: bold; color: #1e293b; margin-bottom: 2px;">${escapeHtml(cell.value)}</div>
          <table cellpadding="0" cellspacing="0" width="100%" style="width: 100%; border-collapse: collapse; height: 6px; background-color: #E2E8F0; border-radius: 3px; border: none;">
            <tr>
              <td style="width: ${percent}%; background-color: ${barColor}; height: 6px; font-size: 1px; line-height: 1px; border: none; border-radius: 2px;">&nbsp;</td>
              <td style="width: ${100 - percent}%; background-color: #E2E8F0; height: 6px; font-size: 1px; line-height: 1px; border: none;">&nbsp;</td>
            </tr>
          </table>
        `;
      }

      const cellBgStyle = cellBg ? `background-color: ${cellBg};` : '';
      const cellTextColorStyle = cellFg ? `color: ${cellFg};` : 'color: #1E293B;';
      const cellBoldStyle = isBold ? 'font-weight: bold;' : '';

      html += `        <td${rowSpanAttr}${colSpanAttr} style="width: ${cellWidth}%; padding: 4.5pt 6pt; mso-padding-alt: 4.5pt 6pt 4.5pt 6pt; font-family: 'Futura', 'Trebuchet MS', Arial, sans-serif; font-size: 8.5pt; ${cellTextColorStyle} ${cellBgStyle} ${cellBoldStyle} border: 1px solid #D0D7DE; text-align: ${align}; vertical-align: middle; word-wrap: break-word !important; word-break: break-word !important; overflow-wrap: break-word !important; white-space: normal !important; mso-line-height-rule: exactly;">
          ${cellContent}
        </td>\n`;
    });

    html += `      </tr>\n`;
  });

  html += `    </tbody>
  </table>

  <!-- Table footer notes & sources with official gray tone -->
  ${
    notes || source
      ? `
  <div style="font-size: 8pt; color: #707070; font-style: italic; line-height: 1.35; margin-top: 4px; border-top: 1px dashed #D0D7DE; padding-top: 4px; width: 100%;">
    ${notes ? `<div><strong>Nota:</strong> ${escapeHtml(notes)}</div>` : ''}
    ${source ? `<div><strong>Fuente:</strong> ${escapeHtml(source)}</div>` : ''}
  </div>`
      : ''
  }
</div>
`;

  return html;
}

export async function copyTableToExcelClipboard(tableData: TableData): Promise<boolean> {
  const { headers, rows, title, subtitle, notes, source } = tableData;

  // Build clean HTML table that Excel interprets with native cell backgrounds & borders
  let excelTable = `<table border="1">`;
  excelTable += `<tr><th colspan="${headers.length}" style="background-color: #005FB6; color: #FFFFFF; font-weight: bold; font-size: 14pt;">${escapeHtml(title || 'Tabla ACH')}</th></tr>`;
  if (subtitle) {
    excelTable += `<tr><td colspan="${headers.length}" style="color: #707070; font-size: 10pt;">${escapeHtml(subtitle)}</td></tr>`;
  }
  excelTable += `<tr>`;
  headers.forEach((h, hIdx) => {
    const bg = tableData.headerBgColors?.[hIdx] || '#005FB6';
    const isDark = bg !== '#FFF200' && bg !== '#FFFFFF' && bg !== '#FFFDE6';
    const fg = isDark ? '#FFFFFF' : '#000000';
    excelTable += `<th style="background-color: ${bg}; color: ${fg}; font-weight: bold;">${escapeHtml(h)}</th>`;
  });
  excelTable += `</tr>`;

  rows.forEach((r) => {
    excelTable += `<tr>`;
    r.cells.forEach((c) => {
      // Skip covered cells in Excel HTML table
      if (c.isSpannedChild) return;
      let bg = c.bgColor || '#FFFFFF';
      let fg = c.textColor || '#000000';
      let bold = c.isBold ? 'font-weight: bold;' : '';

      if (c.badgeColor && c.badgeColor !== 'none') {
        const pal = SEVERITY_PALETTE[c.badgeColor];
        if (tableData.highlightStyle === 'colored-text') {
          fg = pal.textDark;
          bold = 'font-weight: bold;';
        } else if (tableData.highlightStyle === 'soft-pastel') {
          bg = pal.softBg;
          fg = pal.textDark;
          bold = 'font-weight: bold;';
        } else {
          bg = pal.bg;
          fg = pal.text;
          bold = 'font-weight: bold;';
        }
      }

      const rSpan = c.rowSpan && c.rowSpan > 1 ? ` rowspan="${c.rowSpan}"` : '';
      const cSpan = c.colSpan && c.colSpan > 1 ? ` colspan="${c.colSpan}"` : '';
      excelTable += `<td${rSpan}${cSpan} style="background-color: ${bg}; color: ${fg}; ${bold} text-align: ${c.align || 'left'}; padding: 5px 8px;">${escapeHtml(c.value)}</td>`;
    });
    excelTable += `</tr>`;
  });

  if (notes || source) {
    excelTable += `<tr><td colspan="${headers.length}" style="font-size: 9pt; color: #707070;">${notes ? escapeHtml(notes) + ' ' : ''}${source ? escapeHtml(source) : ''}</td></tr>`;
  }
  excelTable += `</table>`;

  // TSV for pure clipboard paste in cells
  const tsv = [
    title,
    subtitle || '',
    '',
    headers.join('\t'),
    ...rows.map((r) => r.cells.map((c) => c.value).join('\t')),
    '',
    notes ? `Nota: ${notes}` : '',
    source ? `Fuente: ${source}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const htmlBlob = new Blob([excelTable], { type: 'text/html' });
      const textBlob = new Blob([tsv], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        }),
      ]);
      return true;
    }
  } catch (e) {
    console.warn('Clipboard write failed, using fallback:', e);
  }

  try {
    const el = document.createElement('textarea');
    el.value = tsv;
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch (err) {
    return false;
  }
}

export async function copyTableToWordClipboard(tableData: TableData): Promise<boolean> {
  const tableHtml = generateWordTableHtml(tableData);

  // Full Word clipboard envelope with explicit A4 printable margins & auto-containment
  const fullHtml = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<style>
  @page WordSection1 {
    size: 595.3pt 841.9pt; /* A4 standard */
    margin: 56.7pt 56.7pt 56.7pt 56.7pt; /* 2.0 cm margins = 17cm printable table */
    mso-header-margin: 35.4pt;
    mso-footer-margin: 35.4pt;
    mso-paper-source: 0;
  }
  div.WordSection1 {
    page: WordSection1;
    width: 100% !important;
    max-width: 100% !important;
  }
  body {
    font-family: 'Futura', 'Trebuchet MS', Arial, sans-serif;
    margin: 0;
    padding: 0;
  }
  table {
    width: 100% !important;
    max-width: 100% !important;
    table-layout: fixed !important;
    mso-table-layout-alt: fixed !important;
    border-collapse: collapse !important;
  }
  th, td {
    word-break: break-word !important;
    word-wrap: break-word !important;
    overflow-wrap: break-word !important;
    white-space: normal !important;
  }
</style>
</head>
<body>
<!--StartFragment-->
${tableHtml}
<!--EndFragment-->
</body>
</html>
`.trim();

  // Plain text fallback
  const plainText = [
    tableData.title,
    tableData.subtitle || '',
    '',
    tableData.headers.join('\t'),
    ...tableData.rows.map((r) => r.cells.map((c) => c.value).join('\t')),
    '',
    tableData.notes ? `Nota: ${tableData.notes}` : '',
    tableData.source ? `Fuente: ${tableData.source}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const htmlBlob = new Blob([fullHtml], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        }),
      ]);
      return true;
    }
  } catch (err) {
    console.warn('ClipboardItem API failed, attempting fallback listener:', err);
  }

  // Fallback using document.execCommand
  try {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.innerHTML = fullHtml;
    document.body.appendChild(container);

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(container);
    selection?.removeAllRanges();
    selection?.addRange(range);

    const successful = document.execCommand('copy');
    selection?.removeAllRanges();
    document.body.removeChild(container);
    return successful;
  } catch (e) {
    console.error('All clipboard operations failed:', e);
    return false;
  }
}

export function generateStandaloneHtml(tableData: TableData): string {
  const tableHtml = generateWordTableHtml(tableData);
  const jsonState = JSON.stringify(tableData, null, 2);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(tableData.title || 'Generador ACH - Tablas y Gráficas')}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --ach-blue: #005FB6;
      --ach-green: #52AE32;
      --ach-orange: #EE7203;
      --ach-gray: #707070;
      --font-family: 'Futura', 'Futura PT', 'Century Gothic', 'Trebuchet MS', Arial, sans-serif;
    }
    * { box-sizing: border-box; font-family: var(--font-family) !important; }
    body {
      background: #0b1329;
      color: #e2e8f0;
      margin: 0;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    .container {
      width: 100%;
      max-width: 1200px;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4);
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid var(--ach-blue);
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 1.4rem;
      font-weight: 700;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .badge-ach {
      background: var(--ach-blue);
      color: white;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .btn-action {
      background: var(--ach-blue);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-action:hover {
      background: #004c94;
      transform: translateY(-1px);
    }
    .table-card {
      background: #ffffff;
      border-radius: 12px;
      padding: 20px;
      color: #1e293b;
      box-shadow: 0 6px 20px rgba(0,0,0,0.15);
      margin-bottom: 24px;
      overflow-x: auto;
    }
    .chart-container {
      background: rgba(30, 41, 59, 0.7);
      border-radius: 12px;
      padding: 20px;
      border: 1px solid rgba(255,255,255,0.08);
      margin-top: 20px;
    }
    canvas { max-height: 380px; width: 100% !important; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-bar">
      <div class="brand-title">
        <span class="badge-ach">ACH</span>
        <span>${escapeHtml(tableData.title)}</span>
      </div>
      <div>
        <button class="btn-action" onclick="copiarParaWord()">📋 Copiar Tabla para Word</button>
      </div>
    </div>

    <!-- Contenedor de la Tabla ACH -->
    <div class="table-card" id="word-target">
      ${tableHtml}
    </div>

    <!-- Módulo de Gráfica Chart.js -->
    <div class="chart-container">
      <h3 style="margin-top: 0; color: #fff;">📊 Visualización Gráfica ACH</h3>
      <div style="position: relative; height: 350px;">
        <canvas id="achChart"></canvas>
      </div>
    </div>
  </div>

  <script>
    const tableData = ${jsonState};

    function copiarParaWord() {
      const el = document.getElementById('word-target');
      const html = el.innerHTML;
      const blob = new Blob([html], { type: 'text/html' });
      navigator.clipboard.write([
        new ClipboardItem({ 'text/html': blob })
      ]).then(() => {
        alert('¡Tabla copiada con estilos optimizados para Word!');
      }).catch(() => {
        alert('Copia el contenido manualmente seleccionando la tabla.');
      });
    }

    // Inicializar Chart.js
    const ctx = document.getElementById('achChart').getContext('2d');
    const labels = tableData.rows.map(r => r.cells[tableData.chartLabelCol || 0]?.value || 'Sin etiqueta');
    const values = tableData.rows.map(r => {
      const raw = r.cells[tableData.chartValueCols?.[0] || 1]?.value || '0';
      return parseFloat(raw.replace(/[^0-9.-]+/g, '')) || 0;
    });

    const achPalette = ['#005FB6', '#52AE32', '#EE7203', '#707070', '#003E7E', '#3E8C22', '#BA5600'];

    new Chart(ctx, {
      type: '${tableData.suggestedChartType || 'bar'}',
      data: {
        labels: labels,
        datasets: [{
          label: tableData.headers[tableData.chartValueCols?.[0] || 1] || 'Valores',
          data: values,
          backgroundColor: achPalette,
          borderColor: '#ffffff',
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#e2e8f0', font: { family: 'Futura, Arial' } } }
        },
        scales: {
          x: { ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y: { ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(255,255,255,0.06)' } }
        }
      }
    });
  </script>
</body>
</html>
`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
