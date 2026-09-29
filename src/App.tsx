import React, { useState } from 'react';
import { PREDEFINED_TEMPLATES } from './constants/templates';
import { INITIAL_COVER_DATA, INITIAL_CREDITS_DATA } from './constants/brandAssets';
import { TableData, PredefinedTemplate } from './types/table';
import { CoverData, CreditsData } from './types/brand';
import { copyTableToWordClipboard } from './utils/exportWord';
import { Navbar, NavView } from './components/Navbar';
import { HomeHub } from './components/HomeHub';
import { MultimodalInput } from './components/MultimodalInput';
import { TableEditor } from './components/TableEditor';
import { ChartPanel } from './components/ChartPanel';
import { CoverEditor } from './components/CoverEditor';
import { CreditsEditor } from './components/CreditsEditor';
import { ExportModal } from './components/ExportModal';
import { FileCheck, Sparkles, ShieldCheck, HeartHandshake } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<NavView>('home');
  const [currentTemplateId, setCurrentTemplateId] = useState<string>(PREDEFINED_TEMPLATES[0].id);
  const [tableData, setTableData] = useState<TableData>(PREDEFINED_TEMPLATES[0].data);
  const [coverData, setCoverData] = useState<CoverData>(INITIAL_COVER_DATA);
  const [creditsData, setCreditsData] = useState<CreditsData>(INITIAL_CREDITS_DATA);

  const [copiedWord, setCopiedWord] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleSelectTemplate = (template: PredefinedTemplate) => {
    setCurrentTemplateId(template.id);
    setTableData(template.data);
    showToast(`Plantilla cargada: ${template.name}`);
  };

  const handleCopyWord = async () => {
    const success = await copyTableToWordClipboard(tableData);
    if (success) {
      setCopiedWord(true);
      showToast('¡Tabla copiada con estilos optimizados para Word y Outlook!');
      setTimeout(() => setCopiedWord(false), 3000);
    } else {
      showToast('No se pudo acceder al portapapeles. Copia manualmente.');
    }
  };

  const handleReset = () => {
    setTableData(PREDEFINED_TEMPLATES[0].data);
    setCurrentTemplateId(PREDEFINED_TEMPLATES[0].id);
    showToast('Tabla restablecida al formato inicial');
  };

  // Cross-module Bridge: Cover -> Credits
  const handleCoverToCredits = (suggestedData?: Partial<CreditsData>) => {
    if (suggestedData) {
      setCreditsData((prev) => ({
        ...prev,
        ...suggestedData,
      }));
    }
    setCurrentView('credits');
    showToast('Metadatos transferidos a la hoja de créditos.');
  };

  return (
    <div className="min-h-screen bg-[#090f1d] text-slate-100 flex flex-col selection:bg-[#005FB6] selection:text-white font-roboto">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[550px] h-[550px] rounded-full bg-[#005FB6]/15 blur-[130px]" />
        <div className="absolute top-[30%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#52AE32]/10 blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[25%] w-[450px] h-[450px] rounded-full bg-[#EE7203]/10 blur-[140px]" />
      </div>

      {/* Main Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        currentTemplateId={currentTemplateId}
        onSelectTemplate={handleSelectTemplate}
        onCopyWord={handleCopyWord}
        onOpenHtmlModal={() => setShowExportModal(true)}
        onReset={handleReset}
        copiedWord={copiedWord}
      />

      {/* Workspace Body */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* VIEW 1: HOME HUB (Welcome Screen with 4 cards) */}
        {currentView === 'home' && (
          <HomeHub onNavigate={setCurrentView} />
        )}

        {/* VIEW 2: TABLES GENERATOR */}
        {currentView === 'tables' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Top Info Banner */}
            <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-800/80">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-xl bg-[#005FB6]/20 border border-[#005FB6]/40 text-[#005FB6]">
                  <HeartHandshake className="w-6 h-6 text-sky-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#52AE32] font-futura">
                      Generador de Tablas Oficiales ACH
                    </span>
                    <span className="text-[10px] bg-sky-950 text-sky-300 border border-sky-800 px-2 py-0.5 rounded font-bold">
                      Fuente Futura
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 mt-0.5 font-roboto">
                    Pega datos con IA Gemini, edita celdas directamente y copia tablas perfectamente acopladas a Microsoft Word.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentView('charts')}
                  className="px-3.5 py-1.5 rounded-lg bg-[#52AE32]/20 hover:bg-[#52AE32]/30 text-emerald-300 border border-[#52AE32]/40 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <span>Módulo de Gráficas</span>
                  <span>➔</span>
                </button>
              </div>
            </div>

            {/* Multimodal Input */}
            <MultimodalInput
              onTableGenerated={(newTable) => {
                setTableData(newTable);
                setCurrentTemplateId('');
                showToast('¡Datos estructurados con éxito en formato ACH!');
              }}
            />

            {/* Table Editor */}
            <TableEditor
              tableData={tableData}
              onChange={setTableData}
              onNavigateToCharts={() => setCurrentView('charts')}
            />
          </div>
        )}

        {/* VIEW 3: CHARTS GENERATOR */}
        {currentView === 'charts' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <ChartPanel
              tableData={tableData}
              onNavigateToTables={() => setCurrentView('tables')}
            />
          </div>
        )}

        {/* VIEW 4: COVERS EDITOR (Canva-style) */}
        {currentView === 'covers' && (
          <CoverEditor
            coverData={coverData}
            onChange={setCoverData}
            onNavigateToCredits={handleCoverToCredits}
          />
        )}

        {/* VIEW 5: CREDITS & BACKCOVER GENERATOR */}
        {currentView === 'credits' && (
          <CreditsEditor
            creditsData={creditsData}
            onChange={setCreditsData}
            onNavigateToCover={() => setCurrentView('covers')}
          />
        )}
      </main>

      {/* Corporate Footer */}
      <footer className="w-full border-t border-slate-800/80 glass-panel py-4 px-6 text-center text-xs text-slate-400 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200 font-futura">Acción contra el Hambre</span>
            <span>•</span>
            <span className="font-roboto">Herramienta de Documentos Humanitarios (Guatemala & Centroamérica)</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-roboto">
            <span className="text-[#005FB6] font-bold">Azul #005FB6</span>
            <span className="text-[#52AE32] font-bold">Verde #52AE32</span>
            <span className="text-[#EE7203] font-bold">Naranja #EE7203</span>
            <span className="text-[#707070] font-bold">Gris #707070</span>
          </div>
        </div>
      </footer>

      {/* Standalone HTML Code Modal */}
      <ExportModal
        tableData={tableData}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-[#005FB6] text-white shadow-2xl animate-in slide-in-from-bottom-5">
          <FileCheck className="w-4 h-4 text-[#52AE32]" />
          <span className="text-xs font-semibold font-roboto">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
