import type { ApprovalDocument, ApprovalRequest, DashboardData, InvoiceCompanyDetails, InvoiceCustomerDetails, InvoiceLine } from "../data/mockData";
import { createCustomerInvoice } from "./customerInvoices";
import { postApprovedProcurement } from "./procurementPosting";

export type ApprovalSubmission =
  | { type: "procurement"; payload: DashboardData["procurements"][number] & { document: ApprovalDocument } }
  | { type: "purchase-order"; payload: Omit<DashboardData["purchaseOrders"][number], "status" | "dateKey" | "lines" | "document" | "location"> & { number: string; lines: NonNullable<DashboardData["purchaseOrders"][number]["lines"]>; location: string; document: ApprovalDocument } }
  | { type: "customer-invoice"; payload: { customerId: string; invoice: string; amount: number; items: InvoiceLine[]; invoiceDate: string; dueDate: string; companyDetails?: InvoiceCompanyDetails; customerDetails?: InvoiceCustomerDetails } };

type WorkflowResult = { data?: DashboardData; error?: string };

function validApprovalDocument(document: ApprovalDocument | undefined): document is ApprovalDocument {
  return Boolean(document?.id && document.name && document.size > 0 &&
    (document.type === "application/pdf" || document.type === "image/jpeg"));
}

function auditEvent(action: string, detail: string, user: string, email: string | undefined, dateKey: string) {
  return {
    time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    action,
    detail,
    user,
    email,
    type: "Approvals",
    status: action === "Approval request rejected" ? "Rejected" : action === "Approval request approved" ? "Approved" : "Pending",
    dateKey,
  };
}

function createRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `approval-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function submitApprovalRequest(
  data: DashboardData,
  submission: ApprovalSubmission,
  submittedBy: string,
  submittedByEmail: string | undefined,
  submittedAt: string,
  revisionOf?: string,
): WorkflowResult {
  if (submission.type === "procurement") {
    if (!validApprovalDocument(submission.payload.document)) return { error: "Attach a JPEG or PDF document before submitting for approval." };
    const reference = submission.payload.billReference?.trim();
    if (!reference) return { error: "Enter a bill reference before submitting for approval." };
    const duplicatePosted = data.payables.some(({ invoice }) => invoice.trim().toLowerCase() === reference.toLowerCase());
    const duplicatePending = data.approvalRequests.some((request) =>
      request.type === "procurement" && request.status === "Pending" && request.payload.billReference?.trim().toLowerCase() === reference.toLowerCase());
    if (duplicatePosted || duplicatePending) return { error: "That bill reference is already in use." };
  }

  if (submission.type === "customer-invoice") {
    const invoice = submission.payload.invoice.trim().toLowerCase();
    const duplicatePending = data.approvalRequests.some((request) =>
      request.type === "customer-invoice" && request.status === "Pending" && request.payload.invoice.trim().toLowerCase() === invoice);
    if (duplicatePending || data.invoices.some((record) => record.invoice.trim().toLowerCase() === invoice) ||
      data.receivables.some((record) => record.invoice.trim().toLowerCase() === invoice)) {
      return { error: "Enter an invoice number that is not already in use." };
    }
    const validation = createCustomerInvoice(data, submission.payload);
    if (!validation.data) return { error: validation.error ?? "Enter a valid customer invoice before submitting for approval." };
  }

  if (submission.type === "purchase-order") {
    const number = submission.payload.number.trim().toLowerCase();
    if (!number) return { error: "Enter a purchase order number." };
    const duplicatePosted = data.purchaseOrders.some((order) => order.number.trim().toLowerCase() === number);
    const duplicatePending = data.approvalRequests.some((request) =>
      request.type === "purchase-order" && request.status === "Pending" && request.id !== revisionOf &&
      request.payload.number?.trim().toLowerCase() === number);
    if (duplicatePosted || duplicatePending) return { error: "That purchase order number is already in use." };
  }

  const requestDetails = {
    id: createRequestId(),
    status: "Pending" as const,
    submittedAt,
    submittedBy,
    submittedByEmail,
    ...(revisionOf ? { revisionOf } : {}),
  };
  let approvalRequest: ApprovalRequest;
  let detail: string;
  if (submission.type === "procurement") {
    approvalRequest = { ...requestDetails, type: submission.type, payload: submission.payload };
    detail = `${submission.payload.billReference} · ${submission.payload.item}`;
  } else if (submission.type === "purchase-order") {
    if (!validApprovalDocument(submission.payload.document)) return { error: "Attach a JPEG or PDF document before submitting for approval." };
    if (!submission.payload.supplier.trim() || !submission.payload.location || !data.inventoryLocations.some(({ location }) => location === submission.payload.location) || !submission.payload.lines.length || submission.payload.lines.some((line) =>
      !Number.isInteger(line.quantity) || line.quantity < 1 || !Number.isFinite(line.unitPrice) || line.unitPrice <= 0)) {
      return { error: "Enter a supplier and valid order items before submitting for approval." };
    }
    approvalRequest = { ...requestDetails, type: submission.type, payload: submission.payload };
    detail = `${submission.payload.supplier} · ${submission.payload.lines.map(({ item }) => item).join(", ")}`;
  } else {
    approvalRequest = { ...requestDetails, type: submission.type, payload: submission.payload };
    detail = `${submission.payload.invoice} · ${data.customers?.find(({ id }) => id === submission.payload.customerId)?.name ?? "Customer"}`;
  }
  return {
    data: {
      ...data,
      approvalRequests: [approvalRequest, ...data.approvalRequests],
      auditEvents: [auditEvent("Approval request submitted", detail, submittedBy, submittedByEmail, submittedAt.slice(0, 10)), ...data.auditEvents],
    },
  };
}

export function decideApprovalRequest(
  data: DashboardData,
  requestId: string,
  decision: "Approved" | "Rejected",
  decidedBy: string,
  decidedByEmail: string | undefined,
  decidedAt: string,
  rejectionReason = "",
): WorkflowResult {
  const request = data.approvalRequests.find(({ id }) => id === requestId);
  if (!request) return { error: "This approval request could not be found." };
  if (request.status !== "Pending") return { error: "This request has already been decided." };
  if (decision === "Rejected" && !rejectionReason.trim()) return { error: "Enter a reason for rejecting this request." };

  let nextData = data;
  let resultingReference: string | undefined;
  const dateKey = decidedAt.slice(0, 10);
  if (decision === "Approved") {
    if (request.type === "procurement") {
      const payload = request.payload;
      const nextNumber = Math.max(0, ...data.procurements.map(({ reference }) => Number(reference?.match(/(\d+)$/)?.[1] ?? 0))) + 1;
      const procurement = {
        ...payload,
        reference: payload.reference || `PR-${dateKey.slice(0, 4)}-${String(nextNumber).padStart(3, "0")}`,
        status: "Approved",
        dateKey: payload.dateKey ?? dateKey,
      };
      const posted = postApprovedProcurement(data, procurement, dateKey);
      if (!posted.data) return { error: posted.error ?? "The approved procurement could not be posted." };
      nextData = {
        ...posted.data,
        procurements: [procurement, ...posted.data.procurements.filter(({ reference }) => reference !== procurement.reference)],
      };
      resultingReference = posted.invoice;
    } else if (request.type === "purchase-order") {
      const payload = request.payload;
      const lines = payload.lines ?? [];
      if (!lines.length) return { error: "The approved purchase order has no order items." };
      const number = payload.number?.trim();
      if (!number) return { error: "The approved purchase order is missing its purchase order number." };
      const quantity = lines.reduce((total, line) => total + line.quantity, 0);
      const amount = lines.reduce((total, line) => total + line.quantity * line.unitPrice, 0);
      nextData = {
        ...data,
        purchaseOrders: [{ ...payload, lines, number, items: lines.length, quantity, amount, status: "Approved", dateKey }, ...data.purchaseOrders],
      };
      resultingReference = number;
    } else {
      const posted = createCustomerInvoice(data, request.payload);
      if (!posted.data) return { error: posted.error ?? "The approved customer invoice could not be posted." };
      nextData = posted.data;
      resultingReference = request.payload.invoice;
    }
  }

  const decidedRequest: ApprovalRequest = {
    ...request,
    status: decision,
    decidedAt,
    decidedBy,
    ...(decision === "Rejected" ? { rejectionReason: rejectionReason.trim() } : { resultingReference }),
  };
  const decisionDetail = `${request.type} · ${resultingReference ?? (request.type === "customer-invoice" ? request.payload.invoice : request.type === "procurement" ? request.payload.billReference : request.payload.supplier)}`;
  return {
    data: {
      ...nextData,
      approvalRequests: nextData.approvalRequests.map((item) => item.id === requestId ? decidedRequest : item),
      auditEvents: [auditEvent(decision === "Approved" ? "Approval request approved" : "Approval request rejected", decisionDetail, decidedBy, decidedByEmail, dateKey), ...nextData.auditEvents],
    },
  };
}
