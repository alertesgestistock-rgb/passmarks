import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const APP_NAME = 'PassMark AI Tutor';
const APP_URL = 'passmarks.vercel.app';
const BLUE = [37, 99, 235];

function addWatermark(pdf, pageWidth, pageHeight) {
  pdf.setTextColor(220, 220, 220);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  const step = 52;
  for (let x = 0; x < pageWidth + step; x += step) {
    for (let y = 0; y < pageHeight + step; y += step) {
      pdf.text('PASSMARK', x, y, { angle: 45 });
    }
  }
  pdf.setTextColor(0, 0, 0);
}

function addHeader(pdf, pageWidth, margin, dateStr) {
  // Background band
  pdf.setFillColor(...BLUE);
  pdf.rect(0, 0, pageWidth, 18, 'F');

  // App name
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text(APP_NAME, margin, 11);

  // Date on the right
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(dateStr, pageWidth - margin, 11, { align: 'right' });

  pdf.setTextColor(0, 0, 0);
}

function addFooter(pdf, pageWidth, pageHeight, margin, currentPage, totalPages) {
  const footerY = pageHeight - 8;

  // Separator line
  pdf.setDrawColor(...BLUE);
  pdf.setLineWidth(0.3);
  pdf.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

  // URL on the left
  pdf.setTextColor(37, 99, 235);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(APP_URL, margin, footerY);

  // Page number on the right
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Page ${currentPage} / ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });

  pdf.setTextColor(0, 0, 0);
}

export async function downloadMessageAsPDF(element, filename = 'passmark-solution.pdf') {
  // Capture at 2x for crisp rendering on retina / mobile
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    // Expand to full scrollable height
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth  = pdf.internal.pageSize.getWidth();   // 210mm
  const pageHeight = pdf.internal.pageSize.getHeight();  // 297mm

  const margin        = 14;
  const headerHeight  = 20;  // mm reserved at top
  const footerHeight  = 14;  // mm reserved at bottom
  const contentWidth  = pageWidth - margin * 2;
  const contentHeight = pageHeight - headerHeight - footerHeight; // usable per page

  // Convert canvas to image
  const imgData   = canvas.toDataURL('image/png');
  const imgWidth  = contentWidth;
  const imgHeight = (canvas.height / canvas.width) * imgWidth; // maintain aspect ratio

  const totalPages = Math.ceil(imgHeight / contentHeight);
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage();

    // 1. Watermark first (behind everything)
    addWatermark(pdf, pageWidth, pageHeight);

    // 2. White mask for header and footer areas (cover watermark there)
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, headerHeight, 'F');
    pdf.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');

    // 3. Content image — shift up by (page * contentHeight) each page
    const imageY = headerHeight - page * contentHeight;
    pdf.addImage(imgData, 'PNG', margin, imageY, imgWidth, imgHeight, '', 'FAST');

    // 4. White masks to clip content overflow into header / footer zones
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, headerHeight, 'F');
    pdf.rect(0, pageHeight - footerHeight, pageWidth, footerHeight + 1, 'F');

    // 5. Header and footer on top
    addHeader(pdf, pageWidth, margin, dateStr);
    addFooter(pdf, pageWidth, pageHeight, margin, page + 1, totalPages);
  }

  pdf.save(filename);
}
