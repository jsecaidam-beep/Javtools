import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  ClipboardPaste,
  X,
  Upload,
  Loader2,
  ArrowRight,
  Table as TableIcon,
  FileSpreadsheet,
  Check,
  RefreshCw,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import { TableData, TableRow, TableCell, CellAlign, BadgeColor } from '../types/table';

interface MultimodalInputProps {
  onTableGenerated: (tableData: TableData) => void;
}

export const MultimodalInput: React.FC<MultimodalInputProps> = ({ onTableGenerated }) => {
  const [pastedText, setPastedText] = useState<string>('');
  const [pastedImageBase64, setPastedImageBase64] = useState<string | null>(null);
  const [pastedImageMime, setPastedImageMime] = useState<string>('image/png');
  const [pastedHtml, setPastedHtml] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [tableTypeHint, setTableTypeHint] = useState<string>('auto');

  // Parsed structured table from clipboard (Word / Excel / TSV)
  const [detectedTable, setDetectedTable] = useState<TableData | null>(null);

  // Active view tab inside input zone: 'table' | 'text' | 'image'
  const [inputTab, setInputTab] = useState<'table' | 'text' | 'image'>('table');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [is503Error, setIs503Error] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [showOptions, setShowOptions] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const richDropzoneRef = useRef<HTMLDivElement>(null);

  // Parse HTML or TSV into a rich TableData object immediately
  const parseClipboardContent = (html: string, text: string): TableData | null => {
    // 1. Try HTML Table first (Word / Excel clipboard standard)
    if (html && html.includes('<table')) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const table = doc.querySelector('table');
        if (table) {
          const allTrs = Array.from(table.querySelectorAll('tr'));
          if (allTrs.length === 0) return null;

          // Compute max columns across all rows taking colspan into account
          const rowColCounts = allTrs.map((tr) => {
            const cells = Array.from(tr.querySelectorAll('th, td'));
            return cells.reduce((sum, cell) => sum + ((cell as HTMLTableCellElement).colSpan || 1), 0);
          });
          const maxCols = Math.max(...rowColCounts, 1);

          let detectedTitle = 'Tabla Importada desde Microsoft Office / Excel';
          let headerTr: HTMLTableRowElement | null = null;
          let dataTrStartIndex = 0;

          const thead = table.querySelector('thead');
          if (thead) {
            headerTr = thead.querySelector('tr');
            dataTrStartIndex = 0; // if thead exists, tbody trs are separate
          } else {
            // Check if first row is a title spanning the entire width or having only 1 cell
            const firstRowCells = Array.from(allTrs[0].querySelectorAll('th, td'));
            const firstRowColSpan = firstRowCells.reduce((sum, cell) => sum + ((cell as HTMLTableCellElement).colSpan || 1), 0);

            if (allTrs.length > 1 && (firstRowCells.length === 1 || (firstRowColSpan >= maxCols && firstRowCells.length <= 2))) {
              const possibleTitle = firstRowCells[0].textContent?.trim();
              if (possibleTitle && possibleTitle.length > 2) {
                detectedTitle = possibleTitle;
              }
              // The next row is likely the header row
              headerTr = allTrs[1];
              dataTrStartIndex = 2;
            } else {
              headerTr = allTrs[0];
              dataTrStartIndex = 1;
            }
          }

          const rawHeaders: string[] = [];
          const headerBgColors: string[] = [];

          if (headerTr) {
            const thElements = Array.from(headerTr.querySelectorAll('th, td'));
            thElements.forEach((th, idx) => {
              const label = th.textContent?.trim() || `Columna ${idx + 1}`;
              const cSpan = (th as HTMLTableCellElement).colSpan || 1;
              rawHeaders.push(label);
              for (let k = 1; k < cSpan; k++) {
                rawHeaders.push(`${label} (${k + 1})`);
              }
              const el = th as HTMLElement;
              const bg = el.style?.backgroundColor || el.getAttribute('bgcolor');
              for (let k = 0; k < cSpan; k++) {
                headerBgColors.push(bg || '#005FB6');
              }
            });
          }

          // Build reliable data rows
          const dataTrs = thead ? Array.from(table.querySelectorAll('tbody tr')) : allTrs.slice(dataTrStartIndex);
          const numRows = dataTrs.length > 0 ? dataTrs.length : 1;

          // 2D grid mapping to handle arbitrary rowspans and colspans
          const grid: (TableCell | null)[][] = Array.from({ length: numRows }, () => []);

          dataTrs.forEach((tr, rIdx) => {
            const tds = Array.from(tr.querySelectorAll('td, th'));
            let colIdx = 0;

            tds.forEach((td) => {
              // Advance to next column slot not already occupied by previous rowspans
              while (grid[rIdx][colIdx] !== undefined) {
                colIdx++;
              }

              const el = td as HTMLTableCellElement;
              const val = td.textContent?.trim() || '';
              const isNum = !isNaN(Number(val.replace(/[^0-9.-]+/g, ''))) && val.length > 0 && !val.includes('/');
              const isPct = val.endsWith('%');

              const bg = el.style?.backgroundColor || el.getAttribute('bgcolor') || undefined;
              const fg = el.style?.color || undefined;
              const isBold = el.style?.fontWeight === 'bold' || el.querySelector('b, strong') !== null;
              const rowSpan = el.rowSpan && el.rowSpan > 1 ? el.rowSpan : undefined;
              const colSpan = el.colSpan && el.colSpan > 1 ? el.colSpan : undefined;

              const rSpanCount = rowSpan || 1;
              const cSpanCount = colSpan || 1;

              // Place master cell at (rIdx, colIdx) - Clean default, no aggressive auto-badges
              grid[rIdx][colIdx] = {
                id: `c-${rIdx}-${colIdx}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                value: val,
                align: (isNum ? 'right' : isPct ? 'center' : 'left') as CellAlign,
                badgeColor: 'none',
                bgColor: bg,
                textColor: fg,
                isBold,
                rowSpan,
                colSpan,
                isSpannedChild: false,
              };

              // Mark covered slots in current and subsequent rows
              for (let r = 0; r < rSpanCount; r++) {
                for (let c = 0; c < cSpanCount; c++) {
                  if (r !== 0 || c !== 0) {
                    const targetR = rIdx + r;
                    const targetC = colIdx + c;
                    if (targetR < numRows) {
                      grid[targetR][targetC] = {
                        id: `spanned-${targetR}-${targetC}-${Date.now()}`,
                        value: '',
                        isSpannedChild: true,
                      };
                    }
                  }
                }
              }

              colIdx += cSpanCount;
            });
          });

          // Pad all grid rows to maxCols with valid empty cells
          const totalCols = Math.max(maxCols, rawHeaders.length);
          for (let r = 0; r < numRows; r++) {
            for (let c = 0; c < totalCols; c++) {
              if (grid[r][c] === undefined || grid[r][c] === null) {
                grid[r][c] = {
                  id: `empty-${r}-${c}-${Date.now()}`,
                  value: '',
                  align: 'left',
                  badgeColor: 'none',
                  isSpannedChild: false,
                };
              }
            }
          }

          const rows: TableRow[] = [];
          grid.forEach((rowCells, rIdx) => {
            const cleanCells: TableCell[] = rowCells.filter((c): c is TableCell => c !== null && c !== undefined);
            if (cleanCells.length > 0) {
              rows.push({
                id: `row-${rIdx}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                cells: cleanCells,
              });
            }
          });

          // Ensure headers match totalCols exactly
          const safeHeaders: string[] = [];
          for (let i = 0; i < totalCols; i++) {
            safeHeaders.push(rawHeaders[i] || `Columna ${i + 1}`);
          }

          if (rows.length > 0) {
            return {
              title: detectedTitle,
              subtitle: 'Estructurada con la Guía de Identidad ACH',
              headers: safeHeaders,
              headerBgColors: safeHeaders.map((_, i) => headerBgColors[i] || '#005FB6'),
              rows,
              suggestedChartType: 'bar',
              chartLabelCol: 0,
              chartValueCols: [1],
              notes: 'Datos pegados desde portapapeles Office',
              source: 'Acción contra el Hambre',
              highlightStyle: 'clean-none',
            };
          }
        }
      } catch (err) {
        console.warn('HTML table parsing fallback:', err);
      }
    }

    // 2. Try TSV (Tab-separated values from Excel / Word table copy)
    if (text && (text.includes('\t') || text.includes('\n'))) {
      const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : lines[0].includes(',') ? ',' : null;
        if (delimiter) {
          const rawLines = lines.map((l) => l.split(delimiter).map((c) => c.trim()));
          const maxCols = Math.max(...rawLines.map((r) => r.length), 1);

          let detectedTitle = 'Tabla de Datos Humanitarios';
          let headerRowIndex = 0;
          let dataRowStartIndex = 1;

          // If line 0 has only 1 element and subsequent lines have more, line 0 is a title!
          if (rawLines.length > 1 && rawLines[0].length === 1 && maxCols > 1) {
            detectedTitle = rawLines[0][0];
            headerRowIndex = 1;
            dataRowStartIndex = 2;
          }

          const rawHeaders = rawLines[headerRowIndex] || [];
          const safeHeaders: string[] = [];
          for (let i = 0; i < maxCols; i++) {
            safeHeaders.push(rawHeaders[i] || `Columna ${i + 1}`);
          }

          const dataLines = rawLines.slice(dataRowStartIndex);
          const rows: TableRow[] = dataLines.map((values, rIdx) => {
            const cells: TableCell[] = safeHeaders.map((_, cIdx) => {
              const val = values[cIdx]?.trim() || '';
              const isNum = !isNaN(Number(val.replace(/[^0-9.-]+/g, ''))) && val.length > 0 && !val.includes('/');
              const isPct = val.endsWith('%');

              return {
                id: `cell-${rIdx}-${cIdx}-${Date.now()}`,
                value: val,
                align: (isNum ? 'right' : isPct ? 'center' : 'left') as CellAlign,
                badgeColor: 'none',
              };
            });
            return {
              id: `row-${rIdx}-${Date.now()}`,
              cells,
            };
          });

          return {
            title: detectedTitle,
            subtitle: 'Importada desde Texto Tabulado Office / Excel',
            headers: safeHeaders,
            headerBgColors: safeHeaders.map(() => '#005FB6'),
            rows: rows.length > 0 ? rows : [{
              id: 'row-0',
              cells: safeHeaders.map((h, i) => ({ id: `c-${i}`, value: h, align: 'left', badgeColor: 'none' }))
            }],
            suggestedChartType: 'bar',
            chartLabelCol: 0,
            chartValueCols: [1],
            notes: 'Fuente: Datos importados ACH',
            highlightStyle: 'clean-none',
          };
        }
      }
    }

    return null;
  };

  // Universal Paste Event Handler (Captures Image, HTML table or TSV text)
  const handlePaste = (e: React.ClipboardEvent<any>) => {
    setErrorMessage(null);
    setIs503Error(false);
    const clipboardData = e.clipboardData;

    // 1. Check for Image (Screenshots / Capturas de pantalla)
    let foundImage = false;
    if (clipboardData.items) {
      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            foundImage = true;
            processImageFile(blob);
            setInputTab('image');
            break;
          }
        }
      }
    }

    if (foundImage) return;

    // 2. Check for Table HTML & Text
    const htmlData = clipboardData.getData('text/html');
    const textData = clipboardData.getData('text/plain');

    if (htmlData) setPastedHtml(htmlData);
    if (textData) setPastedText(textData);

    // Try parsing as actual table right away
    const parsed = parseClipboardContent(htmlData, textData);
    if (parsed) {
      setDetectedTable(parsed);
      setInputTab('table');
    } else if (textData) {
      setInputTab('text');
    }
  };

  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      setPastedImageBase64(result);
      setPastedImageMime(file.type || 'image/png');
      setInputTab('image');
      setErrorMessage(null);
      setIs503Error(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    setErrorMessage(null);
    setIs503Error(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        processImageFile(file);
      } else {
        const reader = new FileReader();
        reader.onload = (txtEvent) => {
          const content = txtEvent.target?.result as string;
          setPastedText(content);
          const parsed = parseClipboardContent('', content);
          if (parsed) {
            setDetectedTable(parsed);
            setInputTab('table');
          } else {
            setInputTab('text');
          }
        };
        reader.readAsText(file);
      }
    }
  };

  // Direct load of the detected table into the main TableEditor
  const handleApplyDetectedTable = () => {
    if (detectedTable) {
      onTableGenerated(detectedTable);
      clearAll();
    } else {
      // Try parsing current text/html
      const parsed = parseClipboardContent(pastedHtml, pastedText);
      if (parsed) {
        onTableGenerated(parsed);
        clearAll();
      } else {
        setErrorMessage('No se encontró una tabla válida. Intenta estructurar con Gemini AI.');
      }
    }
  };

  // Call Gemini Multimodal API via server endpoint
  const handleProcessWithGemini = async () => {
    if (!pastedText.trim() && !pastedImageBase64 && !detectedTable) {
      setErrorMessage('Por favor pega una tabla, texto o captura de pantalla antes de procesar con Gemini.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setIs503Error(false);

    // If we have a detected table, serialize it for AI refinement if no raw text
    const textToSend = pastedText || (detectedTable ? JSON.stringify(detectedTable) : '');

    try {
      const response = await fetch('/api/extract-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSend,
          imageBase64: pastedImageBase64,
          imageMime: pastedImageMime,
          customInstructions: customPrompt,
          tableTypeHint: tableTypeHint !== 'auto' ? tableTypeHint : undefined,
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        if (response.status === 503 || resData.is503) {
          setIs503Error(true);
        }
        throw new Error(resData.error || 'Error al comunicarse con Gemini AI');
      }

      const extracted = resData.data || {};

      const rawRows = Array.isArray(extracted.rows) ? extracted.rows : [];
      const safeHeaders: string[] = Array.isArray(extracted.headers) && extracted.headers.length > 0
        ? extracted.headers
        : ['Categoría', 'Indicador', 'Valor'];

      const formattedRows = rawRows.map((rowArr: any, rIdx: number) => {
        const cellsArr = Array.isArray(rowArr) ? rowArr : [rowArr];
        return {
          id: `gemini-row-${rIdx}-${Date.now()}-${rIdx}`,
          cells: cellsArr.map((cellObj: any, cIdx: number) => {
            const rowSpan = typeof cellObj === 'object' && cellObj?.rowSpan && Number(cellObj.rowSpan) > 1 ? Number(cellObj.rowSpan) : undefined;
            const colSpan = typeof cellObj === 'object' && cellObj?.colSpan && Number(cellObj.colSpan) > 1 ? Number(cellObj.colSpan) : undefined;
            return {
              id: `gemini-c-${rIdx}-${cIdx}-${Date.now()}`,
              value: typeof cellObj === 'object' && cellObj !== null ? String(cellObj.value ?? '') : String(cellObj ?? ''),
              align: (typeof cellObj === 'object' && cellObj !== null ? cellObj.align : 'left') as CellAlign,
              badgeColor: (typeof cellObj === 'object' && cellObj !== null ? cellObj.badgeColor : 'none') as BadgeColor,
              isBold: typeof cellObj === 'object' && cellObj !== null ? Boolean(cellObj.isBold) : false,
              rowSpan,
              colSpan,
            };
          }),
        };
      });

      const newTableData: TableData = {
        title: extracted.title || 'Reporte Humanitario ACH',
        subtitle: extracted.subtitle || 'Consolidado de Indicadores y Criterios Oficiales',
        headers: safeHeaders,
        headerBgColors: Array.isArray(extracted.headerBgColors) ? extracted.headerBgColors : safeHeaders.map(() => '#005FB6'),
        rows: formattedRows,
        notes: extracted.notes || '',
        source: extracted.source || 'Análisis Multimodal Gemini AI - Formato Acción contra el Hambre',
        suggestedChartType: extracted.suggestedChartType || 'bar',
        chartLabelCol: extracted.chartLabelColumnIndex ?? 0,
        chartValueCols: [extracted.chartValueColumnIndex ?? 1],
      };

      onTableGenerated(newTableData);
      clearAll();
    } catch (err: any) {
      console.warn('Gemini extraction issue:', err);
      // If we already have a parsed table, offer instant client-side fallback
      if (detectedTable) {
        setErrorMessage('La IA experimenta una demora temporal. Puedes hacer clic en "Usar Tabla Pegada Directa" abajo para continuar sin interrupciones.');
      } else {
        setErrorMessage(err.message || 'No se pudo estructurar con Gemini. Puedes reintentar o pegar directamente desde Excel/Word.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearAll = () => {
    setPastedText('');
    setPastedImageBase64(null);
    setPastedHtml('');
    setDetectedTable(null);
    setCustomPrompt('');
    setErrorMessage(null);
    setIs503Error(false);
  };

  const loadSample = (sampleType: 'san' | 'geo' | 'budget') => {
    if (sampleType === 'san') {
      const text = `Región\tPoblación\tEstado SAN\tPrevalencia Desnutrición Aguda (%)\nGuajira Alta\t12,400\tAlerta Severa (Fase 4)\t16.4%\nCatatumbo\t8,500\tModerado (Fase 3)\t9.8%\nPacífico Sur\t15,200\tCrítico (Fase 4)\t18.1%\nArauca\t7,100\tEstable (Fase 1)\t5.2%`;
      setPastedText(text);
      const parsed = parseClipboardContent('', text);
      if (parsed) {
        setDetectedTable(parsed);
        setInputTab('table');
      }
    } else if (sampleType === 'geo') {
      const text = `País\tDepartamento\tMunicipio\tMeta Beneficiarios\tAlcanzados (%)\nGuatemala\tChiquimula\tJocotán\t3,500\t103%\nGuatemala\tChiquimula\tCamotán\t2,900\t78%\nHonduras\tSanta Bárbara\tQuimistán\t4,200\t95%\nHonduras\tEl Paraíso\tDanlí\t3,100\t91%`;
      setPastedText(text);
      const parsed = parseClipboardContent('', text);
      if (parsed) {
        setDetectedTable(parsed);
        setInputTab('table');
      }
    } else {
      const text = `Sector Humanitario\tPresupuesto Asignado EUR\tGasto Ejecutado EUR\t% Avance\tDonante Principal\nSeguridad Alimentaria\t1,850,000 €\t1,620,000 €\t87.5%\tECHO / Unión Europea\nWASH y Agua Segura\t1,200,000 €\t1,110,000 €\t92.5%\tUSAID / BHA\nNutrición y Salud\t950,000 €\t890,000 €\t93.6%\tRHPF LAC Fondo Humanitario\nProtección y Género\t420,000 €\t310,000 €\t73.8%\tFondos Propios ACH`;
      setPastedText(text);
      const parsed = parseClipboardContent('', text);
      if (parsed) {
        setDetectedTable(parsed);
        setInputTab('table');
      }
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 shadow-xl mb-6">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-700/60 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#005FB6]/20 border border-[#005FB6]/40 flex items-center justify-center text-[#005FB6]">
            <Sparkles className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 font-futura">
              Zona de Entrada Inteligente (Pegado Word/Excel & Capturas con IA)
            </h2>
            <p className="text-xs text-slate-300 font-roboto">
              Pega directamente una tabla desde Word o Excel y visualízala al instante como tabla real, o sube una captura de pantalla.
            </p>
          </div>
        </div>

        {/* Quick sample pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 mr-1">Cargar muestra:</span>
          <button
            onClick={() => loadSample('san')}
            className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            Fases SAN
          </button>
          <button
            onClick={() => loadSample('geo')}
            className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            Geográfico
          </button>
          <button
            onClick={() => loadSample('budget')}
            className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            Presupuesto
          </button>
        </div>
      </div>

      {/* Main Work Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Interactive Dropzone & Table Preview */}
        <div className="lg:col-span-8 flex flex-col gap-2">
          {/* Mode Switch Tabs */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setInputTab('table')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                  inputTab === 'table'
                    ? 'bg-[#005FB6] text-white shadow'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Vista Tabla Word / Excel</span>
                {detectedTable && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-900 text-[10px] font-black">
                    ✓
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setInputTab('text')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                  inputTab === 'text'
                    ? 'bg-slate-700 text-white shadow'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <span>Texto / TSV</span>
              </button>

              {pastedImageBase64 && (
                <button
                  type="button"
                  onClick={() => setInputTab('image')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                    inputTab === 'image'
                      ? 'bg-[#52AE32] text-white shadow'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Captura de Imagen</span>
                </button>
              )}
            </div>

            {(detectedTable || pastedText || pastedImageBase64) && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Limpiar
              </button>
            )}
          </div>

          {/* TAB 1: VISUAL TABLE PREVIEW (Directly shows the real table as in Word or Excel!) */}
          {inputTab === 'table' && (
            <div
              ref={richDropzoneRef}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onPaste={handlePaste}
              tabIndex={0}
              className={`relative rounded-xl border p-3 min-h-[170px] max-h-[280px] overflow-auto transition-all focus:outline-none focus:ring-2 focus:ring-[#005FB6] ${
                isDragOver ? 'dropzone-active border-[#52AE32]' : 'border-slate-700/80 bg-slate-950/60'
              }`}
            >
              {detectedTable && detectedTable.rows.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800">
                    <span className="font-semibold text-emerald-400 flex items-center gap-1">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Tabla estructurada ({detectedTable.headers.length} columnas × {detectedTable.rows.length} filas)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Haz clic en cualquier celda para editar antes de transferir
                    </span>
                  </div>

                  {/* Rendered HTML Table Grid with ACH official style */}
                  <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white text-slate-900 text-xs shadow-sm">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[#005FB6] text-white font-futura">
                          {detectedTable.headers.map((h, i) => (
                            <th
                              key={`det-h-${i}`}
                              className="px-2.5 py-1.5 text-left border border-slate-400 font-bold"
                            >
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                  const newH = [...detectedTable.headers];
                                  newH[i] = e.currentTarget.innerText;
                                  setDetectedTable({ ...detectedTable, headers: newH });
                                }}
                                className="outline-none"
                              >
                                {h}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {detectedTable.rows.slice(0, 10).map((row, rIdx) => (
                          <tr key={`det-r-${rIdx}`} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            {row.cells.map((cell, cIdx) => {
                              if (cell.isSpannedChild) return null;
                              return (
                                <td
                                  key={`det-c-${rIdx}-${cIdx}`}
                                  rowSpan={cell.rowSpan}
                                  colSpan={cell.colSpan}
                                className="px-2.5 py-1.5 border border-slate-300 font-roboto"
                                style={{
                                  textAlign: cell.align || 'left',
                                  backgroundColor: cell.bgColor || undefined,
                                  color: cell.textColor || undefined,
                                  fontWeight: cell.isBold ? 'bold' : 'normal',
                                }}
                              >
                                <div
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => {
                                    const newRows = [...detectedTable.rows];
                                    if (newRows[rIdx]?.cells[cIdx]) {
                                      newRows[rIdx].cells[cIdx].value = e.currentTarget.innerText;
                                      setDetectedTable({ ...detectedTable, rows: newRows });
                                    }
                                  }}
                                  className="outline-none"
                                >
                                  {cell.value}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      </tbody>
                    </table>
                    {detectedTable.rows.length > 10 && (
                      <div className="p-1.5 text-center text-[10px] text-slate-500 bg-slate-100 border-t border-slate-200">
                        Mostrando las primeras 10 filas ({detectedTable.rows.length} en total)
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 select-none">
                  <div className="w-12 h-12 rounded-2xl bg-[#005FB6]/10 border border-[#005FB6]/30 flex items-center justify-center text-[#005FB6] mb-2.5">
                    <ClipboardPaste className="w-6 h-6 text-sky-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-200 font-futura">
                    Haz clic aquí y presiona Ctrl+V (o Cmd+V)
                  </p>
                  <p className="text-xs text-slate-400 max-w-md mt-1">
                    Copia cualquier tabla desde Microsoft Word, Excel o Google Sheets. Aquí se mostrará inmediatamente con sus filas y columnas como una tabla real.
                  </p>
                  <span className="text-[11px] text-[#52AE32] font-semibold mt-2">
                    También puedes pegar capturas de pantalla o arrastrar archivos.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PLAIN TEXT / TSV */}
          {inputTab === 'text' && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className="relative rounded-xl border border-slate-700/80 bg-slate-950/60"
            >
              <textarea
                value={pastedText}
                onChange={(e) => {
                  const val = e.target.value;
                  setPastedText(val);
                  const parsed = parseClipboardContent('', val);
                  if (parsed) setDetectedTable(parsed);
                }}
                onPaste={handlePaste}
                placeholder="Pega aquí texto tabulado, TSV o CSV..."
                className="w-full min-h-[170px] max-h-[280px] p-3.5 rounded-xl border-none bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#005FB6] resize-y font-mono"
              />
            </div>
          )}

          {/* TAB 3: IMAGE CAPTURE PREVIEW */}
          {inputTab === 'image' && pastedImageBase64 && (
            <div className="relative rounded-xl border border-slate-700 bg-black/40 p-3 flex flex-col items-center">
              <img
                src={pastedImageBase64}
                alt="Captura de tabla"
                className="max-h-[220px] w-auto object-contain rounded-lg border border-slate-700"
              />
              <div className="w-full flex items-center justify-between mt-2 pt-2 border-t border-slate-800 text-xs text-slate-400">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Captura lista para análisis con Gemini Vision
                </span>
                <button
                  type="button"
                  onClick={() => setPastedImageBase64(null)}
                  className="text-red-400 hover:text-red-300 text-[11px]"
                >
                  Quitar captura
                </button>
              </div>
            </div>
          )}

          {/* Bottom helper bar */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.csv,.txt,.tsv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    processImageFile(e.target.files[0]);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-slate-300 hover:text-white transition text-[11px]"
              >
                <Upload className="w-3.5 h-3.5 text-[#EE7203]" />
                <span>Cargar imagen o archivo</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="text-[11px] text-[#005FB6] hover:underline flex items-center gap-1 font-semibold"
            >
              <SlidersHorizontal className="w-3 h-3" />
              {showOptions ? 'Ocultar ajustes avanzados ▲' : 'Ajustes de Clasificación ACH ▼'}
            </button>
          </div>

          {/* Collapsible custom classification / instructions */}
          {showOptions && (
            <div className="mt-1 p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col gap-2.5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <label className="text-[11px] font-bold text-slate-200">
                  Tipo de Tabla según Guía de Identidad ACH:
                </label>
                <select
                  value={tableTypeHint}
                  onChange={(e) => setTableTypeHint(e.target.value)}
                  className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-[#005FB6]"
                >
                  <option value="auto">🤖 Detección Automática por IA (Recomendado)</option>
                  <option value="Matriz de Severidad SAN / CARI">🌾 1. Matriz de Severidad SAN / CARI (Fases IPC)</option>
                  <option value="Desglose Territorial">🗺️ 2. Desglose Territorial y Geográfico</option>
                  <option value="Monitoreo de Indicadores">📈 3. Monitoreo de Indicadores y Avance (%)</option>
                  <option value="Presupuesto y Ejecución">💰 4. Presupuesto y Fondos por Donante</option>
                  <option value="Cronograma de Actividades">📅 5. Cronograma de Actividades</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Instrucciones extra para Gemini (Opcional):
                </label>
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="ej: 'Clasificar severidad en verde/naranja/rojo', 'Separar niños y adultos', 'Identificar municipios de Chiquimula'..."
                  className="w-full text-xs bg-slate-900/90 border border-slate-700 rounded-md px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#005FB6]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions, Processing & IA Execution */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-3 bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/70">
          <div>
            <span className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5 uppercase tracking-wider font-futura">
              <Sparkles className="w-3.5 h-3.5 text-[#52AE32]" />
              Acciones de Integración ACH
            </span>

            {/* Content summary box */}
            <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800 text-xs mb-3 space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span>Estado:</span>
                {detectedTable ? (
                  <span className="text-emerald-400 font-bold">Tabla Office Lista ✓</span>
                ) : pastedImageBase64 ? (
                  <span className="text-sky-400 font-bold">Captura Cargada ✓</span>
                ) : pastedText ? (
                  <span className="text-amber-400 font-bold">Texto Detectado</span>
                ) : (
                  <span className="text-slate-500">Esperando datos</span>
                )}
              </div>

              {pastedImageBase64 && (
                <div className="text-[11px] text-slate-300">
                  <span className="font-semibold text-sky-400">Captura de pantalla:</span> Gemini Vision analizará las filas, columnas y semáforos para adaptarlos a la guía ACH.
                </div>
              )}

              {detectedTable && (
                <div className="text-[11px] text-slate-300">
                  <span className="font-semibold text-emerald-400">Word/Excel:</span> Estructura capturada con {detectedTable.headers.length} columnas y {detectedTable.rows.length} filas.
                </div>
              )}
            </div>
          </div>

          {/* Action Execution Buttons */}
          <div className="space-y-2">
            {/* Primary Action 1: Direct Office Load (Zero wait, 100% reliable) */}
            {detectedTable && (
              <button
                type="button"
                onClick={handleApplyDetectedTable}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#52AE32] to-[#3E8C22] hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Usar Tabla Pegada Directa (Sin IA)</span>
              </button>
            )}

            {/* Primary Action 2: Process or Refine with Gemini AI */}
            <button
              type="button"
              onClick={handleProcessWithGemini}
              disabled={isLoading || (!pastedText && !pastedImageBase64 && !detectedTable)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#005FB6] via-[#004A8F] to-[#52AE32] hover:opacity-95 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-[#005FB6]/20 transition"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Identificando y adaptando con IA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>
                    {pastedImageBase64
                      ? 'Estructurar Captura con Gemini Vision'
                      : detectedTable
                      ? 'Refinar con IA (Semáforos y Guía ACH)'
                      : 'Estructurar Datos con Gemini AI'}
                  </span>
                </>
              )}
            </button>

            {/* Fallback direct parser button if not yet detected */}
            {!detectedTable && pastedText && (
              <button
                type="button"
                onClick={handleApplyDetectedTable}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold border border-slate-600 transition"
              >
                <span>Convertir Texto a Tabla ACH Directamente</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error notification banner with Retry button */}
      {errorMessage && (
        <div className="mt-3 p-3 rounded-xl bg-red-950/70 border border-red-500/60 text-red-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-start gap-2">
            <X className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <div>
              <span className="font-bold text-red-300 block">
                {is503Error ? 'Demanda Temporal en el Servicio de IA (503)' : 'Aviso al procesar datos'}
              </span>
              <span>{errorMessage}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleProcessWithGemini}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Reintentar con IA</span>
            </button>

            {detectedTable && (
              <button
                type="button"
                onClick={handleApplyDetectedTable}
                className="px-3 py-1.5 rounded-lg bg-[#52AE32] hover:bg-[#3E8C22] text-white font-bold text-xs transition"
              >
                Cargar Tabla Directa
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
