import React, { useLayoutEffect, useRef, useState } from 'react';
import { PAGE_FORMATS, PAGE_WIDTH, PageFormat } from '../constants/pageFormats';

/** Lay out a complete page at its export dimensions, then scale the whole preview. */
export function PagePreview({ format, children }: { format: PageFormat; children: React.ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const height = PAGE_FORMATS[format].height;
  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const measure = () => setScale(Math.min(1, element.clientWidth / PAGE_WIDTH));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={viewport} data-page-preview={format} className="w-full max-w-[510px] relative overflow-hidden" style={{ height: height * scale }}>
      <div data-preview-transform style={{ position: 'absolute', top: 0, left: 0, width: PAGE_WIDTH, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  );
}
