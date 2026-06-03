import * as pdfjsLib from 'pdfjs-dist';

// Worker file served from /public with stable URL (not hashed by Vite).
// Promise.withResolvers polyfill in index.html covers iOS Safari < 17.4.
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export default pdfjsLib;
