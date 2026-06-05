import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const APP_NAME = 'PassMark AI Tutor';
const APP_URL  = 'passmarks.vercel.app';
const APP_FULL_URL = `https://${APP_URL}`;
const BLUE  = [37,  99,  235];
const DARK  = [15,  23,  42];
const GREEN = [34,  197, 94];

// ─── Watermark ────────────────────────────────────────────────────────────────

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

// ─── Header (blue band + promo line) ─────────────────────────────────────────

function addHeader(pdf, pageWidth, margin, dateStr) {
  pdf.setFillColor(...BLUE);
  pdf.rect(0, 0, pageWidth, 22, 'F');

  // App name
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text(APP_NAME, margin, 9);

  // Date
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(dateStr, pageWidth - margin, 9, { align: 'right' });

  // Promo line
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(196, 224, 255);
  pdf.text('Get AI-powered answers like this — free at passmarks.vercel.app', margin, 17);

  // Full band is clickable
  pdf.link(0, 0, pageWidth, 22, { url: APP_FULL_URL });

  pdf.setTextColor(0, 0, 0);
}

// ─── Footer (URL + tagline + page number) ────────────────────────────────────

function addFooter(pdf, pageWidth, pageHeight, margin, currentPage, totalPages) {
  const footerY = pageHeight - 8;

  pdf.setDrawColor(...BLUE);
  pdf.setLineWidth(0.3);
  pdf.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...BLUE);
  pdf.textWithLink(APP_URL, margin, footerY, { url: APP_FULL_URL });

  // Tagline after URL
  const urlW = pdf.getTextWidth(APP_URL);
  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'italic');
  pdf.text(' · AI Tutor · Past Papers · Quizzes · Free', margin + urlW, footerY);

  // Page number
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Page ${currentPage} / ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });

  pdf.setTextColor(0, 0, 0);
}

// ─── Promo / Ad page ─────────────────────────────────────────────────────────

function addPromoPage(pdf, pageWidth, pageHeight, margin) {
  pdf.addPage();

  const W  = pageWidth;
  const cx = W / 2;

  // Background
  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, 0, W, pageHeight, 'F');

  // ── Top blue band ──
  pdf.setFillColor(...BLUE);
  pdf.rect(0, 0, W, 42, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PassMark', cx, 16, { align: 'center' });

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(196, 224, 255);
  pdf.text('GCE AI Tutor for Cameroon — O Level & A Level', cx, 25, { align: 'center' });

  // FREE badge
  const badgeW = 32;
  pdf.setFillColor(...GREEN);
  pdf.roundedRect(cx - badgeW / 2, 29, badgeW, 8, 2, 2, 'F');
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('100% FREE', cx, 34.5, { align: 'center' });

  // ── Hook ──
  let y = 56;
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...DARK);
  pdf.text('Your classmates are already using AI', cx, y, { align: 'center' });
  y += 7;
  pdf.text('to solve GCE papers. Are you?', cx, y, { align: 'center' });

  y += 6;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text('Join thousands of GCE students across Cameroon who revise smarter,', cx, y, { align: 'center' });
  y += 5;
  pdf.text('score higher — and stop spending money on expensive pamphlets.', cx, y, { align: 'center' });

  // ── Divider ──
  y += 9;
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.4);
  pdf.line(margin + 10, y, W - margin - 10, y);

  y += 9;
  pdf.setFontSize(10.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...DARK);
  pdf.text('Everything you need to pass your GCE:', margin + 6, y);

  // ── Feature cards ──
  const features = [
    {
      color: BLUE,
      title: 'AI that solves any GCE question — instantly',
      desc:  'Type your question or send a photo of your exercise. Get a full step-by-step solution in seconds, any subject, any level.',
    },
    {
      color: [249, 115, 22],
      title: 'Past Papers — O Level & A Level, all regions',
      desc:  'GCE Board, NW Mock, SW Mock, Centre, Littoral and more. Real exam papers from multiple years, all in one place.',
    },
    {
      color: [168, 85, 247],
      title: 'Timed Quizzes with instant explanations',
      desc:  'Find your weak topics before the examiner does. Practice under real exam conditions and get detailed explanations for every wrong answer.',
    },
    {
      color: [34, 197, 94],
      title: 'Download & share AI solutions as PDF',
      desc:  'Save this solution to your phone. Send it to your study group on WhatsApp. Revise offline — no data needed after download.',
    },
    {
      color: [20, 184, 166],
      title: 'Built for Cameroon — works on MTN & Orange',
      desc:  'Designed for 3G. Lightweight, fast, and offline-ready. No Wi-Fi required. Works on any Tecno, Infinix, Samsung or iPhone.',
    },
  ];

  y += 8;
  for (const f of features) {
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(margin, y - 4, W - margin * 2, 18, 2, 2, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(margin, y - 4, W - margin * 2, 18, 2, 2, 'S');

    // Left accent bar
    pdf.setFillColor(...f.color);
    pdf.rect(margin, y - 4, 3, 18, 'F');

    // Title
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...DARK);
    pdf.text(f.title, margin + 10, y + 2);

    // Description
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text(f.desc, margin + 10, y + 8, { maxWidth: W - margin * 2 - 14 });

    y += 21;
  }

  // ── Urgency banner ──
  y += 2;
  pdf.setFillColor(254, 242, 242);
  pdf.roundedRect(margin, y, W - margin * 2, 11, 2, 2, 'F');
  pdf.setDrawColor(254, 202, 202);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(margin, y, W - margin * 2, 11, 2, 2, 'S');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(220, 38, 38);
  pdf.text('GCE 2026 is coming. Every day without the right tools is a risk.', cx, y + 7.5, { align: 'center' });

  // ── CTA button ──
  y += 17;
  const btnX = margin + 15;
  const btnW = W - (margin + 15) * 2;
  pdf.setFillColor(...BLUE);
  pdf.roundedRect(btnX, y, btnW, 15, 3, 3, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Start Free Now  →  passmarks.vercel.app', cx, y + 10, { align: 'center' });
  pdf.link(btnX, y, btnW, 15, { url: APP_FULL_URL });

  // ── Fine print ──
  y += 21;
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(148, 163, 184);
  pdf.text(
    'No subscription · No credit card · No data wasted · Works on Android & iPhone',
    cx, y, { align: 'center' },
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function downloadMessageAsPDF(element, filename = 'passmark-solution.pdf') {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth  = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin        = 14;
  const headerHeight  = 24;  // taller — accommodates promo line
  const footerHeight  = 14;
  const contentWidth  = pageWidth - margin * 2;
  const contentHeight = pageHeight - headerHeight - footerHeight;

  const imgData   = canvas.toDataURL('image/png');
  const imgWidth  = contentWidth;
  const imgHeight = (canvas.height / canvas.width) * imgWidth;

  const totalPages = Math.ceil(imgHeight / contentHeight);
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage();

    // 1. Watermark
    addWatermark(pdf, pageWidth, pageHeight);

    // 2. White areas for header/footer
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, headerHeight, 'F');
    pdf.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');

    // 3. Content
    const imageY = headerHeight - page * contentHeight;
    pdf.addImage(imgData, 'PNG', margin, imageY, imgWidth, imgHeight, '', 'FAST');

    // 4. Clip content overflow
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, headerHeight, 'F');
    pdf.rect(0, pageHeight - footerHeight, pageWidth, footerHeight + 1, 'F');

    // 5. Header & footer on top
    addHeader(pdf, pageWidth, margin, dateStr);
    addFooter(pdf, pageWidth, pageHeight, margin, page + 1, totalPages);
  }

  // Dedicated promo page — always last
  addPromoPage(pdf, pageWidth, pageHeight, margin);

  pdf.save(filename);
}
