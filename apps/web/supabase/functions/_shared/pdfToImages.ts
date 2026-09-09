// PDF → JPEG pages, using the same mupdf WASM pipeline and the same limits as
// the pdf-upload Edge Function, so a PDF sent to the Telegram bot is treated
// exactly like one uploaded in the web app (same page cap, same quality, same
// "too many pages" message).

export const PDF_MAX_PAGES = 10;
export const PDF_MAX_SIZE_BYTES = 15_000_000; // 15 MB
const SCALE = 1.5; // ~892×1263 px for A4
const JPEG_QUALITY = 82;

export type PdfConversion =
  | { ok: true; images: string[]; numPages: number }
  | { ok: false; reason: 'too_large' | 'too_many_pages' | 'render_failed'; numPages?: number };

export async function pdfToJpegPages(pdfBuffer: ArrayBuffer): Promise<PdfConversion> {
  if (pdfBuffer.byteLength > PDF_MAX_SIZE_BYTES) return { ok: false, reason: 'too_large' };

  let mupdf: any;
  try {
    const mod = await import('npm:mupdf@1.3.0');
    mupdf = mod.default ?? mod;
  } catch (err) {
    console.error('[pdfToImages] mupdf import failed:', err);
    return { ok: false, reason: 'render_failed' };
  }

  const images: string[] = [];
  try {
    const doc = mupdf.Document.openDocument(pdfBuffer, 'application/pdf');
    const numPages: number = doc.countPages();

    if (numPages > PDF_MAX_PAGES) {
      doc.destroy();
      return { ok: false, reason: 'too_many_pages', numPages };
    }

    const matrix = [SCALE, 0, 0, SCALE, 0, 0];
    for (let i = 0; i < numPages; i++) {
      const page = doc.loadPage(i);
      const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);
      const jpeg = pixmap.asJPEG(JPEG_QUALITY, false) as Uint8Array;

      let binary = '';
      for (let j = 0; j < jpeg.length; j++) binary += String.fromCharCode(jpeg[j]);
      images.push(btoa(binary));

      pixmap.destroy();
      page.destroy();
    }

    doc.destroy();
    return { ok: true, images, numPages };
  } catch (err) {
    console.error('[pdfToImages] render error:', err);
    return { ok: false, reason: 'render_failed' };
  }
}
