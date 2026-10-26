import React, { useEffect, useState } from 'react';
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
import { StoriesEditor } from './components/StoriesEditor';
import { RecruitmentEditor } from './components/RecruitmentEditor';
import { InvitationEditor } from './components/InvitationEditor';
import { ExportModal } from './components/ExportModal';
import { FileCheck, Sparkles, ShieldCheck, HeartHandshake } from 'lucide-react';

const VIEW_HASHES: Record<NavView, string> = {
  home: 'inicio',
  recruitment: 'convocatorias',
  stories: 'historias',
  tables: 'tablas',
  charts: 'graficas',
  covers: 'portadas',
  credits: 'creditos',
  invitations: 'invitaciones',
};

const getViewFromHash = (): NavView => {
  const hash = window.location.hash.slice(1).toLowerCase();
  return (Object.keys(VIEW_HASHES) as NavView[]).find(
    (view) => VIEW_HASHES[view] === hash || view === hash,
  ) ?? 'home';
};

export default function App() {
  const [currentView, setCurrentView] = useState<NavView>(getViewFromHash);
  const [currentTemplateId, setCurrentTemplateId] = useState<string>(PREDEFINED_TEMPLATES[0].id);
  const [tableData, setTableData] = useState<TableData>(PREDEFINED_TEMPLATES[0].data);
  const [coverData, setCoverData] = useState<CoverData>(INITIAL_COVER_DATA);
  const [creditsData, setCreditsData] = useState<CreditsData>(INITIAL_CREDITS_DATA);

  const [copiedWord, setCopiedWord] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const syncView = () => setCurrentView(getViewFromHash());
    window.addEventListener('hashchange', syncView);
    window.addEventListener('popstate', syncView);
    return () => {
      window.removeEventListener('hashchange', syncView);
      window.removeEventListener('popstate', syncView);
    };
  }, []);

  const handleNavigate = (view: NavView) => {
    const nextHash = `#${VIEW_HASHES[view]}`;
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, '', nextHash);
    }
    setCurrentView(view);
    window.scrollTo({top:0,behavior:'instant'});
  };

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
    handleNavigate('credits');
    showToast('Metadatos transferidos a la hoja de créditos.');
  };

  return (
    <div className="ach-app javtools-prototype min-h-screen bg-[#f3f7fa] text-slate-900 flex flex-col selection:bg-[#005FB6] selection:text-white font-roboto">
      <div className="studio-ambient" aria-hidden="true"><i/><i/><i/></div>
      {/* Main Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        currentTemplateId={currentTemplateId}
        onSelectTemplate={handleSelectTemplate}
        onCopyWord={handleCopyWord}
        onOpenHtmlModal={() => setShowExportModal(true)}
        onReset={handleReset}
        copiedWord={copiedWord}
      />

      {/* Workspace Body */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {currentView === 'stories' && <StoriesEditor />}
        {currentView === 'recruitment' && <RecruitmentEditor />}
        {/* VIEW 1: HOME HUB */}
        {currentView === 'home' && (
          <HomeHub onNavigate={handleNavigate} />
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
                    Pega datos desde Word, Excel o CSV, edita las celdas y copia la tabla a tu documento.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavigate('charts')}
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
              onNavigateToCharts={() => handleNavigate('charts')}
            />
          </div>
        )}

        {/* VIEW 3: CHARTS GENERATOR */}
        {currentView === 'charts' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <ChartPanel
              tableData={tableData}
              onNavigateToTables={() => handleNavigate('tables')}
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
            onNavigateToCover={() => handleNavigate('covers')}
          />
        )}

        {currentView === 'invitations' && <InvitationEditor />}
      </main>

      <footer className="studio-footer"><button onClick={()=>handleNavigate('home')} className="footer-brand">javtools</button><p>Pequeñas herramientas.<br/>Más espacio para tus ideas.</p><span>Creado para comunicar con identidad ACH.<br/><small>Prototipo local · Diseño para revisión</small></span></footer>

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
