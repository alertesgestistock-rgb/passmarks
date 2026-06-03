import * as pdfjsLib from 'pdfjs-dist';

// iOS Safari/WebKit fails to load the external worker file (known PDF.js v5/v6 bug).
// Force fake-worker mode on iOS — runs parsing in main thread, no external file needed.
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
if (!isIOS) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export default pdfjsLib;
