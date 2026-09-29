import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  BarChart2,
  Table as TableIcon,
  BarChart3,
  ArrowRight,
  Copy,
  Check,
  FileSpreadsheet,
  Paintbrush,
  Bold,
  ArrowDownToLine,
  ArrowRightToLine,
  Split,
  Pencil,
  Layers,
  Sparkles,
  Undo2,
  Sliders,
} from 'lucide-react';
import { TableData, TableRow, TableCell, BadgeColor, CellAlign } from '../types/table';
import { copyTableToWordClipboard, copyTableToExcelClipboard, SEVERITY_PALETTE } from '../utils/exportWord';

interface TableEditorProps {
  tableData: TableData;
  onChange: (updated: TableData) => void;
  onNavigateToCharts?: () => void;
}

export const TableEditor: React.FC<TableEditorProps> = ({ tableData, onChange, onNavigateToCharts }) => {
  const [activeCell, setActiveCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);
  const [showColorMenu, setShowColorMenu] = useState<boolean>(false);
  const [copiedWord, setCopiedWord] = useState<boolean>(false);
  const [copiedExcel, setCopiedExcel] = useState<boolean>(false);
  const [showPresetMenu, setShowPresetMenu] = useState<boolean>(false);
  const [showHighlightStyleMenu, setShowHighlightStyleMenu] = useState<boolean>(false);

  // Interactive Merge Tool states (Requested by user)
  const [isMergeToolActive, setIsMergeToolActive] = useState<boolean>(false);
  const [selectedCellKeys, setSelectedCellKeys] = useState<Set<string>>(new Set());
  const [mergeFeedback, setMergeFeedback] = useState<string | null>(null);
  const [anchorCell, setAnchorCell] = useState<{ r: number; c: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ r: number; c: number } | null>(null);

  // Global mouseup listener for drag-selection
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Update title / subtitle / notes
  const updateField = (field: keyof TableData, value: string) => {
    onChange({
      ...tableData,
      [field]: value,
    });
  };

  // Update header text
  const updateHeader = (colIndex: number, value: string) => {
    const newHeaders = [...tableData.headers];
    newHeaders[colIndex] = value;
    onChange({
      ...tableData,
      headers: newHeaders,
    });
  };

  // Update header background color
  const updateHeaderBgColor = (colIndex: number, color: string) => {
    const currentColors = [...(tableData.headerBgColors || tableData.headers.map(() => '#005FB6'))];
    currentColors[colIndex] = color;
    onChange({
      ...tableData,
      headerBgColors: currentColors,
    });
  };

  // Update cell value
  const updateCell = (rowIndex: number, colIndex: number, newProps: Partial<TableCell>) => {
    const newRows = tableData.rows.map((row, rIdx) => {
      if (rIdx !== rowIndex) return row;
      const newCells = row.cells.map((cell, cIdx) => {
        if (cIdx !== colIndex) return cell;
        return {
          ...cell,
          ...newProps,
        };
      });
      return { ...row, cells: newCells };
    });

    onChange({
      ...tableData,
      rows: newRows,
    });
  };

  // Add Row
  const addRow = () => {
    const colCount = tableData.headers.length || 3;
    const newCells: TableCell[] = Array.from({ length: colCount }).map((_, cIdx) => ({
      id: `c-new-${Date.now()}-${cIdx}`,
      value: `Dato ${cIdx + 1}`,
      align: 'left',
      badgeColor: 'none',
    }));

    onChange({
      ...tableData,
      rows: [
        ...tableData.rows,
        {
          id: `row-new-${Date.now()}`,
          cells: newCells,
        },
      ],
    });
  };

  // Add Column
  const addColumn = () => {
    const newColIndex = tableData.headers.length + 1;
    const newHeaders = [...tableData.headers, `Columna ${newColIndex}`];
    const newRows = tableData.rows.map((row) => ({
      ...row,
      cells: [
        ...row.cells,
        {
          id: `c-${Date.now()}-${Math.random()}`,
          value: '-',
          align: 'left' as CellAlign,
          badgeColor: 'none' as BadgeColor,
        },
      ],
    }));

    onChange({
      ...tableData,
      headers: newHeaders,
      rows: newRows,
    });
  };

  // Remove Row
  const removeRow = (rowIndex: number) => {
    if (tableData.rows.length <= 1) return;
    onChange({
      ...tableData,
      rows: tableData.rows.filter((_, idx) => idx !== rowIndex),
    });
    if (activeCell?.rowIndex === rowIndex) {
      setActiveCell(null);
    }
  };

  // Move Row
  const moveRow = (rowIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? rowIndex - 1 : rowIndex + 1;
    if (targetIndex < 0 || targetIndex >= tableData.rows.length) return;

    const newRows = [...tableData.rows];
    const temp = newRows[rowIndex];
    newRows[rowIndex] = newRows[targetIndex];
    newRows[targetIndex] = temp;

    onChange({
      ...tableData,
      rows: newRows,
    });
  };

  // Remove Column
  const removeColumn = (colIndex: number) => {
    if (tableData.headers.length <= 1) return;
    const newHeaders = tableData.headers.filter((_, idx) => idx !== colIndex);
    const newRows = tableData.rows.map((row) => ({
      ...row,
      cells: row.cells.filter((_, idx) => idx !== colIndex),
    }));

    onChange({
      ...tableData,
      headers: newHeaders,
      rows: newRows,
    });
    if (activeCell?.colIndex === colIndex) {
      setActiveCell(null);
    }
  };

  // Set Alignment of column
  const setColumnAlign = (colIndex: number, align: CellAlign) => {
    const newRows = tableData.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell, cIdx) => (cIdx === colIndex ? { ...cell, align } : cell)),
    }));
    onChange({
      ...tableData,
      rows: newRows,
    });
  };

  // Cell formatting helpers
  const currentSelectedCell =
    activeCell !== null ? tableData.rows[activeCell.rowIndex]?.cells[activeCell.colIndex] : null;

  const setBadgeColor = (color: BadgeColor) => {
    if (!activeCell) return;
    updateCell(activeCell.rowIndex, activeCell.colIndex, { badgeColor: color });
    setShowColorMenu(false);
  };

  const setCellCustomBg = (bgColor: string, textColor: string = '#000000') => {
    if (!activeCell) return;
    updateCell(activeCell.rowIndex, activeCell.colIndex, {
      bgColor: bgColor || undefined,
      textColor: textColor || undefined,
    });
    setShowColorMenu(false);
  };

  const toggleBold = () => {
    if (!activeCell || !currentSelectedCell) return;
    updateCell(activeCell.rowIndex, activeCell.colIndex, {
      isBold: !currentSelectedCell.isBold,
    });
  };

  const toggleProgressBar = () => {
    if (!activeCell || !currentSelectedCell) return;
    const isProg = !currentSelectedCell.isProgressBar;
    const parsedPercent = parseInt(currentSelectedCell.value.replace(/[^0-9]/g, '')) || 65;
    updateCell(activeCell.rowIndex, activeCell.colIndex, {
      isProgressBar: isProg,
      progressPercent: isProg ? Math.min(100, Math.max(0, parsedPercent)) : undefined,
    });
  };

  // --- EXCEL-LIKE SELECTION & INTERACTIVE MERGE TOOL ---
  const getColLetter = (idx: number): string => {
    let letter = '';
    let n = idx;
    while (n >= 0) {
      letter = String.fromCharCode((n % 26) + 65) + letter;
      n = Math.floor(n / 26) - 1;
    }
    return letter;
  };

  const getCoordinateLabel = (): string => {
    if (selectedCellKeys.size > 1) {
      const coords = Array.from(selectedCellKeys).map((k) => {
        const [r, c] = k.split(',').map(Number);
        return { r, c };
      });
      const minR = Math.min(...coords.map((p) => p.r));
      const maxR = Math.max(...coords.map((p) => p.r));
      const minC = Math.min(...coords.map((p) => p.c));
      const maxC = Math.max(...coords.map((p) => p.c));
      return `${getColLetter(minC)}${minR + 1}:${getColLetter(maxC)}${maxR + 1} (${selectedCellKeys.size} celdas)`;
    }
    if (activeCell) {
      return `${getColLetter(activeCell.colIndex)}${activeCell.rowIndex + 1}`;
    }
    return 'A1';
  };

  const toggleMergeTool = () => {
    const nextState = !isMergeToolActive;
    setIsMergeToolActive(nextState);
    if (!nextState) {
      setSelectedCellKeys(new Set());
      setAnchorCell(null);
    } else {
      if (activeCell) {
        setSelectedCellKeys(new Set([`${activeCell.rowIndex},${activeCell.colIndex}`]));
        setAnchorCell({ r: activeCell.rowIndex, c: activeCell.colIndex });
      }
    }
  };

  const clearMergeSelection = () => {
    setSelectedCellKeys(new Set());
    setAnchorCell(null);
    setIsDragging(false);
    setDragStart(null);
  };

  const selectEntireColumn = (colIdx: number) => {
    const newSet = new Set<string>();
    tableData.rows.forEach((_, rIdx) => {
      newSet.add(`${rIdx},${colIdx}`);
    });
    setSelectedCellKeys(newSet);
    setActiveCell({ rowIndex: 0, colIndex: colIdx });
    setAnchorCell({ r: 0, c: colIdx });
  };

  const selectEntireRow = (rowIdx: number) => {
    const newSet = new Set<string>();
    tableData.headers.forEach((_, cIdx) => {
      newSet.add(`${rowIdx},${cIdx}`);
    });
    setSelectedCellKeys(newSet);
    setActiveCell({ rowIndex: rowIdx, colIndex: 0 });
    setAnchorCell({ r: rowIdx, c: 0 });
  };

  const selectAllCells = () => {
    const newSet = new Set<string>();
    tableData.rows.forEach((_, rIdx) => {
      tableData.headers.forEach((_, cIdx) => {
        newSet.add(`${rIdx},${cIdx}`);
      });
    });
    setSelectedCellKeys(newSet);
    setActiveCell({ rowIndex: 0, colIndex: 0 });
    setAnchorCell({ r: 0, c: 0 });
  };

  // Mouse drag selection like Excel (supports empty cells!)
  const handleCellMouseDown = (rIdx: number, cIdx: number, e: React.MouseEvent) => {
    if (e.button !== 0) return; // left click only
    setActiveCell({ rowIndex: rIdx, colIndex: cIdx });

    if (isMergeToolActive) {
      handleCellClickForMerge(rIdx, cIdx, e);
      return;
    }

    setIsDragging(true);
    setDragStart({ r: rIdx, c: cIdx });

    if (e.shiftKey && anchorCell) {
      // Shift range selection
      const minR = Math.min(anchorCell.r, rIdx);
      const maxR = Math.max(anchorCell.r, rIdx);
      const minC = Math.min(anchorCell.c, cIdx);
      const maxC = Math.max(anchorCell.c, cIdx);

      const newSet = new Set<string>();
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          newSet.add(`${r},${c}`);
        }
      }
      setSelectedCellKeys(newSet);
    } else {
      setAnchorCell({ r: rIdx, c: cIdx });
      setSelectedCellKeys(new Set([`${rIdx},${cIdx}`]));
    }
  };

  const handleCellMouseEnter = (rIdx: number, cIdx: number) => {
    if (!isDragging || !dragStart || isMergeToolActive) return;
    const minR = Math.min(dragStart.r, rIdx);
    const maxR = Math.max(dragStart.r, rIdx);
    const minC = Math.min(dragStart.c, cIdx);
    const maxC = Math.max(dragStart.c, cIdx);

    const newSet = new Set<string>();
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        newSet.add(`${r},${c}`);
      }
    }
    setSelectedCellKeys(newSet);
  };

  // Page margin fit mode: 'a4-page' (100% Word printable margins) or 'excel-grid' (wide spreadsheet)
  const [pageFitMode, setPageFitMode] = useState<'a4-page' | 'excel-grid'>('a4-page');

  // Handle cell click in merge mode (supports empty cells and range selection)
  const handleCellClickForMerge = (rIdx: number, cIdx: number, e: React.MouseEvent) => {
    const key = `${rIdx},${cIdx}`;
    if (e.shiftKey && anchorCell) {
      // Shift range selection
      const minR = Math.min(anchorCell.r, rIdx);
      const maxR = Math.max(anchorCell.r, rIdx);
      const minC = Math.min(anchorCell.c, cIdx);
      const maxC = Math.max(anchorCell.c, cIdx);

      const newSet = new Set<string>();
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          newSet.add(`${r},${c}`);
        }
      }
      setSelectedCellKeys(newSet);
    } else {
      // Toggle cell selection (works on any cell, empty or filled)
      const next = new Set(selectedCellKeys);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      setSelectedCellKeys(next);
      setAnchorCell({ r: rIdx, c: cIdx });
    }
    setActiveCell({ rowIndex: rIdx, colIndex: cIdx });
  };

  const clearAllHighlights = () => {
    const newRows = tableData.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => ({
        ...cell,
        badgeColor: 'none' as BadgeColor,
        bgColor: undefined,
        textColor: undefined,
      })),
    }));
    onChange({
      ...tableData,
      rows: newRows,
      highlightStyle: 'clean-none',
    });
    setMergeFeedback('Se han limpiado todos los resaltados de color.');
    setTimeout(() => setMergeFeedback(null), 3000);
  };

  const setHighlightStyle = (style: 'full-cell' | 'colored-text' | 'soft-pastel' | 'badge-pill' | 'clean-none') => {
    onChange({
      ...tableData,
      highlightStyle: style,
    });
    setShowHighlightStyleMenu(false);
  };

  const executeMergeSelection = () => {
    if (selectedCellKeys.size < 2) return;

    const coords = Array.from(selectedCellKeys).map((k) => {
      const [r, c] = k.split(',').map(Number);
      return { r, c };
    });

    const minRow = Math.min(...coords.map((p) => p.r));
    const maxRow = Math.max(...coords.map((p) => p.r));
    const minCol = Math.min(...coords.map((p) => p.c));
    const maxCol = Math.max(...coords.map((p) => p.c));

    const rowSpan = maxRow - minRow + 1;
    const colSpan = maxCol - minCol + 1;

    // Collect non-empty text from cells being merged
    const textPieces: string[] = [];

    const newRows = tableData.rows.map((row, rIdx) => {
      return {
        ...row,
        cells: row.cells.map((cell, cIdx) => {
          const inRect = rIdx >= minRow && rIdx <= maxRow && cIdx >= minCol && cIdx <= maxCol;
          if (!inRect) return cell;

          if (rIdx === minRow && cIdx === minCol) {
            // Master primary cell
            return {
              ...cell,
              rowSpan: rowSpan > 1 ? rowSpan : undefined,
              colSpan: colSpan > 1 ? colSpan : undefined,
              isSpannedChild: false,
            };
          } else {
            // Covered child cell
            if (cell.value && cell.value.trim() && !textPieces.includes(cell.value.trim())) {
              textPieces.push(cell.value.trim());
            }
            return {
              ...cell,
              rowSpan: undefined,
              colSpan: undefined,
              isSpannedChild: true,
            };
          }
        }),
      };
    });

    // If master cell is empty or has placeholder, combine text
    const master = newRows[minRow]?.cells[minCol];
    if (master && textPieces.length > 0 && (!master.value || master.value === '-')) {
      master.value = textPieces.join(' ');
    }

    onChange({
      ...tableData,
      rows: newRows,
    });

    setSelectedCellKeys(new Set());
    setAnchorCell(null);
    setMergeFeedback(`¡Celdas fusionadas con éxito (${rowSpan} filas × ${colSpan} columnas)!`);
    setTimeout(() => setMergeFeedback(null), 3500);
  };

  const unmergeSpecificCell = (rIdx: number, cIdx: number) => {
    const master = tableData.rows[rIdx]?.cells[cIdx];
    if (!master) return;
    const rSpan = master.rowSpan || 1;
    const cSpan = master.colSpan || 1;

    const newRows = tableData.rows.map((row, r) => {
      return {
        ...row,
        cells: row.cells.map((cell, c) => {
          const inRect = r >= rIdx && r < rIdx + rSpan && c >= cIdx && c < cIdx + cSpan;
          if (!inRect) return cell;
          return {
            ...cell,
            rowSpan: undefined,
            colSpan: undefined,
            isSpannedChild: false,
          };
        }),
      };
    });

    onChange({
      ...tableData,
      rows: newRows,
    });
    setMergeFeedback('Celdas separadas correctamente.');
    setTimeout(() => setMergeFeedback(null), 3000);
  };

  const mergeRowDown = () => {
    if (!activeCell || !currentSelectedCell) return;
    const currentSpan = currentSelectedCell.rowSpan || 1;
    const targetRowIdx = activeCell.rowIndex + currentSpan;
    if (targetRowIdx >= tableData.rows.length) return;

    const newRows = tableData.rows.map((row, rIdx) => {
      if (rIdx === activeCell.rowIndex) {
        return {
          ...row,
          cells: row.cells.map((cell, cIdx) =>
            cIdx === activeCell.colIndex ? { ...cell, rowSpan: currentSpan + 1 } : cell
          ),
        };
      }
      if (rIdx === targetRowIdx) {
        return {
          ...row,
          cells: row.cells.map((cell, cIdx) =>
            cIdx === activeCell.colIndex ? { ...cell, isSpannedChild: true } : cell
          ),
        };
      }
      return row;
    });

    onChange({
      ...tableData,
      rows: newRows,
    });
  };

  const mergeColRight = () => {
    if (!activeCell || !currentSelectedCell) return;
    const currentSpan = currentSelectedCell.colSpan || 1;
    const targetColIdx = activeCell.colIndex + currentSpan;
    if (targetColIdx >= tableData.headers.length) return;

    const newRows = tableData.rows.map((row, rIdx) => {
      if (rIdx === activeCell.rowIndex) {
        return {
          ...row,
          cells: row.cells.map((cell, cIdx) => {
            if (cIdx === activeCell.colIndex) {
              return { ...cell, colSpan: currentSpan + 1 };
            }
            if (cIdx === targetColIdx) {
              return { ...cell, isSpannedChild: true };
            }
            return cell;
          }),
        };
      }
      return row;
    });

    onChange({
      ...tableData,
      rows: newRows,
    });
  };

  const unmergeCell = () => {
    if (!activeCell) return;
    unmergeSpecificCell(activeCell.rowIndex, activeCell.colIndex);
  };

  const handleCopyWord = async () => {
    const ok = await copyTableToWordClipboard(tableData);
    if (ok) {
      setCopiedWord(true);
      setTimeout(() => setCopiedWord(false), 3000);
    }
  };

  const handleCopyExcel = async () => {
    const ok = await copyTableToExcelClipboard(tableData);
    if (ok) {
      setCopiedExcel(true);
      setTimeout(() => setCopiedExcel(false), 3000);
    }
  };

  // Apply Creative Color Presets
  const applyPresetTheme = (preset: 'cari' | 'ach' | 'monochrome' | 'soft') => {
    if (preset === 'cari') {
      const newHeaderColors = ['#A6A6A6', '#A6A6A6', '#8DC63F', '#FFF200', '#F7941D', '#ED1C24'];
      onChange({
        ...tableData,
        headerBgColors: newHeaderColors,
      });
    } else if (preset === 'ach') {
      const newHeaderColors = tableData.headers.map((_, i) => (i % 2 === 0 ? '#005FB6' : '#52AE32'));
      onChange({
        ...tableData,
        headerBgColors: newHeaderColors,
      });
    } else if (preset === 'soft') {
      const newHeaderColors = tableData.headers.map(() => '#003E7E');
      onChange({
        ...tableData,
        headerBgColors: newHeaderColors,
      });
    } else {
      const newHeaderColors = tableData.headers.map(() => '#334155');
      onChange({
        ...tableData,
        headerBgColors: newHeaderColors,
      });
    }
    setShowPresetMenu(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Table Editor Top Control Bar */}
      <div className="glass-panel p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 border border-white/10">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mr-2 font-futura">
            <TableIcon className="w-4 h-4 text-[#005FB6]" />
            Edición & Exportación
          </span>

          {/* Add Row Button */}
          <button
            onClick={addRow}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#005FB6]/80 hover:bg-[#005FB6] text-white text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Fila</span>
          </button>

          {/* Add Column Button */}
          <button
            onClick={addColumn}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-[#52AE32]" />
            <span>+ Columna</span>
          </button>

          {/* Interactive Cell Merge Tool Button with Pencil Icon (Requested by User) */}
          <button
            onClick={toggleMergeTool}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
              isMergeToolActive
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white ring-2 ring-amber-300 shadow-amber-500/40 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 hover:border-amber-400'
            }`}
            title="Herramienta de fusión interactiva: haz clic para seleccionar celdas y fusionarlas"
          >
            <Pencil className="w-3.5 h-3.5 text-amber-300" />
            <span>{isMergeToolActive ? '✏️ Modo Fusión (Activo)' : '✏️ Fusión Manual'}</span>
          </button>

          {/* Instant Merge Button (Visible whenever 2 or more cells are selected via mouse drag or click!) */}
          {selectedCellKeys.size >= 2 && (
            <button
              onClick={executeMergeSelection}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-lg bg-gradient-to-r from-[#107C41] to-[#0E6835] hover:opacity-95 text-white ring-2 ring-emerald-400 animate-in zoom-in-95 cursor-pointer"
              title="Combinar y centrar todas las celdas seleccionadas (como en Excel)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>⊞ Fusionar Celdas ({selectedCellKeys.size})</span>
            </button>
          )}

          {/* Instant Unmerge Button if current cell is merged */}
          {currentSelectedCell && (currentSelectedCell.rowSpan || currentSelectedCell.colSpan) && (
            <button
              onClick={() => {
                if (activeCell) unmergeSpecificCell(activeCell.rowIndex, activeCell.colIndex);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-700/60 shadow-xs cursor-pointer"
              title="Separar celdas combinadas"
            >
              <Split className="w-3.5 h-3.5 text-red-300" />
              <span>⊟ Separar Celdas</span>
            </button>
          )}

          {/* Creative Style Presets Menu */}
          <div className="relative">
            <button
              onClick={() => setShowPresetMenu(!showPresetMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition shadow-sm"
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span>Presets de Color</span>
            </button>
            {showPresetMenu && (
              <div className="absolute left-0 top-full mt-1 z-40 bg-slate-900 border border-slate-700 rounded-xl p-2 shadow-2xl w-56 flex flex-col gap-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  Estilos Institucionales
                </span>
                <button
                  onClick={() => applyPresetTheme('cari')}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-left text-white"
                >
                  <span className="font-semibold">Matriz CARI (Semáforo)</span>
                  <div className="flex gap-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8DC63F]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFF200]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F7941D]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ED1C24]" />
                  </div>
                </button>
                <button
                  onClick={() => applyPresetTheme('ach')}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-left text-white"
                >
                  <span className="font-semibold">Azul & Verde ACH</span>
                  <div className="flex gap-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#005FB6]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#52AE32]" />
                  </div>
                </button>
                <button
                  onClick={() => applyPresetTheme('soft')}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-left text-white"
                >
                  <span className="font-semibold">Azul Noche Monocolor</span>
                  <span className="w-3 h-3 rounded-full bg-[#003E7E]" />
                </button>
                <button
                  onClick={() => applyPresetTheme('monochrome')}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-left text-white"
                >
                  <span className="font-semibold">Gris Pizarra / Neutro</span>
                  <span className="w-3 h-3 rounded-full bg-[#334155]" />
                </button>
              </div>
            )}
          </div>

          {/* Highlight Style Menu (Requested by User to fix highlighted text formatting) */}
          <div className="relative">
            <button
              onClick={() => setShowHighlightStyleMenu(!showHighlightStyleMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/40 text-xs font-bold transition shadow-sm"
              title="Cambiar formato de resaltado / semáforos"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>
                {tableData.highlightStyle === 'clean-none'
                  ? '⚪ Texto Limpio (Sin Resaltados)'
                  : tableData.highlightStyle === 'soft-pastel'
                  ? '🌿 Pastel Suave Condicional'
                  : tableData.highlightStyle === 'colored-text'
                  ? '🔤 Solo Texto en Color'
                  : tableData.highlightStyle === 'badge-pill'
                  ? '🏷️ Píldora Sutil'
                  : '🟩 Fondo Sólido'}
              </span>
            </button>
            {showHighlightStyleMenu && (
              <div className="absolute left-0 top-full mt-1 z-40 bg-slate-900 border border-slate-700 rounded-xl p-2.5 shadow-2xl w-64 flex flex-col gap-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5">
                  Estilo de Resaltado (Word & Excel)
                </span>
                <button
                  onClick={() => setHighlightStyle('clean-none')}
                  className={`flex items-start gap-2 p-2 rounded-lg text-left transition ${
                    tableData.highlightStyle === 'clean-none'
                      ? 'bg-[#005FB6] text-white font-bold'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <span className="text-base">⚪</span>
                  <div>
                    <div className="font-bold">Sin Resaltados (Texto Limpio Excel)</div>
                    <div className="text-[10px] opacity-80 font-normal">Texto estándar negro de alta legibilidad, sin colores ni cajas.</div>
                  </div>
                </button>

                <button
                  onClick={() => setHighlightStyle('soft-pastel')}
                  className={`flex items-start gap-2 p-2 rounded-lg text-left transition ${
                    tableData.highlightStyle === 'soft-pastel'
                      ? 'bg-[#005FB6] text-white font-bold'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <span className="text-base">🌿</span>
                  <div>
                    <div className="font-bold">Pastel Suave Excel</div>
                    <div className="text-[10px] opacity-80 font-normal">Formato condicional tenue con texto oscuro contrastado.</div>
                  </div>
                </button>

                <button
                  onClick={() => setHighlightStyle('colored-text')}
                  className={`flex items-start gap-2 p-2 rounded-lg text-left transition ${
                    tableData.highlightStyle === 'colored-text'
                      ? 'bg-[#005FB6] text-white font-bold'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <span className="text-base">🔤</span>
                  <div>
                    <div className="font-bold">Solo Texto en Color</div>
                    <div className="text-[10px] opacity-80 font-normal">Texto en color corporativo ACH sin ningún fondo.</div>
                  </div>
                </button>

                <button
                  onClick={() => setHighlightStyle('full-cell')}
                  className={`flex items-start gap-2 p-2 rounded-lg text-left transition ${
                    tableData.highlightStyle === 'full-cell'
                      ? 'bg-[#005FB6] text-white font-bold'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <span className="text-base">🟩</span>
                  <div>
                    <div className="font-bold">Relleno Sólido Completo</div>
                    <div className="text-[10px] opacity-80 font-normal">Llena la celda completa con color corporativo.</div>
                  </div>
                </button>

                <button
                  onClick={() => setHighlightStyle('badge-pill')}
                  className={`flex items-start gap-2 p-2 rounded-lg text-left transition ${
                    tableData.highlightStyle === 'badge-pill'
                      ? 'bg-[#005FB6] text-white font-bold'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <span className="text-base">🏷️</span>
                  <div>
                    <div className="font-bold">Insignia / Píldora Minimalista</div>
                    <div className="text-[10px] opacity-80 font-normal">Etiqueta fina redondeada sin bordes dobles.</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Clear highlights button */}
          <button
            onClick={clearAllHighlights}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition shadow-sm"
            title="Quitar colores y semáforos de todas las celdas para dejar texto estándar"
          >
            <span>🧹 Limpiar Resaltados</span>
          </button>

          {/* Page margin fit mode toggle */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setPageFitMode('a4-page')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-bold transition ${
                pageFitMode === 'a4-page'
                  ? 'bg-[#005FB6] text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Ajuste exacto al 100% de la hoja A4 y márgenes de Word (17cm)"
            >
              <span>📄 Hoja A4 (Márgenes Word)</span>
            </button>
            <button
              onClick={() => setPageFitMode('excel-grid')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-bold transition ${
                pageFitMode === 'excel-grid'
                  ? 'bg-[#107C41] text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Vista de cuadrícula completa de Excel con scroll horizontal"
            >
              <span>📊 Cuadrícula Excel</span>
            </button>
          </div>

          {/* Quick link to generate chart from table */}
          {onNavigateToCharts && (
            <button
              onClick={onNavigateToCharts}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#52AE32]/20 hover:bg-[#52AE32]/30 text-emerald-300 border border-[#52AE32]/40 text-xs font-bold transition shadow-sm"
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#52AE32]" />
              <span>Crear Gráfica</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Dual One-Click Export: Word & Excel Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopyWord}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-md ${
              copiedWord
                ? 'bg-[#52AE32] text-white ring-2 ring-emerald-400'
                : 'bg-[#005FB6] hover:bg-[#004A8F] text-white shadow-[#005FB6]/30'
            }`}
          >
            {copiedWord ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>¡Copiado para Word!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar para Word</span>
              </>
            )}
          </button>

          <button
            onClick={handleCopyExcel}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-md ${
              copiedExcel
                ? 'bg-[#52AE32] text-white ring-2 ring-emerald-400'
                : 'bg-[#1D6F42] hover:bg-[#165633] text-white shadow-emerald-900/30'
            }`}
          >
            {copiedExcel ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>¡Copiado para Excel!</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Copiar para Excel</span>
              </>
            )}
          </button>
        </div>

        {/* Selected Cell Formatting Ribbon */}
        {activeCell && currentSelectedCell && (
          <div className="w-full flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-700 text-xs animate-in fade-in mt-2 flex-wrap">
            <span className="text-[11px] text-sky-400 font-bold mr-1 font-mono">
              F{activeCell.rowIndex + 1} : C{activeCell.colIndex + 1}
            </span>

            {/* Alignments */}
            <div className="flex items-center bg-slate-800 rounded p-0.5 border border-slate-700">
              <button
                onClick={() => updateCell(activeCell.rowIndex, activeCell.colIndex, { align: 'left' })}
                title="Alinear Izquierda"
                className={`p-1 rounded ${currentSelectedCell.align === 'left' ? 'bg-[#005FB6] text-white' : 'text-slate-400'}`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => updateCell(activeCell.rowIndex, activeCell.colIndex, { align: 'center' })}
                title="Alinear Centro"
                className={`p-1 rounded ${currentSelectedCell.align === 'center' ? 'bg-[#005FB6] text-white' : 'text-slate-400'}`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => updateCell(activeCell.rowIndex, activeCell.colIndex, { align: 'right' })}
                title="Alinear Derecha"
                className={`p-1 rounded ${currentSelectedCell.align === 'right' ? 'bg-[#005FB6] text-white' : 'text-slate-400'}`}
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bold Toggle */}
            <button
              onClick={toggleBold}
              className={`p-1 px-2 rounded border text-xs font-bold flex items-center gap-1 ${
                currentSelectedCell.isBold
                  ? 'bg-sky-500 text-white border-sky-400'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <Bold className="w-3.5 h-3.5" />
              <span>Negrita</span>
            </button>

            {/* Cell Color / Badge Palette Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowColorMenu(!showColorMenu)}
                title="Color de celda o semáforo"
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs"
              >
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span>Color de Celda</span>
              </button>
              {showColorMenu && (
                <div className="absolute left-0 top-full mt-1 z-40 bg-slate-900 border border-slate-700 rounded-xl p-2.5 shadow-2xl w-60 flex flex-col gap-2 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Semáforo de Severidad (CARI / SAN)
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      onClick={() => setBadgeColor('green')}
                      className="p-1.5 rounded bg-[#8DC63F] text-slate-900 font-bold text-center text-[10px]"
                      title="Verde (Seguridad Alimentaria)"
                    >
                      Verde
                    </button>
                    <button
                      onClick={() => setBadgeColor('yellow')}
                      className="p-1.5 rounded bg-[#FFF200] text-slate-900 font-bold text-center text-[10px]"
                      title="Amarillo (Marginal / Alerta)"
                    >
                      Amarillo
                    </button>
                    <button
                      onClick={() => setBadgeColor('orange')}
                      className="p-1.5 rounded bg-[#F7941D] text-white font-bold text-center text-[10px]"
                      title="Naranja (Inseguridad Moderada)"
                    >
                      Naranja
                    </button>
                    <button
                      onClick={() => setBadgeColor('red')}
                      className="p-1.5 rounded bg-[#ED1C24] text-white font-bold text-center text-[10px]"
                      title="Rojo (Inseguridad Severa)"
                    >
                      Rojo
                    </button>
                  </div>

                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-1 border-t border-slate-800">
                    Fondos Pasteles / Celdas Dominio
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => setCellCustomBg('#D9D9D9', '#000000')}
                      className="p-1 rounded bg-[#D9D9D9] text-black font-semibold text-[10px]"
                    >
                      Gris Claro
                    </button>
                    <button
                      onClick={() => setCellCustomBg('#A6A6A6', '#000000')}
                      className="p-1 rounded bg-[#A6A6A6] text-black font-semibold text-[10px]"
                    >
                      Gris Medio
                    </button>
                    <button
                      onClick={() => setCellCustomBg('#B4C6E7', '#000000')}
                      className="p-1 rounded bg-[#B4C6E7] text-black font-semibold text-[10px]"
                    >
                      Azul Pastel
                    </button>
                    <button
                      onClick={() => setCellCustomBg('#F2F8EC', '#1E293B')}
                      className="p-1 rounded bg-[#F2F8EC] text-slate-900 font-semibold text-[10px]"
                    >
                      Verde Tenue
                    </button>
                    <button
                      onClick={() => setCellCustomBg('#FFFDE6', '#1E293B')}
                      className="p-1 rounded bg-[#FFFDE6] text-slate-900 font-semibold text-[10px]"
                    >
                      Amar. Tenue
                    </button>
                    <button
                      onClick={() => setCellCustomBg('#FEF4EA', '#1E293B')}
                      className="p-1 rounded bg-[#FEF4EA] text-slate-900 font-semibold text-[10px]"
                    >
                      Naran. Tenue
                    </button>
                  </div>

                  <div className="pt-1 border-t border-slate-800 flex justify-between">
                    <button
                      onClick={() => {
                        setBadgeColor('none');
                        setCellCustomBg('', '');
                      }}
                      className="text-red-400 hover:text-red-300 text-[10px] font-semibold"
                    >
                      Quitar Colores
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Toggle progress bar */}
            <button
              onClick={toggleProgressBar}
              title="Convertir a barra de progreso visual"
              className={`flex items-center gap-1 px-2 py-1 rounded border text-xs ${
                currentSelectedCell.isProgressBar
                  ? 'bg-[#52AE32]/20 border-[#52AE32] text-[#52AE32]'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Barra SAN</span>
            </button>

            {/* Merge / Unmerge Controls */}
            <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded border border-slate-700">
              <button
                onClick={mergeRowDown}
                title="Fusionar con celda inferior (Rowspan +1)"
                className="p-1 px-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 text-[11px]"
              >
                <ArrowDownToLine className="w-3 h-3 text-sky-400" />
                <span>Fusionar ↓</span>
              </button>
              <button
                onClick={mergeColRight}
                title="Fusionar con celda derecha (Colspan +1)"
                className="p-1 px-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 text-[11px]"
              >
                <ArrowRightToLine className="w-3 h-3 text-emerald-400" />
                <span>Fusionar →</span>
              </button>
              {(currentSelectedCell.rowSpan || currentSelectedCell.colSpan) && (
                <button
                  onClick={unmergeCell}
                  title="Separar celdas fusionadas"
                  className="p-1 px-1.5 rounded bg-red-950/60 hover:bg-red-900 text-red-300 flex items-center gap-1 text-[11px]"
                >
                  <Split className="w-3 h-3 text-red-400" />
                  <span>Separar</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast Feedback for Merging */}
      {mergeFeedback && (
        <div className="bg-[#52AE32]/20 border border-[#52AE32]/60 text-emerald-300 p-2.5 rounded-xl text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#52AE32]" />
            <span className="font-semibold">{mergeFeedback}</span>
          </div>
          <button
            onClick={() => setMergeFeedback(null)}
            className="text-slate-400 hover:text-white text-xs px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Interactive Cell Merge Mode Banner (Visible when isMergeToolActive is true) */}
      {isMergeToolActive && (
        <div className="glass-panel p-3.5 rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-950/70 via-slate-900/90 to-amber-950/70 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xl animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white font-futura">
                  Modo Selección de Fusión Activo
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] font-mono">
                  {selectedCellKeys.size} {selectedCellKeys.size === 1 ? 'celda seleccionada' : 'celdas seleccionadas'}
                </span>
              </div>
              <p className="text-[11px] text-amber-200/80 font-roboto">
                Haz clic en las celdas contiguas que deseas fusionar (horizontal o verticalmente).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={executeMergeSelection}
              disabled={selectedCellKeys.size < 2}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#52AE32] to-[#3E8C22] hover:opacity-95 text-white font-bold text-xs shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>⚡ Fusionar Celdas Marcadas</span>
            </button>

            {selectedCellKeys.size > 0 && (
              <button
                onClick={clearMergeSelection}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition"
              >
                Limpiar Selección
              </button>
            )}

            <button
              onClick={() => setIsMergeToolActive(false)}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 text-xs transition"
            >
              ✕ Salir del Modo
            </button>
          </div>
        </div>
      )}

      {/* Main Table Preview Card (Rendered with Excel & Word-aligned Sheet Style) */}
      <div
        className={`bg-white rounded-2xl shadow-2xl p-5 sm:p-7 border border-slate-300 text-slate-900 transition-all ${
          pageFitMode === 'a4-page' ? 'max-w-[920px] mx-auto w-full' : 'w-full overflow-x-auto'
        }`}
      >
        {/* Page Margin Indicator for Word / A4 */}
        {pageFitMode === 'a4-page' && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] mb-3 select-none">
            <div className="flex items-center gap-1.5">
              <span className="font-bold font-futura">📄 Vista Hoja A4 Oficial</span>
              <span>•</span>
              <span className="font-roboto">100% Acoplada a márgenes estándar de Microsoft Word (17 cm)</span>
            </div>
            <span className="text-[10px] bg-emerald-200/80 text-emerald-950 px-2 py-0.5 rounded font-bold">
              ✓ Sin desbordamiento al copiar
            </span>
          </div>
        )}

        {/* Table Title and Subtitle (Editable in place) */}
        <div className="mb-3 pb-3 border-b-2 border-[#005FB6]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-[#005FB6] uppercase tracking-wider font-futura">
              ACCIÓN CONTRA EL HAMBRE | TABLA INSTITUCIONAL
            </span>
            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
              Formato Futura • Compatible Word & Excel
            </span>
          </div>

          <input
            type="text"
            value={tableData.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="Título de la tabla..."
            className="w-full font-bold text-lg sm:text-xl text-slate-900 border-none outline-none focus:ring-1 focus:ring-[#005FB6] rounded px-1 mt-1 bg-transparent hover:bg-slate-50 transition font-futura"
          />

          <input
            type="text"
            value={tableData.subtitle || ''}
            onChange={(e) => updateField('subtitle', e.target.value)}
            placeholder="Subtítulo o período de referencia (ej: 2024-2025)..."
            className="w-full text-xs sm:text-sm text-slate-500 border-none outline-none focus:ring-1 focus:ring-[#005FB6] rounded px-1 bg-transparent hover:bg-slate-50 transition"
          />
        </div>

        {/* Excel Formula & Coordinates Bar */}
        <div className="mb-3 flex items-center gap-2 px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono shadow-xs">
          <div className="flex items-center gap-1 px-2.5 py-0.5 bg-white border border-slate-300 rounded shadow-xs text-slate-800 font-bold min-w-[75px] justify-center select-none">
            <span>{getCoordinateLabel()}</span>
          </div>
          <span className="font-bold text-[#107C41] font-serif italic text-sm select-none">fx</span>
          <input
            type="text"
            value={currentSelectedCell?.value ?? ''}
            onChange={(e) => {
              if (activeCell) {
                updateCell(activeCell.rowIndex, activeCell.colIndex, { value: e.target.value });
              }
            }}
            placeholder={
              activeCell
                ? 'Escribe o edita el contenido de la celda seleccionada...'
                : 'Selecciona una celda para editar en la barra de fórmulas...'
            }
            className="flex-1 bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800 text-xs font-sans outline-none focus:ring-1 focus:ring-[#107C41] focus:border-[#107C41] transition"
          />
        </div>

        {/* The Live Interactive Table with Excel Grid & Column/Row Headers */}
        <div className="relative overflow-x-auto pb-4">
          {(() => {
            const maxRowCells = Math.max(...(tableData.rows || []).map((r) => r.cells?.length || 0), 1);
            const colCount = Math.max(1, tableData.headers.length, maxRowCells);
            const safeHeaders = Array.from({ length: colCount }).map((_, i) => tableData.headers[i] || `Columna ${i + 1}`);

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

            return (
              <table
                className={`w-full border-collapse border border-[#D4D4D4] text-xs sm:text-sm font-sans shadow-sm ${
                  pageFitMode === 'a4-page' ? 'table-fixed' : 'table-auto'
                }`}
              >
                <colgroup>
                  {/* Row number gutter column */}
                  <col style={{ width: '42px' }} width="42" />
                  {safeHeaders.map((_, cIdx) => (
                    <col
                      key={`col-w-${cIdx}`}
                      style={{ width: `${colWidths[cIdx]}%` }}
                      width={`${colWidths[cIdx]}%`}
                    />
                  ))}
                </colgroup>

                <thead>
                  {/* Excel Column Letters Row (A, B, C, D...) */}
                  <tr className="bg-slate-100 text-slate-600 text-[11px] font-mono border-b border-[#D4D4D4] select-none">
                    <th
                      onClick={selectAllCells}
                      title="Seleccionar toda la hoja"
                      className="w-10 px-2 py-1 text-center bg-slate-200 border border-[#D4D4D4] hover:bg-slate-300 cursor-pointer text-slate-600 font-bold"
                    >
                      ◢
                    </th>
                    {safeHeaders.map((_, colIdx) => (
                      <th
                        key={`col-letter-${colIdx}`}
                        onClick={() => selectEntireColumn(colIdx)}
                        title={`Seleccionar Columna ${getColLetter(colIdx)}`}
                        className="px-2 py-1 text-center font-bold bg-slate-100 border border-[#D4D4D4] hover:bg-slate-200 cursor-pointer transition text-slate-700"
                      >
                        {getColLetter(colIdx)}
                      </th>
                    ))}
                  </tr>

                  {/* Table Headers */}
                  <tr>
                    <th className="w-10 px-1 py-2 text-center text-[10px] font-bold text-slate-300 bg-slate-700 border border-slate-500 select-none">
                      #
                    </th>

                    {safeHeaders.map((header, colIdx) => {
                      const headerBg = tableData.headerBgColors?.[colIdx] || '#005FB6';
                      const isLightHeader =
                        headerBg === '#FFF200' || headerBg === '#FFFFFF' || headerBg === '#FFFDE6';
                      const headerText = isLightHeader ? '#000000' : '#FFFFFF';

                      return (
                        <th
                          key={`header-${colIdx}`}
                          style={{ backgroundColor: headerBg, color: headerText }}
                          className="px-3 py-2 text-left font-bold border border-slate-400 relative group transition-colors"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => updateHeader(colIdx, e.currentTarget.innerText)}
                              className="outline-none focus:bg-black/10 px-1 py-0.5 rounded transition flex-1 font-bold font-futura break-words"
                            >
                              {header}
                            </div>

                            {/* Column action controls */}
                            <div className="hidden group-hover:flex items-center gap-0.5 bg-black/60 backdrop-blur px-1 py-0.5 rounded shadow text-white">
                              <input
                                type="color"
                                value={headerBg}
                                onChange={(e) => updateHeaderBgColor(colIdx, e.target.value)}
                                title="Cambiar color de columna"
                                className="w-3.5 h-3.5 rounded cursor-pointer border-none bg-transparent p-0"
                              />
                              <button
                                onClick={() => setColumnAlign(colIdx, 'left')}
                                title="Alinear a la izquierda"
                                className="p-0.5 hover:text-sky-300"
                              >
                                <AlignLeft className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setColumnAlign(colIdx, 'center')}
                                title="Alinear al centro"
                                className="p-0.5 hover:text-sky-300"
                              >
                                <AlignCenter className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setColumnAlign(colIdx, 'right')}
                                title="Alinear a la derecha"
                                className="p-0.5 hover:text-sky-300"
                              >
                                <AlignRight className="w-3 h-3" />
                              </button>
                              {tableData.headers.length > 1 && (
                                <button
                                  onClick={() => removeColumn(colIdx)}
                                  title="Eliminar columna"
                                  className="p-0.5 text-red-300 hover:text-red-100 ml-0.5"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {(tableData.rows || []).map((row, rowIdx) => {
                    const isEven = rowIdx % 2 === 0;
                    const defaultRowBg = isEven ? '#FFFFFF' : '#F6F9FD';
                    const rowBg = row.rowBgColor || defaultRowBg;
                    const safeCells = Array.isArray(row?.cells) ? row.cells : [];

                    return (
                      <tr
                        key={row?.id || `row-${rowIdx}`}
                        style={{ backgroundColor: rowBg }}
                        className="hover:bg-blue-50/40 transition group"
                      >
                        {/* Excel Row Number gutter */}
                        <td
                          onClick={() => selectEntireRow(rowIdx)}
                          title={`Seleccionar Fila ${rowIdx + 1}`}
                          className="px-1.5 py-1.5 text-center text-slate-500 border border-[#D4D4D4] bg-slate-100 hover:bg-slate-200 cursor-pointer font-mono text-[11px] font-bold select-none group/row relative"
                        >
                          <span>{rowIdx + 1}</span>
                          <div className="hidden group-hover/row:flex absolute right-1 top-1/2 -translate-y-1/2 items-center bg-white shadow rounded px-0.5 z-20">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveRow(rowIdx, 'up');
                              }}
                              disabled={rowIdx === 0}
                              className="p-0.5 hover:text-slate-900 disabled:opacity-20"
                              title="Subir fila"
                            >
                              <ChevronUp className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveRow(rowIdx, 'down');
                              }}
                              disabled={rowIdx === (tableData.rows?.length || 0) - 1}
                              className="p-0.5 hover:text-slate-900 disabled:opacity-20"
                              title="Bajar fila"
                            >
                              <ChevronDown className="w-2.5 h-2.5" />
                            </button>
                            {(tableData.rows?.length || 0) > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeRow(rowIdx);
                                }}
                                className="p-0.5 text-red-500 hover:text-red-700"
                                title="Eliminar fila"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Cells */}
                        {safeCells.map((cell, colIdx) => {
                          // CRITICAL: Do NOT render <td> for cells that are covered by another cell's rowSpan/colSpan
                          if (cell.isSpannedChild) return null;

                          const cellKey = `${rowIdx},${colIdx}`;
                          const isMarkedForMerge = isMergeToolActive && selectedCellKeys.has(cellKey);
                          const isInMultiSelect = !isMergeToolActive && selectedCellKeys.has(cellKey) && selectedCellKeys.size > 1;
                          const isSelected =
                            activeCell?.rowIndex === rowIdx && activeCell?.colIndex === colIdx;
                          const isMerged =
                            (cell.rowSpan && cell.rowSpan > 1) || (cell.colSpan && cell.colSpan > 1);
                          const align = cell?.align || 'left';
                          const badge = cell?.badgeColor || 'none';
                          const currentHighlight = tableData.highlightStyle || 'soft-pastel';

                          let cellBg = cell.bgColor;
                          let cellFg = cell.textColor;
                          let isBold = Boolean(cell.isBold);

                          // Handle severity and classification styling
                          if (badge !== 'none' && currentHighlight !== 'clean-none') {
                            const pal = SEVERITY_PALETTE[badge];
                            if (currentHighlight === 'soft-pastel') {
                              // Elegant Excel conditional formatting: soft tint across the cell, dark readable font
                              cellBg = pal.softBg;
                              cellFg = pal.textDark;
                              isBold = true;
                            } else if (currentHighlight === 'colored-text') {
                              // Pure colored text
                              cellFg = pal.textDark;
                              isBold = true;
                            } else if (currentHighlight === 'full-cell') {
                              // Solid corporate fill
                              cellBg = pal.bg;
                              cellFg = pal.text;
                              isBold = true;
                            }
                          }

                          const cellStyle: React.CSSProperties = {
                            textAlign: align,
                            backgroundColor: isMarkedForMerge ? '#FEF3C7' : cellBg || undefined,
                            color: isMarkedForMerge ? '#78350F' : cellFg || undefined,
                            fontWeight: isBold ? 'bold' : 'normal',
                          };

                          return (
                            <td
                              key={cell.id}
                              rowSpan={cell.rowSpan}
                              colSpan={cell.colSpan}
                              onClick={() => {
                                setActiveCell({ rowIndex: rowIdx, colIndex: colIdx });
                              }}
                              onMouseDown={(e) => handleCellMouseDown(rowIdx, colIdx, e)}
                              onMouseEnter={() => handleCellMouseEnter(rowIdx, colIdx)}
                              className={`px-3 py-2 border border-[#D4D4D4] transition-all relative select-none group/cell ${
                                isMarkedForMerge
                                  ? 'ring-2 ring-amber-500 bg-amber-100 font-bold border-amber-500 z-10'
                                  : isInMultiSelect
                                  ? 'ring-2 ring-[#107C41] bg-emerald-50/60 z-10'
                                  : isSelected
                                  ? 'ring-2 ring-[#107C41] bg-emerald-50/30 z-20'
                                  : ''
                              } ${
                                isMergeToolActive
                                  ? 'cursor-pointer hover:ring-2 hover:ring-amber-400 hover:bg-amber-100/70'
                                  : 'cursor-cell'
                              }`}
                              style={cellStyle}
                            >
                              {/* Merged cell indicator badge */}
                              {isMerged && !isMergeToolActive && (
                                <div className="absolute top-1 right-1 opacity-70 group-hover/cell:opacity-100 transition flex items-center gap-1 bg-sky-100 border border-sky-300 rounded px-1.5 py-0.5 text-[9.5px] font-mono text-sky-800 shadow-xs z-10">
                                  <span>
                                    ⊞ {cell.rowSpan || 1}x{cell.colSpan || 1}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      unmergeSpecificCell(rowIdx, colIdx);
                                    }}
                                    className="text-red-500 hover:text-red-700 font-bold ml-0.5"
                                    title="Separar celdas fusionadas"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}

                              {/* Marked for merge indicator */}
                              {isMarkedForMerge && (
                                <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold shadow-xs z-10">
                                  ✓
                                </span>
                              )}

                              {/* Excel Active Cell Corner Handle */}
                              {isSelected && !isMergeToolActive && (
                                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-[#107C41] border border-white z-30 cursor-crosshair shadow-xs pointer-events-none" />
                              )}

                              {/* Cell Content */}
                              {cell.isProgressBar ? (
                                <div className="flex flex-col gap-1">
                                  <div
                                    contentEditable={!isMergeToolActive}
                                    suppressContentEditableWarning
                                    onBlur={(e) => {
                                      const text = e.currentTarget.innerText;
                                      const pct = parseInt(text.replace(/[^0-9]/g, '')) || 0;
                                      updateCell(rowIdx, colIdx, {
                                        value: text,
                                        progressPercent: pct,
                                      });
                                    }}
                                    className="font-semibold text-xs outline-none"
                                  >
                                    {cell.value}
                                  </div>
                                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        badge === 'orange'
                                          ? 'bg-[#EE7203]'
                                          : badge === 'green'
                                          ? 'bg-[#52AE32]'
                                          : badge === 'yellow'
                                          ? 'bg-[#FFF200]'
                                          : 'bg-[#005FB6]'
                                      }`}
                                      style={{
                                        width: `${Math.min(
                                          100,
                                          Math.max(0, cell.progressPercent ?? 50)
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              ) : badge !== 'none' && currentHighlight === 'badge-pill' ? (
                                /* Sleek minimal pill */
                                <span className="inline-block px-2 py-0.5 rounded text-xs font-bold border border-current">
                                  <span
                                    contentEditable={!isMergeToolActive}
                                    suppressContentEditableWarning
                                    onBlur={(e) =>
                                      updateCell(rowIdx, colIdx, { value: e.currentTarget.innerText })
                                    }
                                    className="outline-none"
                                  >
                                    {cell.value}
                                  </span>
                                </span>
                              ) : (
                                /* Clean text, colored-text, or soft-pastel (Seamless, NO ugly floating boxes!) */
                                <div
                                  contentEditable={!isMergeToolActive}
                                  suppressContentEditableWarning
                                  onBlur={(e) =>
                                    updateCell(rowIdx, colIdx, { value: e.currentTarget.innerText })
                                  }
                                  className={`outline-none min-h-[1.75rem] w-full h-full flex items-center break-words ${
                                    align === 'center'
                                      ? 'justify-center text-center'
                                      : align === 'right'
                                      ? 'justify-end text-right'
                                      : 'justify-start text-left'
                                  } ${
                                    !cell.value && isMergeToolActive
                                      ? 'text-amber-800/60 font-mono text-[10.5px] italic'
                                      : ''
                                  }`}
                                >
                                  {cell.value ? (
                                    <>
                                      {badge !== 'none' && currentHighlight === 'colored-text' && (
                                        <span className="mr-1 text-[10px] select-none">●</span>
                                      )}
                                      {cell.value}
                                    </>
                                  ) : isMergeToolActive ? (
                                    <span className="opacity-60 select-none font-mono text-[10.5px]">〔vacía〕</span>
                                  ) : (
                                    <span className="opacity-25 select-none text-[10px]">—</span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          })()}
        </div>

        {/* Footer notes & Source */}
        <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-col gap-1 text-[11px] text-[#707070]">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600">Nota:</span>
            <input
              type="text"
              value={tableData.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Notas técnicas o aclaraciones sobre los indicadores..."
              className="flex-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#005FB6] outline-none text-slate-600 px-1 transition"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600">Fuente:</span>
            <input
              type="text"
              value={tableData.source || ''}
              onChange={(e) => updateField('source', e.target.value)}
              placeholder="Fuente de los datos (ej: Monitoreo Humanitario ACH)..."
              className="flex-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#005FB6] outline-none text-slate-600 px-1 transition"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
