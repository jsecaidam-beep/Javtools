import React from 'react';
import { PAGE_FORMATS, PageFormat } from '../constants/pageFormats';

export function PageFormatSelector({ value, onChange }: { value: PageFormat; onChange: (value: PageFormat) => void }) {
  return (
    <label className="glass-panel flex items-center gap-3 p-3 rounded-xl text-sm font-semibold">
      Tamaño de hoja
      <select aria-label="Tamaño de hoja" value={value} onChange={e => onChange(e.target.value as PageFormat)} className="border rounded-lg p-2 bg-white">
        {Object.entries(PAGE_FORMATS).map(([key, format]) => <option key={key} value={key}>{format.label} · {format.dimensions}</option>)}
      </select>
    </label>
  );
}
