import * as pdfjsLib from 'pdfjs-dist';

const WORKER_URL = '/pdf.worker.min.mjs';

// Always set workerSrc so PDF.js passes its validation check.
// On iOS, disableWorker:true is passed directly to getDocument() instead,
// which forces execution on the main thread and bypasses the worker entirely.
pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;

export { pdfjsLib as default };

// Detect iOS/iPadOS (used by handlePDFSelect in AITutorPage)
export const isIOSDevice =
  /iPad|iPhone|iPod/.test(navigator?.userAgent ?? '') ||
  (navigator?.platform === 'MacIntel' && navigator?.maxTouchPoints > 1);
