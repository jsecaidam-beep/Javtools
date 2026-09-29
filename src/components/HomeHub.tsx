import React from 'react';
import {
  Table2,
  BarChart3,
  BookOpen,
  FileCheck2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Layers,
  Palette,
  CheckCircle2,
} from 'lucide-react';

interface HomeHubProps {
  onNavigate: (view: 'tables' | 'charts' | 'covers' | 'credits') => void;
}

export const HomeHub: React.FC<HomeHubProps> = ({ onNavigate }) => {
  return (
    <div className="flex flex-col gap-8 py-4 animate-in fade-in duration-300">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden glass-panel rounded-3xl p-6 sm:p-10 border border-white/15 shadow-2xl bg-gradient-to-br from-slate-900/90 via-[#005FB6]/15 to-slate-900/90">
        <div className="relative z-10 max-w-3xl flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 rounded-full bg-[#52AE32]/20 border border-[#52AE32]/40 text-[#52AE32] text-xs font-bold uppercase tracking-wider font-futura">
              Suite Humanitaria Oficial • Acción contra el Hambre
            </span>
            <span className="hidden sm:inline text-xs text-slate-400 font-mono">
              Guía de Identidad & CARI
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight font-futura">
            ¿Qué deseas crear para tu documento humanitario?
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-roboto">
            Genera tablas sin desbordamiento para Microsoft Word, gráficas oficiales (CARI/SAN), portadas personalizadas y hojas de créditos con la identidad visual corporativa de Acción contra el Hambre y asistencia inteligente con Gemini AI.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#52AE32]" />
              <span>Tipografía Futura & Roboto</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#005FB6]" />
              <span>Colores Oficiales ACH</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#EE7203]" />
              <span>Regla oficial de 3 Logotipos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Asistencia Gemini Multimodal</span>
            </div>
          </div>
        </div>

        {/* Decorative corner watermark */}
        <div className="absolute right-[-20px] bottom-[-30px] opacity-10 pointer-events-none select-none">
          <div className="w-64 h-64 rounded-full border-[28px] border-[#005FB6]" />
        </div>
      </div>

      {/* 4 Interactive Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Tablas Humanitarias */}
        <div
          onClick={() => onNavigate('tables')}
          className="group relative glass-panel rounded-2xl p-6 border border-white/10 hover:border-[#005FB6]/60 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-[#005FB6]/20 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#005FB6]/20 border border-[#005FB6]/40 flex items-center justify-center text-[#005FB6] group-hover:scale-110 transition-transform">
                <Table2 className="w-6 h-6 text-sky-400" />
              </div>
              <span className="text-[11px] font-bold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                Word & Office Ready
              </span>
            </div>

            <h3 className="text-lg font-bold text-white mb-2 font-futura group-hover:text-sky-300 transition-colors">
              1. Generador de Tablas ACH
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mb-4 leading-relaxed font-roboto">
              Crea cuadros con el diseño exacto de los informes humanitarios: desgloses geográficos con celdas agrupadas (*rowspan*), matrices CARI con semaforización y copiado con estilos *inline* que se acoplan perfectamente al ancho de hoja en Word.
            </p>

            <div className="flex flex-wrap gap-1.5 mb-6">
              <span className="text-[10px] bg-sky-950/80 text-sky-300 px-2 py-0.5 rounded border border-sky-800">
                Criterios SAN
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                Países & Municipios
              </span>
              <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                Barras en Celdas
              </span>
              <span className="text-[10px] bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded border border-amber-800">
                Extracción IA
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <span className="text-xs font-bold text-[#005FB6] group-hover:text-sky-300 flex items-center gap-1">
              Abrir Generador de Tablas <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </div>

        {/* Card 2: Gráficas Humanitarias */}
        <div
          onClick={() => onNavigate('charts')}
          className="group relative glass-panel rounded-2xl p-6 border border-white/10 hover:border-[#52AE32]/60 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-[#52AE32]/20 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#52AE32]/20 border border-[#52AE32]/40 flex items-center justify-center text-[#52AE32] group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="text-[11px] font-bold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                Chart.js & Export PNG
              </span>
            </div>

            <h3 className="text-lg font-bold text-white mb-2 font-futura group-hover:text-emerald-300 transition-colors">
              2. Módulo de Gráficas ACH
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mb-4 leading-relaxed font-roboto">
              Diseña gráficas inspiradas en la Evaluación de Seguridad Alimentaria: barras 100% apiladas para severidad CARI, barras horizontales por departamento coloreadas por país, comparativas de encuestas y donas de cooperación.
            </p>

            <div className="flex flex-wrap gap-1.5 mb-6">
              <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                Barras 100% Apiladas
              </span>
              <span className="text-[10px] bg-sky-950/80 text-sky-300 px-2 py-0.5 rounded border border-sky-800">
                HDDS Departamental
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                Donas & Pies
              </span>
              <span className="text-[10px] bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded border border-amber-800">
                Copiar como Imagen
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <span className="text-xs font-bold text-[#52AE32] group-hover:text-emerald-300 flex items-center gap-1">
              Abrir Módulo de Gráficas <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </div>

        {/* Card 3: Editor de Portadas Humanitarias */}
        <div
          onClick={() => onNavigate('covers')}
          className="group relative glass-panel rounded-2xl p-6 border border-white/10 hover:border-[#EE7203]/60 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-[#EE7203]/20 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#EE7203]/20 border border-[#EE7203]/40 flex items-center justify-center text-[#EE7203] group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6 text-amber-400" />
              </div>
              <span className="text-[11px] font-bold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                Editor Tipo Canva
              </span>
            </div>

            <h3 className="text-lg font-bold text-white mb-2 font-futura group-hover:text-amber-300 transition-colors">
              3. Editor de Portadas Humanitarias
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mb-4 leading-relaxed font-roboto">
              Crea portadas profesionales de alto impacto como las de los informes de monitoreo y guías de identidad. Personaliza textos en Futura, sube fotos de campo, configura píldoras de estado y gestiona los logotipos según la norma institucional de máx. 3 marcas.
            </p>

            <div className="flex flex-wrap gap-1.5 mb-6">
              <span className="text-[10px] bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded border border-amber-800">
                Píldora & Título Futura
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                Subir / Elegir Fotos
              </span>
              <span className="text-[10px] bg-sky-950/80 text-sky-300 px-2 py-0.5 rounded border border-sky-800">
                Regla 3 Logos
              </span>
              <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                Asistente IA Títulos
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <span className="text-xs font-bold text-[#EE7203] group-hover:text-amber-300 flex items-center gap-1">
              Crear Portada de Informe <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </div>

        {/* Card 4: Páginas de Créditos & Contraportadas */}
        <div
          onClick={() => onNavigate('credits')}
          className="group relative glass-panel rounded-2xl p-6 border border-white/10 hover:border-sky-400/60 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-sky-400/20 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                <FileCheck2 className="w-6 h-6 text-sky-300" />
              </div>
              <span className="text-[11px] font-bold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                Contraportada Oficial
              </span>
            </div>

            <h3 className="text-lg font-bold text-white mb-2 font-futura group-hover:text-sky-300 transition-colors">
              4. Hojas de Créditos & Contraportadas
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mb-4 leading-relaxed font-roboto">
              Genera la contraportada azul corporativa de ACH con marcas de agua del isotipo, cláusula de descargo de responsabilidad oficial de donantes (RHPF LAC, ECHO, etc.), contactos de oficinas de país y buzones PQR autorizados.
            </p>

            <div className="flex flex-wrap gap-1.5 mb-6">
              <span className="text-[10px] bg-sky-950/80 text-sky-300 px-2 py-0.5 rounded border border-sky-800">
                Fondo Azul Degradado
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                Descargos de Donante
              </span>
              <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                Buzón PQR
              </span>
              <span className="text-[10px] bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded border border-amber-800">
                Redacción IA
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <span className="text-xs font-bold text-sky-400 group-hover:text-sky-300 flex items-center gap-1">
              Generar Hoja de Créditos <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
