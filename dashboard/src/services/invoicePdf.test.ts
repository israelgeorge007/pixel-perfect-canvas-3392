import { describe, expect, it } from "vitest";
import type { DashboardInvoice } from "../data/mockData";
import { createInvoicePdf } from "./invoicePdf";

const invoice: DashboardInvoice = {
  id: "INV-2026-0001",
  vendor: "",
  customer: "Lagos Premium Hotels",
  invoice: "INV-2026-0001",
  date: "13 Oct 2026",
  dateKey: "2026-10-13",
  dueDate: "2026-11-06",
  amount: 500_000,
  status: "Matched",
  owner: "Maya Chen",
  items: [{ description: "Monthly accounting support", quantity: 1, unitPrice: 500_000 }],
};

describe("invoice PDF", () => {
  it("produces a valid PDF document from a saved invoice", () => {
    const document = createInvoicePdf(invoice);
    const bytes = new Uint8Array(document.output("arraybuffer"));

    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(document.getNumberOfPages()).toBe(1);
  });

  it("produces a valid PDF when an invoice includes a totals breakdown", () => {
    const document = createInvoicePdf({
      ...invoice,
      amount: 1_021.25,
      items: [{ description: "Office support", quantity: 1, unitPrice: 1_000 }],
      totals: { subtotal: 1_000, discountAmount: 100, vatRate: 0.075, vatAmount: 71.25, shippingFee: 50 },
    });

    expect(new TextDecoder().decode(new Uint8Array(document.output("arraybuffer")).slice(0, 5))).toBe("%PDF-");
  });

  it("adds pages when invoice line items exceed the first page", () => {
    const document = createInvoicePdf({
      ...invoice,
      amount: 20_000,
      items: Array.from({ length: 40 }, (_, index) => ({ description: `Service line ${index + 1}`, quantity: 1, unitPrice: 500 })),
    });

    expect(document.getNumberOfPages()).toBeGreaterThan(1);
  });
});