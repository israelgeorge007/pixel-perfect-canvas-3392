import type { DashboardData } from "../data/mockData";
import { appendJournal, prepareJournal } from "./journalPosting";

export function postApprovedProcurement(
  data: DashboardData,
  procurement: DashboardData["procurements"][number],
  dateKey: string,
): { data?: DashboardData; invoice?: string; alreadyPosted?: boolean; error?: string } {
  const invoice = procurement.billReference?.trim() || procurement.reference?.trim();
  const vendor = procurement.supplier.trim();
  const amount = procurement.amount;
  if (!invoice || !vendor || !Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7) {
    return { error: "Enter a supplier, bill reference, and positive amount with no more than two decimal places before approval." };
  }

  const existingPayable = data.payables.find(({ invoice: existingInvoice }) => existingInvoice.trim().toLowerCase() === invoice.toLowerCase());
  if (existingPayable) {
    if (existingPayable.vendor.toLowerCase() === vendor.toLowerCase() && Math.abs(existingPayable.amount - amount) < 0.005) {
      return { data, invoice, alreadyPosted: true };
    }
    return { error: "That bill reference is already in use." };
  }

  const prepared = prepareJournal(data, {
    dateKey,
    memo: `Vendor bill ${invoice}`,
    sourceType: "vendor-bill",
    sourceId: invoice,
    lines: [
      { account: procurement.billType === "inventory" ? "Inventory" : "Office Supplies", debit: amount, credit: 0 },
      { account: "Accounts Payable", debit: 0, credit: amount },
    ],
  });
  if (!prepared.entry) return { error: prepared.error ?? "Approved procurement bill could not be posted." };

  const posted = appendJournal(data, prepared.entry);
  if (!posted.data) return { error: posted.error ?? "Approved procurement bill could not be posted." };
  const vendorProfile = posted.data.vendors?.find(({ name }) => name.toLowerCase() === vendor.toLowerCase());
  return {
    data: {
      ...posted.data,
      payables: [{
        vendor,
        vendorId: vendorProfile?.id,
        invoice,
        amount,
        due: procurement.due,
        ledgerStatus: "Matched",
        paymentStatus: "Pending",
        dateKey,
        journalEntryId: prepared.entry.id,
        billType: procurement.billType ?? "expense",
      }, ...posted.data.payables],
    },
    invoice,
  };
}