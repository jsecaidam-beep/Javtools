import React, { useState } from 'react';
import { X, Copy, Download, Check, FileCode } from 'lucide-react';
import { TableData } from '../types/table';
import { generateStandaloneHtml } from '../utils/exportWord';

interface ExportModalProps {
  tableData: TableData;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ tableData, isOpen, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [modalHighlightStyle, setModalHighlightStyle] = useState<'clean-none' | 'soft-pastel' | 'colored-text' | 'full-cell'>(
    (tableData.highlightStyle as any) || 'clean-none'
  );

  if (!isOpen) return null;

  const effectiveTableData: TableData = {
    ...tableData,
    highlightStyle: modalHighlightStyle,
  };

  const standaloneHtml = generateStandaloneHtml(effectiveTableData);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(standaloneHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Error copying code:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tabla-ach-${tableData.title.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'autocontenida'}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[90vh] glass-panel rounded-2xl border border-white/20 shadow-2xl flex flex-col overflow-hidden bg-slate-900/95 text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#EE7203]/20 text-[#EE7203] border border-[#EE7203]/40">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Código HTML, CSS y JS Autocontenido (Single File)
              </h3>
              <p className="text-xs text-slate-400">
                Archivo 100% independiente con identidad visual ACH y Chart.js integrado
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-header with Tab Switcher & Style Filter */}
        <div className="px-6 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 rounded font-bold transition ${
                activeTab === 'preview' ? 'bg-[#005FB6] text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              👁️ Vista Previa Renderizada
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1 rounded font-bold transition ${
                activeTab === 'code' ? 'bg-[#EE7203] text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              &lt;/&gt; Código HTML / CSS
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Estilo de Texto:</span>
            <select
              value={modalHighlightStyle}
              onChange={(e) => setModalHighlightStyle(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-[#005FB6]"
            >
              <option value="clean-none">⚪ Sin Resaltados (Texto Limpio)</option>
              <option value="soft-pastel">🌿 Pastel Suave Condicional</option>
              <option value="colored-text">🔤 Solo Texto en Color</option>
              <option value="full-cell">🟩 Relleno Sólido Completo</option>
            </select>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 flex-1 overflow-hidden flex flex-col gap-3">
          {activeTab === 'preview' ? (
            <div className="relative flex-1 bg-slate-100 rounded-xl border border-slate-300 overflow-hidden shadow-inner flex flex-col">
              <iframe
                title="Vista previa HTML independiente"
                srcDoc={standaloneHtml}
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Listo para guardarse como archivo <code className="text-[#52AE32]">.html</code> o incrustarse:</span>
                <span>{standaloneHtml.length.toLocaleString()} caracteres</span>
              </div>
              <div className="relative flex-1 bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs text-slate-300 overflow-auto">
                <pre className="whitespace-pre">{standaloneHtml}</pre>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/80 bg-slate-950/60 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold transition"
            >
              <Download className="w-4 h-4 text-[#52AE32]" />
              <span>Descargar .html</span>
            </button>
            <a
              href="./ach-humanitarian-suite.zip"
              download="ach-humanitarian-suite.zip"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#005FB6]/30 hover:bg-[#005FB6]/50 text-sky-200 border border-[#005FB6]/60 text-xs font-bold transition"
            >
              <Download className="w-4 h-4 text-sky-300" />
              <span>Descargar ZIP con Todo el Código para GitHub</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition"
            >
              Cerrar
            </button>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition shadow-lg ${
                copied
                  ? 'bg-[#52AE32] text-white ring-2 ring-emerald-400'
                  : 'bg-[#005FB6] hover:bg-[#004A8F] text-white shadow-[#005FB6]/30'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>¡Código Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Código Completo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
