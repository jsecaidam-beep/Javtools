import { parseNumericValue } from '../utils/tabularData';
import { canvasToPngBlob, downloadBlob } from '../utils/canvasExport';
import React, { useEffect, useRef, useState } from 'react';
import {
  Chart,
  Filler, RadarController, PolarAreaController, RadialLinearScale,
  BarController,
  BarElement,
  PieController,
  DoughnutController,
  LineController,
  LineElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import {
  BarChart3,
  PieChart,
  LineChart,
  Copy,
  Download,
  Check,
  Sparkles,
  Sliders,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { TableData } from '../types/table';
import { CHART_PRESETS_SAN } from '../constants/brandAssets';

// Register Chart.js components
Chart.register(Filler, RadarController, PolarAreaController, RadialLinearScale,
  BarController,
  BarElement,
  PieController,
  DoughnutController,
  LineController,
  LineElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title
);

interface ChartPanelProps {
  tableData: TableData;
  onNavigateToTables?: () => void;
}

type ChartType = 'bar' | 'horizontalBar' | 'stackedBar' | 'pie' | 'doughnut' | 'line' | 'area' | 'radar' | 'polarArea';

const ACH_PALETTE = [
  '#005FB6', // Azul ACH
  '#52AE32', // Verde ACH
  '#EE7203', // Naranja ACH
  '#707070', // Gris ACH
  '#003E7E', // Azul oscuro
  '#35821F', // Verde bosque
  '#C45B00', // Naranja tierra
  '#0284C7', // Azul cian
  '#DC2626', // Rojo alerta
  '#F59E0B', // Amarillo ámbar
];

export const ChartPanel: React.FC<ChartPanelProps> = ({ tableData, onNavigateToTables }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const [chartType, setChartType] = useState<ChartType>(
    (tableData.suggestedChartType as ChartType) || 'bar'
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [labelColIndex, setLabelColIndex] = useState<number>(tableData.chartLabelCol ?? 0);
  const [valueColIndex, setValueColIndex] = useState<number>(tableData.chartValueCols?.[0] ?? 1);
  const [visualStyle,setVisualStyle]=useState('institutional');
  const palettes:Record<string,string[]>={institutional:ACH_PALETTE,ocean:['#005FB6','#008AA6','#63B6CE','#003E7E','#8EB8DB'],pastel:['#699BCA','#96C780','#EAB47F','#A6B8CB','#82C4C4'],forest:['#286B32','#52AE32','#94C45D','#005FB6','#AECFA0']};
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [includeTotalRow, setIncludeTotalRow] = useState<boolean>(false);
  const [useCustomPresetData, setUseCustomPresetData] = useState<any | null>(null);

  // Sync with tableData changes
  useEffect(() => {
    if (!useCustomPresetData) {
      if (typeof tableData.chartLabelCol === 'number') {
        setLabelColIndex(Math.min(tableData.chartLabelCol, Math.max(0, tableData.headers.length - 1)));
      }
      if (tableData.chartValueCols && tableData.chartValueCols.length > 0) {
        setValueColIndex(Math.min(tableData.chartValueCols[0], Math.max(0, tableData.headers.length - 1)));
      }
    }
  }, [tableData, useCustomPresetData]);

  // Load a preset from the PDF Evaluation
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = CHART_PRESETS_SAN.find((p) => p.id === presetId);
    if (preset) {
      setChartType(preset.type as ChartType);
      setUseCustomPresetData(preset);
    } else {
      setUseCustomPresetData(null);
    }
  };

  // Build chart configuration
  const getRenderData = () => {
    if (useCustomPresetData) {
      return {
        labels: useCustomPresetData.labels,
        datasets: useCustomPresetData.datasets,
      };
    }

    // From active tableData
    let targetRows = Array.isArray(tableData?.rows) ? tableData.rows : [];
    if (!includeTotalRow) {
      targetRows = targetRows.filter((r) => {
        const firstCell = r?.cells?.[0]?.value?.toLowerCase() || '';
        return !firstCell.includes('total') && !firstCell.includes('promedio');
      });
    }

    const labels = targetRows.map((row) => row?.cells?.[labelColIndex]?.value || '');
    const values = targetRows.map((row) => {
      const cell = row?.cells?.[valueColIndex];
      if (!cell) return 0;
      const parsed = parseNumericValue(cell.value || '');
      return isNaN(parsed) ? 0 : parsed;
    });

    const isHorizontal = chartType === 'horizontalBar';
    const bgColors = labels.map((_, i) => ACH_PALETTE[i % ACH_PALETTE.length]);

    return {
      labels,
      datasets: [
        {
          label: tableData.headers[valueColIndex] || 'Valores',
          data: values,
          backgroundColor: bgColors,
          borderColor: '#FFFFFF',
          borderWidth: 1.5,
          borderRadius: 6,
        },
      ],
    };
  };

  // Render chart
  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const { labels, datasets } = getRenderData();
    const isHorizontal = chartType === 'horizontalBar';
    const isStacked = chartType === 'stackedBar';
    const baseType = isHorizontal || isStacked ? 'bar' : chartType==='area'?'line':chartType;
    const radial=baseType==='radar'||baseType==='polarArea';
    const palette=palettes[visualStyle];
    const styledDatasets=datasets.map((dataset:any,index:number)=>({...dataset,
      ...(visualStyle!=='institutional'?{backgroundColor:datasets.length>1?palette[index%palette.length]:labels.map((_:unknown,i:number)=>palette[i%palette.length])}:{}),
      ...(baseType==='line'||baseType==='radar'?{borderColor:palette[index%palette.length],backgroundColor:palette[index%palette.length]+'35',pointBackgroundColor:palette[index%palette.length],pointRadius:4,borderWidth:3,tension:.3,fill:chartType==='area'||baseType==='radar'}:{}),
      borderRadius:baseType==='bar'?8:0,
    }));

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartInstanceRef.current = new Chart(ctx, {
      type: baseType,
      data: {
        labels,
        datasets:styledDatasets,
      },
      options: {
        indexAxis: isHorizontal ? 'y' : 'x',
        responsive: true,
        animation: false,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: baseType === 'pie' || baseType === 'doughnut' || baseType==='polarArea' || datasets.length > 1,
            position: 'bottom',
            labels: {
              color: '#374c5e',
              font: {
                family: "'Futura', 'Trebuchet MS', Arial, sans-serif",
                size: 11,
              },
              padding: 12,
              usePointStyle: true,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#FFFFFF',
            bodyColor: '#e2e8f0',
            borderColor: '#005FB6',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            titleFont: {
              family: "'Futura', 'Trebuchet MS', Arial, sans-serif",
              size: 12,
              weight: 'bold',
            },
          },
        },
        scales:
          baseType === 'pie' || baseType === 'doughnut' || radial
            ? {}
            : {
                x: {
                  stacked: isStacked,
                  ticks: {
                    color: '#475569',
                    font: {
                      family: "'Futura', 'Trebuchet MS', Arial, sans-serif",
                      size: 10,
                    },
                  },
                  grid: { color: 'rgba(0, 62, 126, 0.10)' },
                },
                y: {
                  stacked: isStacked,
                  ticks: {
                    color: '#475569',
                    font: {
                      family: "'Futura', 'Trebuchet MS', Arial, sans-serif",
                      size: 10,
                    },
                  },
                  grid: { color: 'rgba(0, 62, 126, 0.10)' },
                },
              },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [tableData, chartType, labelColIndex, valueColIndex, includeTotalRow, useCustomPresetData,visualStyle]);

  const [exportError, setExportError] = useState<string | null>(null);

  const createChartExport = (): HTMLCanvasElement => {
    if (!canvasRef.current) throw new Error('No se encontró la gráfica.');
    const source = canvasRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height + 100;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo preparar la gráfica.');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#005FB6';
    ctx.font = "bold 18px 'Jost', Arial, sans-serif";
    ctx.fillText(useCustomPresetData?.name || tableData.title || 'Gráfica ACH', 20, 30, canvas.width - 40);
    ctx.font = "12px 'Roboto', Arial, sans-serif";
    ctx.fillStyle = '#707070';
    ctx.fillText(useCustomPresetData?.description || tableData.subtitle || 'Acción contra el Hambre', 20, 52, canvas.width - 40);
    ctx.drawImage(source, 0, 75);
    return canvas;
  };

  const handleCopyChartImage = async () => {
    setExportError(null);
    try {
      if (!navigator.clipboard?.write || !window.ClipboardItem) throw new Error('Portapapeles no disponible');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': canvasToPngBlob(createChartExport()) })]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 3000);
    } catch {
      await handleDownloadChartPng();
    }
  };

  const handleDownloadChartPng = async () => {
    setExportError(null);
    try {
      downloadBlob(await canvasToPngBlob(createChartExport()), `ach-grafica-${Date.now()}.png`);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'No se pudo descargar la gráfica.');
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-white/10 shadow-xl flex flex-col gap-4 animate-in fade-in duration-300">
      {exportError && <p role="alert" className="text-red-700">{exportError}</p>}
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#52AE32]/20 border border-[#52AE32]/40 flex items-center justify-center text-[#52AE32]">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 font-futura">
              Gráficas con identidad ACH
            </h2>
            <p className="text-xs text-slate-400 font-roboto">
              Nueve tipos de gráfica y cuatro paletas para presentar tus datos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleDownloadChartPng}
            title="Descargar imagen en PNG"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition"
          >
            <Download className="w-4 h-4 text-[#52AE32]" />
          </button>

          <button
            onClick={handleCopyChartImage}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg ${
              copiedImage
                ? 'bg-[#52AE32] text-white ring-2 ring-emerald-400'
                : 'bg-[#005FB6] hover:bg-[#004A8F] text-white shadow-[#005FB6]/30'
            }`}
          >
            {copiedImage ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>¡Gráfica Copiada para Word!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar como Imagen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preset Selector from PDF 2 */}
      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">
            Modelos de Referencia ACH:
          </span>
          <select
            value={selectedPresetId}
            onChange={(e) => handleSelectPreset(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-[#52AE32]"
          >
            <option value="">📊 Usar datos de mi tabla activa</option>
            {CHART_PRESETS_SAN.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>

        {useCustomPresetData && (
          <button
            onClick={() => handleSelectPreset('')}
            className="text-[11px] text-[#005FB6] hover:underline font-bold"
          >
            ↺ Volver a los datos de mi tabla activa
          </button>
        )}
      </div>

      {/* Controls Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700/60 text-xs">
        {/* Chart Type Selector */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Tipo de Gráfico
          </label>
          <select aria-label="Tipo de gráfica" value={chartType} onChange={e=>setChartType(e.target.value as ChartType)} className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 bg-white">{[['bar','Barras verticales'],['horizontalBar','Barras horizontales'],['stackedBar','Barras apiladas'],['pie','Circular'],['doughnut','Dona'],['line','Líneas'],['area','Área suave'],['radar','Radar'],['polarArea','Área polar']].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><label className="block mt-3 text-slate-500">Estilo visual<select aria-label="Estilo visual de gráfica" value={visualStyle} onChange={e=>setVisualStyle(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 bg-white mt-1"><option value="institutional">Institucional ACH</option><option value="ocean">Océano</option><option value="pastel">Pastel editorial</option><option value="forest">Bosque</option></select></label>
        </div>

        {/* Labels Column Selector */}
        {!useCustomPresetData ? (
          <>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Etiquetas (Eje X)
              </label>
              <select
                value={labelColIndex}
                onChange={(e) => setLabelColIndex(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#005FB6]"
              >
                {tableData.headers.map((h, idx) => (
                  <option key={idx} value={idx}>
                    {h || `Columna ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Valores Numéricos (Eje Y)
              </label>
              <select
                value={valueColIndex}
                onChange={(e) => setValueColIndex(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#52AE32]"
              >
                {tableData.headers.map((h, idx) => (
                  <option key={idx} value={idx}>
                    {h || `Columna ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 py-1.5 select-none">
                <input
                  type="checkbox"
                  checked={includeTotalRow}
                  onChange={(e) => setIncludeTotalRow(e.target.checked)}
                  className="rounded border-slate-700 text-[#005FB6]"
                />
                <span className="text-[11px]">Incluir fila de Totales</span>
              </label>
            </div>
          </>
        ) : (
          <div className="col-span-3 flex items-center text-xs text-slate-300 bg-slate-900/60 p-2 rounded-lg">
            <span>
              ℹ️ Mostrando modelo del informe: <strong>{useCustomPresetData.name}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Main Canvas Container */}
      <div className="relative w-full h-[360px] sm:h-[420px] bg-slate-900/70 rounded-2xl p-4 border border-slate-700/50 flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* Color references and bottom navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-700/60 gap-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-300">Gama Cromática ACH:</span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#005FB6]" /> Azul #005FB6
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#52AE32]" /> Verde #52AE32
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EE7203]" /> Naranja #EE7203
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#707070]" /> Gris #707070
          </span>
        </div>

        {onNavigateToTables && (
          <button
            onClick={onNavigateToTables}
            className="text-[#005FB6] hover:underline font-bold flex items-center gap-1"
          >
            <span>Ver o editar datos en la tabla</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
