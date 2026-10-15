import { describe, expect, it } from "vitest";
import { createFinancialPdf } from "./financialPdf";

describe("financial report PDF", () => {
  it("generates a readable PDF from report summaries and table rows", () => {
    const pdf = createFinancialPdf({
      title: "Operating account",
      subtitle: "Account code 5000 / Expense account activity",
      period: "01 Oct 2026 - 13 Oct 2026",
      summaries: [{ label: "Total debits", value: "NGN 1,250.00" }],
      sections: [{
        title: "Account activity",
        columns: ["Date", "Description", "Reference", "Debit", "Credit", "Balance"],
        rows: [{ cells: ["13 Oct 2026", "Office supplies", "JE-2026-0001", "NGN 1,250.00", "-", "NGN 1,250.00"] }],
      }],
      filename: "Operating account",
    });
    const bytes = new Uint8Array(pdf.output("arraybuffer"));

    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(pdf.getNumberOfPages()).toBe(1);
  });

  it("adds pages for long report tables", () => {
    const pdf = createFinancialPdf({
      title: "Customer statement",
      sections: [{
        title: "Account activity",
        columns: ["Date", "Description", "Reference", "Status", "Debit", "Credit", "Balance"],
        rows: Array.from({ length: 80 }, (_, index) => ({
          cells: [`13 Oct 2026`, `Transaction description ${index + 1}`, `INV-${index + 1}`, "Open", "NGN 100.00", "-", "NGN 100.00"],
        })),
      }],
      filename: "Customer statement",
    });

    expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
  });
});