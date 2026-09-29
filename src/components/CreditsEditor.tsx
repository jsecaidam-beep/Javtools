import React, { useState, useRef } from 'react';
import { CreditsData, TeamContributor } from '../types/brand';
import { AchOfficialSvg } from './AchLogos';
import { downloadElementAsPng, copyElementAsPngToClipboard } from '../utils/canvasExport';
import {
  Copy,
  Download,
  Check,
  Sparkles,
  ArrowLeft,
  Users,
  Plus,
  Trash2,
  Palette,
  Columns2,
  FileText,
  ToggleLeft,
  ToggleRight,
  ClipboardList,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface CreditsEditorProps {
  creditsData: CreditsData;
  onChange: (updated: CreditsData) => void;
  onNavigateToCover: () => void;
}

export const CreditsEditor: React.FC<CreditsEditorProps> = ({
  creditsData,
  onChange,
  onNavigateToCover,
}) => {
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [donorInput, setDonorInput] = useState<string>('Fondo Humanitario Regional (RHPF LAC)');
  const [activeSubTab, setActiveSubTab] = useState<'text' | 'contributors' | 'colors' | 'ai'>('contributors');
  const [quickPasteOpen, setQuickPasteOpen] = useState<boolean>(false);
  const [quickPasteText, setQuickPasteText] = useState<string>('');

  const creditsCanvasRef = useRef<HTMLDivElement | null>(null);

  const updateField = (field: keyof CreditsData, value: any) => {
    onChange({
      ...creditsData,
      [field]: value,
    });
  };

  // Contributor helpers
  const handleAddContributor = () => {
    const newPerson: TeamContributor = {
      id: `contrib-${Date.now()}`,
      name: 'Nuevo Integrante',
      role: 'Especialista Técnico / Redactor',
    };
    onChange({
      ...creditsData,
      contributors: [...(creditsData.contributors || []), newPerson],
    });
  };

  const handleUpdateContributor = (id: string, field: 'name' | 'role', val: string) => {
    const updated = (creditsData.contributors || []).map((c) => (c.id === id ? { ...c, [field]: val } : c));
    onChange({
      ...creditsData,
      contributors: updated,
    });
  };

  const handleRemoveContributor = (id: string) => {
    const updated = (creditsData.contributors || []).filter((c) => c.id !== id);
    onChange({
      ...creditsData,
      contributors: updated,
    });
  };

  const handleQuickPasteImport = () => {
    if (!quickPasteText.trim()) return;
    const lines = quickPasteText.trim().split('\n').filter(Boolean);
    const newContributors: TeamContributor[] = lines.map((line, idx) => {
      const parts = line.split(/[-–—:|]/);
      const name = parts[0]?.trim() || line.trim();
      const role = parts.slice(1).join(' - ').trim();
      return {
        id: `contrib-pasted-${Date.now()}-${idx}`,
        name,
        role: role || undefined,
      };
    });

    onChange({
      ...creditsData,
      showPersonCredits: true,
      contributors: [...(creditsData.contributors || []), ...newContributors],
    });
    setQuickPasteText('');
    setQuickPasteOpen(false);
  };

  // AI Assistant for Credits
  const handleGenerateAiCredits = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donor: donorInput,
          projectTitle: creditsData.topBanner,
          countries: 'Guatemala y Honduras',
          currentAuthors: (creditsData.contributors || []).map((c) => c.name).join(', '),
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const aiContributors = Array.isArray(json.data.contributors)
          ? json.data.contributors.map((c: any, i: number) => ({
              id: `ai-c-${Date.now()}-${i}`,
              name: c.name || `Autor ${i + 1}`,
              role: c.role || 'Equipo de Proyecto',
            }))
          : creditsData.contributors;

        onChange({
          ...creditsData,
          topBanner: json.data.topBanner || creditsData.topBanner,
          subBanner: json.data.subBanner || creditsData.subBanner,
          donorAttribution: json.data.donorAttribution || creditsData.donorAttribution,
          disclaimer: json.data.disclaimer || creditsData.disclaimer,
          officeGuatemalaAddress: json.data.officeGuatemala || creditsData.officeGuatemalaAddress,
          officeHondurasAddress: json.data.officeHonduras || creditsData.officeHondurasAddress,
          pqrEmail: json.data.pqrEmail || creditsData.pqrEmail,
          commsEmail: json.data.commsEmail || creditsData.commsEmail,
          webUrl: json.data.webUrl || creditsData.webUrl,
          contributorsTitle: json.data.contributorsTitle || creditsData.contributorsTitle || 'EQUIPO TÉCNICO Y REDACCIÓN',
          showPersonCredits: true,
          contributors: aiContributors && aiContributors.length > 0 ? aiContributors : creditsData.contributors,
        });
      }
    } catch (e) {
      console.warn('AI credits error, applying local smart generator:', e);
      onChange({
        ...creditsData,
        donorAttribution: `Proyecto implementado por Fundación Acción contra el Hambre, con el apoyo financiero de ${donorInput || 'RHPF LAC'}.`,
        disclaimer: 'El contenido de este material es responsabilidad exclusiva de Acción contra el Hambre y no necesariamente refleja las opiniones, posiciones o políticas del donante.',
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  // Copy Credits as high-resolution PNG
  const handleCopyCreditsImage = async () => {
    if (!creditsCanvasRef.current) return;
    try {
      await copyElementAsPngToClipboard(creditsCanvasRef.current, {
        scale: 2,
        backgroundColor: null,
      });
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 3000);
    } catch (err) {
      console.error('Error copying credits image:', err);
      handleDownloadCreditsPng();
    }
  };

  const handleDownloadCreditsPng = async () => {
    if (!creditsCanvasRef.current || isDownloading) return;
    setIsDownloading(true);
    setDownloadError(null);
    try {
      await downloadElementAsPng(
        creditsCanvasRef.current,
        'contraportada-creditos-ach.png',
        { scale: 2, backgroundColor: null }
      );
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err: any) {
      console.error('Error downloading credits PNG:', err);
      setDownloadError(err?.message || 'Error al procesar la descarga de los créditos');
    } finally {
      setIsDownloading(false);
    }
  };

  const isShowingPersonCredits = creditsData.showPersonCredits !== false;
  const columnsCount = creditsData.personCreditsColumns || 2;
  const contributorsList = creditsData.contributors || [];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Top Banner / Actions Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 border border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToCover}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Volver a la portada"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-futura">
              <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/40">
                📄
              </span>
              Página de Créditos & Contraportada ACH
            </h2>
            <p className="text-xs text-slate-400 font-roboto">
              Configura los créditos al equipo redactor y técnico en 1 o 2 columnas, descargos del donante y canales oficiales
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Prominent Country Selector in Top Bar (Requested by user) */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700 shadow-inner">
            <span className="text-[11px] font-bold text-slate-400 px-1.5 select-none font-futura hidden sm:inline">
              Sede:
            </span>
            <button
              type="button"
              onClick={() => updateField('countrySelection', 'guatemala_only')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                creditsData.countrySelection === 'guatemala_only'
                  ? 'bg-[#005FB6] text-white shadow-md ring-1 ring-sky-300'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Mostrar únicamente la sede de Guatemala"
            >
              <span>🇬🇹 Solo Guatemala</span>
            </button>
            <button
              type="button"
              onClick={() => updateField('countrySelection', 'honduras_only')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                creditsData.countrySelection === 'honduras_only'
                  ? 'bg-[#005FB6] text-white shadow-md ring-1 ring-sky-300'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Mostrar únicamente la sede de Honduras"
            >
              <span>🇭🇳 Solo Honduras</span>
            </button>
            <button
              type="button"
              onClick={() => updateField('countrySelection', 'guatemala_honduras')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                creditsData.countrySelection === 'guatemala_honduras' || !creditsData.countrySelection
                  ? 'bg-[#005FB6] text-white shadow-md ring-1 ring-sky-300'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Mostrar ambas sedes: Guatemala y Honduras"
            >
              <span>🌎 Ambos Países</span>
            </button>
          </div>

          <button
            onClick={handleDownloadCreditsPng}
            disabled={isDownloading}
            title="Descargar Hoja de Créditos en PNG"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition shadow-sm ${
              downloadSuccess
                ? 'bg-[#52AE32] text-white border-[#52AE32] ring-2 ring-emerald-400'
                : isDownloading
                ? 'bg-slate-800 text-slate-400 border-slate-700 cursor-wait'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600 hover:border-slate-500'
            }`}
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                <span>Generando PNG...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>¡Créditos Descargados!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-[#52AE32]" />
                <span>Descargar PNG</span>
              </>
            )}
          </button>

          <button
            onClick={handleCopyCreditsImage}
            disabled={isDownloading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg ${
              copiedImage
                ? 'bg-[#52AE32] text-white ring-2 ring-emerald-400'
                : 'bg-gradient-to-r from-[#005FB6] to-[#004B91] hover:from-[#004B91] hover:to-[#003870] text-white shadow-[#005FB6]/30'
            }`}
          >
            {copiedImage ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>¡Contraportada Copiada!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar como Imagen para Word</span>
              </>
            )}
          </button>
        </div>
      </div>

      {downloadError && (
        <div className="p-3 bg-red-950/80 border border-red-500/80 rounded-xl text-red-200 text-xs flex items-center justify-between gap-2">
          <span>{downloadError}</span>
          <button onClick={() => setDownloadError(null)} className="text-red-400 font-bold hover:text-white">✕</button>
        </div>
      )}

      {/* Editor Layout: Form on Left, Live Render on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column Controls */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="grid grid-cols-4 bg-slate-900/80 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('contributors')}
              className={`py-2 rounded-lg transition flex items-center justify-center gap-1 ${
                activeSubTab === 'contributors' ? 'bg-[#005FB6] text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Autores</span>
            </button>
            <button
              onClick={() => setActiveSubTab('text')}
              className={`py-2 rounded-lg transition flex items-center justify-center gap-1 ${
                activeSubTab === 'text' ? 'bg-[#005FB6] text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Textos</span>
            </button>
            <button
              onClick={() => setActiveSubTab('colors')}
              className={`py-2 rounded-lg transition flex items-center justify-center gap-1 ${
                activeSubTab === 'colors' ? 'bg-[#005FB6] text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-sky-300" />
              <span>Color</span>
            </button>
            <button
              onClick={() => setActiveSubTab('ai')}
              className={`py-2 rounded-lg transition flex items-center justify-center gap-1 ${
                activeSubTab === 'ai' ? 'bg-[#EE7203] text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>IA</span>
            </button>
          </div>

          {/* TAB 1: CONTRIBUTORS / PERSON CREDITS (Requested by user) */}
          {activeSubTab === 'contributors' && (
            <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-col gap-4 text-xs">
              {/* The Toggle Switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-700">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs block font-futura">
                      ¿Hay créditos a personas / autores?
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Enlista a los redactores, especialistas e investigadores
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => updateField('showPersonCredits', !isShowingPersonCredits)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                    isShowingPersonCredits
                      ? 'bg-[#52AE32] text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                  }`}
                >
                  {isShowingPersonCredits ? (
                    <>
                      <ToggleRight className="w-4 h-4" />
                      <span>SÍ (Visible)</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4" />
                      <span>NO (Oculto)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Contributor Controls (Only if switch is ON) */}
              {isShowingPersonCredits && (
                <div className="space-y-3.5 animate-in fade-in">
                  {/* Title and Column Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        Título de la sección:
                      </label>
                      <input
                        type="text"
                        value={creditsData.contributorsTitle || 'EQUIPO TÉCNICO Y REDACCIÓN'}
                        onChange={(e) => updateField('contributorsTitle', e.target.value)}
                        placeholder="EQUIPO TÉCNICO Y REDACCIÓN"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-futura font-bold uppercase"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        Disposición en columnas:
                      </label>
                      <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
                        <button
                          type="button"
                          onClick={() => updateField('personCreditsColumns', 1)}
                          className={`py-1 rounded text-[11px] font-semibold transition ${
                            columnsCount === 1 ? 'bg-[#005FB6] text-white shadow' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          1 Columna
                        </button>
                        <button
                          type="button"
                          onClick={() => updateField('personCreditsColumns', 2)}
                          className={`py-1 rounded text-[11px] font-semibold transition flex items-center justify-center gap-1 ${
                            columnsCount === 2 ? 'bg-[#005FB6] text-white shadow' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Columns2 className="w-3 h-3" />
                          <span>2 Columnas</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Add Person & Quick Paste Modal */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
                    <span className="text-[11px] font-bold text-slate-300">
                      Personas acreditadas ({contributorsList.length}):
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setQuickPasteOpen(!quickPasteOpen)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] transition"
                      >
                        <ClipboardList className="w-3 h-3 text-sky-400" />
                        <span>Pegar lista</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddContributor}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#005FB6] hover:bg-[#004A8F] text-white text-[11px] font-bold transition shadow-sm"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Agregar</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Paste Input Drawer */}
                  {quickPasteOpen && (
                    <div className="p-3 bg-slate-900 border border-sky-500/40 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs text-sky-400 font-semibold">
                        <span>Pega aquí la lista de redactores (uno por línea):</span>
                        <button
                          type="button"
                          onClick={() => setQuickPasteOpen(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          ✕
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        value={quickPasteText}
                        onChange={(e) => setQuickPasteText(e.target.value)}
                        placeholder="Ejemplo:&#10;Licda. María José Morales - Coordinadora de Nutrición&#10;Ing. Carlos Mendoza - Especialista WASH&#10;Elena Ramírez - Asistente M&E"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-[#005FB6]"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setQuickPasteOpen(false)}
                          className="px-2.5 py-1 rounded text-[11px] text-slate-400 hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleQuickPasteImport}
                          className="px-3 py-1 rounded bg-[#52AE32] hover:bg-[#3E8C22] text-white text-[11px] font-bold transition"
                        >
                          Importar Lista
                        </button>
                      </div>
                    </div>
                  )}

                  {/* List of Persons */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {contributorsList.map((person, index) => (
                      <div
                        key={person.id}
                        className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/80 flex items-center gap-2 group"
                      >
                        <span className="text-[10px] font-mono text-slate-500 font-bold w-4 text-center">
                          {index + 1}
                        </span>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            value={person.name}
                            onChange={(e) => handleUpdateContributor(person.id, 'name', e.target.value)}
                            placeholder="Nombre completo..."
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-futura font-semibold focus:outline-none focus:border-[#005FB6]"
                          />
                          <input
                            type="text"
                            value={person.role || ''}
                            onChange={(e) => handleUpdateContributor(person.id, 'role', e.target.value)}
                            placeholder="Cargo o rol técnico..."
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 font-roboto focus:outline-none focus:border-[#005FB6]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveContributor(person.id)}
                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {contributorsList.length === 0 && (
                      <div className="text-center py-4 text-xs text-slate-400 bg-slate-900/40 rounded-lg border border-dashed border-slate-700">
                        No hay personas añadidas aún. Haz clic en "+ Agregar" o "Pegar lista".
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TEXT FIELDS (Banner, donor, disclaimer, offices, PQR) */}
          {activeSubTab === 'text' && (
            <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-col gap-3.5 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Titular Superior (Futura Bold)
                </label>
                <input
                  type="text"
                  value={creditsData.topBanner}
                  onChange={(e) => updateField('topBanner', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-bold uppercase font-futura"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Sub-titular de Contexto
                </label>
                <textarea
                  rows={2}
                  value={creditsData.subBanner}
                  onChange={(e) => updateField('subBanner', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Atribución al Donante (Aprobada)
                </label>
                <textarea
                  rows={2}
                  value={creditsData.donorAttribution}
                  onChange={(e) => updateField('donorAttribution', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Descargo de Responsabilidad (Disclaimer)
                </label>
                <textarea
                  rows={2}
                  value={creditsData.disclaimer}
                  onChange={(e) => updateField('disclaimer', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-roboto italic"
                />
              </div>

              <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#52AE32] block">
                    Presencia en Países
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Selecciona qué países mostrar
                  </span>
                </div>

                {/* Country Checkboxes & Selection Mode */}
                <div className="grid grid-cols-2 gap-2 pb-1 border-b border-slate-700/60">
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer hover:border-sky-500 transition">
                    <input
                      type="checkbox"
                      checked={creditsData.countrySelection !== 'honduras_only'}
                      onChange={(e) => {
                        const guatChecked = e.target.checked;
                        const hondChecked = creditsData.countrySelection !== 'guatemala_only';
                        if (guatChecked && hondChecked) updateField('countrySelection', 'guatemala_honduras');
                        else if (guatChecked && !hondChecked) updateField('countrySelection', 'guatemala_only');
                        else if (!guatChecked && hondChecked) updateField('countrySelection', 'honduras_only');
                        else updateField('countrySelection', 'guatemala_only'); // keep at least one
                      }}
                      className="rounded text-[#005FB6] focus:ring-[#005FB6] w-4 h-4 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white flex items-center gap-1">
                        <span>🇬🇹</span> <span>Guatemala</span>
                      </span>
                      <span className="text-[10px] text-slate-400">Oficina Nacional</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer hover:border-sky-500 transition">
                    <input
                      type="checkbox"
                      checked={creditsData.countrySelection !== 'guatemala_only'}
                      onChange={(e) => {
                        const hondChecked = e.target.checked;
                        const guatChecked = creditsData.countrySelection !== 'honduras_only';
                        if (guatChecked && hondChecked) updateField('countrySelection', 'guatemala_honduras');
                        else if (!guatChecked && hondChecked) updateField('countrySelection', 'honduras_only');
                        else if (guatChecked && !hondChecked) updateField('countrySelection', 'guatemala_only');
                        else updateField('countrySelection', 'honduras_only'); // keep at least one
                      }}
                      className="rounded text-[#005FB6] focus:ring-[#005FB6] w-4 h-4 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white flex items-center gap-1">
                        <span>🇭🇳</span> <span>Honduras</span>
                      </span>
                      <span className="text-[10px] text-slate-400">Presencia Nacional</span>
                    </div>
                  </label>
                </div>

                {/* Country Selection Mode Buttons */}
                <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => updateField('countrySelection', 'guatemala_only')}
                    className={`py-1.5 px-1 rounded text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      creditsData.countrySelection === 'guatemala_only'
                        ? 'bg-[#005FB6] text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🇬🇹 Solo Guat.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateField('countrySelection', 'honduras_only')}
                    className={`py-1.5 px-1 rounded text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      creditsData.countrySelection === 'honduras_only'
                        ? 'bg-[#005FB6] text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🇭🇳 Solo Hond.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateField('countrySelection', 'guatemala_honduras')}
                    className={`py-1.5 px-1 rounded text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                      (creditsData.countrySelection === 'guatemala_honduras' || !creditsData.countrySelection)
                        ? 'bg-[#005FB6] text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🌎 Ambos</span>
                  </button>
                </div>

                {/* Guatemala Address Field */}
                {(creditsData.countrySelection !== 'honduras_only') && (
                  <div>
                    <label className="text-[10px] font-bold text-sky-400 block mb-0.5">Sede Guatemala:</label>
                    <textarea
                      rows={2}
                      value={creditsData.officeGuatemalaAddress}
                      onChange={(e) => updateField('officeGuatemalaAddress', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                    />
                  </div>
                )}

                {/* Honduras Address Field */}
                {(creditsData.countrySelection !== 'guatemala_only') && (
                  <div>
                    <label className="text-[10px] font-bold text-sky-400 block mb-0.5">Presencia Honduras:</label>
                    <textarea
                      rows={2}
                      value={creditsData.officeHondurasAddress}
                      onChange={(e) => updateField('officeHondurasAddress', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Correo PQR</label>
                  <input
                    type="text"
                    value={creditsData.pqrEmail}
                    onChange={(e) => updateField('pqrEmail', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Correo Comunicación</label>
                  <input
                    type="text"
                    value={creditsData.commsEmail}
                    onChange={(e) => updateField('commsEmail', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COLORS & STYLES */}
          {activeSubTab === 'colors' && (
            <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-col gap-4 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-200 block mb-1.5 flex items-center justify-between">
                  <span>Modo de Color del Logo ACH Central</span>
                  <span className="text-[10px] text-sky-400 font-mono">
                    {creditsData.logoColorMode === 'white'
                      ? '⚪ Blanco Nítido'
                      : creditsData.logoColorMode === 'color'
                      ? '🎨 A Color Oficial'
                      : '🖤 Monocromático'}
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => updateField('logoColorMode', 'white')}
                    className={`p-2.5 rounded-lg border text-center transition flex flex-col items-center gap-1 ${
                      creditsData.logoColorMode === 'white'
                        ? 'bg-slate-700 border-white text-white font-bold ring-1 ring-white'
                        : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white border border-slate-300 shadow-sm" />
                    <span className="text-[10px]">Blanco</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateField('logoColorMode', 'color')}
                    className={`p-2.5 rounded-lg border text-center transition flex flex-col items-center gap-1 ${
                      creditsData.logoColorMode === 'color'
                        ? 'bg-slate-700 border-sky-400 text-white font-bold ring-1 ring-sky-400'
                        : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full flex overflow-hidden border border-slate-400">
                      <span className="w-1/2 h-full bg-[#53ae32]" />
                      <span className="w-1/2 h-full bg-[#076cb5]" />
                    </div>
                    <span className="text-[10px]">Color Oficial</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateField('logoColorMode', 'monochrome')}
                    className={`p-2.5 rounded-lg border text-center transition flex flex-col items-center gap-1 ${
                      creditsData.logoColorMode === 'monochrome'
                        ? 'bg-slate-700 border-slate-400 text-white font-bold ring-1 ring-slate-400'
                        : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-500 shadow-sm" />
                    <span className="text-[10px]">Monocromo</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-200 block mb-1.5">
                  Fondo de la Contraportada
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'gradient-blue', label: 'Azul ACH (Oficial)', preview: 'linear-gradient(135deg, #005FB6, #003366)' },
                    { id: 'gradient-green', label: 'Verde Esperanza', preview: 'linear-gradient(135deg, #52AE32, #1E4620)' },
                    { id: 'gradient-orange', label: 'Naranja ACH', preview: 'linear-gradient(135deg, #EE7203, #7A3500)' },
                    { id: 'dark-slate', label: 'Pizarra Oscura', preview: '#0F172A' },
                    { id: 'pure-white', label: 'Blanco Limpio', preview: '#FFFFFF' },
                  ].map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => {
                        updateField('bgTheme', bg.id);
                        if (bg.id === 'pure-white') {
                          updateField('logoColorMode', 'color');
                        } else {
                          updateField('logoColorMode', 'white');
                        }
                      }}
                      className={`p-2 rounded-lg border text-center transition flex flex-col items-center gap-1 ${
                        creditsData.bgTheme === bg.id
                          ? 'border-white bg-slate-800 ring-2 ring-sky-400'
                          : 'border-slate-700 bg-slate-900 hover:bg-slate-800'
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-full border border-white/30"
                        style={{ background: bg.preview }}
                      />
                      <span className="text-[10px] text-slate-200 font-medium truncate w-full">
                        {bg.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/80">
                <label className="text-[10px] font-bold text-slate-300 block mb-1">
                  O color de fondo personalizado (Hex):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={creditsData.bgCustom || '#005FB6'}
                    onChange={(e) => {
                      updateField('bgCustom', e.target.value);
                      updateField('bgTheme', 'custom');
                    }}
                    className="w-10 h-8 rounded border border-slate-600 bg-transparent cursor-pointer p-0"
                  />
                  <input
                    type="text"
                    value={creditsData.bgCustom || '#005FB6'}
                    onChange={(e) => {
                      updateField('bgCustom', e.target.value);
                      updateField('bgTheme', 'custom');
                    }}
                    placeholder="#005FB6"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs uppercase"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AI ASSISTANT */}
          {activeSubTab === 'ai' && (
            <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-col gap-3.5 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white font-futura">Redactor IA de Créditos y Autores</span>
              </div>
              <p className="text-slate-300 text-[11px] font-roboto">
                Genera automáticamente las atribuciones correctas de marca, cláusulas de responsabilidad y sugerencias de cargos técnicos humanitarios.
              </p>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                  Nombre del Donante / Fondo:
                </label>
                <input
                  type="text"
                  value={donorInput}
                  onChange={(e) => setDonorInput(e.target.value)}
                  placeholder="ej: Fondo Humanitario Regional (RHPF LAC) o ECHO / AECID..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-[#EE7203]"
                />
              </div>

              <button
                onClick={handleGenerateAiCredits}
                disabled={isAiLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#EE7203] to-[#C45B00] hover:opacity-95 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>{isAiLoading ? 'Redactando con Gemini...' : 'Redactar Créditos con IA'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Live A4 Rendered Container */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center">
          <div className="text-[11px] text-slate-400 mb-2 flex flex-wrap items-center justify-between w-full max-w-[540px] gap-2">
            <div className="flex items-center gap-2">
              <span>Contraportada Oficial (A4 Vertical)</span>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span className="text-sky-400 font-semibold">Identidad ACH</span>
            </div>

            {/* Quick Country Switcher above Preview */}
            <div className="flex items-center gap-1 bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-700 text-[10.5px]">
              <span className="text-slate-400 font-semibold mr-0.5">Sede:</span>
              <button
                type="button"
                onClick={() => updateField('countrySelection', 'guatemala_only')}
                className={`px-1.5 py-0.5 rounded font-bold transition ${
                  creditsData.countrySelection === 'guatemala_only'
                    ? 'bg-[#005FB6] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🇬🇹 Solo GT
              </button>
              <button
                type="button"
                onClick={() => updateField('countrySelection', 'honduras_only')}
                className={`px-1.5 py-0.5 rounded font-bold transition ${
                  creditsData.countrySelection === 'honduras_only'
                    ? 'bg-[#005FB6] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🇭🇳 Solo HN
              </button>
              <button
                type="button"
                onClick={() => updateField('countrySelection', 'guatemala_honduras')}
                className={`px-1.5 py-0.5 rounded font-bold transition ${
                  creditsData.countrySelection === 'guatemala_honduras' || !creditsData.countrySelection
                    ? 'bg-[#005FB6] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🌎 Ambos
              </button>
            </div>
          </div>

          {/* Physical Container */}
          <div
            ref={creditsCanvasRef}
            className="w-full max-w-[540px] shadow-2xl rounded-sm overflow-hidden border border-slate-700 relative flex flex-col justify-between aspect-[1/1.414] p-8 sm:p-10 select-none transition-all duration-300"
            style={{
              background:
                creditsData.bgTheme === 'custom'
                  ? creditsData.bgCustom || '#005FB6'
                  : creditsData.bgTheme === 'gradient-green'
                  ? 'linear-gradient(145deg, #52AE32 0%, #3B7D24 50%, #1E4620 100%)'
                  : creditsData.bgTheme === 'gradient-orange'
                  ? 'linear-gradient(145deg, #EE7203 0%, #C45B00 50%, #7A3500 100%)'
                  : creditsData.bgTheme === 'dark-slate'
                  ? 'linear-gradient(145deg, #1E293B 0%, #0F172A 100%)'
                  : creditsData.bgTheme === 'pure-white'
                  ? '#FFFFFF'
                  : 'linear-gradient(145deg, #005FB6 0%, #004A8F 50%, #003366 100%)',
              color: creditsData.bgTheme === 'pure-white' ? '#0F172A' : '#FFFFFF',
              minHeight: '700px',
            }}
          >
            {/* Ambient Watermark vector silhouettes */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
              <div
                className="absolute top-1/4 -right-16 w-80 h-80 rounded-full border-[36px]"
                style={{ borderColor: creditsData.bgTheme === 'pure-white' ? '#005FB6' : '#FFFFFF' }}
              />
              <div
                className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full border-[32px]"
                style={{ borderColor: creditsData.bgTheme === 'pure-white' ? '#52AE32' : '#FFFFFF' }}
              />
            </div>

            {/* Top Banner Block */}
            <div className="relative z-10 text-center flex flex-col items-center gap-1.5 pt-2">
              <h2
                className="text-xl sm:text-2xl font-black tracking-wider uppercase font-futura"
                style={{ color: creditsData.bgTheme === 'pure-white' ? '#005FB6' : '#FFFFFF' }}
              >
                {creditsData.topBanner}
              </h2>
              <div
                className="text-xs sm:text-sm font-bold uppercase tracking-wide font-futura whitespace-pre-line leading-snug max-w-sm opacity-95"
                style={{ color: creditsData.bgTheme === 'pure-white' ? '#334155' : 'rgba(255,255,255,0.95)' }}
              >
                {creditsData.subBanner}
              </div>
            </div>

            {/* Center Massive ACH Logo & Mission Title */}
            <div className="relative z-10 flex flex-col items-center text-center my-4 gap-2.5">
              <div className="scale-110 my-1 max-w-[260px]">
                <AchOfficialSvg
                  variant={
                    creditsData.logoColorMode !== 'auto'
                      ? creditsData.logoColorMode
                      : creditsData.bgTheme === 'pure-white'
                      ? 'color'
                      : 'white'
                  }
                  className="h-12 sm:h-14 w-auto"
                />
              </div>
              <div
                className="text-xs sm:text-sm font-semibold font-futura whitespace-pre-line max-w-md pt-1 opacity-90"
                style={{ color: creditsData.bgTheme === 'pure-white' ? '#475569' : '#FFFFFF' }}
              >
                {creditsData.missionSubtitle}
              </div>
            </div>

            {/* SECTION: ENLISTED PERSON CREDITS (Authors / Technical Team) */}
            {isShowingPersonCredits && contributorsList.length > 0 && (
              <div
                className="relative z-10 w-full my-3 px-3 py-3 rounded-lg border transition-all"
                style={{
                  backgroundColor:
                    creditsData.bgTheme === 'pure-white' ? 'rgba(0, 95, 182, 0.04)' : 'rgba(255, 255, 255, 0.08)',
                  borderColor:
                    creditsData.bgTheme === 'pure-white' ? 'rgba(0, 95, 182, 0.2)' : 'rgba(255, 255, 255, 0.2)',
                }}
              >
                {/* Section Title */}
                <div
                  className="font-black text-xs sm:text-sm tracking-wider uppercase font-futura text-center mb-2.5 pb-1 border-b"
                  style={{
                    borderColor: creditsData.bgTheme === 'pure-white' ? 'rgba(0, 95, 182, 0.2)' : 'rgba(255, 255, 255, 0.2)',
                    color: creditsData.bgTheme === 'pure-white' ? '#005FB6' : '#FFFFFF',
                  }}
                >
                  {creditsData.contributorsTitle || 'EQUIPO TÉCNICO Y REDACCIÓN'}
                </div>

                {/* Enlisted Contributors Grid (1 or 2 Columns) */}
                <div
                  className={`grid ${
                    columnsCount === 1
                      ? 'grid-cols-1 gap-2 max-w-md mx-auto'
                      : 'grid-cols-2 gap-x-4 gap-y-2.5'
                  }`}
                >
                  {contributorsList.map((person) => (
                    <div
                      key={person.id}
                      className="text-left border-l-2 pl-2.5 transition-all"
                      style={{
                        borderColor: creditsData.bgTheme === 'pure-white' ? '#52AE32' : '#38BDF8',
                      }}
                    >
                      <div
                        className="font-bold text-xs sm:text-[13px] leading-tight font-futura"
                        style={{
                          color: creditsData.bgTheme === 'pure-white' ? '#0F172A' : '#FFFFFF',
                        }}
                      >
                        {person.name}
                      </div>
                      {person.role && (
                        <div
                          className="text-[9.5px] sm:text-[10.5px] font-roboto leading-snug mt-0.5 opacity-90"
                          style={{
                            color: creditsData.bgTheme === 'pure-white' ? '#475569' : '#E2E8F0',
                          }}
                        >
                          {person.role}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Section: Address Columns + PQR + Website */}
            <div
              className="relative z-10 flex flex-col gap-3 text-[10px] sm:text-[11px] font-roboto border-t pt-3"
              style={{
                borderColor:
                  creditsData.bgTheme === 'pure-white' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)',
              }}
            >
              {/* Offices Layout (Solo Guatemala, Solo Honduras o Ambos) */}
              {creditsData.countrySelection === 'guatemala_only' ? (
                <div className="text-center space-y-0.5 pb-1 max-w-sm mx-auto">
                  <div
                    className="font-bold text-xs uppercase font-futura flex items-center justify-center gap-1.5"
                    style={{ color: creditsData.bgTheme === 'pure-white' ? '#005FB6' : '#FFFFFF' }}
                  >
                    <span>🇬🇹</span>
                    <span>{creditsData.officeGuatemalaTitle || 'Oficina Nacional Guatemala'}</span>
                  </div>
                  <div
                    className="whitespace-pre-line leading-tight opacity-85 text-[10px] sm:text-[11px]"
                    style={{ color: creditsData.bgTheme === 'pure-white' ? '#334155' : '#FFFFFF' }}
                  >
                    {creditsData.officeGuatemalaAddress}
                  </div>
                </div>
              ) : creditsData.countrySelection === 'honduras_only' ? (
                <div className="text-center space-y-0.5 pb-1 max-w-sm mx-auto">
                  <div
                    className="font-bold text-xs uppercase font-futura flex items-center justify-center gap-1.5"
                    style={{ color: creditsData.bgTheme === 'pure-white' ? '#005FB6' : '#FFFFFF' }}
                  >
                    <span>🇭🇳</span>
                    <span>{creditsData.officeHondurasTitle || 'Oficina Nacional Honduras'}</span>
                  </div>
                  <div
                    className="whitespace-pre-line leading-tight opacity-85 text-[10px] sm:text-[11px]"
                    style={{ color: creditsData.bgTheme === 'pure-white' ? '#334155' : '#FFFFFF' }}
                  >
                    {creditsData.officeHondurasAddress}
                  </div>
                </div>
              ) : (
                /* Ambos: Guatemala & Honduras en 2 columnas */
                <div className="grid grid-cols-2 gap-4 pb-1">
                  <div className="space-y-0.5">
                    <div
                      className="font-bold text-xs uppercase font-futura flex items-center gap-1"
                      style={{ color: creditsData.bgTheme === 'pure-white' ? '#005FB6' : '#FFFFFF' }}
                    >
                      <span>🇬🇹</span>
                      <span>{creditsData.officeGuatemalaTitle}</span>
                    </div>
                    <div
                      className="whitespace-pre-line leading-tight opacity-80"
                      style={{ color: creditsData.bgTheme === 'pure-white' ? '#334155' : '#FFFFFF' }}
                    >
                      {creditsData.officeGuatemalaAddress}
                    </div>
                  </div>

                  <div
                    className="space-y-0.5 border-l pl-3"
                    style={{
                      borderColor:
                        creditsData.bgTheme === 'pure-white' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)',
                    }}
                  >
                    <div
                      className="font-bold text-xs uppercase font-futura flex items-center gap-1"
                      style={{ color: creditsData.bgTheme === 'pure-white' ? '#005FB6' : '#FFFFFF' }}
                    >
                      <span>🇭🇳</span>
                      <span>{creditsData.officeHondurasTitle}</span>
                    </div>
                    <div
                      className="whitespace-pre-line leading-tight opacity-80"
                      style={{ color: creditsData.bgTheme === 'pure-white' ? '#334155' : '#FFFFFF' }}
                    >
                      {creditsData.officeHondurasAddress}
                    </div>
                  </div>
                </div>
              )}

              {/* PQR Channels */}
              <div className="text-center space-y-0.5 pt-0.5">
                <div
                  className="font-bold font-futura text-xs"
                  style={{ color: creditsData.bgTheme === 'pure-white' ? '#005FB6' : '#FFFFFF' }}
                >
                  {creditsData.pqrTitle}
                </div>
                <div
                  className="font-mono text-[10px] opacity-90"
                  style={{ color: creditsData.bgTheme === 'pure-white' ? '#334155' : '#FFFFFF' }}
                >
                  {creditsData.pqrEmail}
                </div>
                <div
                  className="font-mono text-[10px] opacity-90"
                  style={{ color: creditsData.bgTheme === 'pure-white' ? '#334155' : '#FFFFFF' }}
                >
                  {creditsData.commsEmail}
                </div>
              </div>

              {/* Official Web URL */}
              <div
                className="text-center pt-2 border-t"
                style={{
                  borderColor:
                    creditsData.bgTheme === 'pure-white' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)',
                }}
              >
                <span
                  className="font-extrabold text-xs sm:text-sm tracking-wider font-futura"
                  style={{ color: creditsData.bgTheme === 'pure-white' ? '#52AE32' : '#FFFFFF' }}
                >
                  {creditsData.webUrl}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
