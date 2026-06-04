import * as pdfjsLib from 'pdfjs-dist';

const WORKER_URL = '/pdf.worker.min.mjs';

// Detect iOS/iPadOS (includes iPad on modern Safari which reports as MacOS)
const isIOS =
  /iPad|iPhone|iPod/.test(navigator?.userAgent ?? '') ||
  (navigator?.platform === 'MacIntel' && navigator?.maxTouchPoints > 1);

if (isIOS) {
  // iOS WebKit blocks Web Workers in PWAs and restricts module workers from blob URLs.
  // The only 100% reliable solution: disable the worker entirely (DisableWorker mode).
  // PDF.js will run on the main thread — slightly slower but works on all iOS versions.
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';
} else {
  pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
}

export default pdfjsLib;
