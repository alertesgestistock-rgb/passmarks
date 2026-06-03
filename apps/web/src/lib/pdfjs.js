import * as pdfjsLib from 'pdfjs-dist';

const WORKER_URL = '/pdf.worker.min.mjs';
const isIOS = /iPad|iPhone|iPod/.test(navigator?.userAgent ?? '');

if (isIOS) {
  // iOS WebKit (Safari + Chrome) rejects .mjs loaded as a classic Worker.
  // A blob wrapper using dynamic import() lets it load as a module — supported iOS 15+.
  const absUrl = new URL(WORKER_URL, location.origin).href;
  const blob = new Blob([`import(${JSON.stringify(absUrl)});`], { type: 'application/javascript' });
  pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
} else {
  pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
}

export default pdfjsLib;
