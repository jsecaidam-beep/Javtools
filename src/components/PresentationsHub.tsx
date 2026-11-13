import React, { useState } from 'react';
import { ArrowUpRight, Check, Clock3, Copy, Maximize2, Play, Presentation } from 'lucide-react';
import './PresentationsHub.css';

const PRESENTATION_PATH = `${import.meta.env.BASE_URL}presentaciones/mejoramientos.html`;

export function PresentationsHub() {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const shareUrl = new URL(PRESENTATION_PATH, window.location.href).href;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError(true);
    }
  }

  return <div className="presentations-hub">
    <header className="presentations-heading">
      <span className="studio-eyebrow"><Presentation size={15} /> PRESENTACIONES · ACCIÓN CONTRA EL HAMBRE</span>
      <h1>Avances que<br /><em>se pueden ver.</em></h1>
      <p>Historias del territorio para compartir en una reunión, en una sala o frente a una audiencia.</p>
    </header>

    <article className="presentation-card">
      <a href={PRESENTATION_PATH} className="presentation-preview" aria-label="Abrir Mejoramientos">
        <div className="presentation-preview-grain" />
        <span className="presentation-preview-tag">CHIQUIMULA · GUATEMALA</span>
        <div className="presentation-preview-title">Mejoramientos<span>Agua. Salud. Bienestar.</span></div>
        <div className="presentation-preview-comparison" aria-hidden="true">
          <div><span>ANTES</span><i /><i /><i /></div><div><span>AVANCES</span><i /><i /><i /></div>
          <b>↔</b>
        </div>
        <span className="presentation-play"><Play size={24} fill="currentColor" /></span>
        <div className="presentation-preview-foot"><span>ACCIÓN CONTRA EL HAMBRE</span><span>FHG · GUATEMALA</span></div>
      </a>

      <div className="presentation-card-content">
        <div className="presentation-card-kicker">DEL TERRITORIO A LA PANTALLA</div>
        <h2>Mejoramientos</h2>
        <p>Registro inicial y avances de las obras de agua, saneamiento y salud en Chiquimula. Una mirada al trabajo que seguimos construyendo en los territorios.</p>
        <div className="presentation-features">
          <span><Clock3 size={16} /> 2 min 40 s</span>
          <span><Play size={16} /> Avance automático</span>
          <span><Maximize2 size={16} /> Pantalla completa</span>
        </div>
        <div className="presentation-card-actions">
          <a href={PRESENTATION_PATH} className="presentation-open">Abrir presentación <ArrowUpRight size={19} /></a>
          <button type="button" onClick={() => void copyLink()} className="presentation-copy">{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? 'Enlace copiado' : 'Copiar enlace'}</button>
        </div>
        {copyError && <div className="presentation-share-fallback" role="status"><label htmlFor="presentation-link">Copia este enlace para compartir:</label><input id="presentation-link" readOnly value={shareUrl} onFocus={event => event.currentTarget.select()} /></div>}
        <p className="presentation-tip">Abre la presentación y activa pantalla completa para proyectar. Puedes pausar o avanzar a tu ritmo.</p>
      </div>
    </article>
  </div>;
}
