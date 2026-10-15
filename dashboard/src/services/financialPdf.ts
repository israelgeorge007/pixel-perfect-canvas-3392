import { jsPDF } from "jspdf";

export type FinancialPdfSection = {
  title?: string;
  columns: string[];
  rows: { cells: string[]; emphasize?: boolean }[];
};

export type FinancialPdfDocument = {
  title: string;
  subtitle?: string;
  period?: string;
  summaries?: { label: string; value: string }[];
  sections: FinancialPdfSection[];
  footer?: string;
  filename: string;
};

const ink: [number, number, number] = [36, 28, 21];
const muted: [number, number, number] = [112, 104, 96];
const accent: [number, number, number] = [255, 224, 27];
const paper: [number, number, number] = [248, 246, 241];
const rule: [number, number, number] = [229, 224, 216];

function printableText(value: string): string {
  return value.replace(/[–—]/g, "-").replace(/[·•]/g, " / ").replace(/₦/g, "NGN ")
    .replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
}

function wrap(doc: jsPDF, value: string, width: number): string[] {
  return doc.splitTextToSize(printableText(value), width);
}

function columnWeights(columnCount: number): number[] {
  if (columnCount === 7) return [1.1, 2.1, 1.3, 1, 1, 1, 1];
  if (columnCount === 6) return [1.6, 2.1, 1.4, 1, 1, 1];
  if (columnCount === 4) return [2, 1.4, 1.4, 1.2];
  if (columnCount === 3) return [2, 1.2, 1.2];
  return Array.from({ length: columnCount }, (_, index) => index === 0 ? 2 : 1);
}

export function createFinancialPdf(document: FinancialPdfDocument): jsPDF {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const left = 17;
  const right = pageWidth - left;
  const contentWidth = right - left;
  const summaryCount = document.summaries?.length ?? 0;

  pdf.setFillColor(...ink);
  pdf.rect(0, 0, pageWidth, 42, "F");
  pdf.setFillColor(...accent);
  pdf.rect(0, 42, pageWidth, 2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(...accent);
  pdf.text("CORELOGIC  /  FINANCE", left, 11);
  pdf.setFontSize(19);
  pdf.setTextColor(255, 255, 255);
  const titleLines = wrap(pdf, document.title, contentWidth - 4).slice(0, 2);
  pdf.text(titleLines, left, 21);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(225, 220, 212);
  if (document.subtitle) pdf.text(wrap(pdf, document.subtitle, contentWidth - 4).slice(0, 1), left, titleLines.length > 1 ? 31 : 28);
  if (document.period) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.text(wrap(pdf, document.period, contentWidth * 0.45).slice(0, 1), right, 37, { align: "right" });
  }

  let y = 51;
  if (summaryCount) {
    const columns = Math.min(summaryCount, 3);
    const gap = 4;
    const cardWidth = (contentWidth - gap * (columns - 1)) / columns;
    document.summaries!.forEach((summary, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      if (column === 0 && row > 0) y += 24;
      const x = left + column * (cardWidth + gap);
      pdf.setFillColor(...paper);
      pdf.setDrawColor(...rule);
      pdf.roundedRect(x, y, cardWidth, 21, 2, 2, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(...muted);
      pdf.text(wrap(pdf, summary.label, cardWidth - 8).slice(0, 1), x + 4, y + 7);
      pdf.setFontSize(9.5);
      pdf.setTextColor(...ink);
      pdf.text(wrap(pdf, summary.value, cardWidth - 8).slice(0, 2), x + 4, y + 15);
    });
    y += Math.ceil(summaryCount / columns) * 24;
  }

  const drawTableHeader = (columns: string[], widths: number[], top: number) => {
    pdf.setFillColor(...ink);
    pdf.roundedRect(left, top, contentWidth, 9, 1, 1, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    let x = left;
    columns.forEach((column, index) => {
      const alignRight = columns.length === 7 ? index >= 4 : columns.length === 6 ? index >= 3 : columns.length === 4 ? index >= 1 : index === columns.length - 1;
      pdf.text(wrap(pdf, column.toUpperCase(), widths[index] - 7).slice(0, 1), alignRight ? x + widths[index] - 3 : x + 3, top + 6, { align: alignRight ? "right" : "left" });
      x += widths[index];
    });
    return top + 9;
  };

  for (const section of document.sections) {
    if (section.title) {
      y += 5;
      if (y + 16 > pageHeight - 20) {
        pdf.addPage();
        y = 18;
      }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(...ink);
      pdf.text(printableText(section.title), left, y + 4);
      y += 8;
    }
    const weights = columnWeights(section.columns.length);
    const weightTotal = weights.reduce((total, weight) => total + weight, 0);
    const widths = weights.map((weight) => contentWidth * weight / weightTotal);
    if (y + 25 > pageHeight - 18) {
      pdf.addPage();
      y = 18;
    }
    y = drawTableHeader(section.columns, widths, y);
    for (const row of section.rows) {
      const cellLines = section.columns.map((_, index) => wrap(pdf, row.cells[index] ?? "", widths[index] - 7));
      const lineCount = Math.max(1, ...cellLines.map((lines) => lines.length));
      const rowHeight = Math.max(9, lineCount * 4 + 4);
      if (y + rowHeight > pageHeight - 19) {
        pdf.addPage();
        y = drawTableHeader(section.columns, widths, 18);
      }
      if (row.emphasize) {
        pdf.setFillColor(255, 248, 197);
        pdf.rect(left, y, contentWidth, rowHeight, "F");
      }
      pdf.setFont("helvetica", row.emphasize ? "bold" : "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(...ink);
      let x = left;
      section.columns.forEach((_, index) => {
        const alignRight = section.columns.length === 7 ? index >= 4 : section.columns.length === 6 ? index >= 3 : section.columns.length === 4 ? index >= 1 : index === section.columns.length - 1;
        pdf.text(cellLines[index], alignRight ? x + widths[index] - 3 : x + 3, y + 5, { align: alignRight ? "right" : "left" });
        x += widths[index];
      });
      y += rowHeight;
      pdf.setDrawColor(...rule);
      pdf.line(left, y, right, y);
    }
    y += 5;
  }

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(...rule);
    pdf.line(left, pageHeight - 14, right, pageHeight - 14);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...muted);
    pdf.text(wrap(pdf, document.footer ?? "Values shown in Nigerian naira (NGN).", contentWidth - 24).slice(0, 1), left, pageHeight - 8);
    pdf.text(`Page ${page} of ${pageCount}`, right, pageHeight - 8, { align: "right" });
  }

  return pdf;
}

export function downloadFinancialPdf(document: FinancialPdfDocument): void {
  const filename = printableText(document.filename).replace(/[^a-zA-Z0-9_-]+/g, "-") || "finance-report";
  createFinancialPdf(document).save(`${filename}.pdf`);
}