import { jsPDF } from "jspdf";
import type {
  DashboardInvoice,
  InvoiceCompanyDetails,
  InvoiceCustomerDetails,
  InvoiceLine,
} from "../data/mockData";

const ink: [number, number, number] = [36, 28, 21];
const muted: [number, number, number] = [112, 104, 96];
const accent: [number, number, number] = [255, 224, 27];
const paper: [number, number, number] = [248, 246, 241];
const rule: [number, number, number] = [229, 224, 216];

function printableText(value: string): string {
  return value
    .replace(/[–—]/g, "-")
    .replace(/[·•]/g, " / ")
    .replace(/₦/g, "NGN ")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function money(value: number): string {
  return `NGN ${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateLabel(value: string | undefined): string {
  if (!value) return "-";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? printableText(value)
    : parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function drawInvoiceTableHeader(doc: jsPDF, y: number, left: number, right: number) {
  doc.setFillColor(...ink);
  doc.roundedRect(left, y, right - left, 10, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("DESCRIPTION", left + 4, y + 6.5);
  doc.text("QTY", left + 111, y + 6.5, { align: "right" });
  doc.text("PRICE", left + 144, y + 6.5, { align: "right" });
  doc.text("AMOUNT", right - 4, y + 6.5, { align: "right" });
}

export function createInvoicePdf(
  invoice: DashboardInvoice,
  company?: InvoiceCompanyDetails,
  customer?: InvoiceCustomerDetails,
): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 18;
  const right = pageWidth - left;
  const contentWidth = right - left;
  const companyName = printableText(company?.name || "Company details unavailable");
  const buyerName = printableText(customer?.name || invoice.customer || "Customer");
  const rows: InvoiceLine[] = invoice.items?.length
    ? invoice.items
    : [
        {
          description: "Item details were not recorded for this invoice.",
          quantity: 1,
          unitPrice: invoice.amount,
        },
      ];

  doc.setFillColor(...ink);
  doc.rect(0, 0, pageWidth, 52, "F");
  doc.setFillColor(...accent);
  doc.rect(0, 52, pageWidth, 2, "F");

  let logoDrawn = false;
  if (company?.logoDataUrl) {
    try {
      doc.addImage(company.logoDataUrl, 18, 12, 23, 23);
      logoDrawn = true;
    } catch {
      logoDrawn = false;
    }
  }
  const companyX = logoDrawn ? 47 : left;
  if (!logoDrawn) {
    const initials =
      companyName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "C";
    doc.setFillColor(...accent);
    doc.roundedRect(left, 13, 22, 22, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...ink);
    doc.text(initials, left + 11, 27, { align: "center" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(doc.splitTextToSize(companyName, 78)[0], companyX, 17);
  const companyLines = [
    company?.address,
    [company?.contactEmail, company?.contactPhone].filter(Boolean).join(" / "),
    company?.website,
  ]
    .filter((line): line is string => Boolean(line))
    .flatMap((line) => doc.splitTextToSize(printableText(line), 80));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(225, 220, 212);
  companyLines.slice(0, 4).forEach((line, index) => doc.text(line, companyX, 23 + index * 4.2));
  const companyIdentifiers = [
    company?.registrationNumber ? `Registration: ${company.registrationNumber}` : "",
    company?.taxId ? `Tax ID: ${company.taxId}` : "",
  ]
    .filter(Boolean)
    .join(" / ");
  if (companyIdentifiers) {
    doc.setFontSize(7);
    doc.text(doc.splitTextToSize(printableText(companyIdentifiers), 80).slice(0, 2), companyX, 43);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...accent);
  doc.text("INVOICE", right, 19, { align: "right" });
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(printableText(invoice.invoice), right, 27, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(225, 220, 212);
  doc.text("ORIGINAL", right, 34, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...muted);
  doc.text("ISSUE DATE", left, 65);
  doc.text("DUE DATE", left + 48, 65);
  doc.text("INVOICE TOTAL", right, 65, { align: "right" });
  doc.setFontSize(10);
  doc.setTextColor(...ink);
  doc.text(printableText(invoice.date || dateLabel(invoice.dateKey)), left, 72);
  doc.text(dateLabel(invoice.dueDate), left + 48, 72);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(money(invoice.amount), right, 73, { align: "right" });

  const partyY = 83;
  const partyHeight = 42;
  doc.setFillColor(...paper);
  doc.setDrawColor(...rule);
  doc.roundedRect(left, partyY, contentWidth, partyHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...muted);
  doc.text("BILL TO", left + 5, partyY + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...ink);
  doc.text(doc.splitTextToSize(buyerName, contentWidth - 10)[0], left + 5, partyY + 14);
  const buyerLines = [customer?.address, customer?.email, customer?.phone]
    .filter(Boolean)
    .map((line) => printableText(line!));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...muted);
  buyerLines
    .slice(0, 3)
    .forEach((line, index) =>
      doc.text(doc.splitTextToSize(line, contentWidth - 10)[0], left + 5, partyY + 21 + index * 5),
    );

  let y = 137;
  drawInvoiceTableHeader(doc, y, left, right);
  y += 10;
  rows.forEach((item) => {
    const description = printableText(item.description);
    const descriptionLines = doc.splitTextToSize(description, 92);
    const rowHeight = Math.max(11, descriptionLines.length * 4 + (item.inventorySku ? 4 : 0) + 4);
    if (y + rowHeight > 250) {
      doc.addPage();
      y = 20;
      drawInvoiceTableHeader(doc, y, left, right);
      y += 10;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...ink);
    doc.text(descriptionLines, left + 4, y + 5);
    if (item.inventorySku) {
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text(
        `SKU ${printableText(item.inventorySku)}`,
        left + 4,
        y + 5 + descriptionLines.length * 4,
      );
    }
    doc.setFontSize(8.5);
    doc.setTextColor(...ink);
    doc.text(item.inventorySku ? String(item.quantity) : "-", left + 111, y + 5, {
      align: "right",
    });
    doc.text(money(item.unitPrice), left + 144, y + 5, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(money(Math.round(item.quantity * item.unitPrice * 100) / 100), right - 4, y + 5, {
      align: "right",
    });
    y += rowHeight;
    doc.setDrawColor(...rule);
    doc.line(left, y, right, y);
  });

  const totalsRows = invoice.totals
    ? [
        { label: "Subtotal", amount: invoice.totals.subtotal },
        { label: "Discount", amount: -invoice.totals.discountAmount },
        { label: "Shipping fee", amount: invoice.totals.shippingFee },
        {
          label: `VAT (${Number((invoice.totals.vatRate * 100).toFixed(2))}%)`,
          amount: invoice.totals.vatAmount,
        },
      ]
    : [];
  if (y + totalsRows.length * 5 + 25 > 260) {
    doc.addPage();
    y = 20;
  }
  y += totalsRows.length ? 4 : 8;
  totalsRows.forEach(({ label, amount }) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(label, right - 52, y + 4);
    doc.text(money(amount), right - 4, y + 4, { align: "right" });
    y += 5;
  });
  if (totalsRows.length) y += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text("Total due", right - 52, y + 5);
  doc.setFillColor(...accent);
  doc.roundedRect(right - 45, y - 1, 45, 13, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...ink);
  doc.text(money(invoice.amount), right - 4, y + 7, { align: "right" });

  y += 25;
  if (company?.bankAccounts.length) {
    if (y + 24 > 270) {
      doc.addPage();
      y = 22;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text("PAYMENT DETAILS", left, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...ink);
    company.bankAccounts.forEach((account) => {
      const details = [
        account.bankName,
        account.accountName,
        account.accountNumber,
        account.currency,
      ]
        .filter(Boolean)
        .map(printableText)
        .join(" / ");
      const lines = doc.splitTextToSize(details, contentWidth);
      if (y + lines.length * 4.5 > 275) {
        doc.addPage();
        y = 22;
      }
      doc.text(lines, left, y);
      y += lines.length * 4.5 + 1;
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...rule);
    doc.line(left, pageHeight - 15, right, pageHeight - 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text(companyName, left, pageHeight - 9);
    doc.text(`Page ${page} of ${pageCount}`, right, pageHeight - 9, { align: "right" });
  }

  return doc;
}

export function downloadInvoicePdf(
  invoice: DashboardInvoice,
  company?: InvoiceCompanyDetails,
  customer?: InvoiceCustomerDetails,
): void {
  const doc = createInvoicePdf(invoice, company, customer);
  const filename = printableText(invoice.invoice).replace(/[^a-zA-Z0-9_-]+/g, "-") || "invoice";
  doc.save(`Invoice-${filename}.pdf`);
}
