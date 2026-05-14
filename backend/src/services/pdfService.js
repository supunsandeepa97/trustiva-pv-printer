const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib');
const fs   = require('fs');
const path = require('path');

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

const PDF_DIR = process.env.PDF_DIR || './generated-pdfs';
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });

// A5 in points: 148mm × 210mm
const A5_W = 419.53;
const A5_H = 595.28;
const MARGIN = 34; // ~12mm

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3), 16) / 255;
  const g = parseInt(hex.slice(3,5), 16) / 255;
  const b = parseInt(hex.slice(5,7), 16) / 255;
  return rgb(r, g, b);
}

function formatCurrency(amount, currency = 'LKR') {
  return `${currency} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  } catch { return dateStr; }
}

function isFieldVisible(field, template) {
  const visibleFields = template?.config?.visible_fields;
  if (!visibleFields) return true;
  return visibleFields.includes(field);
}

async function drawVoucherPage(page, voucher, company, template, pdfDoc) {
  const bold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const normal = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const styles       = template?.config?.styles || {};
  const headerBg     = hexToRgb(styles.headerBg    || '#0F172A');
  const accentColor  = hexToRgb(styles.accentColor || '#2563EB');
  const sigLabels    = template?.config?.signature_labels || { left: 'Prepared By', center: 'Approved By', right: 'Received By' };

  let y = A5_H;

  // ── Header background ──────────────────────────────────────
  const headerH = 75;
  page.drawRectangle({ x: 0, y: A5_H - headerH, width: A5_W, height: headerH, color: headerBg });

  // Logo (if available and field visible)
  let logoRight = MARGIN;
  if (isFieldVisible('logo', template) && company.logo_url) {
    const safeUrl  = company.logo_url.replace(/^\//, '');
    const logoPath = path.resolve(process.cwd(), safeUrl);
    const withinUploads = logoPath.startsWith(UPLOADS_DIR + path.sep) || logoPath.startsWith(UPLOADS_DIR + '/');
    if (!withinUploads) {
      console.warn('[PDF] Logo path rejected — outside uploads directory:', safeUrl);
    } else if (fs.existsSync(logoPath)) {
      try {
        const logoBytes = fs.readFileSync(logoPath);
        const logoImg   = company.logo_url.endsWith('.png')
          ? await pdfDoc.embedPng(logoBytes)
          : await pdfDoc.embedJpg(logoBytes);
        const logoScale = logoImg.scaleToFit(45, 45);
        page.drawImage(logoImg, { x: MARGIN, y: A5_H - headerH + (headerH - logoScale.height) / 2, ...logoScale });
        logoRight = MARGIN + logoScale.width + 8;
      } catch (e) {
        console.warn('[PDF] Logo embed failed:', e.message);
      }
    }
  }

  // Company name
  const companyName = company.name || 'COMPANY NAME';
  page.drawText(companyName, {
    x: logoRight, y: A5_H - 26,
    font: bold, size: 12, color: rgb(1, 1, 1),
    maxWidth: A5_W - logoRight - MARGIN - 100,
  });

  // Company address
  if (company.address) {
    page.drawText(company.address, {
      x: logoRight, y: A5_H - 40,
      font: normal, size: 7, color: rgb(0.8, 0.85, 0.9),
      maxWidth: A5_W - logoRight - MARGIN - 100,
    });
  }

  // Voucher title (right side)
  const title = 'PAYMENT VOUCHER';
  const titleW = bold.widthOfTextAtSize(title, 10);
  page.drawText(title, {
    x: A5_W - MARGIN - titleW, y: A5_H - 26,
    font: bold, size: 10, color: rgb(1, 1, 1),
  });

  // Divider
  y = A5_H - headerH - 8;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: A5_W - MARGIN, y }, thickness: 1.5, color: accentColor });
  y -= 14;

  // ── Voucher No + Date (two column) ──────────────────────────
  const midX = A5_W / 2;

  page.drawText('Voucher No:', { x: MARGIN, y, font: bold, size: 8, color: rgb(0.3,0.3,0.3) });
  page.drawText(voucher.voucher_no || '-', { x: MARGIN + 56, y, font: normal, size: 8, color: rgb(0.1,0.1,0.1) });
  page.drawText('Date:', { x: midX, y, font: bold, size: 8, color: rgb(0.3,0.3,0.3) });
  page.drawText(formatDate(voucher.date), { x: midX + 32, y, font: normal, size: 8, color: rgb(0.1,0.1,0.1) });
  y -= 14;

  // Payee
  page.drawText('Paid To:', { x: MARGIN, y, font: bold, size: 8, color: rgb(0.3,0.3,0.3) });
  page.drawText(voucher.payee_name || '-', { x: MARGIN + 40, y, font: bold, size: 9, color: rgb(0.05,0.05,0.05), maxWidth: A5_W - MARGIN - 60 });
  y -= 14;

  // Bank + Cheque
  if (isFieldVisible('bank_name', template) && (voucher.bank_name || voucher.cheque_no)) {
    page.drawText('Bank:', { x: MARGIN, y, font: bold, size: 8, color: rgb(0.3,0.3,0.3) });
    page.drawText(voucher.bank_name || '-', { x: MARGIN + 30, y, font: normal, size: 8, color: rgb(0.1,0.1,0.1) });
    if (isFieldVisible('cheque_no', template) && voucher.cheque_no) {
      page.drawText('Cheque No:', { x: midX, y, font: bold, size: 8, color: rgb(0.3,0.3,0.3) });
      page.drawText(voucher.cheque_no, { x: midX + 55, y, font: normal, size: 8, color: rgb(0.1,0.1,0.1) });
    }
    y -= 14;
  }

  // Account
  if (isFieldVisible('account_name', template) && voucher.account_name) {
    page.drawText('Account:', { x: MARGIN, y, font: bold, size: 8, color: rgb(0.3,0.3,0.3) });
    page.drawText(voucher.account_name, { x: MARGIN + 44, y, font: normal, size: 8, color: rgb(0.1,0.1,0.1) });
    page.drawText('Currency:', { x: midX, y, font: bold, size: 8, color: rgb(0.3,0.3,0.3) });
    page.drawText(voucher.currency || 'LKR', { x: midX + 50, y, font: normal, size: 8, color: rgb(0.1,0.1,0.1) });
    y -= 14;
  }

  // Description
  if (isFieldVisible('description', template) && voucher.description) {
    y -= 4;
    page.drawLine({ start: { x: MARGIN, y: y + 2 }, end: { x: A5_W - MARGIN, y: y + 2 }, thickness: 0.5, color: rgb(0.9,0.9,0.9) });
    y -= 12;
    page.drawText('Description:', { x: MARGIN, y, font: bold, size: 8, color: rgb(0.3,0.3,0.3) });
    y -= 12;
    page.drawText(voucher.description, { x: MARGIN, y, font: normal, size: 8, color: rgb(0.2,0.2,0.2), maxWidth: A5_W - MARGIN * 2 });
    y -= 6;
  }

  // ── Amount box ──────────────────────────────────────────────
  y -= 10;
  const boxH   = 52;
  const boxY   = y - boxH;
  page.drawRectangle({ x: MARGIN, y: boxY, width: A5_W - MARGIN * 2, height: boxH, color: rgb(0.97,0.98,1), borderColor: accentColor, borderWidth: 1 });

  const amtLabel = formatCurrency(voucher.amount, voucher.currency || 'LKR');
  page.drawText('Amount:', { x: MARGIN + 8, y: boxY + boxH - 18, font: bold, size: 9, color: rgb(0.2,0.2,0.2) });
  page.drawText(amtLabel, { x: MARGIN + 56, y: boxY + boxH - 18, font: bold, size: 13, color: accentColor });

  page.drawText('In Words:', { x: MARGIN + 8, y: boxY + boxH - 36, font: bold, size: 8, color: rgb(0.3,0.3,0.3) });
  page.drawText(voucher.amount_words || '', {
    x: MARGIN + 56, y: boxY + boxH - 36,
    font: italic, size: 7.5, color: rgb(0.2,0.2,0.2),
    maxWidth: A5_W - MARGIN - 70,
  });

  y = boxY - 12;

  // Prepared By
  if (isFieldVisible('prepared_by', template) && voucher.prepared_by) {
    page.drawText(`Prepared By: ${voucher.prepared_by}`, { x: MARGIN, y, font: normal, size: 7.5, color: rgb(0.3,0.3,0.3) });
    y -= 12;
  }

  // ── Signature section (anchored near bottom) ────────────────
  const sigY    = 42;
  const colW    = (A5_W - MARGIN * 2) / 3;

  page.drawLine({ start: { x: MARGIN, y: sigY + 28 }, end: { x: A5_W - MARGIN, y: sigY + 28 }, thickness: 0.5, color: rgb(0.85,0.85,0.85) });

  const sigEntries = [
    { label: sigLabels.left   || 'Prepared By',  x: MARGIN },
    { label: sigLabels.center || 'Approved By',  x: MARGIN + colW },
    { label: sigLabels.right  || 'Received By',  x: MARGIN + colW * 2 },
  ];

  for (const { label, x } of sigEntries) {
    const lineLen = colW - 12;
    page.drawLine({ start: { x, y: sigY + 12 }, end: { x: x + lineLen, y: sigY + 12 }, thickness: 0.75, color: rgb(0.3,0.3,0.3) });
    page.drawText(label, { x, y: sigY, font: normal, size: 7, color: rgb(0.5,0.5,0.5) });
  }

  // Footer
  const now = new Date().toLocaleString('en-GB');
  const footerText = `Printed: ${now}  |  TRUSTIVA PRINTER`;
  const footerW    = normal.widthOfTextAtSize(footerText, 6);
  page.drawText(footerText, {
    x: (A5_W - footerW) / 2, y: 8,
    font: normal, size: 6, color: rgb(0.65,0.65,0.65),
  });
}

async function generateVoucherPDF(voucher, company, template) {
  const pdfDoc = await PDFDocument.create();
  const page   = pdfDoc.addPage([A5_W, A5_H]);
  await drawVoucherPage(page, voucher, company, template, pdfDoc);

  const bytes    = await pdfDoc.save();
  const filename = `voucher-${voucher.id}-${Date.now()}.pdf`;
  const filePath = path.join(PDF_DIR, filename);
  await fs.promises.writeFile(filePath, bytes);
  return { filePath, filename, url: `/generated-pdfs/${filename}` };
}

async function generateBulkPDF(vouchers, company, template) {
  const pdfDoc = await PDFDocument.create();
  for (const voucher of vouchers) {
    const page = pdfDoc.addPage([A5_W, A5_H]);
    await drawVoucherPage(page, voucher, company, template, pdfDoc);
  }

  const bytes    = await pdfDoc.save();
  const filename = `bulk-${Date.now()}.pdf`;
  const filePath = path.join(PDF_DIR, filename);
  await fs.promises.writeFile(filePath, bytes);
  return { filePath, filename, url: `/generated-pdfs/${filename}` };
}

module.exports = { generateVoucherPDF, generateBulkPDF };
