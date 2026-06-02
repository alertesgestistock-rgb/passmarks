import * as pdfjsLib from 'pdfjs-dist';

// Stable public URL — not hashed by Vite, properly cached by PWA service worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export default pdfjsLib;
