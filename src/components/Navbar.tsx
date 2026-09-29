import React from 'react';
import { PREDEFINED_TEMPLATES } from '../constants/templates';
import { PredefinedTemplate } from '../types/table';
import {
  Copy,
  FileCode,
  RefreshCw,
  Check,
  Table2,
  BarChart3,
  BookOpen,
  FileCheck2,
  Home,
} from 'lucide-react';
import { AchOfficialSvg } from './AchLogos';

export type NavView = 'home' | 'tables' | 'charts' | 'covers' | 'credits';

interface NavbarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  currentTemplateId: string;
  onSelectTemplate: (template: PredefinedTemplate) => void;
  onCopyWord: () => void;
  onOpenHtmlModal: () => void;
  onReset: () => void;
  copiedWord: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  currentTemplateId,
  onSelectTemplate,
  onCopyWord,
  onOpenHtmlModal,
  onReset,
  copiedWord,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 px-4 lg:px-8 py-3 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand Header with Official ACH Logo */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            {/* Official ACH Logo Badge in the corner */}
            <div className="flex items-center justify-center bg-white px-3 py-1.5 rounded-xl shadow-lg shadow-[#005FB6]/20 border border-white/30 group-hover:scale-105 transition-transform">
              <AchOfficialSvg variant="color" className="h-8 w-auto" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wider font-bold text-[#52AE32] font-futura">
                  Acción contra el Hambre
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#EE7203]" />
                <span className="text-[10px] text-slate-400 uppercase tracking-wider hidden sm:inline font-futura">
                  Misión Centroamérica
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight font-futura">
                Suite de Documentos Humanitarios
              </h1>
            </div>
          </div>
        </div>

        {/* Center Main Nav Tabs */}
        <nav className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 overflow-x-auto max-w-full">
          <button
            onClick={() => onNavigate('home')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              currentView === 'home'
                ? 'bg-slate-700 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Inicio</span>
          </button>

          <button
            onClick={() => onNavigate('tables')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              currentView === 'tables'
                ? 'bg-[#005FB6] text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>Tablas</span>
          </button>

          <button
            onClick={() => onNavigate('charts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              currentView === 'charts'
                ? 'bg-[#52AE32] text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Gráficas</span>
          </button>

          <button
            onClick={() => onNavigate('covers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              currentView === 'covers'
                ? 'bg-[#EE7203] text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Portadas</span>
          </button>

          <button
            onClick={() => onNavigate('credits')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              currentView === 'credits'
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Créditos</span>
          </button>
        </nav>

        {/* Right contextual actions */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {currentView === 'tables' && (
            <>
              {/* Template Selector */}
              <div className="relative min-w-[170px] sm:min-w-[190px]">
                <select
                  value={currentTemplateId}
                  onChange={(e) => {
                    const found = PREDEFINED_TEMPLATES.find((t) => t.id === e.target.value);
                    if (found) onSelectTemplate(found);
                  }}
                  className="w-full text-xs font-medium bg-slate-800/90 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 pr-7 focus:outline-none focus:border-[#005FB6] appearance-none"
                >
                  <option disabled value="">
                    📂 Plantillas ACH...
                  </option>
                  {PREDEFINED_TEMPLATES.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
                  ▼
                </div>
              </div>

              {/* Primary Copy to Word */}
              <button
                onClick={onCopyWord}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-md ${
                  copiedWord
                    ? 'bg-[#52AE32] text-white ring-2 ring-emerald-400'
                    : 'bg-[#005FB6] hover:bg-[#004A8F] text-white shadow-[#005FB6]/30'
                }`}
              >
                {copiedWord ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Tabla Word</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* HTML Standalone Code Viewer */}
          <button
            onClick={onOpenHtmlModal}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition"
            title="Ver código HTML / Exportar archivo"
          >
            <FileCode className="w-4 h-4 text-[#EE7203]" />
          </button>
        </div>
      </div>
    </header>
  );
};
