import html2canvas from 'html2canvas';

/**
 * Converts a remote image URL to a local Base64 data URL via fetch.
 * This guarantees html2canvas will never fail CORS or taint the canvas.
 */
export async function urlToBase64(url: string): Promise<string> {
  if (!url || url.startsWith('data:')) return url;
  try {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Could not convert image to base64, using original URL:', e);
    return url;
  }
}

export interface ExportPngOptions {
  scale?: number;
  fileName?: string;
  backgroundColor?: string | null;
}

/**
 * Robust export function to download an HTML element as PNG.
 * Solves iframe sandbox blocks, CORS issues, and tainted canvas exceptions.
 */
export async function downloadElementAsPng(
  element: HTMLElement,
  fileName: string = 'imagen-oficial.png',
  options?: ExportPngOptions
): Promise<boolean> {
  if (!element) {
    throw new Error('Element to export does not exist');
  }

  // 1. Temporarily mark all internal images with crossorigin = anonymous
  const originalCrossOrigins = new Map<HTMLImageElement, string | null>();
  const images = element.querySelectorAll('img');
  images.forEach((img) => {
    originalCrossOrigins.set(img, img.getAttribute('crossorigin'));
    img.setAttribute('crossorigin', 'anonymous');
  });

  try {
    // 2. Render canvas with safe options (allowTaint must be FALSE to allow toBlob/toDataURL)
    const canvas = await html2canvas(element, {
      scale: options?.scale || 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: options?.backgroundColor !== undefined ? options.backgroundColor : null,
      logging: false,
      imageTimeout: 15000,
      onclone: (clonedDoc, clonedEl) => {
        // Strip out backdrop-filter which causes parser crashes in html2canvas
        const blurEls = clonedEl.querySelectorAll('[class*="backdrop-blur"]');
        blurEls.forEach((el) => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.backdropFilter = 'none';
          (htmlEl.style as any).webkitBackdropFilter = 'none';
        });

        // Ensure all cloned images have crossorigin
        const clonedImgs = clonedEl.querySelectorAll('img');
        clonedImgs.forEach((img) => {
          img.crossOrigin = 'anonymous';
        });
      },
    });

    // 3. Convert to blob first (most reliable in iframes)
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png', 1.0);
    });

    const safeFileName = fileName.endsWith('.png') ? fileName : `${fileName}.png`;

    if (blob) {
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = safeFileName;
      link.href = objectUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        try {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
          URL.revokeObjectURL(objectUrl);
        } catch (_) {}
      }, 4000);
      return true;
    }

    // Fallback if toBlob failed: use dataURL
    const dataUrl = canvas.toDataURL('image/png');
    const fallbackLink = document.createElement('a');
    fallbackLink.download = safeFileName;
    fallbackLink.href = dataUrl;
    fallbackLink.style.display = 'none';
    document.body.appendChild(fallbackLink);
    fallbackLink.click();

    setTimeout(() => {
      try {
        if (document.body.contains(fallbackLink)) {
          document.body.removeChild(fallbackLink);
        }
      } catch (_) {}
    }, 4000);
    return true;
  } catch (error) {
    console.error('Error rendering or downloading PNG via html2canvas:', error);
    throw error;
  } finally {
    // Restore original crossorigin
    images.forEach((img) => {
      const orig = originalCrossOrigins.get(img);
      if (orig === null || orig === undefined) {
        img.removeAttribute('crossorigin');
      } else {
        img.setAttribute('crossorigin', orig);
      }
    });
  }
}

/**
 * Copies an HTML element directly to clipboard as image/png.
 */
export async function copyElementAsPngToClipboard(
  element: HTMLElement,
  options?: ExportPngOptions
): Promise<boolean> {
  if (!element) return false;

  const canvas = await html2canvas(element, {
    scale: options?.scale || 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: options?.backgroundColor !== undefined ? options.backgroundColor : null,
    logging: false,
    imageTimeout: 15000,
    onclone: (clonedDoc, clonedEl) => {
      const blurEls = clonedEl.querySelectorAll('[class*="backdrop-blur"]');
      blurEls.forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.backdropFilter = 'none';
        (htmlEl.style as any).webkitBackdropFilter = 'none';
      });
      const clonedImgs = clonedEl.querySelectorAll('img');
      clonedImgs.forEach((img) => {
        img.crossOrigin = 'anonymous';
      });
    },
  });

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png', 1.0);
  });

  if (!blob) {
    throw new Error('Failed to generate image blob');
  }

  if (navigator.clipboard && window.ClipboardItem) {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
    return true;
  } else {
    throw new Error('Clipboard API not supported in this browser');
  }
}
