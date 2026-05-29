
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PDFReader({ url, subject, year, paperNumber, onClose, navigate }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [isLoading, setIsLoading] = useState(true);
  const [renderTask, setRenderTask] = useState(null);

  useEffect(() => {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const loadPdf = async () => {
      try {
        setIsLoading(true);
        const loadingTask = window.pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setPageNum(1);
      } catch (err) {
        console.error('Error loading PDF:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPdf();
  }, [url]);

  const renderPage = async (num, currentScale) => {
    if (!pdfDoc || !canvasRef.current) return;
    setIsLoading(true);

    try {
      if (renderTask) {
        await renderTask.cancel();
      }

      const page = await pdfDoc.getPage(num);
      const viewport = page.getViewport({ scale: currentScale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const task = page.render({ canvasContext: ctx, viewport });
      setRenderTask(task);
      await task.promise;
    } catch (err) {
      if (err.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (pdfDoc) {
      renderPage(pageNum, scale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, pageNum, scale]);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.2, 3.0));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.2, 0.5));
  const handlePrevPage = () => setPageNum(p => Math.max(p - 1, 1));
  const handleNextPage = () => setPageNum(p => Math.min(p + 1, totalPages));

  const handleSliderChange = (e) => {
    setPageNum(Number(e.target.value));
  };

  const extractTextAndAskAI = async () => {
    if (!pdfDoc) return;
    try {
      setIsLoading(true);
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const extractedText = textContent.items.map(item => item.str).join(' ');
      
      onClose(); // Close the PDF reader overlay
      
      navigate('tutor', {
        initialMessage: `I'm reading ${subject} ${year} Paper ${paperNumber}. Here is the question from page ${pageNum}: "${extractedText.substring(0, 800)}...". Please solve this step by step.`
      });
    } catch (err) {
      console.error('Extraction failed:', err);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#0F172A] flex flex-col w-full h-full overflow-hidden">
      {/* Top Bar */}
      <div className="h-[56px] bg-[#1E293B] flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
        <button onClick={onClose} className="flex items-center gap-1 text-[#22C55E] font-medium text-[13px] active:scale-95 transition-transform p-1">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="text-[13px] font-medium text-[#F1F5F9] truncate px-2 max-w-[50%]">
          {subject} {year} — Paper {paperNumber}
        </div>
        <div className="text-[#94A3B8] text-[12px] min-w-[40px] text-right">
          {pageNum} / {totalPages || '?'}
        </div>
      </div>

      {/* Toolbar */}
      <div className="h-[44px] bg-[#1E293B] border-b border-[#334155] flex items-center justify-center gap-2 px-2 shrink-0 overflow-x-auto hide-scrollbar z-10">
        <button onClick={handleZoomOut} className="bg-[#334155] text-[#F1F5F9] rounded-md px-2.5 py-1 text-[11px] flex items-center gap-1 active:bg-[#475569]">
          <ZoomOut size={14} /> <span className="hidden sm:inline">Zoom −</span>
        </button>
        <button onClick={handleZoomIn} className="bg-[#334155] text-[#F1F5F9] rounded-md px-2.5 py-1 text-[11px] flex items-center gap-1 active:bg-[#475569]">
          <ZoomIn size={14} /> <span className="hidden sm:inline">Zoom +</span>
        </button>
        <div className="w-[1px] h-[20px] bg-[#475569] mx-1"></div>
        <button onClick={handlePrevPage} disabled={pageNum <= 1} className="bg-[#334155] text-[#F1F5F9] rounded-md px-2.5 py-1 text-[11px] flex items-center gap-1 disabled:opacity-50 active:bg-[#475569]">
          <ChevronLeft size={14} /> <span className="hidden sm:inline">Page −</span>
        </button>
        <button onClick={handleNextPage} disabled={pageNum >= totalPages} className="bg-[#334155] text-[#F1F5F9] rounded-md px-2.5 py-1 text-[11px] flex items-center gap-1 disabled:opacity-50 active:bg-[#475569]">
          <span className="hidden sm:inline">Page +</span> <ChevronRight size={14} />
        </button>
        <div className="w-[1px] h-[20px] bg-[#475569] mx-1"></div>
        <button className="bg-[#334155] text-[#F1F5F9] rounded-md px-2.5 py-1 text-[11px] flex items-center gap-1 active:bg-[#475569]">
          <Search size={14} />
        </button>
        <button onClick={extractTextAndAskAI} className="bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/50 rounded-md px-3 py-1 text-[11px] font-medium flex items-center gap-1 ml-auto shrink-0 active:scale-95 transition-transform">
          <Sparkles size={14} /> Ask AI ✨
        </button>
      </div>

      {/* Canvas Area */}
      <div 
        ref={containerRef}
        className="flex-1 bg-[#0F172A] overflow-auto p-3 flex justify-center items-start touch-pan-x touch-pan-y relative"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0F172A]/50 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#22C55E]"></div>
          </div>
        )}
        <canvas 
          ref={canvasRef} 
          className={cn("max-w-none shadow-lg shadow-black/50 transition-opacity duration-200", isLoading ? "opacity-50" : "opacity-100")} 
        />
      </div>

      {/* Bottom Bar */}
      <div className="h-[48px] bg-[#1E293B] border-t border-[#334155] px-4 flex items-center shrink-0 z-10 pb-safe">
        <input 
          type="range" 
          min="1" 
          max={totalPages || 1} 
          value={pageNum}
          onChange={handleSliderChange}
          className="w-full h-1.5 bg-[#334155] rounded-lg appearance-none cursor-pointer accent-[#22C55E]"
          style={{
            background: `linear-gradient(to right, #22C55E 0%, #22C55E ${(pageNum / totalPages) * 100}%, #334155 ${(pageNum / totalPages) * 100}%, #334155 100%)`
          }}
        />
      </div>
    </div>
  );
}
