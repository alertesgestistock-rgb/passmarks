import * as pdfjsLib from 'pdfjs-dist';

const WORKER_URL = '/pdf.worker.min.mjs';
const isIOS = /iPad|iPhone|iPod/.test(navigator?.userAgent ?? '');

if (isIOS) {
  // iOS WebKit classic workers cannot use dynamic import() or .mjs syntax.
  // Solution: create a module worker blob with a static import, then pass it
  // via workerPort so pdfjs skips its own Worker creation entirely.
  const absUrl = new URL(WORKER_URL, location.origin).href;
  const blob = new Blob([`import ${JSON.stringify(absUrl)};`], { type: 'application/javascript' });
  const worker = new Worker(URL.createObjectURL(blob), { type: 'module' });
  pdfjsLib.GlobalWorkerOptions.workerPort = worker;
} else {
  pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
}

export default pdfjsLib;
