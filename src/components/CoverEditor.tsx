import React, { useState, useRef } from 'react';
import {
  CoverData,
  LogoItem,
  CoverStyle,
  CreditsData,
} from '../types/brand';
import {
  AVAILABLE_PARTNER_LOGOS,
  PRELOADED_COVER_PHOTOS,
} from '../constants/brandAssets';
import { AchOfficialSvg, RhpfLogoSvg, DynamicLogoRenderer } from './AchLogos';
import { downloadElementAsPng, copyElementAsPngToClipboard } from '../utils/canvasExport';
import {
  Sparkles,
  Image as ImageIcon,
  Upload,
  Copy,
  Download,
  Check,
  AlertTriangle,
  ArrowRight,
  Plus,
  Trash2,
  Sliders,
  Type,
  Layers,
  FileCheck2,
  Palette,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

// Reusable switch control matching the user's requested mechanics
const ToggleSwitch: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  compact?: boolean;
}> = ({ label, description, checked, onChange, compact = false }) => {
  if (compact) {
    return (
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition select-none ${
          checked
            ? 'bg-[#52AE32] text-white shadow-xs'
            : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
        }`}
        title={checked ? `${label}: Visible (haz clic para ocultar)` : `${label}: Oculto (haz clic para mostrar)`}
      >
        {checked ? (
          <>
            <ToggleRight className="w-3.5 h-3.5" />
            <span>Visible</span>
          </>
        ) : (
          <>
            <ToggleLeft className="w-3.5 h-3.5" />
            <span>Oculto</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 transition-all hover:border-slate-600">
      <div className="pr-2">
        <span className="font-bold text-white text-xs block font-futura flex items-center gap-1.5">
          {checked ? <Eye className="w-3.5 h-3.5 text-[#52AE32]" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
          {label}
        </span>
        {description && <span className="text-[10px] text-slate-400 block leading-tight mt-0.5">{description}</span>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition shrink-0 select-none ${
          checked
            ? 'bg-[#52AE32] text-white shadow-md'
            : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
        }`}
      >
        {checked ? (
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
  );
};

interface CoverEditorProps {
  coverData: CoverData;
  onChange: (updated: CoverData) => void;
  onNavigateToCredits: (suggestedData?: Partial<CreditsData>) => void;
}

export const CoverEditor: React.FC<CoverEditorProps> = ({
  coverData,
  onChange,
  onNavigateToCredits,
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'elements' | 'photo' | 'logos' | 'colors' | 'ai'>('content');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiTopic, setAiTopic] = useState<string>('');
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [customLogoName, setCustomLogoName] = useState<string>('');

  const coverCanvasRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const updateField = (field: keyof CoverData, value: any) => {
    onChange({
      ...coverData,
      [field]: value,
    });
  };

  // Add a predefined or custom logo
  const addLogo = (logo: LogoItem) => {
    if (coverData.logos.some((l) => l.id === logo.id)) return;
    updateField('logos', [...coverData.logos, logo]);
  };

  const addCustomLogo = () => {
    if (!customLogoName.trim()) return;
    const newLogo: LogoItem = {
      id: `custom-logo-${Date.now()}`,
      name: customLogoName.trim(),
      type: 'partner',
      isCustom: true,
    };
    updateField('logos', [...coverData.logos, newLogo]);
    setCustomLogoName('');
  };

  // Upload custom PNG/JPG logo
  const handleLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').toUpperCase();
        const uploadedLogo: LogoItem = {
          id: `custom-upload-${Date.now()}`,
          name: cleanName || 'Logotipo Socio',
          url: e.target.result as string,
          type: 'partner',
          isCustom: true,
        };
        updateField('logos', [...coverData.logos, uploadedLogo]);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = (id: string) => {
    updateField('logos', coverData.logos.filter((l) => l.id !== id));
  };

  // Handle Photo upload
  const handlePhotoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        updateField('photoUrl', e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Call AI Assistant for Cover
  const handleGenerateAiCover = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai/cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic || coverData.title,
          context: coverData.subtitle,
          documentType: coverData.categoryPill,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        onChange({
          ...coverData,
          categoryPill: json.data.documentCategory || coverData.categoryPill,
          title: json.data.title || coverData.title,
          subtitle: json.data.subtitle || coverData.subtitle,
          projectCode: json.data.projectCode || coverData.projectCode,
          internalCode: json.data.internalCode || coverData.internalCode,
          location: json.data.location || coverData.location,
          authorName: json.data.authorName || coverData.authorName,
          authorRole: json.data.authorRole || coverData.authorRole,
          authorBase: json.data.authorBase || coverData.authorBase,
        });
      }
    } catch (e) {
      console.warn('AI cover API unreachable, applying local smart generator:', e);
      const cleanTitle = (aiTopic || coverData.title || 'RESPUESTA HUMANITARIA Y SEGURIDAD ALIMENTARIA').toUpperCase();
      onChange({
        ...coverData,
        title: cleanTitle,
        categoryPill: 'INFORME DE ACOMPAÑAMIENTO, MONITOREO Y SUPERVISIÓN',
        subtitle: `Acciones de asistencia humanitaria y nutricional en municipios priorizados. ${aiTopic || ''}`.trim(),
        projectCode: 'CBPF-GTM-R-INGO-NSFT-39626',
        internalCode: 'GTD5AI',
        location: 'Chiquimula y Huehuetenango, Guatemala',
        authorName: coverData.authorName || 'Equipo Técnico Humanitario',
        authorRole: 'Oficial de Proyecto y Monitoreo',
        authorBase: 'Base Regional Chiquimula',
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  // Export / Copy Cover as high-resolution PNG
  const handleCopyCoverImage = async () => {
    if (!coverCanvasRef.current) return;
    try {
      await copyElementAsPngToClipboard(coverCanvasRef.current, {
        scale: 2,
        backgroundColor: '#FFFFFF',
      });
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 3000);
    } catch (err) {
      console.error('Error copying cover image:', err);
      handleDownloadCoverPng();
    }
  };

  const handleDownloadCoverPng = async () => {
    if (!coverCanvasRef.current || isDownloading) return;
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const cleanSlug = (coverData.title || 'oficial')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 35);
      await downloadElementAsPng(
        coverCanvasRef.current,
        `portada-ach-${cleanSlug || 'oficial'}.png`,
        { scale: 2, backgroundColor: '#FFFFFF' }
      );
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err: any) {
      console.error('Error downloading cover PNG:', err);
      setDownloadError(err?.message || 'Error al procesar la descarga de la portada');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleProceedToCredits = () => {
    onNavigateToCredits({
      topBanner: coverData.title.length > 30 ? coverData.title.slice(0, 30) + '...' : coverData.title,
      subBanner: `${coverData.location || 'Guatemala'} • ${coverData.projectCode || ''}`.trim(),
      donorAttribution: `Proyecto implementado por Fundación Acción contra el Hambre, con el apoyo de socios y donantes en ${coverData.location || 'Centroamérica'}.`,
      logos: coverData.logos,
    });
  };

  const isMoreThanThreeLogos = coverData.logos.length > 3;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Top Banner / Actions Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 border border-white/10">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2 font-futura">
            <span className="p-1.5 rounded-lg bg-[#EE7203]/20 text-[#EE7203] border border-[#EE7203]/40">
              🎨
            </span>
            Editor de Portadas Humanitarias (Estilo Canva)
          </h2>
          <p className="text-xs text-slate-400 font-roboto">
            Diseña la portada oficial con tipografía Futura, fotos de campo, switches de visibilidad y regla de 3 logotipos
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Download button with real feedback */}
          <button
            onClick={handleDownloadCoverPng}
            disabled={isDownloading}
            title="Descargar Portada en alta resolución PNG"
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
                <span>¡Portada Descargada!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-[#52AE32]" />
                <span>Descargar PNG</span>
              </>
            )}
          </button>

          <button
            onClick={handleCopyCoverImage}
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
                <span>¡Portada Copiada para Word!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Portada como Imagen</span>
              </>
            )}
          </button>

          <button
            onClick={handleProceedToCredits}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#52AE32] hover:bg-[#469829] text-white text-xs font-bold transition shadow-lg shadow-[#52AE32]/20"
          >
            <span>Generar Hoja de Créditos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {downloadError && (
        <div className="p-3 bg-red-950/80 border border-red-500/80 rounded-xl text-red-200 text-xs flex items-center justify-between gap-2">
          <span>{downloadError}</span>
          <button onClick={() => setDownloadError(null)} className="text-red-400 font-bold hover:text-white">✕</button>
        </div>
      )}

      {/* Main Studio Area: Controls on Left, Live Canvas on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column (Canva Sidebar) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Tabs Selector */}
          <div className="grid grid-cols-6 bg-slate-900/80 p-1 rounded-xl border border-slate-700 text-[10px] sm:text-[11px] font-semibold gap-0.5">
            <button
              onClick={() => setActiveTab('content')}
              className={`py-2 px-1 rounded-lg transition text-center ${
                activeTab === 'content' ? 'bg-[#005FB6] text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Textos
            </button>
            <button
              onClick={() => setActiveTab('elements')}
              className={`py-2 px-1 rounded-lg transition text-center flex items-center justify-center gap-1 ${
                activeTab === 'elements' ? 'bg-[#52AE32] text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>Switches</span>
            </button>
            <button
              onClick={() => setActiveTab('photo')}
              className={`py-2 px-1 rounded-lg transition text-center ${
                activeTab === 'photo' ? 'bg-[#005FB6] text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Foto
            </button>
            <button
              onClick={() => setActiveTab('logos')}
              className={`py-2 px-1 rounded-lg transition text-center ${
                activeTab === 'logos' ? 'bg-[#005FB6] text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Logos ({coverData.logos.length})
            </button>
            <button
              onClick={() => setActiveTab('colors')}
              className={`py-2 px-1 rounded-lg transition flex items-center justify-center gap-1 ${
                activeTab === 'colors' ? 'bg-[#005FB6] text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Palette className="w-3 h-3 text-sky-300" />
              <span>Color</span>
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`py-2 px-1 rounded-lg transition flex items-center justify-center gap-1 ${
                activeTab === 'ai' ? 'bg-[#EE7203] text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>IA</span>
            </button>
          </div>

          {/* Tab 1: Content & Texts */}
          {activeTab === 'content' && (
            <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-col gap-3.5 text-xs">
              {/* Quick switch info banner */}
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/80 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#52AE32]" />
                  <span>Usa los switches para activar u ocultar códigos o secciones:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('elements')}
                  className="text-[10px] font-bold text-sky-400 hover:underline shrink-0"
                >
                  Panel Switches →
                </button>
              </div>

              {/* Style selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Estilo de Maqueta de Portada
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateField('style', 'monitoring')}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      coverData.style === 'monitoring'
                        ? 'bg-[#005FB6]/20 border-[#005FB6] text-white font-bold'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="block text-xs font-semibold">1. Informe de Monitoreo</span>
                    <span className="text-[10px] text-slate-400">Azul superior + foto central + banda verde</span>
                  </button>
                  <button
                    onClick={() => updateField('style', 'identity-box')}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      coverData.style === 'identity-box'
                        ? 'bg-[#52AE32]/20 border-[#52AE32] text-white font-bold'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="block text-xs font-semibold">2. Guía Editorial</span>
                    <span className="text-[10px] text-slate-400">Foto superior + caja verde sólida</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-300">
                    Píldora / Categoría de Documento
                  </label>
                  <ToggleSwitch
                    compact
                    label="Píldora"
                    checked={coverData.showCategoryPill !== false}
                    onChange={(v) => updateField('showCategoryPill', v)}
                  />
                </div>
                <input
                  type="text"
                  value={coverData.categoryPill}
                  onChange={(e) => updateField('categoryPill', e.target.value)}
                  placeholder="ej: INFORME DE ACOMPAÑAMIENTO, MONITOREO Y SUPERVISIÓN"
                  className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#005FB6] ${
                    coverData.showCategoryPill === false ? 'opacity-50' : ''
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Título Principal (Futura Bold)
                </label>
                <textarea
                  rows={2}
                  value={coverData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Título del documento..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#005FB6] font-bold uppercase font-futura"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-300">
                    Subtítulo / Descripción
                  </label>
                  <ToggleSwitch
                    compact
                    label="Subtítulo"
                    checked={coverData.showSubtitle !== false}
                    onChange={(v) => updateField('showSubtitle', v)}
                  />
                </div>
                <textarea
                  rows={2}
                  value={coverData.subtitle}
                  onChange={(e) => updateField('subtitle', e.target.value)}
                  placeholder="Descripción técnica o alcance..."
                  className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#005FB6] ${
                    coverData.showSubtitle === false ? 'opacity-50' : ''
                  }`}
                />
              </div>

              {/* Codes row with switches */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-700/80">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-300">Código Proyecto</label>
                    <ToggleSwitch
                      compact
                      label="Código Proyecto"
                      checked={coverData.showProjectCode !== false}
                      onChange={(v) => updateField('showProjectCode', v)}
                    />
                  </div>
                  <input
                    type="text"
                    value={coverData.projectCode}
                    onChange={(e) => updateField('projectCode', e.target.value)}
                    placeholder="ej: CBPF-GTM-..."
                    className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs ${
                      coverData.showProjectCode === false ? 'opacity-50' : ''
                    }`}
                  />
                </div>

                <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-700/80">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-300">Código Interno</label>
                    <ToggleSwitch
                      compact
                      label="Código Interno"
                      checked={coverData.showInternalCode !== false}
                      onChange={(v) => updateField('showInternalCode', v)}
                    />
                  </div>
                  <input
                    type="text"
                    value={coverData.internalCode}
                    onChange={(e) => updateField('internalCode', e.target.value)}
                    placeholder="ej: GTD5AI"
                    className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs ${
                      coverData.showInternalCode === false ? 'opacity-50' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Location & Date with switches */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-700/80">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-300">Ubicación</label>
                    <ToggleSwitch
                      compact
                      label="Ubicación"
                      checked={coverData.showLocation !== false}
                      onChange={(v) => updateField('showLocation', v)}
                    />
                  </div>
                  <input
                    type="text"
                    value={coverData.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs ${
                      coverData.showLocation === false ? 'opacity-50' : ''
                    }`}
                  />
                </div>

                <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-700/80">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-300">Fecha</label>
                    <ToggleSwitch
                      compact
                      label="Fecha"
                      checked={coverData.showDate !== false}
                      onChange={(v) => updateField('showDate', v)}
                    />
                  </div>
                  <input
                    type="text"
                    value={coverData.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs ${
                      coverData.showDate === false ? 'opacity-50' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Author footer */}
              <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#52AE32]">
                    Responsable / Autor (Banda Inferior)
                  </span>
                  <ToggleSwitch
                    compact
                    label="Banda Autor"
                    checked={coverData.showAuthorBlock !== false}
                    onChange={(v) => updateField('showAuthorBlock', v)}
                  />
                </div>
                <input
                  type="text"
                  value={coverData.authorName}
                  onChange={(e) => updateField('authorName', e.target.value)}
                  placeholder="Nombre y apellido..."
                  className={`w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white ${
                    coverData.showAuthorBlock === false ? 'opacity-50' : ''
                  }`}
                />
                <input
                  type="text"
                  value={coverData.authorRole}
                  onChange={(e) => updateField('authorRole', e.target.value)}
                  placeholder="Cargo institucional..."
                  className={`w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white ${
                    coverData.showAuthorBlock === false ? 'opacity-50' : ''
                  }`}
                />
                <input
                  type="text"
                  value={coverData.authorBase}
                  onChange={(e) => updateField('authorBase', e.target.value)}
                  placeholder="Base o Delegación (ej: Base Chiquimula)..."
                  className={`w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white ${
                    coverData.showAuthorBlock === false ? 'opacity-50' : ''
                  }`}
                />
              </div>
            </div>
          )}

          {/* Tab 2: Elements & Switches (Requested by user) */}
          {activeTab === 'elements' && (
            <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-col gap-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <div>
                  <h3 className="font-bold text-white text-xs font-futura flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#52AE32]" />
                    Visibilidad de Elementos en Portada
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Activa u oculta con precisión cada dato o bloque de la portada oficial.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onChange({
                        ...coverData,
                        showCategoryPill: true,
                        showSubtitle: true,
                        showProjectCode: true,
                        showInternalCode: true,
                        showLocation: true,
                        showDate: true,
                        showAuthorBlock: true,
                        showLogos: true,
                        showPhoto: true,
                      });
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded-lg text-[10px] font-bold transition"
                  >
                    Mostrar Todo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({
                        ...coverData,
                        showInternalCode: false,
                        showProjectCode: false,
                      });
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-lg text-[10px] font-bold transition"
                  >
                    Sin Códigos
                  </button>
                </div>
              </div>

              {/* Group 1: Codes */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-sky-400 block tracking-wider">
                  1. Códigos y Gestión Interna
                </span>
                <ToggleSwitch
                  label="Código Interno (ej. GTD5AI)"
                  description="Código interno de misión o proyecto. Puedes desactivarlo si no deseas mostrarlo."
                  checked={coverData.showInternalCode !== false}
                  onChange={(val) => updateField('showInternalCode', val)}
                />
                <ToggleSwitch
                  label="Código de Proyecto (ej. CBPF-GTM...)"
                  description="Identificador oficial del proyecto o donante"
                  checked={coverData.showProjectCode !== false}
                  onChange={(val) => updateField('showProjectCode', val)}
                />
              </div>

              {/* Group 2: Content & Hierarchy */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
                  2. Textos y Datos del Documento
                </span>
                <ToggleSwitch
                  label="Píldora / Tipo de Documento"
                  description="Caja blanca superior con la categoría (ej: INFORME DE MONITOREO)"
                  checked={coverData.showCategoryPill !== false}
                  onChange={(val) => updateField('showCategoryPill', val)}
                />
                <ToggleSwitch
                  label="Subtítulo / Alcance"
                  description="Descripción del informe bajo el título principal"
                  checked={coverData.showSubtitle !== false}
                  onChange={(val) => updateField('showSubtitle', val)}
                />
                <ToggleSwitch
                  label="Ubicación Geográfica"
                  description="Lugar o municipios cubiertos por el informe"
                  checked={coverData.showLocation !== false}
                  onChange={(val) => updateField('showLocation', val)}
                />
                <ToggleSwitch
                  label="Fecha de Emisión"
                  description="Fecha visible en los metadatos de la cabecera"
                  checked={coverData.showDate !== false}
                  onChange={(val) => updateField('showDate', val)}
                />
              </div>

              {/* Group 3: Visual Identity & Layout */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
                  3. Identidad Visual y Secciones Gráficas
                </span>
                <ToggleSwitch
                  label="Banda Verde de Autoría (Pie de Portada)"
                  description="Banda verde inferior con autor, cargo y base regional"
                  checked={coverData.showAuthorBlock !== false}
                  onChange={(val) => updateField('showAuthorBlock', val)}
                />
                <ToggleSwitch
                  label="Barra de Logotipos"
                  description="Logotipos institucionales de Acción contra el Hambre y socios"
                  checked={coverData.showLogos !== false}
                  onChange={(val) => updateField('showLogos', val)}
                />
                <ToggleSwitch
                  label="Fotografía Humanitaria"
                  description="Foto de campo o fondo corporativo institucional con marca de agua"
                  checked={coverData.showPhoto !== false}
                  onChange={(val) => updateField('showPhoto', val)}
                />
              </div>
            </div>
          )}

          {/* Tab 2: Photos */}
          {activeTab === 'photo' && (
            <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-col gap-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">Subir Fotografía Propia</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handlePhotoUpload(e.target.files[0]);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#005FB6] hover:bg-[#004A8F] text-white text-xs font-semibold"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Seleccionar Archivo</span>
                </button>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 block mb-2">
                  O elige entre fotografías humanitarias precargadas:
                </span>
                <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {PRELOADED_COVER_PHOTOS.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => updateField('photoUrl', photo.url)}
                      className={`relative group rounded-lg overflow-hidden border cursor-pointer transition-all ${
                        coverData.photoUrl === photo.url
                          ? 'border-[#52AE32] ring-2 ring-[#52AE32]'
                          : 'border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <img src={photo.url} alt={photo.title} className="w-full h-20 object-cover" />
                      <div className="p-1 bg-slate-900/90 text-[10px] text-slate-300 truncate">
                        {photo.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Logos & Max 3 Rule */}
          {activeTab === 'logos' && (
            <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-col gap-3.5 text-xs">
              {/* Alert if more than 3 logos */}
              {isMoreThanThreeLogos && (
                <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-500/80 text-amber-200 text-xs flex gap-2.5 animate-in slide-in-from-top-2">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
                  <div className="space-y-1">
                    <span className="font-bold block text-amber-300">
                      Recomendación de Identidad Visual (Máximo 3 Logotipos)
                    </span>
                    <p className="text-[11px] leading-relaxed">
                      La guía oficial de Acción contra el Hambre recomienda un máximo de 3 logotipos para mantener la legibilidad y el equilibrio institucional. Si por razones contractuales necesitas incluir más organizaciones socias, consulta previamente con:
                    </p>
                    <a
                      href="mailto:comunicacion@ca.acfspain.org"
                      className="font-bold underline text-amber-300 block text-[11px]"
                    >
                      comunicacion@ca.acfspain.org
                    </a>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-300">
                    Logotipos Activos en la Portada ({coverData.logos.length}/3 recomendados)
                  </span>
                  <div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleLogoUpload(e.target.files[0]);
                          e.target.value = '';
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#52AE32] hover:bg-[#469829] text-white text-[11px] font-bold shadow transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir Logo (PNG/JPG)</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {coverData.logos.map((logo, idx) => (
                    <div
                      key={logo.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 border border-slate-700"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-bold text-slate-400 text-xs shrink-0">{idx + 1}.</span>
                        {logo.url ? (
                          <img
                            src={logo.url}
                            alt={logo.name}
                            className="w-8 h-8 object-contain bg-white/10 rounded p-0.5 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-[10px] text-slate-300 shrink-0 font-bold">
                            SVG
                          </div>
                        )}
                        <span className="font-semibold text-white truncate text-xs">
                          {logo.name}
                        </span>
                      </div>
                      <button
                        onClick={() => removeLogo(logo.id)}
                        className="text-red-400 hover:text-red-300 p-1 shrink-0 ml-2"
                        title="Quitar logotipo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 block mb-1">
                  Agregar Logotipo Preconfigurado
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_PARTNER_LOGOS.map((logo) => {
                    const isAdded = coverData.logos.some((l) => l.id === logo.id);
                    return (
                      <button
                        key={logo.id}
                        disabled={isAdded}
                        onClick={() => addLogo(logo)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                          isAdded
                            ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
                        }`}
                      >
                        + {logo.name.split('-')[0].trim()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Add custom partner name */}
              <div className="pt-2 border-t border-slate-700">
                <span className="text-[11px] font-bold text-slate-300 block mb-1">
                  O agregar otro socio implementador:
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customLogoName}
                    onChange={(e) => setCustomLogoName(e.target.value)}
                    placeholder="Nombre del socio o ministerio..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs"
                  />
                  <button
                    onClick={addCustomLogo}
                    className="px-3 py-1 bg-[#52AE32] hover:bg-[#469829] text-white rounded-lg text-xs font-bold"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Colors & Backgrounds */}
          {activeTab === 'colors' && (
            <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-col gap-4 text-xs">
              {/* Logo Color Mode */}
              <div>
                <label className="text-[11px] font-bold text-slate-200 block mb-1.5 flex items-center justify-between">
                  <span>Modo de Color de Logotipos</span>
                  <span className="text-[10px] text-sky-400 font-mono">
                    {coverData.logoColorMode === 'white'
                      ? '⚪ Blanco Nítido'
                      : coverData.logoColorMode === 'color'
                      ? '🎨 A Color Oficial'
                      : '🖤 Monocromático'}
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => updateField('logoColorMode', 'white')}
                    className={`p-2.5 rounded-lg border text-center transition flex flex-col items-center gap-1 ${
                      coverData.logoColorMode === 'white'
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
                      coverData.logoColorMode === 'color'
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
                      coverData.logoColorMode === 'monochrome'
                        ? 'bg-slate-700 border-slate-400 text-white font-bold ring-1 ring-slate-400'
                        : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-500 shadow-sm" />
                    <span className="text-[10px]">Monocromo</span>
                  </button>
                </div>
              </div>

              {/* Cover Background Colors Preset */}
              <div>
                <label className="text-[11px] font-bold text-slate-200 block mb-1.5">
                  Color de Fondo Cabecera (Bloque Superior)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'blue', label: 'Azul ACH', hex: '#005FB6' },
                    { id: 'darkBlue', label: 'Azul Noche', hex: '#003366' },
                    { id: 'green', label: 'Verde ACH', hex: '#52AE32' },
                    { id: 'orange', label: 'Naranja ACH', hex: '#EE7203' },
                    { id: 'charcoal', label: 'Pizarra', hex: '#1E293B' },
                    { id: 'white', label: 'Blanco', hex: '#FFFFFF' },
                  ].map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => {
                        updateField('themeColor', bg.id);
                        if (bg.id === 'white') {
                          updateField('logoColorMode', 'color');
                        }
                      }}
                      className={`p-2 rounded-lg border text-center transition flex flex-col items-center gap-1 ${
                        coverData.themeColor === bg.id
                          ? 'border-white bg-slate-800 ring-2 ring-sky-400'
                          : 'border-slate-700 bg-slate-900 hover:bg-slate-800'
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full border border-white/30"
                        style={{ backgroundColor: bg.hex }}
                      />
                      <span className="text-[10px] text-slate-200 font-medium truncate w-full">
                        {bg.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Hex Color for Header */}
              <div className="pt-2 border-t border-slate-700/80">
                <label className="text-[10px] font-bold text-slate-300 block mb-1">
                  O elige color personalizado (Hex / Selector):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={coverData.headerBgCustom || '#005FB6'}
                    onChange={(e) => {
                      updateField('headerBgCustom', e.target.value);
                      updateField('themeColor', 'custom');
                    }}
                    className="w-10 h-8 rounded border border-slate-600 bg-transparent cursor-pointer p-0"
                  />
                  <input
                    type="text"
                    value={coverData.headerBgCustom || '#005FB6'}
                    onChange={(e) => {
                      updateField('headerBgCustom', e.target.value);
                      updateField('themeColor', 'custom');
                    }}
                    placeholder="#005FB6"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs uppercase"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: AI Assistant */}
          {activeTab === 'ai' && (
            <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-col gap-3.5 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white font-futura">Asistente IA para Portadas</span>
              </div>
              <p className="text-slate-300 text-[11px] font-roboto">
                Indica de qué trata tu informe y Gemini generará los textos, títulos y códigos con el estilo y tono oficial de Acción contra el Hambre.
              </p>

              <textarea
                rows={3}
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="ej: Informe de monitoreo de agua potable y filtros comunitarios en Jocotán y Camotán, financiado por ECHO..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-[#EE7203]"
              />

              <button
                onClick={handleGenerateAiCover}
                disabled={isAiLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#EE7203] to-[#C45B00] hover:opacity-95 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>{isAiLoading ? 'Generando con Gemini...' : 'Generar Portada con IA'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Live A4 Canvas Preview (Right Column) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center">
          <div className="text-[11px] text-slate-400 mb-2 flex items-center gap-2">
            <span>Previsualización en tiempo real (Proporción A4 Vertical)</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-emerald-400 font-semibold">Listo para Word</span>
          </div>

          {/* The Physical A4 Rendered Container */}
          <div
            ref={coverCanvasRef}
            className="w-full max-w-[520px] bg-white text-slate-900 shadow-2xl rounded-sm overflow-hidden border border-slate-300 relative flex flex-col aspect-[1/1.414]"
            style={{ minHeight: '680px' }}
          >
            {/* STYLE 1: INFORME DE MONITOREO (Screenshot 1 Reference) */}
            {coverData.style === 'monitoring' ? (
              <div className="flex-1 flex flex-col justify-between bg-white h-full">
                {/* Top Section with dynamic background color */}
                <div
                  className="p-6 text-white flex flex-col gap-3 relative transition-colors duration-300"
                  style={{
                    backgroundColor:
                      coverData.themeColor === 'custom'
                        ? coverData.headerBgCustom || '#005FB6'
                        : coverData.themeColor === 'darkBlue'
                        ? '#003366'
                        : coverData.themeColor === 'green'
                        ? '#52AE32'
                        : coverData.themeColor === 'orange'
                        ? '#EE7203'
                        : coverData.themeColor === 'charcoal'
                        ? '#1E293B'
                        : coverData.themeColor === 'white'
                        ? '#FFFFFF'
                        : '#005FB6',
                    color: coverData.themeColor === 'white' ? '#0f172a' : '#ffffff',
                  }}
                >
                  {/* Header Logos Bar */}
                  {coverData.showLogos !== false && (
                    <div
                      className="flex items-center justify-between gap-3 pb-3 border-b flex-wrap"
                      style={{
                        borderColor:
                          coverData.themeColor === 'white'
                            ? 'rgba(0,0,0,0.15)'
                            : 'rgba(255,255,255,0.2)',
                      }}
                    >
                      {coverData.logos.length > 0 ? (
                        coverData.logos.map((logo) => (
                          <DynamicLogoRenderer
                            key={logo.id}
                            logo={logo}
                            variant={coverData.themeColor === 'white' ? 'color' : 'white'}
                            overrideColorMode={coverData.logoColorMode}
                            className="h-8 max-h-10"
                          />
                        ))
                      ) : (
                        <>
                          <RhpfLogoSvg
                            variant={coverData.themeColor === 'white' ? 'color' : 'white'}
                            className="h-8"
                          />
                          <AchOfficialSvg
                            variant={coverData.themeColor === 'white' ? 'color' : 'white'}
                            className="h-9"
                          />
                        </>
                      )}
                    </div>
                  )}

                  {/* White Pill Banner */}
                  {coverData.showCategoryPill !== false && coverData.categoryPill && (
                    <div className="bg-white text-[#52AE32] px-3.5 py-1 rounded-sm text-[11px] sm:text-xs font-bold tracking-wider uppercase font-futura text-center shadow-sm w-full my-1">
                      {coverData.categoryPill}
                    </div>
                  )}

                  {/* Big Futura Title */}
                  <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white uppercase text-center leading-snug font-futura py-1">
                    {coverData.title}
                  </h1>

                  {/* Subtitle in Style 1 (if enabled) */}
                  {coverData.showSubtitle !== false && coverData.subtitle && (
                    <p className="text-white/90 text-[11px] sm:text-xs text-center font-roboto italic px-2 leading-relaxed pb-1">
                      {coverData.subtitle}
                    </p>
                  )}

                  {/* Project Metadata Block (conditionally rendered only if visible fields exist) */}
                  {((coverData.showProjectCode !== false && coverData.projectCode) ||
                    (coverData.showInternalCode !== false && coverData.internalCode) ||
                    (coverData.showLocation !== false && coverData.location) ||
                    (coverData.showDate !== false && coverData.date)) && (
                    <div className="text-white/90 text-[10px] sm:text-[11px] space-y-0.5 pt-1 font-roboto border-t border-white/15">
                      {coverData.showProjectCode !== false && coverData.projectCode && (
                        <div>
                          <strong>Proyecto:</strong> {coverData.projectCode}
                        </div>
                      )}
                      {coverData.showInternalCode !== false && coverData.internalCode && (
                        <div>
                          <strong>Código:</strong> {coverData.internalCode}
                        </div>
                      )}
                      {coverData.showLocation !== false && coverData.location && (
                        <div>
                          <strong>Ubicación:</strong> {coverData.location}
                        </div>
                      )}
                      {coverData.showDate !== false && coverData.date && (
                        <div>
                          <strong>Fecha:</strong> {coverData.date}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Middle Section: Real Humanitarian Field Photograph or Textured Brand Minimal */}
                {coverData.showPhoto !== false ? (
                  <div className="flex-1 relative overflow-hidden bg-slate-100 min-h-[200px]">
                    <img
                      src={coverData.photoUrl}
                      alt="Fotografía de portada"
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex-1 relative overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200 min-h-[200px] flex items-center justify-center p-6 border-y border-slate-300">
                    <div className="text-center opacity-30 pointer-events-none select-none">
                      <AchOfficialSvg variant="dark" className="h-14 mx-auto mb-2 opacity-50" />
                      <span className="text-[11px] font-futura uppercase tracking-widest text-slate-700 font-bold block">
                        Acción contra el Hambre
                      </span>
                    </div>
                  </div>
                )}

                {/* Bottom Section: Solid Green Bar (#52AE32) with author */}
                {coverData.showAuthorBlock !== false && (coverData.authorName || coverData.authorRole || coverData.authorBase) && (
                  <div className="bg-[#52AE32] text-white p-4 text-center font-roboto">
                    {coverData.authorName && (
                      <div className="font-bold text-xs sm:text-sm font-futura">
                        {coverData.authorName}
                      </div>
                    )}
                    {coverData.authorRole && (
                      <div className="italic text-[10px] sm:text-[11px] opacity-90">
                        {coverData.authorRole}
                      </div>
                    )}
                    {coverData.authorBase && (
                      <div className="font-semibold text-[10px] sm:text-[11px]">
                        {coverData.authorBase}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* STYLE 2: GUÍA DE IDENTIDAD / EDITORIAL (PDF 1 Page 1 & 20 Reference) */
              <div className="flex-1 flex flex-col justify-between bg-white h-full">
                {/* Top Half: Photo with solid green box overlay */}
                <div className="relative h-[55%] overflow-hidden bg-slate-900">
                  {coverData.showPhoto !== false ? (
                    <img
                      src={coverData.photoUrl}
                      alt="Fotografía superior"
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#005FB6] to-[#003366] flex items-center justify-center">
                      <AchOfficialSvg variant="white" className="h-16 opacity-30" />
                    </div>
                  )}
                  {/* Floating Green Box with Futura Title */}
                  <div className="absolute left-6 bottom-4 right-6 bg-[#52AE32] text-white p-4 shadow-xl">
                    {coverData.showCategoryPill !== false && coverData.categoryPill && (
                      <div className="text-[10px] uppercase font-bold tracking-wider opacity-90 mb-1">
                        {coverData.categoryPill}
                      </div>
                    )}
                    <h1 className="text-base sm:text-lg font-black tracking-tight uppercase leading-snug font-futura">
                      {coverData.title}
                    </h1>
                  </div>
                </div>

                {/* Bottom Half: White with project text, author and logos */}
                <div className="h-[45%] p-6 flex flex-col justify-between">
                  <div className="space-y-3">
                    {coverData.showSubtitle !== false && coverData.subtitle && (
                      <p className="text-xs sm:text-sm text-[#005FB6] font-semibold leading-relaxed font-roboto">
                        {coverData.subtitle}
                      </p>
                    )}

                    {/* Project metadata in style 2 */}
                    {((coverData.showProjectCode !== false && coverData.projectCode) ||
                      (coverData.showInternalCode !== false && coverData.internalCode) ||
                      (coverData.showLocation !== false && coverData.location) ||
                      (coverData.showDate !== false && coverData.date)) && (
                      <div className="text-[10px] text-slate-600 font-roboto space-y-0.5 border-l-2 border-[#005FB6] pl-2.5 py-0.5">
                        {coverData.showProjectCode !== false && coverData.projectCode && (
                          <div>
                            <strong>Proyecto:</strong> {coverData.projectCode}
                          </div>
                        )}
                        {coverData.showInternalCode !== false && coverData.internalCode && (
                          <div>
                            <strong>Código:</strong> {coverData.internalCode}
                          </div>
                        )}
                        {coverData.showLocation !== false && coverData.location && (
                          <div>
                            <strong>Ubicación:</strong> {coverData.location}
                          </div>
                        )}
                        {coverData.showDate !== false && coverData.date && (
                          <div>
                            <strong>Fecha:</strong> {coverData.date}
                          </div>
                        )}
                      </div>
                    )}

                    {coverData.showAuthorBlock !== false && (coverData.authorName || coverData.authorRole) && (
                      <div className="text-[11px] text-slate-500 italic font-roboto">
                        Adaptado por: {coverData.authorName}{coverData.authorRole ? `, ${coverData.authorRole}` : ''}
                      </div>
                    )}
                  </div>

                  {/* Bottom logos bar */}
                  {coverData.showLogos !== false && (
                    <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 flex-wrap">
                      {coverData.logos.length > 0 ? (
                        coverData.logos.map((logo) => (
                          <DynamicLogoRenderer
                            key={logo.id}
                            logo={logo}
                            variant="color"
                            overrideColorMode={coverData.logoColorMode}
                            className="h-8 max-h-10"
                          />
                        ))
                      ) : (
                        <>
                          <RhpfLogoSvg
                            variant={coverData.logoColorMode === 'white' ? 'white' : 'color'}
                            className="h-8"
                          />
                          <AchOfficialSvg
                            variant={coverData.logoColorMode === 'white' ? 'white' : 'color'}
                            className="h-9"
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
