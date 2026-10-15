import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ComponentType, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDownRight, ArrowUpRight, Bell, Boxes, Building2, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Download,
  FileCheck2, Headphones, HelpCircle, LockKeyhole, LogOut, Mail, MessageSquare,
  Menu, MoreHorizontal, PackageCheck, Pencil, Phone, Plus, Search, Settings, ShieldCheck, Sparkles,
  Trash2, TrendingUp, Upload, UserRound, X,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import type { ApprovalDocument, ApprovalRequest, DashboardData, DashboardNav, InvoiceCompanyDetails, InvoiceCustomerDetails, InvoiceLine, InvoiceStatus, LedgerAccountType, ReconciliationView } from "./data/mockData";
import { cashFlowAmountToNaira, fetchDashboardData, filterDashboardData, formatCompactNaira, formatDateKey, formatNaira, getCashFlowWaterfall, getInventoryMetrics, getModuleRecords, getOverviewMetrics, saveDashboardData, toDateKey, type CashFlowStep } from "./services/dashboardData";
import { calculateFinancialStatements, calculateWeightedAverage, findJournalMatches, getUnmatchedCashJournalEntries, parseBankStatementCsv, validateJournalEntry, type BankCsvMapping, type JournalEntry } from "./services/accounting";
import { createCustomerInvoice, getSellableInventoryItems } from "./services/customerInvoices";
import { decideApprovalRequest, submitApprovalRequest, type ApprovalSubmission } from "./services/approvalWorkflow";
import { getApprovalDocumentType, loadApprovalDocument, maximumApprovalDocumentSize, removeApprovalDocument, storeApprovalDocument } from "./services/approvalDocuments";
import { appendJournal, prepareJournal, type JournalDraft, type PostingLineDraft } from "./services/journalPosting";
import { postApprovedProcurement } from "./services/procurementPosting";
import { getLocationQuantity, receiveInventoryAtLocation, setLocationQuantity, syncInventoryLocationTotals } from "./services/inventoryStock";
import { mockDashboardData } from "./data/mockData";
import type { FinancialPdfDocument } from "./services/financialPdf";

type NavKey = "Overview" | "Approvals" | "Ledger" | "Receivables" | "Payables" | "Reconciliation" | "Invoice" | "Inventory" | "Payroll" | "Reports" | "Audit Logs" | "Settings";
type ModuleNavKey = DashboardNav;
type Status = InvoiceStatus;
type Invoice = DashboardData["invoices"][number];
type PurchaseOrderLine = { item: string; sku: string; quantity: number; unitPrice: number };
type SupplierProfile = { id?: string; name: string; address?: string; email?: string; phone?: string; contact?: string };
type SupplierDetails = { supplier: string; supplierAddress: string; supplierContact: string; billReference?: string; billType?: "expense" | "inventory" };
type LedgerJournalEntry = { dateKey: string; memo: string; reference: string; lines: { account: string; debit: number; credit: number }[] };
type LedgerAccount = DashboardData["ledgerAccountCatalog"][number];
type NewLedgerAccount = LedgerAccount & { openingBalance: number; openingDate: string };
type ReceivableDraft = { customer: string; invoice: string; amount: number; items: InvoiceLine[]; dueDate: string };
type CustomerProfileDraft = { name: string; email: string; phone: string; billingAddress: string };
type PartyProfileSelection = { kind: "customer" | "supplier"; id?: string; name: string };
type InventoryBillLineDraft = { sku: string; quantity: number; unitCost: number };
type PayableDraft = { vendor: string; invoice: string; amount: number; dueDate: string; billType?: "expense" | "inventory"; sku?: string; location?: string; quantity?: number; items?: InventoryBillLineDraft[] };
type InvoiceDraft = { customerId: string; invoice: string; amount: number; items: InvoiceLine[]; dateKey: string; dueDate: string };
type InvoiceLineFormDraft = { kind: "inventory" | "service"; sku: string; location: string; description: string; quantity: string; unitPrice: string };
type PayrollDraft = { employee: string; role: string; grossPay: number; employeeDeductions: number; employerLiabilities: number };
type ReportDraft = { report: string; periodStart: string; periodEnd: string };
type ProfileSettings = DashboardData["profile"];
type DashboardNotification = { id: string; title: string; detail: string; section: string; destination: NavKey };
const procurementStatuses = ["Cancelled"] as const;

function useFinancialPdfDownload() {
  const [downloadDocument, setDownloadDocument] = useState<typeof import("./services/financialPdf").downloadFinancialPdf | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    void import("./services/financialPdf").then(({ downloadFinancialPdf }) => {
      if (!cancelled) setDownloadDocument(() => downloadFinancialPdf);
    }).catch(() => {
      if (!cancelled) setError("The PDF could not be prepared.");
    });
    return () => { cancelled = true; };
  }, []);
  const download = (document: FinancialPdfDocument) => {
    if (!downloadDocument) return;
    setError("");
    try { downloadDocument(document); }
    catch { setError("The PDF could not be downloaded."); }
  };
  return { download, ready: Boolean(downloadDocument), error };
}

export function generateBillReference(existingReferences: string[] = []): string {
  const year = new Date().getFullYear();
  const nextNumber = Math.max(0, ...existingReferences.map((reference) => {
    const match = reference.match(/^BILL-(\d{4})-(\d+)$/i);
    if (!match) return 0;
    return Number(match[2]);
  })) + 1;
  return `BILL-${year}-${String(nextNumber).padStart(4, "0")}`;
}

export function generateInvoiceNumber(existingReferences: string[] = []): string {
  const year = new Date().getFullYear();
  const usedReferences = new Set(existingReferences.map((reference) => reference.trim().toLowerCase()));
  let nextNumber = Math.max(0, ...existingReferences.map((reference) => {
    const match = reference.trim().match(/^INV-(\d{4})-(\d+)$/i);
    return match && Number(match[1]) === year ? Number(match[2]) : 0;
  })) + 1;
  let candidate = `INV-${year}-${String(nextNumber).padStart(4, "0")}`;
  while (usedReferences.has(candidate.toLowerCase())) {
    nextNumber += 1;
    candidate = `INV-${year}-${String(nextNumber).padStart(4, "0")}`;
  }
  return candidate;
}

const isInvoiceStatus = (value: string): value is InvoiceStatus => value === "Matched" || value === "Pending" || value === "Flagged";
const notificationStorageKey = "corelogic-dashboard-read-notifications";
const sidebarCollapsedStorageKey = "corelogic-dashboard-sidebar-collapsed";
const themeStorageKey = "corelogic-dashboard-theme";

function readDarkMode(): boolean {
  try {
    return localStorage.getItem(themeStorageKey) === "dark";
  } catch (error) {
    console.error("Could not load saved theme preference.", error);
    return false;
  }
}

function readSavedNotificationIds(): string[] {
  try {
    const stored = localStorage.getItem(notificationStorageKey);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === "string")) {
      throw new Error("Saved notification read state has an invalid format.");
    }
    return parsed;
  } catch (error) {
    console.error("Could not load saved notification read state.", error);
    return [];
  }
}

function readSidebarCollapsed(): boolean {
  try {
    const saved = localStorage.getItem(sidebarCollapsedStorageKey);
    if (saved === null) return false;
    if (saved !== "true" && saved !== "false") {
      throw new Error("Saved sidebar state has an invalid format.");
    }
    return saved === "true";
  } catch (error) {
    console.error("Could not load saved sidebar state.", error);
    return false;
  }
}

function getDashboardNotifications(data: DashboardData): DashboardNotification[] {
  return [
    ...data.invoices
      .filter(({ status }) => status === "Pending" || status === "Flagged")
      .map((invoice) => ({
        id: `invoice-${invoice.id}`,
        title: `Invoice ${invoice.invoice} needs review`,
        detail: `${invoice.customer ?? invoice.vendor} · ${formatNaira(invoice.amount)} · ${invoice.status}`,
        section: "Invoice review",
        destination: "Invoice" as const,
      })),
    ...data.receivables
      .filter(({ status }) => status === "Overdue" || status === "Partial")
      .map((receivable) => ({
        id: `receivable-${receivable.invoice}`,
        title: `Receivable ${receivable.invoice} needs attention`,
        detail: `${receivable.customer} · ${formatNaira(receivable.outstanding)} outstanding · ${receivable.status}`,
        section: "Receivables",
        destination: "Receivables" as const,
      })),
    ...data.payables
      .filter(({ ledgerStatus, paymentStatus }) =>
        ledgerStatus !== "Matched" || ["Pending", "Review", "Approval"].includes(paymentStatus))
      .map((payable) => ({
        id: `payable-${payable.invoice}`,
        title: `Supplier bill ${payable.invoice} needs attention`,
        detail: `${payable.vendor} · ${payable.ledgerStatus} / ${payable.paymentStatus}`,
        section: "Payables",
        destination: "Payables" as const,
      })),
    ...data.bankTransactions
      .filter(({ status }) => status !== "Matched")
      .map((transaction) => ({
        id: `bank-${transaction.reference}`,
        title: `Bank transaction ${transaction.reference} needs matching`,
        detail: `${transaction.bank} · ${formatNaira(transaction.amount)} · ${transaction.status}`,
        section: "Reconciliation",
        destination: "Reconciliation" as const,
      })),
    ...(data.bankStatementLines ?? [])
      .filter(({ status }) => status !== "Matched")
      .map((line) => ({
        id: `bank-${line.id}`,
        title: `Bank transaction ${line.reference} needs matching`,
        detail: `${line.bank} · ${formatNaira(line.amount)} · ${line.status}`,
        section: "Reconciliation",
        destination: "Reconciliation" as const,
      })),
    ...data.payroll
      .filter(({ status }) => status !== "Paid")
      .map((record) => ({
        id: `payroll-${record.employee}`,
        title: `Payroll for ${record.employee} is not complete`,
        detail: `${record.role} · ${formatNaira(record.pay)} · ${record.status}`,
        section: "Payroll",
        destination: "Payroll" as const,
      })),
    ...data.reports
      .filter(({ status }) => status === "Draft" || status === "Review")
      .map((report) => ({
        id: `report-${report.report}-${report.period}`,
        title: `${report.report} report needs review`,
        detail: `${report.period} · ${report.status}`,
        section: "Reports",
        destination: "Reports" as const,
      })),
  ];
}

const profileStorageKey = "corelogic-dashboard-profile";
const adminSettingsStorageKey = "corelogic-dashboard-admin-settings";
const adminUsersStorageKey = "corelogic-dashboard-admin-users";
const organizationStorageKey = "corelogic-dashboard-organization";
const feedbackStorageKey = "corelogic-dashboard-feedback";
const profileInitials = (name: string) => name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "U";
type OrganizationSettings = {
  name: string;
  code: string;
  logoDataUrl: string;
  address: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  registrationNumber: string;
  taxId: string;
  bankAccounts: OrganizationBankAccount[];
};
type OrganizationBankAccount = { id: string; bankName: string; accountName: string; accountNumber: string; currency: string };
const createBankAccountId = () => globalThis.crypto?.randomUUID?.() ?? `bank-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const createOrganizationBankAccount = (): OrganizationBankAccount => ({ id: createBankAccountId(), bankName: "", accountName: "", accountNumber: "", currency: "NGN" });
const createOrganizationCode = () => `ORG-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
const createDefaultOrganizationSettings = (): OrganizationSettings => ({
  name: "Corelogic",
  code: createOrganizationCode(),
  logoDataUrl: "",
  address: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  website: "",
  registrationNumber: "",
  taxId: "",
  bankAccounts: [],
});
// Permission lookup follows the active demo identity, not editable profile fields.
const activeUserIdentity = { name: mockDashboardData.profile.name, email: mockDashboardData.profile.email };

function readOrganizationSettings(): OrganizationSettings {
  try {
    const saved = localStorage.getItem(organizationStorageKey);
    if (!saved) {
      const defaults = createDefaultOrganizationSettings();
      localStorage.setItem(organizationStorageKey, JSON.stringify(defaults));
      return defaults;
    }
    const parsed: unknown = JSON.parse(saved);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("name" in parsed) ||
      typeof parsed.name !== "string" ||
      !parsed.name.trim() ||
      !("logoDataUrl" in parsed) ||
      typeof parsed.logoDataUrl !== "string" ||
      (parsed.logoDataUrl !== "" && !/^data:image\/(?:png|jpeg|webp);base64,[a-z\d+/]+=*$/i.test(parsed.logoDataUrl))
    ) throw new Error("Saved organization settings have an invalid format.");
    const savedValues = parsed as Record<string, unknown>;
    const savedText = (key: string) => typeof savedValues[key] === "string" ? savedValues[key].trim() : "";
    const bankAccounts = Array.isArray(savedValues.bankAccounts) ? savedValues.bankAccounts.flatMap((value): OrganizationBankAccount[] => {
      if (typeof value !== "object" || value === null) return [];
      const account = value as Record<string, unknown>;
      const bankName = typeof account.bankName === "string" ? account.bankName.trim() : "";
      const accountName = typeof account.accountName === "string" ? account.accountName.trim() : "";
      const accountNumber = typeof account.accountNumber === "string" ? account.accountNumber.trim() : "";
      const currency = typeof account.currency === "string" && account.currency.trim() ? account.currency.trim().toUpperCase() : "NGN";
      if (!bankName && !accountName && !accountNumber) return [];
      return [{
        id: typeof account.id === "string" && account.id ? account.id : createBankAccountId(),
        bankName,
        accountName,
        accountNumber,
        currency,
      }];
    }) : [];
    const code = "code" in parsed && typeof parsed.code === "string" && /^ORG-[A-Z0-9]{8}$/.test(parsed.code)
      ? parsed.code
      : createOrganizationCode();
    const organization: OrganizationSettings = {
      name: parsed.name.trim(),
      code,
      logoDataUrl: parsed.logoDataUrl,
      address: savedText("address"),
      contactName: savedText("contactName"),
      contactEmail: savedText("contactEmail"),
      contactPhone: savedText("contactPhone"),
      website: savedText("website"),
      registrationNumber: savedText("registrationNumber"),
      taxId: savedText("taxId"),
      bankAccounts,
    };

    if (JSON.stringify(organization) !== saved) {
      localStorage.setItem(organizationStorageKey, JSON.stringify(organization));
    }
    return organization;
  } catch (error) {
    console.error("Could not load saved organization settings.", error);
    return createDefaultOrganizationSettings();
  }
}

function snapshotOrganizationForInvoice(organization: OrganizationSettings): InvoiceCompanyDetails {
  return {
    name: organization.name,
    logoDataUrl: organization.logoDataUrl,
    address: organization.address,
    contactEmail: organization.contactEmail,
    contactPhone: organization.contactPhone,
    website: organization.website,
    registrationNumber: organization.registrationNumber,
    taxId: organization.taxId,
    bankAccounts: organization.bankAccounts
      .filter(({ bankName, accountName, accountNumber }) => bankName && accountName && accountNumber)
      .map(({ bankName, accountName, accountNumber, currency }) => ({ bankName, accountName, accountNumber, currency })),
  };
}

function snapshotCustomerForInvoice(customer: NonNullable<DashboardData["customers"]>[number]): InvoiceCustomerDetails {
  return {
    name: customer.name,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    address: customer.billingAddress ?? "",
  };
}

type AdminSettings = {
  approvalRules: {
    flaggedInvoicesRequireApproval: boolean;
    purchaseOrderRequired: boolean;
    overdueReceivableAlerts: boolean;
  };
};

function defaultAdminSettings(): AdminSettings {
  return {
    approvalRules: {
      flaggedInvoicesRequireApproval: true,
      purchaseOrderRequired: true,
      overdueReceivableAlerts: true,
    },
  };
}

function readAdminSettings(defaults: AdminSettings): AdminSettings {
  try {
    const saved = localStorage.getItem(adminSettingsStorageKey);
    if (!saved) return defaults;
    const parsed: unknown = JSON.parse(saved);
    if (typeof parsed !== "object" || parsed === null) throw new Error("Saved admin settings have an invalid format.");
    const values = parsed as Partial<AdminSettings>;
    const approvalRules = values.approvalRules;
    if (
      typeof approvalRules !== "object" ||
      approvalRules === null ||
      typeof approvalRules.flaggedInvoicesRequireApproval !== "boolean" ||
      typeof approvalRules.purchaseOrderRequired !== "boolean" ||
      typeof approvalRules.overdueReceivableAlerts !== "boolean"
    ) throw new Error("Saved admin settings are incomplete.");
    return {
      approvalRules: {
        flaggedInvoicesRequireApproval: approvalRules.flaggedInvoicesRequireApproval,
        purchaseOrderRequired: approvalRules.purchaseOrderRequired,
        overdueReceivableAlerts: approvalRules.overdueReceivableAlerts,
      },
    };
  } catch (error) {
    console.error("Could not load saved admin settings.", error);
    return defaults;
  }
}

function readAdminUsers(defaults: DashboardData["users"]): DashboardData["users"] {
  try {
    const saved = localStorage.getItem(adminUsersStorageKey);
    if (!saved) return defaults;
    const parsed: unknown = JSON.parse(saved);
    if (
      !Array.isArray(parsed) ||
      !parsed.every((user) =>
        typeof user === "object" &&
        user !== null &&
        "name" in user && typeof user.name === "string" &&
        "role" in user && typeof user.role === "string" &&
        "initials" in user && typeof user.initials === "string" &&
        (!("email" in user) || typeof user.email === "string"))
    ) throw new Error("Saved workspace users have an invalid format.");
    return parsed.map((user) => {
      const matchingDefault = defaults.find((defaultUser) => defaultUser.name.toLowerCase() === user.name.toLowerCase());
      return user.email || !matchingDefault?.email ? user : { ...user, email: matchingDefault.email };
    });
  } catch (error) {
    console.error("Could not load saved workspace users.", error);
    return defaults;
  }
}

function getCurrentWorkspaceRole(users: DashboardData["users"]): string {
  const email = activeUserIdentity.email.trim().toLowerCase();
  const currentUser = (email ? users.find((user) => user.email?.trim().toLowerCase() === email) : undefined)
    ?? users.find((user) => user.name.trim().toLowerCase() === activeUserIdentity.name.trim().toLowerCase());
  return currentUser?.role ?? "Viewer";
}

function readProfileSettings(): ProfileSettings {
  try {
    const saved = localStorage.getItem(profileStorageKey);
    if (!saved) return mockDashboardData.profile;
    const parsed: unknown = JSON.parse(saved);
    if (typeof parsed !== "object" || parsed === null) throw new Error("Saved profile settings have an invalid format.");
    const values = parsed as Partial<ProfileSettings>;
    if (
      typeof values.name !== "string" ||
      typeof values.email !== "string" ||
      typeof values.phone !== "string" ||
      typeof values.jobTitle !== "string" ||
      typeof values.team !== "string" ||
      typeof values.timezone !== "string" ||
      typeof values.invoiceAlerts !== "boolean" ||
      typeof values.reconciliationAlerts !== "boolean" ||
      typeof values.weeklySummary !== "boolean"
    ) throw new Error("Saved profile settings are incomplete.");
    return {
      name: values.name,
      email: values.email,
      phone: values.phone,
      jobTitle: values.jobTitle,
      team: values.team,
      timezone: values.timezone,
      invoiceAlerts: values.invoiceAlerts,
      reconciliationAlerts: values.reconciliationAlerts,
      weeklySummary: values.weeklySummary,
    };
  } catch (error) {
    console.error("Could not load saved profile settings.", error);
    return mockDashboardData.profile;
  }
}

function DashboardIcon() {
  return <img src="./dashboard.png" alt="" width="18" height="18" />;
}

function TransferIcon() {
  return <img src="./transfer.png" alt="" width="18" height="18" />;
}

function PayableIcon() {
  return <img src="./up-arrow.png" alt="" width="18" height="18" />;
}

function ReceivableIcon() {
  return <img src="./down-arrow.png" alt="" width="18" height="18" />;
}

function ApprovalIcon() {
  return <img src="./approval.png" alt="" width="18" height="18" />;
}

function LedgerIcon() {
  return <img src="./ledger.png" alt="" width="18" height="18" />;
}

function InvoiceIcon() {
  return <img src="./invoice.png" alt="" width="18" height="18" />;
}

function InventoryIcon() {
  return <img src="./inventory.png" alt="" width="18" height="18" />;
}

function SidebarSwitchIcon() {
  return <img src="./Switch.png" alt="" width="20" height="20" />;
}

function GrossProfitIcon({ size = 20 }: { size?: number }) {
  return <img src="./Gross%20Profit.png" alt="" width={size} height={size} />;
}

function PendingPayablesIcon({ size = 20 }: { size?: number }) {
  return <img src="./Pending%20Payables.png" alt="" width={size} height={size} />;
}

function OutstandingReceivablesIcon({ size = 20 }: { size?: number }) {
  return <img src="./Outstanding%20Receivables.png" alt="" width={size} height={size} />;
}

function PayrollIcon() {
  return <img src="./payroll.png" alt="" width="18" height="18" />;
}

function ReportsIcon() {
  return <img src="./reports.png" alt="" width="18" height="18" />;
}

function AuditTrailIcon() {
  return <img src="./audit.png" alt="" width="18" height="18" />;
}

function SettingsIcon() {
  return <img src="./settings.png" alt="" width="18" height="18" />;
}

const navItems: { label: NavKey; icon: ComponentType<{ size?: number }> }[] = [
  { label: "Overview", icon: DashboardIcon }, { label: "Ledger", icon: LedgerIcon },
  { label: "Receivables", icon: ReceivableIcon }, { label: "Payables", icon: PayableIcon },
  { label: "Reconciliation", icon: TransferIcon }, { label: "Invoice", icon: InvoiceIcon }, { label: "Inventory", icon: InventoryIcon },
  { label: "Payroll", icon: PayrollIcon }, { label: "Reports", icon: ReportsIcon }, { label: "Approvals", icon: ApprovalIcon },
  { label: "Audit Logs", icon: AuditTrailIcon }, { label: "Settings", icon: SettingsIcon },
];

function DateRangePicker({ onApply }: { onApply: (startDate: string, endDate: string) => void }) {
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const last30DaysStart = new Date(today);
  last30DaysStart.setDate(today.getDate() - 29);
  const todayKey = toDateKey(today);
  const yearStartKey = toDateKey(yearStart);
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(last30DaysStart);
  const [endDate, setEndDate] = useState(today);
  const [draftStart, setDraftStart] = useState(last30DaysStart);
  const [draftEnd, setDraftEnd] = useState(today);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const pickerRef = useRef<HTMLDivElement>(null);
  const monthCount = today.getMonth() + 1;
  const isSameDay = (first: Date, second: Date) => first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate();
  const formatDate = (date: Date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const selectDate = (date: Date) => {
    if (!selectingEnd) {
      setDraftStart(date);
      setDraftEnd(date);
      setSelectingEnd(true);
    } else if (date < draftStart) {
      setDraftStart(date);
      setDraftEnd(draftStart);
      setSelectingEnd(false);
    } else {
      setDraftEnd(date);
      setSelectingEnd(false);
    }
  };
  const applyRange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
    setDraftStart(start);
    setDraftEnd(end);
    setOpen(false);
    onApply(toDateKey(start), toDateKey(end));
  };
  const monthDates = (monthOffset: number) => {
    const month = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + monthOffset, 1);
    const firstDay = (month.getDay() + 6) % 7;
    const gridStart = new Date(month.getFullYear(), month.getMonth(), 1 - firstDay);
    return Array.from({ length: 42 }, (_, index) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index));
  };
  const renderMonth = (monthOffset: number) => {
    const month = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + monthOffset, 1);
    return <div className={`calendar-month ${monthOffset ? "calendar-month-next" : ""}`} key={month.toISOString()}>
      <h3>{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h3>
      <div className="calendar-weekdays">{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="calendar-grid">{monthDates(monthOffset).map((date) => {
        const key = toDateKey(date);
        const inMonth = date.getMonth() === month.getMonth();
        const selected = isSameDay(date, draftStart) || isSameDay(date, draftEnd);
        const between = date > draftStart && date < draftEnd;
        const disabled = !inMonth || key < yearStartKey || key > todayKey;
        return <button key={key} type="button" className={`${inMonth ? "" : "outside-month"} ${selected ? "selected" : ""} ${between ? "in-range" : ""}`} disabled={disabled} aria-pressed={selected} onClick={() => selectDate(date)}>{date.getDate()}</button>;
      })}</div>
    </div>;
  };
  const previousMonth = () => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const nextMonth = () => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1));

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !pickerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  return <div className="date-range-picker" ref={pickerRef}>
    <button className="date-control" type="button" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((current) => !current)}><CalendarDays size={17} /><span>{formatDate(startDate)} – {formatDate(endDate)}</span><ChevronDown size={15} /></button>
    {open && <div className="calendar-popover" role="dialog" aria-label="Choose date range">
      <div className="calendar-header"><div><span>Selected range</span><strong>{formatDate(draftStart)} – {formatDate(draftEnd)}</strong></div></div>
      <div className="calendar-navigation"><button type="button" aria-label="Previous month" disabled={visibleMonth.getMonth() === 0} onClick={previousMonth}><ChevronLeft size={16} /></button><span>Choose start and end dates</span><button type="button" aria-label="Next month" disabled={visibleMonth.getMonth() + 1 >= monthCount} onClick={nextMonth}><ChevronRight size={16} /></button></div>
      <div className="calendar-months">{renderMonth(0)}{renderMonth(1)}</div>
      <div className="calendar-footer"><button type="button" onClick={() => applyRange(yearStart, today)}>Year to date</button><button type="button" className="apply-range" onClick={() => applyRange(draftStart, draftEnd)}>Apply range</button></div>
    </div>}
  </div>;
}

function App() {
  const [activeNav, setActiveNav] = useState<NavKey>("Overview");
  const [payrollDetailOpen, setPayrollDetailOpen] = useState(false);
  const [reportDetailOpen, setReportDetailOpen] = useState(false);
  const [inventoryLocationOpen, setInventoryLocationOpen] = useState(false);
  const [bankStatementDetailOpen, setBankStatementDetailOpen] = useState(false);
  const [partyProfileDetailOpen, setPartyProfileDetailOpen] = useState(false);
  const [ledgerAccountDetailOpen, setLedgerAccountDetailOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dataError, setDataError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const [darkMode, setDarkMode] = useState(readDarkMode);
  const [inventorySection, setInventorySection] = useState<"Overview" | "Procurement" | "Purchase Order">("Overview");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [profileSettings, setProfileSettings] = useState(readProfileSettings);
  const [organizationSettings, setOrganizationSettings] = useState(readOrganizationSettings);
  const [workspaceUsers, setWorkspaceUsers] = useState<DashboardData["users"] | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userMenuButtonRef = useRef<HTMLButtonElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const feedbackButtonRef = useRef<HTMLButtonElement>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState(readSavedNotificationIds);
  const [notificationStorageError, setNotificationStorageError] = useState("");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const last30DaysStart = new Date(today);
    last30DaysStart.setDate(today.getDate() - 29);
    return { start: toDateKey(last30DaysStart), end: toDateKey(today) };
  });
  useEffect(() => {
    setInventoryLocationOpen(false);
  }, [activeNav]);
  useEffect(() => {
    let active = true;
    fetchDashboardData().then((data) => {
      if (active) setDashboardData(data);
    }).catch((error: unknown) => {
      console.error("Could not load dashboard data.", error);
      if (active) setDataError("Dashboard data couldn't be loaded. Refresh to try again.");
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (dashboardData) {
      setWorkspaceUsers((current) => current ?? readAdminUsers(dashboardData.users));
    }
  }, [dashboardData]);
  useEffect(() => {
    if (!dashboardData) return;
    try {
      saveDashboardData(dashboardData);
    } catch (error) {
      console.error("Could not persist dashboard accounting data.", error);
    }
  }, [dashboardData]);
  useEffect(() => {
    try {
      localStorage.setItem(sidebarCollapsedStorageKey, String(sidebarCollapsed));
    } catch (error) {
      console.error("Could not save sidebar state.", error);
    }
  }, [sidebarCollapsed]);
  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    try {
      localStorage.setItem(themeStorageKey, darkMode ? "dark" : "light");
    } catch (error) {
      console.error("Could not save theme preference.", error);
    }
  }, [darkMode]);
  const dateFilteredData = useMemo(
    () => dashboardData ? filterDashboardData(dashboardData, dateRange.start, dateRange.end) : null,
    [dashboardData, dateRange],
  );
  const notifications = useMemo(
    () => dateFilteredData ? getDashboardNotifications(dateFilteredData) : [],
    [dateFilteredData],
  );
  const unreadNotificationCount = notifications.filter(({ id }) => !readNotificationIds.includes(id)).length;
  const invoices = dateFilteredData?.invoices ?? [];
  const reconciliationAlertCount = dateFilteredData
    ? dateFilteredData.payables.filter(({ ledgerStatus, paymentStatus }) =>
      ledgerStatus !== "Matched" || ["Pending", "Review", "Approval"].includes(paymentStatus)).length +
      dateFilteredData.receivables.filter(({ status }) => status === "Overdue" || status === "Partial").length +
      dateFilteredData.bankTransactions.filter(({ status }) => status !== "Matched").length +
      (dateFilteredData.bankStatementLines ?? []).filter(({ status }) => status !== "Matched").length
    : 0;
  const payrollAlertCount = dateFilteredData?.payroll.filter(({ status }) => status !== "Paid").length ?? 0;
  const currentWorkspaceRole = getCurrentWorkspaceRole(workspaceUsers ?? dashboardData?.users ?? mockDashboardData.users);

  const navigate = (page: NavKey) => {
    if (page === "Approvals" && currentWorkspaceRole !== "Finance Admin") return;
    setActiveNav(page);
    setSidebarOpen(false);
    setSearch("");
  };
  const saveWorkspaceUsers = (users: DashboardData["users"]) => {
    try {
      localStorage.setItem(adminUsersStorageKey, JSON.stringify(users));
      setWorkspaceUsers(users);
      return true;
    } catch (error) {
      console.error("Could not save workspace users.", error);
      return false;
    }
  };
  useEffect(() => {
    try {
      localStorage.setItem(notificationStorageKey, JSON.stringify(readNotificationIds));
      setNotificationStorageError("");
    } catch (error) {
      console.error("Could not save notification read state.", error);
      setNotificationStorageError("Read status could not be saved on this device.");
    }
  }, [readNotificationIds]);
  useEffect(() => {
    if (!notificationsOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !notificationMenuRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        requestAnimationFrame(() => notificationButtonRef.current?.focus());
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [notificationsOpen]);
  useEffect(() => {
    if (!userMenuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !userMenuRef.current?.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
        requestAnimationFrame(() => userMenuButtonRef.current?.focus());
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [userMenuOpen]);
  const markNotificationRead = (notificationId: string) => {
    setReadNotificationIds((current) => current.includes(notificationId) ? current : [...current, notificationId]);
  };
  const markAllNotificationsRead = () => {
    setReadNotificationIds((current) => [...new Set([...current, ...notifications.map(({ id }) => id)])]);
  };
  const closeFeedback = useCallback(() => {
    setFeedbackOpen(false);
    requestAnimationFrame(() => feedbackButtonRef.current?.focus());
  }, []);
  useEffect(() => {
    if (!feedbackOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeFeedback();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [closeFeedback, feedbackOpen]);
  const updateStatus = (id: string, status: Status) => {
    setDashboardData((current) => current ? {
      ...current,
      invoices: current.invoices.map((invoice) => invoice.id === id ? { ...invoice, status } : invoice),
    } : current);
  };
  const createAuditEvent = (current: DashboardData, action: string, detail: string, type: string) => ({
    time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    action,
    detail,
    user: current.profile.name,
    email: current.profile.email,
    type,
    status: "Created",
    dateKey: toDateKey(new Date()),
  });
  const submitForApproval = (submission: ApprovalSubmission): string | null => {
    if (!dashboardData) return "Approval data isn't ready yet. Please try again.";
    const result = submitApprovalRequest(dashboardData, submission, activeUserIdentity.name, activeUserIdentity.email, new Date().toISOString());
    if (!result.data) return result.error ?? "The request could not be submitted for approval.";
    setDashboardData(result.data);
    return null;
  };
  const resubmitRejectedApproval = (requestId: string, submission: ApprovalSubmission): string | null => {
    if (!dashboardData) return "Approval data isn't ready yet. Please try again.";
    const request = dashboardData.approvalRequests.find(({ id }) => id === requestId);
    if (!request || request.status !== "Rejected") return "Only rejected requests can be edited and resubmitted.";
    if (request.type !== submission.type) return "The request type cannot be changed.";
    const result = submitApprovalRequest(dashboardData, submission, activeUserIdentity.name, activeUserIdentity.email, new Date().toISOString(), requestId);
    if (!result.data) return result.error ?? "The revised request could not be submitted for approval.";
    setDashboardData(result.data);
    return null;
  };
  const decideRequest = (requestId: string, decision: "Approved" | "Rejected", rejectionReason: string): string | null => {
    if (currentWorkspaceRole !== "Finance Admin") return "Only a Finance Admin can decide approval requests.";
    if (!dashboardData) return "Approval data isn't ready yet. Please try again.";
    const result = decideApprovalRequest(dashboardData, requestId, decision, activeUserIdentity.name, activeUserIdentity.email, new Date().toISOString(), rejectionReason);
    if (!result.data) return result.error ?? "The approval decision could not be saved.";
    setDashboardData(result.data);
    return null;
  };
  const createPurchaseOrder = (order: SupplierDetails & { number: string; lines: PurchaseOrderLine[]; location: string; document: ApprovalDocument }): string | null => {
    if (!dashboardData?.inventoryLocations.some(({ location }) => location === order.location)) return "Choose a valid receiving location.";
    const quantity = order.lines.reduce((total, line) => total + line.quantity, 0);
    const amount = order.lines.reduce((total, line) => total + line.quantity * line.unitPrice, 0);
    return submitForApproval({
      type: "purchase-order",
      payload: {
        number: order.number.trim(),
        supplier: order.supplier.trim(),
        supplierAddress: order.supplierAddress.trim(),
        supplierContact: order.supplierContact.trim(),
        location: order.location,
        item: order.lines.map(({ item }) => item).join(", "),
        items: order.lines.length,
        quantity,
        lines: order.lines,
        document: order.document,
        amount,
      },
    });
  };
  const updatePurchaseOrderStatus = (number: string, status: string, receivingLocation?: string): string | null => {
    const allowedStatuses = ["Received", "Canceled"];
    if (!allowedStatuses.includes(status)) return "Choose a valid purchase order status.";
    const order = dashboardData?.purchaseOrders.find((candidate) => candidate.number === number);
    if (!dashboardData || !order) return "This purchase order could not be found.";
    if (order.status === "Received" && status !== "Received") return "A received purchase order cannot be moved back to another status.";
    const receiving = status === "Received" && order.status !== "Received";
    const locationName = receivingLocation || order.location;
    const receipt = receiving
      ? receiveInventoryAtLocation(dashboardData.inventoryItems, dashboardData.inventoryLocations, order.lines ?? [], locationName ?? "")
      : undefined;
    if (receiving && !receipt?.inventoryItems) return receipt?.error ?? "The purchase order could not be received.";
    const dateKey = toDateKey(new Date());
    setDashboardData((current) => current ? {
      ...current,
      ...(receiving && receipt?.inventoryItems && receipt.inventoryLocations ? {
        inventoryItems: receipt.inventoryItems,
        inventoryLocations: receipt.inventoryLocations,
        inventoryMovements: [
          ...(receipt.receivedLines ?? []).map((line) => ({ id: `receipt-${number}-${line.sku}`, sku: line.sku, location: locationName!, quantity: line.quantity, unitCost: line.unitCost, direction: "in" as const, dateKey })),
          ...(current.inventoryMovements ?? []),
        ],
        auditEvents: [createAuditEvent(current, "Purchase order received", `${number} · ${locationName} · ${receipt.receivedLines?.reduce((total, line) => total + line.quantity, 0) ?? 0} units`, "Inventory"), ...current.auditEvents],
      } : {}),
      purchaseOrders: current.purchaseOrders.map((order) => order.number === number ? { ...order, status, location: locationName ?? order.location } : order),
    } : current);
    return null;
  };
  const updateProcurementStatus = (reference: string | undefined, item: string, supplier: string, status: string): string | null => {
    if (!procurementStatuses.some((allowedStatus) => allowedStatus === status)) return "Choose a valid procurement status.";
    if (!dashboardData) return "Procurement data isn't ready yet. Please try again.";
    const index = dashboardData.procurements.findIndex((candidate) => reference
      ? candidate.reference === reference
      : !candidate.reference && candidate.item === item && candidate.supplier === supplier);
    if (index < 0) return "This procurement request could not be found.";
    setDashboardData((current) => current ? {
      ...current,
      procurements: current.procurements.map((procurement, procurementIndex) => procurementIndex === index ? { ...procurement, status } : procurement),
    } : current);
    return null;
  };
  const createProcurement = (request: SupplierDetails & { item: string; amount: number; dueDate: string; billReference?: string; billType?: "expense" | "inventory"; document: ApprovalDocument }): string | null => {
    if (!dashboardData) return "Procurement data isn't ready yet. Please try again.";
    const [year, month, day] = request.dueDate.split("-").map(Number);
    const dueDate = new Date(year, month - 1, day);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(request.dueDate) || toDateKey(dueDate) !== request.dueDate) return "Choose a valid due date.";
    const nextNumber = Math.max(0,
      ...dashboardData.procurements.map(({ reference }) => Number(reference?.match(/(\d+)$/)?.[1] ?? 0)),
      ...dashboardData.approvalRequests.flatMap((approval) => approval.type === "procurement" ? [Number(approval.payload.reference?.match(/(\d+)$/)?.[1] ?? 0)] : []),
    ) + 1;
    const reference = `PR-${new Date().getFullYear()}-${String(nextNumber).padStart(3, "0")}`;
    return submitForApproval({
      type: "procurement",
      payload: {
        reference,
        item: request.item.trim(),
        supplier: request.supplier.trim(),
        supplierAddress: request.supplierAddress.trim(),
        supplierContact: request.supplierContact.trim(),
        amount: request.amount,
        due: dueDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        status: "Awaiting approval",
        dateKey: toDateKey(new Date()),
        billReference: request.billReference?.trim(),
        billType: request.billType ?? "expense",
        document: request.document,
      },
    });
  };
  const generateProcurementReference = (reference: string | undefined, itemName: string): string | null => {
    if (!dashboardData) return null;
    const target = dashboardData.procurements.find((procurement) =>
      reference ? procurement.reference === reference : !procurement.reference && procurement.item === itemName);
    if (!target) return null;
    if (target.reference) return target.reference;
    const nextNumber = Math.max(0, ...dashboardData.procurements.map(({ reference: currentReference }) => Number(currentReference?.match(/(\d+)$/)?.[1] ?? 0))) + 1;
    const generatedReference = `PR-${new Date().getFullYear()}-${String(nextNumber).padStart(3, "0")}`;
    setDashboardData((current) => current ? {
      ...current,
      procurements: current.procurements.map((procurement) =>
        !procurement.reference && procurement.item === itemName
          ? { ...procurement, reference: generatedReference }
          : procurement),
    } : current);
    return generatedReference;
  };
  const addInventoryItem = (newItem: { item: string; sku: string; location: string; quantity: number; unitCost: number; sellingPrice: number; reorderLevel: number }): string | null => {
    if (!dashboardData) return "Inventory data isn't ready yet. Please try again.";
    if (!Number.isFinite(newItem.sellingPrice) || newItem.sellingPrice < 0 || Math.abs(newItem.sellingPrice * 100 - Math.round(newItem.sellingPrice * 100)) > 1e-7) {
      return "Enter an optional selling price with no more than two decimal places.";
    }
    if (dashboardData.inventoryItems.some(({ sku }) => sku.trim().toLowerCase() === newItem.sku.trim().toLowerCase())) {
      return "That SKU already exists. Enter a unique SKU.";
    }
    const location = dashboardData.inventoryLocations.find(({ location: name }) => name === newItem.location);
    if (!location) return "Choose a valid stock location.";
    if (location.stock + newItem.quantity > location.capacity) {
      return `This location only has capacity for ${location.capacity - location.stock} more units.`;
    }
    const dateKey = toDateKey(new Date());
    const value = Math.round(newItem.quantity * newItem.unitCost * 100) / 100;
    const prepared = prepareJournal(dashboardData, { dateKey, memo: `Opening stock ${newItem.sku.trim().toUpperCase()}`, sourceType: "inventory-opening", sourceId: newItem.sku.trim().toUpperCase(), lines: [
      { account: "Inventory", debit: value, credit: 0 },
      { account: "Opening Balance Equity", debit: 0, credit: value },
    ] });
    if (!prepared.entry) return prepared.error ?? "Inventory could not be posted.";
    setDashboardData((current) => {
      if (!current || current.inventoryItems.some(({ sku }) => sku.trim().toLowerCase() === newItem.sku.trim().toLowerCase())) return current;
      const posted = appendJournal(current, prepared.entry!);
      if (!posted.data) return current;
      return {
        ...posted.data,
        inventoryItems: [{
          item: newItem.item.trim(),
          sku: newItem.sku.trim().toUpperCase(),
          stock: newItem.quantity,
          value,
          unitCost: value / newItem.quantity,
          sellingPrice: newItem.sellingPrice,
          reorderLevel: newItem.reorderLevel,
          locationStock: [{ location: newItem.location, quantity: newItem.quantity }],
          status: newItem.quantity <= newItem.reorderLevel ? "Low stock" : "Healthy",
        }, ...posted.data.inventoryItems],
        inventoryLocations: posted.data.inventoryLocations.map((entry) => entry.location === newItem.location
          ? { ...entry, stock: entry.stock + newItem.quantity }
          : entry),
        inventoryMovements: [{ id: prepared.entry!.id, sku: newItem.sku.trim().toUpperCase(), location: newItem.location, quantity: newItem.quantity, unitCost: newItem.unitCost, direction: "in", dateKey, journalEntryId: prepared.entry!.id }, ...(posted.data.inventoryMovements ?? [])],
        auditEvents: [createAuditEvent(posted.data, "New inventory item", `${newItem.item.trim()} · ${newItem.sku.trim().toUpperCase()}`, "Inventory"), ...posted.data.auditEvents],
      };
    });
    return null;
  };
  const updateInventorySellingPrice = (sku: string, sellingPrice: number): string | null => {
    if (!dashboardData) return "Inventory data isn't ready yet. Please try again.";
    if (!dashboardData.inventoryItems.some((item) => item.sku === sku)) return "Choose an existing inventory item.";
    if (!Number.isFinite(sellingPrice) || sellingPrice < 0 || Math.abs(sellingPrice * 100 - Math.round(sellingPrice * 100)) > 1e-7) {
      return "Enter a selling price with no more than two decimal places, or leave it unset.";
    }
    setDashboardData((current) => current ? {
      ...current,
      inventoryItems: current.inventoryItems.map((item) => item.sku === sku ? { ...item, sellingPrice } : item),
      auditEvents: [createAuditEvent(current, "Inventory selling price updated", `${sku} · ${sellingPrice > 0 ? formatNaira(sellingPrice) : "Not set"}`, "Inventory"), ...current.auditEvents],
    } : current);
    return null;
  };
  const addInventoryLocation = (newLocation: { location: string; capacity: number }): string | null => {
    if (!dashboardData) return "Inventory data isn't ready yet. Please try again.";
    if (dashboardData.inventoryLocations.some(({ location }) => location.trim().toLowerCase() === newLocation.location.trim().toLowerCase())) {
      return "That location already exists. Enter a unique location name.";
    }
    setDashboardData((current) => current ? {
      ...current,
      inventoryLocations: [...current.inventoryLocations, { location: newLocation.location.trim(), stock: 0, capacity: newLocation.capacity }],
      auditEvents: [createAuditEvent(current, "New inventory location", newLocation.location.trim(), "Inventory"), ...current.auditEvents],
    } : current);
    return null;
  };
  const updateInventoryLocation = (updatedLocation: { location: string; capacity: number }): string | null => {
    if (!dashboardData) return "Inventory data isn't ready yet. Please try again.";
    const existingLocation = dashboardData.inventoryLocations.find(({ location }) => location.trim().toLowerCase() === updatedLocation.location.trim().toLowerCase());
    if (!existingLocation) return "Choose an existing inventory location to update.";
    if (!Number.isInteger(updatedLocation.capacity) || updatedLocation.capacity < 1) {
      return "Enter a positive whole-number capacity.";
    }
    if (updatedLocation.capacity < existingLocation.stock) {
      return `Capacity cannot be lower than the current stock level (${existingLocation.stock} units).`;
    }
    setDashboardData((current) => current ? {
      ...current,
      inventoryLocations: current.inventoryLocations.map((location) => location.location === existingLocation.location
        ? { ...location, capacity: updatedLocation.capacity }
        : location),
    } : current);
    return null;
  };
  const addLedgerAccount = (newAccount: NewLedgerAccount): string | null => {
    if (!dashboardData) return "Ledger data isn't ready yet. Please try again.";
    if (!newAccount.account.trim() || !/^\d{4,10}$/.test(newAccount.code.trim()) || !["Asset", "Liability", "Equity", "Income", "Expense"].includes(newAccount.type)) {
      return "Enter a valid account name, numeric code, and account type.";
    }
    if (!Number.isFinite(newAccount.openingBalance) || newAccount.openingBalance < 0 || Math.abs(newAccount.openingBalance * 100 - Math.round(newAccount.openingBalance * 100)) > 1e-7) {
      return "Enter a valid non-negative opening balance with no more than two decimal places.";
    }
    const duplicate = dashboardData.ledgerAccountCatalog.some(({ account, code }) =>
      account.trim().toLowerCase() === newAccount.account.trim().toLowerCase() || code === newAccount.code);
    if (duplicate) return "That account name or code is already in use.";
    const hasOpeningBalance = newAccount.openingBalance > 0;
    if (hasOpeningBalance && !["Asset", "Liability", "Equity"].includes(newAccount.type)) {
      return "Opening balances are only supported for balance-sheet accounts. Post income and expenses using a journal entry.";
    }
    if (hasOpeningBalance) {
      const openingDate = new Date(`${newAccount.openingDate}T00:00:00`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(newAccount.openingDate) ||
        toDateKey(openingDate) !== newAccount.openingDate ||
        newAccount.openingDate > toDateKey(new Date())) {
        return "Choose a valid opening balance date that is not in the future.";
      }
    }
    const openingReference = hasOpeningBalance
      ? `OB-${newAccount.openingDate.slice(0, 4)}-${String(Math.max(0, ...(dashboardData.journalEntries ?? []).map(({ reference }) => Number(reference.match(/^OB-\d{4}-(\d+)$/)?.[1] ?? 0))) + 1).padStart(4, "0")}`
      : "";
    const debitNormal = newAccount.type === "Asset";
    const normalizedAccount = { id: newAccount.code.trim(), code: newAccount.code.trim(), name: newAccount.account.trim(), type: newAccount.type };
    const openingEntry: JournalEntry | undefined = hasOpeningBalance ? {
      id: openingReference,
      reference: openingReference,
      dateKey: newAccount.openingDate,
      memo: `Opening balance — ${newAccount.account.trim()}`,
      sourceType: "opening-balance",
      sourceId: newAccount.code.trim(),
      lines: [
        { accountId: newAccount.code.trim(), debit: debitNormal ? newAccount.openingBalance : 0, credit: debitNormal ? 0 : newAccount.openingBalance },
        { accountId: "3000", debit: debitNormal ? 0 : newAccount.openingBalance, credit: debitNormal ? newAccount.openingBalance : 0 },
      ],
    } : undefined;
    setDashboardData((current) => current ? {
      ...current,
      ledgerAccountCatalog: [...current.ledgerAccountCatalog, {
        account: newAccount.account.trim(),
        code: newAccount.code.trim(),
        type: newAccount.type,
      }],
      auditEvents: [createAuditEvent(current, "New ledger account", `${newAccount.account.trim()} · ${newAccount.code.trim()}`, "Ledger"), ...current.auditEvents],
      accounts: [...(current.accounts ?? []), normalizedAccount],
      ...(openingEntry ? { journalEntries: [openingEntry, ...(current.journalEntries ?? [])] } : {}),
      ...(openingEntry ? { ledgerAccounts: [...openingEntry.lines.map((line, index) => ({
        account: index === 0 ? normalizedAccount.name : "Opening Balance Equity",
        code: index === 0 ? normalizedAccount.code : "3000",
        type: index === 0 ? normalizedAccount.type : "Equity" as const,
        debit: line.debit,
        credit: line.credit,
        dateKey: openingEntry.dateKey,
        id: `${openingEntry.id}-${index + 1}`,
        memo: openingEntry.memo,
        reference: openingEntry.reference,
      })), ...current.ledgerAccounts] } : {}),
    } : current);
    return null;
  };
  const createLedgerJournalEntry = (entry: LedgerJournalEntry): string | null => {
    if (!dashboardData) return "Ledger data isn't ready yet. Please try again.";
    const todayKey = toDateKey(new Date());
    const transactionDate = new Date(`${entry.dateKey}T00:00:00`);
    if (!entry.memo.trim() || !entry.reference.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(entry.dateKey) ||
      toDateKey(transactionDate) !== entry.dateKey || entry.dateKey > todayKey) {
      return "Enter a description and a valid transaction date that is not in the future.";
    }
    const prepared = prepareJournal(dashboardData, { ...entry, sourceType: "manual-journal" });
    if (!prepared.entry) return prepared.error ?? "Journal entry could not be created.";
    setDashboardData((current) => {
      if (!current) return current;
      const result = appendJournal(current, prepared.entry!);
      return result.data
        ? { ...result.data, auditEvents: [createAuditEvent(result.data, "New journal entry", `${prepared.entry!.reference} · ${prepared.entry!.memo}`, "Ledger"), ...result.data.auditEvents] }
        : current;
    });
    return null;
  };
  const addReceivable = (draft: ReceivableDraft): string | null => {
    if (!dashboardData) return "Receivables data isn't ready yet. Please try again.";
    const customerProfile = dashboardData.customers?.find(({ name }) => name.toLowerCase() === draft.customer.trim().toLowerCase());
    if (!customerProfile) return "Choose a saved customer profile before creating the invoice.";
    const invoiceDraft = {
      customerId: customerProfile.id,
      invoice: draft.invoice,
      amount: draft.amount,
      items: draft.items,
      invoiceDate: toDateKey(new Date()),
      dueDate: draft.dueDate,
      companyDetails: snapshotOrganizationForInvoice(organizationSettings),
      customerDetails: snapshotCustomerForInvoice(customerProfile),
    };
    const result = createCustomerInvoice(dashboardData, invoiceDraft);
    if (!result.data) return result.error ?? "Customer invoice could not be submitted.";
    return submitForApproval({ type: "customer-invoice", payload: invoiceDraft });
  };
  const addSupplierProfile = (draft: SupplierProfile): string | null => {
    const name = draft.name.trim();
    const email = draft.email?.trim() || draft.contact?.trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)?.[0] || "";
    const phone = draft.phone?.trim() || draft.contact?.trim().replace(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "") || "";
    if (!dashboardData) return "Supplier data isn't ready yet. Please try again.";
    if (!name) return "Enter the supplier name.";
    if (dashboardData.vendors?.some((vendor) => vendor.name.toLowerCase() === name.toLowerCase())) return "A supplier with that name already exists.";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid supplier email address or leave it blank.";
    const vendor = {
      id: `vendor-${Date.now()}`,
      name,
      address: draft.address?.trim() || undefined,
      email: email || undefined,
      phone: phone || undefined,
      contact: draft.contact?.trim() || undefined,
    };
    setDashboardData((current) => current ? {
      ...current,
      vendors: [vendor, ...(current.vendors ?? [])],
      auditEvents: [createAuditEvent(current, "New supplier", name, "Payables"), ...current.auditEvents],
    } : current);
    return null;
  };
  const addCustomerProfile = (draft: CustomerProfileDraft): string | null => {
    if (!dashboardData) return "Customer data isn't ready yet. Please try again.";
    const name = draft.name.trim();
    const email = draft.email.trim();
    if (!name) return "Enter a customer name.";
    if (dashboardData.customers?.some((customer) => customer.name.toLowerCase() === name.toLowerCase())) {
      return "A customer with that name already exists.";
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address or leave it blank.";
    const customer = {
      id: globalThis.crypto?.randomUUID?.() ?? `customer-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      email,
      phone: draft.phone.trim(),
      billingAddress: draft.billingAddress.trim(),
    };
    setDashboardData((current) => current ? {
      ...current,
      customers: [customer, ...(current.customers ?? [])],
      auditEvents: [createAuditEvent(current, "New customer", name, "Receivables"), ...current.auditEvents],
    } : current);
    return null;
  };
  const updateCustomerProfile = (customerId: string, draft: CustomerProfileDraft): string | null => {
    if (!dashboardData) return "Customer data isn't ready yet. Please try again.";
    const name = draft.name.trim();
    const email = draft.email.trim();
    if (!name) return "Enter a customer name.";
    if (dashboardData.customers?.some((customer) => customer.id !== customerId && customer.name.toLowerCase() === name.toLowerCase())) {
      return "A customer with that name already exists.";
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address or leave it blank.";
    setDashboardData((current) => current ? {
      ...current,
      customers: (current.customers ?? []).map((customer) => customer.id === customerId
        ? { ...customer, name, email, phone: draft.phone.trim(), billingAddress: draft.billingAddress.trim() }
        : customer),
      receivables: current.receivables.map((invoice) => invoice.customerId === customerId ? { ...invoice, customer: name } : invoice),
      invoices: current.invoices.map((invoice) => invoice.customerId === customerId ? { ...invoice, customer: name } : invoice),
      auditEvents: [createAuditEvent(current, "Customer updated", name, "Receivables"), ...current.auditEvents],
    } : current);
    return null;
  };
  const deleteCustomerProfile = (customerId: string): string | null => {
    if (!dashboardData) return "Customer data isn't ready yet. Please try again.";
    const customer = dashboardData.customers?.find(({ id }) => id === customerId);
    if (!customer) return "This customer could not be found.";
    setDashboardData((current) => current ? {
      ...current,
      customers: (current.customers ?? []).filter(({ id }) => id !== customerId),
      receivables: current.receivables.map((invoice) => invoice.customerId === customerId ? { ...invoice, customerId: undefined } : invoice),
      invoices: current.invoices.map((invoice) => invoice.customerId === customerId ? { ...invoice, customerId: undefined } : invoice),
      auditEvents: [createAuditEvent(current, "Customer deleted", customer.name, "Receivables"), ...current.auditEvents],
    } : current);
    return null;
  };
  const updateSupplierProfile = (supplierId: string, draft: SupplierProfile): string | null => {
    if (!dashboardData) return "Supplier data isn't ready yet. Please try again.";
    const supplier = dashboardData.vendors?.find(({ id }) => id === supplierId);
    if (!supplier) return "This supplier could not be found.";
    const name = draft.name.trim();
    const email = draft.email?.trim() || draft.contact?.trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)?.[0] || "";
    const phone = draft.phone?.trim() || draft.contact?.trim().replace(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "") || "";
    if (!name) return "Enter the supplier name.";
    if (dashboardData.vendors?.some((vendor) => vendor.id !== supplierId && vendor.name.toLowerCase() === name.toLowerCase())) return "A supplier with that name already exists.";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid supplier email address or leave it blank.";
    setDashboardData((current) => current ? {
      ...current,
      vendors: (current.vendors ?? []).map((vendor) => vendor.id === supplierId
        ? { ...vendor, name, address: draft.address?.trim() || undefined, email: email || undefined, phone: phone || undefined, contact: draft.contact?.trim() || undefined }
        : vendor),
      payables: current.payables.map((bill) => bill.vendorId === supplierId ? { ...bill, vendor: name } : bill),
      purchaseOrders: current.purchaseOrders.map((order) => order.supplier === supplier.name ? { ...order, supplier: name } : order),
      procurements: current.procurements.map((request) => request.supplier === supplier.name ? { ...request, supplier: name } : request),
      invoices: current.invoices.map((invoice) => invoice.vendor === supplier.name ? { ...invoice, vendor: name } : invoice),
      auditEvents: [createAuditEvent(current, "Supplier updated", name, "Payables"), ...current.auditEvents],
    } : current);
    return null;
  };
  const deleteSupplierProfile = (supplierId: string): string | null => {
    if (!dashboardData) return "Supplier data isn't ready yet. Please try again.";
    const supplier = dashboardData.vendors?.find(({ id }) => id === supplierId);
    if (!supplier) return "This supplier could not be found.";
    setDashboardData((current) => current ? {
      ...current,
      vendors: (current.vendors ?? []).filter(({ id }) => id !== supplierId),
      payables: current.payables.map((bill) => bill.vendorId === supplierId ? { ...bill, vendorId: undefined } : bill),
      auditEvents: [createAuditEvent(current, "Supplier deleted", supplier.name, "Payables"), ...current.auditEvents],
    } : current);
    return null;
  };
  const addPayable = (draft: PayableDraft): string | null => {
    if (!dashboardData) return "Payables data isn't ready yet. Please try again.";
    if (dashboardData.payables.some(({ invoice }) => invoice.trim().toLowerCase() === draft.invoice.trim().toLowerCase())) {
      return "That bill reference is already in use.";
    }
    const inventoryBillLines = draft.billType === "inventory"
      ? draft.items ?? (draft.sku ? [{ sku: draft.sku, quantity: draft.quantity ?? 0, unitCost: draft.amount / Math.max(draft.quantity ?? 0, 1) }] : [])
      : [];
    const inventoryLocation = draft.billType === "inventory" ? dashboardData.inventoryLocations.find(({ location }) => location === draft.location) : undefined;
    const inventoryBillTotal = inventoryBillLines.reduce((total, line) => total + line.quantity * line.unitCost, 0);
    const amount = draft.billType === "inventory" ? Math.round((inventoryBillTotal + Number.EPSILON) * 100) / 100 : draft.amount;
    if (!draft.vendor.trim() || !draft.invoice.trim() || !Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7) {
      return "Enter a supplier, unique bill reference, and positive amount with no more than two decimal places.";
    }
    if (draft.billType === "inventory" && (!inventoryLocation || inventoryBillLines.length === 0 || inventoryBillLines.some((line) =>
      !dashboardData.inventoryItems.some(({ sku }) => sku === line.sku) || !Number.isInteger(line.quantity) || line.quantity <= 0 ||
      !Number.isFinite(line.unitCost) || line.unitCost <= 0 || Math.abs(line.unitCost * 100 - Math.round(line.unitCost * 100)) > 1e-7))) {
      return "Choose inventory items and a location, and enter a positive whole-number quantity and unit cost for each item.";
    }
    if (draft.billType === "inventory" && Math.abs(amount - draft.amount) > 0.005) return "The bill amount must match the total of the inventory lines.";
    const inventoryQuantity = inventoryBillLines.reduce((total, line) => total + line.quantity, 0);
    if (draft.billType === "inventory" && inventoryLocation && inventoryLocation.stock + inventoryQuantity > inventoryLocation.capacity) {
      return `This location only has capacity for ${inventoryLocation.capacity - inventoryLocation.stock} more units.`;
    }
    const dueDate = new Date(`${draft.dueDate}T00:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.dueDate) || toDateKey(dueDate) !== draft.dueDate) return "Choose a valid due date.";
    const [year, month, day] = draft.dueDate.split("-").map(Number);
    const due = new Date(year, month - 1, day).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const dateKey = toDateKey(new Date());
    const prepared = prepareJournal(dashboardData, { dateKey, memo: `Vendor bill ${draft.invoice.trim()}`, sourceType: "vendor-bill", sourceId: draft.invoice.trim(), lines: [
      { account: draft.billType === "inventory" ? "Inventory" : "Office Supplies", debit: amount, credit: 0 },
      { account: "Accounts Payable", debit: 0, credit: amount },
    ] });
    if (!prepared.entry) return prepared.error ?? "Vendor bill could not be posted.";
    const existingVendor = dashboardData.vendors?.find(({ name }) => name.toLowerCase() === draft.vendor.trim().toLowerCase());
    const vendorId = existingVendor?.id ?? `vendor-${Date.now()}`;
    setDashboardData((current) => {
      if (!current) return current;
      const posted = appendJournal(current, prepared.entry!);
      if (!posted.data) return current;
      const quantityBySku = new Map<string, number>();
      const costBySku = new Map<string, number>();
      for (const line of inventoryBillLines) {
        quantityBySku.set(line.sku, (quantityBySku.get(line.sku) ?? 0) + line.quantity);
        costBySku.set(line.sku, (costBySku.get(line.sku) ?? 0) + line.quantity * line.unitCost);
      }
      const inventoryUpdates = [...quantityBySku].map(([sku, quantity]) => {
        const item = posted.data!.inventoryItems.find((entry) => entry.sku === sku)!;
        const totalCost = costBySku.get(sku)!;
        const averageUnitCost = totalCost / quantity;
        return { sku, quantity, averageUnitCost, weighted: calculateWeightedAverage(item.stock, item.value, quantity, averageUnitCost) };
      });
      return {
        ...posted.data,
        payables: [{ vendor: draft.vendor.trim(), vendorId, invoice: draft.invoice.trim(), amount, due, ledgerStatus: "Matched", paymentStatus: "Pending", dateKey, journalEntryId: prepared.entry!.id, billType: draft.billType ?? "expense", sku: inventoryBillLines[0]?.sku, quantity: inventoryQuantity, inventoryLines: draft.billType === "inventory" ? inventoryBillLines : undefined }, ...posted.data.payables],
        vendors: existingVendor
          ? posted.data.vendors
          : [{ id: vendorId, name: draft.vendor.trim() }, ...(posted.data.vendors ?? [])],
        auditEvents: [
          createAuditEvent(posted.data, "New bill", `${draft.invoice.trim()} · ${draft.vendor.trim()}`, "Payables"),
          ...(!existingVendor ? [createAuditEvent(posted.data, "New supplier", draft.vendor.trim(), "Payables")] : []),
          ...posted.data.auditEvents,
        ],
        ...(inventoryLocation && inventoryBillLines.length ? {
          inventoryItems: posted.data.inventoryItems.map((item) => {
            const update = inventoryUpdates.find((entry) => entry.sku === item.sku);
            if (!update) return item;
            return {
              ...setLocationQuantity(item, inventoryLocation.location, getLocationQuantity(item, inventoryLocation.location) + update.quantity),
              stock: update.weighted.quantityOnHand,
              value: update.weighted.inventoryValue,
              unitCost: update.weighted.averageUnitCost,
              status: update.weighted.quantityOnHand <= (item.reorderLevel ?? 5) ? "Low stock" : "Healthy",
            };
          }),
          inventoryLocations: posted.data.inventoryLocations.map((entry) => entry.location === inventoryLocation.location
            ? { ...entry, stock: entry.stock + inventoryQuantity }
            : entry),
          inventoryMovements: [...inventoryUpdates.map((update) => ({ id: `${prepared.entry!.id}-${update.sku}`, sku: update.sku, location: inventoryLocation.location, quantity: update.quantity, unitCost: update.averageUnitCost, direction: "in" as const, dateKey, journalEntryId: prepared.entry!.id })), ...(posted.data.inventoryMovements ?? [])],
        } : {}),
      };
    });
    return null;
  };
  const recordPayment = (nav: "Receivables" | "Payables" | "Payroll", invoice: string, amount: number, payrollDateKey?: string): string | null => {
    if (!dashboardData) return "Accounting data isn't ready yet. Please try again.";
    if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7) {
      return "Enter a positive payment amount with no more than two decimal places.";
    }
    const receivable = nav === "Receivables" ? dashboardData.receivables.find((item) => item.invoice === invoice) : undefined;
    const payable = nav === "Payables" ? dashboardData.payables.find((item) => item.invoice === invoice) : undefined;
    const payroll = nav === "Payroll" ? dashboardData.payroll.find((item) =>
      item.employee === invoice && item.journalEntryId && (payrollDateKey === undefined || item.dateKey === payrollDateKey)) : undefined;
    const outstanding = receivable?.outstanding ?? (payable ? payable.amount - (payable.paidAmount ?? 0) : payroll ? payroll.pay - (payroll.paidAmount ?? 0) : 0);
    if ((!receivable && !payable && !payroll) || amount > outstanding) return "Payment must be greater than zero and cannot exceed the outstanding balance.";
    const dateKey = toDateKey(new Date());
    const prepared = prepareJournal(dashboardData, {
      dateKey,
      memo: `${nav === "Receivables" ? "Customer receipt" : nav === "Payables" ? "Vendor payment" : "Payroll settlement"} ${invoice}`,
      sourceType: nav === "Receivables" ? "customer-payment" : nav === "Payables" ? "vendor-payment" : "payroll-payment",
      sourceId: invoice,
      lines: nav === "Receivables"
        ? [{ account: "Cash & Cash Equivalents", debit: amount, credit: 0 }, { account: "Accounts Receivable", debit: 0, credit: amount }]
        : nav === "Payables"
          ? [{ account: "Accounts Payable", debit: amount, credit: 0 }, { account: "Cash & Cash Equivalents", debit: 0, credit: amount }]
          : [{ account: "Wages Payable", debit: amount, credit: 0 }, { account: "Cash & Cash Equivalents", debit: 0, credit: amount }],
    });
    if (!prepared.entry) return prepared.error ?? "Payment could not be posted.";
    setDashboardData((current) => {
      if (!current) return current;
      const posted = appendJournal(current, prepared.entry!);
      if (!posted.data) return current;
      if (nav === "Receivables") {
        const remaining = Math.round(((receivable!.outstanding - amount) + Number.EPSILON) * 100) / 100;
        return {
          ...posted.data,
          customerPayments: [{ id: prepared.entry!.id, invoice, amount, dateKey, journalEntryId: prepared.entry!.id }, ...(posted.data.customerPayments ?? [])],
          receivables: posted.data.receivables.map((item) => item.invoice === invoice
            ? { ...item, outstanding: remaining, status: remaining === 0 ? "Paid" : "Partial" }
            : item),
        };
      }
      if (nav === "Payables") return {
        ...posted.data,
        vendorPayments: [{ id: prepared.entry!.id, bill: invoice, amount, dateKey, journalEntryId: prepared.entry!.id }, ...(posted.data.vendorPayments ?? [])],
        payables: posted.data.payables.map((item) => {
          if (item.invoice !== invoice) return item;
          const paidAmount = Math.round(((item.paidAmount ?? 0) + amount + Number.EPSILON) * 100) / 100;
          return { ...item, paidAmount, paymentStatus: paidAmount === item.amount ? "Paid" : "Partial" };
        }),
      };
      return {
        ...posted.data,
        payrollPayments: [{ id: prepared.entry!.id, employee: invoice, amount, dateKey, journalEntryId: prepared.entry!.id, ...(payrollDateKey ? { payrollDateKey } : {}) }, ...(posted.data.payrollPayments ?? [])],
        payroll: posted.data.payroll.map((item) => {
          if (item.employee !== invoice || payrollDateKey !== undefined && item.dateKey !== payrollDateKey) return item;
          const paidAmount = Math.round(((item.paidAmount ?? 0) + amount + Number.EPSILON) * 100) / 100;
          return { ...item, paidAmount, status: paidAmount === item.pay ? "Paid" : "Processing" };
        }),
      };
    });
    return null;
  };
  const importBankStatement = (csv: string, mapping: BankCsvMapping, bank: string): string | null => {
    if (!dashboardData) return "Accounting data isn't ready yet.";
    let imported;
    try {
      const batchId = globalThis.crypto?.randomUUID?.() ?? `statement-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      imported = parseBankStatementCsv(csv, mapping, bank.trim(), batchId);
    } catch (error) {
      return error instanceof Error ? error.message : "The bank statement could not be parsed.";
    }
    const existingIds = new Set((dashboardData.bankStatementLines ?? []).map(({ id }) => id));
    const importedIds = new Set(imported.map(({ id }) => id));
    if (imported.some(({ id }) => existingIds.has(id)) || importedIds.size !== imported.length) return "This statement contains duplicate transaction rows or rows that have already been imported.";
    setDashboardData((current) => current ? {
      ...current,
      bankStatementLines: [...imported, ...(current.bankStatementLines ?? [])],
      auditEvents: [{ time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), action: "Bank statement imported", detail: `${bank.trim() || "Bank"} · ${imported.length} transactions`, user: current.profile.name, email: current.profile.email, type: "Reconciliation", status: "Imported", dateKey: toDateKey(new Date()) }, ...current.auditEvents],
    } : current);
    return null;
  };
  const matchBankStatementLine = (lineId: string): string | null => {
    if (!dashboardData) return "Accounting data isn't ready yet.";
    const statementLine = dashboardData.bankStatementLines?.find((line) => line.id === lineId);
    if (!statementLine) return "This bank row was not imported from a statement.";
    if (statementLine.status === "Matched") return "This bank row is already matched.";
    const cashAccountIds = (dashboardData.accounts ?? []).filter(({ type, code, name }) => type === "Asset" && (code === "1000" || name.toLowerCase().includes("cash"))).map(({ id }) => id);
    const matches = findJournalMatches(statementLine, dashboardData.journalEntries ?? [], cashAccountIds)
      .filter(({ id }) => !(dashboardData.bankStatementLines ?? []).some((line) => line.matchedJournalId === id));
    if (matches.length === 0) return "No posted cash entry matches this amount, reference, and date window.";
    if (matches.length > 1) return "More than one ledger entry matches. Narrow the statement details before matching.";
    const matched = matches[0];
    setDashboardData((current) => current ? {
      ...current,
      bankStatementLines: (current.bankStatementLines ?? []).map((line) => line.id === lineId
        ? { ...line, status: "Matched", matchedJournalId: matched.id }
        : line),
      auditEvents: [{ time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), action: "Bank transaction matched", detail: `${statementLine.reference} · ${matched.reference}`, user: current.profile.name, email: current.profile.email, type: "Reconciliation", status: "Matched", dateKey: toDateKey(new Date()) }, ...current.auditEvents],
    } : current);
    return null;
  };
  const manuallyMatchBankStatementLine = (lineId: string, journalId: string): string | null => {
    if (!dashboardData) return "Accounting data isn't ready yet.";
    const statementLine = dashboardData.bankStatementLines?.find((line) => line.id === lineId);
    if (!statementLine) return "This bank row was not imported from a statement.";
    if (statementLine.status === "Matched") return "This bank row is already matched.";
    const cashAccountIds = (dashboardData.accounts ?? []).filter(({ type, code, name }) => type === "Asset" && (code === "1000" || name.toLowerCase().includes("cash"))).map(({ id }) => id);
    const availableEntries = getUnmatchedCashJournalEntries(
      dashboardData.journalEntries ?? [],
      cashAccountIds,
      (dashboardData.bankStatementLines ?? []).map(({ matchedJournalId }) => matchedJournalId).filter((id): id is string => Boolean(id)),
    );
    const match = availableEntries.find(({ entry }) => entry.id === journalId);
    if (!match) return "Choose an unmatched ledger entry that affects a cash account.";
    setDashboardData((current) => current ? {
      ...current,
      bankStatementLines: (current.bankStatementLines ?? []).map((line) => line.id === lineId
        ? { ...line, status: "Matched", matchedJournalId: journalId }
        : line),
      auditEvents: [{ time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), action: "Bank transaction manually matched", detail: `${statementLine.reference} · ${match.entry.reference}`, user: current.profile.name, email: current.profile.email, type: "Reconciliation", status: "Matched", dateKey: toDateKey(new Date()) }, ...current.auditEvents],
    } : current);
    return null;
  };
  const addInvoice = (draft: InvoiceDraft): string | null => {
    if (!dashboardData) return "Invoice data isn't ready yet. Please try again.";
    const customerProfile = dashboardData.customers?.find(({ id }) => id === draft.customerId);
    if (!customerProfile) return "Choose a saved customer profile before creating the invoice.";
    const invoiceDraft = {
      customerId: draft.customerId,
      invoice: draft.invoice,
      amount: draft.amount,
      items: draft.items,
      invoiceDate: draft.dateKey,
      dueDate: draft.dueDate,
      companyDetails: snapshotOrganizationForInvoice(organizationSettings),
      customerDetails: snapshotCustomerForInvoice(customerProfile),
    };
    const result = createCustomerInvoice(dashboardData, invoiceDraft);
    if (!result.data) return result.error ?? "Customer invoice could not be submitted.";
    return submitForApproval({ type: "customer-invoice", payload: invoiceDraft });
  };
  const addPayrollRecord = (draft: PayrollDraft): string | null => {
    if (!dashboardData) return "Payroll data isn't ready yet. Please try again.";
    if (dashboardData.payroll.some(({ employee }) => employee.trim().toLowerCase() === draft.employee.trim().toLowerCase())) {
      return "A payroll record already exists for that employee.";
    }
    const netPay = Math.round((draft.grossPay - draft.employeeDeductions + Number.EPSILON) * 100) / 100;
    if (!draft.employee.trim() || !draft.role.trim() || !Number.isFinite(draft.grossPay) || draft.grossPay <= 0 ||
      !Number.isFinite(draft.employeeDeductions) || draft.employeeDeductions < 0 || draft.employeeDeductions >= draft.grossPay ||
      !Number.isFinite(draft.employerLiabilities) || draft.employerLiabilities < 0 ||
      [draft.grossPay, draft.employeeDeductions, draft.employerLiabilities].some((amount) => Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7)) {
      return "Enter valid gross pay, employee deductions below gross pay, and non-negative employer liabilities (maximum two decimals).";
    }
    const dateKey = toDateKey(new Date());
    const lines: PostingLineDraft[] = [
      { account: "Payroll Expense", debit: draft.grossPay, credit: 0 },
      { account: "Wages Payable", debit: 0, credit: netPay },
    ];
    if (draft.employerLiabilities > 0) {
      lines.push({ account: "Employer Payroll Expense", debit: draft.employerLiabilities, credit: 0 });
      lines.push({ account: "Payroll Deductions Payable", debit: 0, credit: draft.employerLiabilities });
    }
    if (draft.employeeDeductions > 0) lines.push({ account: "Payroll Deductions Payable", debit: 0, credit: draft.employeeDeductions });
    const prepared = prepareJournal(dashboardData, {
      dateKey,
      memo: `Payroll accrual for ${draft.employee.trim()}`,
      sourceType: "payroll-accrual",
      sourceId: `${draft.employee.trim()}-${dateKey}`,
      lines,
    });
    if (!prepared.entry) return prepared.error ?? "Payroll could not be posted.";
    setDashboardData((current) => {
      if (!current) return current;
      const posted = appendJournal(current, prepared.entry!);
      return posted.data ? {
        ...posted.data,
        payroll: [{ employee: draft.employee.trim(), role: draft.role.trim(), pay: netPay, grossPay: draft.grossPay, employeeDeductions: draft.employeeDeductions, employerLiabilities: draft.employerLiabilities, status: "Pending", dateKey, journalEntryId: prepared.entry!.id }, ...posted.data.payroll],
        auditEvents: [createAuditEvent(posted.data, "New payroll record", draft.employee.trim(), "Payroll"), ...posted.data.auditEvents],
      } : current;
    });
    return null;
  };
  const addReport = (draft: ReportDraft): string | null => {
    if (!dashboardData) return "Reports data isn't ready yet. Please try again.";
    if (!draft.report.trim() || !draft.periodStart || !draft.periodEnd) return "Choose a report and reporting date range.";
    if (draft.periodEnd < draft.periodStart) return "The end date must be on or after the start date.";
    const period = `${formatDateKey(draft.periodStart)} – ${formatDateKey(draft.periodEnd)}`;
    if (dashboardData.reports.some(({ report, periodStart, periodEnd, period: savedPeriod }) =>
      report.trim().toLowerCase() === draft.report.trim().toLowerCase() &&
      ((periodStart === draft.periodStart && periodEnd === draft.periodEnd) || savedPeriod.trim().toLowerCase() === period.toLowerCase()))) {
      return "A report with that name and period already exists.";
    }
    setDashboardData((current) => current ? {
      ...current,
      reports: [{ report: draft.report.trim(), period, periodStart: draft.periodStart, periodEnd: draft.periodEnd, owner: current.profile.name, status: "Draft", dateKey: toDateKey(new Date()) }, ...current.reports],
      auditEvents: [createAuditEvent(current, "New report", `${draft.report.trim()} · ${period}`, "Reports"), ...current.auditEvents],
    } : current);
    return null;
  };
  const adjustInventoryStock = (adjustment: { sku: string; location: string; quantity: number; direction: "Add" | "Remove"; unitCost?: number }): string | null => {
    if (!dashboardData) return "Inventory data isn't ready yet.";
    const item = dashboardData.inventoryItems.find(({ sku }) => sku === adjustment.sku);
    const location = dashboardData.inventoryLocations.find(({ location: name }) => name === adjustment.location);
    if (!item || !location) return "Choose a valid item and location.";
    const delta = adjustment.direction === "Add" ? adjustment.quantity : -adjustment.quantity;
    if (item.stock + delta < 0 || location.stock + delta < 0 || location.stock + delta > location.capacity) return "The adjustment exceeds available stock or location capacity.";
    if (adjustment.direction === "Remove" && getLocationQuantity(item, adjustment.location) < adjustment.quantity) {
      return `Only ${getLocationQuantity(item, adjustment.location)} ${item.item} available at ${adjustment.location}.`;
    }
    const averageCost = item.stock > 0 ? item.value / item.stock : 0;
    let nextValue = item.value;
    let unitCost = averageCost;
    if (adjustment.direction === "Add") {
      if (!Number.isFinite(adjustment.unitCost) || (adjustment.unitCost ?? 0) <= 0) return "Enter a positive unit cost for incoming stock.";
      const weighted = calculateWeightedAverage(item.stock, item.value, adjustment.quantity, adjustment.unitCost!);
      nextValue = weighted.inventoryValue;
      unitCost = adjustment.unitCost!;
    } else {
      nextValue = Math.max(0, Math.round((item.value - averageCost * adjustment.quantity + Number.EPSILON) * 100) / 100);
    }
    const dateKey = toDateKey(new Date());
    const amount = Math.round(Math.abs(nextValue - item.value) * 100) / 100;
    const prepared = prepareJournal(dashboardData, { dateKey, memo: `${adjustment.direction === "Add" ? "Stock receipt" : "Stock issue"} ${item.sku}`, sourceType: adjustment.direction === "Add" ? "inventory-receipt" : "inventory-issue", sourceId: item.sku, lines: adjustment.direction === "Add"
      ? [{ account: "Inventory", debit: amount, credit: 0 }, { account: "Cash & Cash Equivalents", debit: 0, credit: amount }]
      : [{ account: "Cost of Goods Sold", debit: amount, credit: 0 }, { account: "Inventory", debit: 0, credit: amount }],
    });
    if (!prepared.entry) return prepared.error ?? "Stock movement could not be posted.";
    setDashboardData((current) => {
      if (!current) return current;
      const posted = appendJournal(current, prepared.entry!);
      if (!posted.data) return current;
      const nextStock = item.stock + delta;
      return {
        ...posted.data,
        inventoryItems: posted.data.inventoryItems.map((entry) => entry.sku === adjustment.sku
          ? { ...setLocationQuantity(entry, adjustment.location, getLocationQuantity(entry, adjustment.location) + delta), stock: nextStock, value: nextValue, unitCost: nextStock > 0 ? nextValue / nextStock : 0, status: nextStock <= (entry.reorderLevel ?? 5) ? "Low stock" : "Healthy" }
          : entry),
        inventoryLocations: posted.data.inventoryLocations.map((entry) => entry.location === adjustment.location
          ? { ...entry, stock: entry.stock + delta }
          : entry),
        inventoryMovements: [{ id: prepared.entry!.id, sku: item.sku, location: adjustment.location, quantity: adjustment.quantity, unitCost, direction: adjustment.direction === "Add" ? "in" : "out", dateKey, journalEntryId: prepared.entry!.id }, ...(posted.data.inventoryMovements ?? [])],
      };
    });
    return null;
  };

  if (isLoggedOut) return <main className="signed-out-screen">
    <section className="signed-out-card">
      <span className="signed-out-mark"><LogOut size={20} /></span>
      <h1>You’re signed out</h1>
      <p>This demo doesn’t have authentication connected. Reload the page to start a new demo session.</p>
    </section>
  </main>;

  return (
    <div className={`dashboard-app ${sidebarCollapsed ? "sidebar-collapsed" : ""}`} data-theme={darkMode ? "dark" : "light"}>
      <header className="app-brand-bar">
        <div className="brand"><span className="brand-mark">C</span><div><strong>Corelogic</strong><span>ERP & finance System</span></div></div>
      </header>
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="user-menu-wrap organization-menu-wrap" ref={userMenuRef}>
          <button
            ref={userMenuButtonRef}
            type="button"
            className="organization-identity"
            aria-label={`Open organization menu for ${organizationSettings.name}`}
            aria-haspopup="dialog"
            aria-expanded={userMenuOpen}
            onClick={() => setUserMenuOpen((open) => !open)}
          >
            {organizationSettings.logoDataUrl
              ? <img className="organization-mark organization-logo" src={organizationSettings.logoDataUrl} alt="" />
              : <span className="organization-mark" aria-hidden="true">{profileInitials(organizationSettings.name)}</span>}
            <span className="organization-identity-copy">
              <strong>{organizationSettings.name}</strong>
              <small>{organizationSettings.code}</small>
            </span>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          {userMenuOpen && <section className="user-menu-popover" role="dialog" aria-label="Logged-in user">
            <div className="user-menu-details">
              <div><strong>{activeUserIdentity.name}</strong><span>{activeUserIdentity.email}</span><small>{currentWorkspaceRole}</small></div>
            </div>
            <div className="user-menu-divider" />
            <button type="button" className="user-menu-logout" onClick={() => {
              setUserMenuOpen(false);
              window.location.replace("/auth/sign-in");
            }}>
              <LogOut size={15} aria-hidden="true" /> Log out
            </button>
          </section>}
        </div>
        <nav aria-label="Dashboard navigation">
          {navItems.filter(({ label }) => label !== "Settings" && (label !== "Approvals" || currentWorkspaceRole === "Finance Admin")).map(({ label, icon: Icon }) => {
            const alertCount = label === "Invoice"
              ? invoices.filter(({ status }) => status !== "Matched").length
              : label === "Reconciliation" ? reconciliationAlertCount
                : label === "Payroll" ? payrollAlertCount
                  : label === "Approvals" ? dashboardData?.approvalRequests.filter(({ status }) => status === "Pending").length ?? 0
                    : null;
            return <button key={label} aria-label={label} title={sidebarCollapsed ? label : undefined} className={activeNav === label ? "nav-item active" : "nav-item"} onClick={() => navigate(label)}><Icon size={18} /><span>{label}</span>{alertCount !== null && <span className="nav-count" aria-label={`${alertCount} pending alerts`}>{alertCount}</span>}</button>;
          })}
        </nav>
        <button type="button" className="sidebar-collapse-button" aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!sidebarCollapsed} onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}><SidebarSwitchIcon /></button>
      </aside>
      {sidebarOpen && <button className="sidebar-overlay" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><div className="breadcrumb"><span>Dashboard</span><span>|</span><strong>{activeNav}</strong></div></div>
          <div className="topbar-actions">
            <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records..." /></label>
            <button ref={feedbackButtonRef} type="button" className="feedback-button" aria-haspopup="dialog" aria-expanded={feedbackOpen} onClick={() => setFeedbackOpen(true)}><MessageSquare size={15} /><span>Feedback</span></button>
            <a className="icon-button" href="/documentation" target="_blank" rel="noreferrer" aria-label="Help and documentation" title="Documentation"><HelpCircle size={19} /></a>
            <div className="notification-menu-wrap" ref={notificationMenuRef}>
              <button ref={notificationButtonRef} type="button" className="icon-button notification" aria-label={unreadNotificationCount ? `Notifications, ${unreadNotificationCount} unread` : "Notifications"} aria-haspopup="dialog" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}>
                <Bell size={19} />{unreadNotificationCount > 0 && <span aria-hidden="true">{unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}</span>}
              </button>
              {notificationsOpen && <section className="notification-popover" role="dialog" aria-label="Notifications">
                <header className="notification-popover-header">
                  <div><strong>Notifications</strong><span>{unreadNotificationCount ? `${unreadNotificationCount} unread` : "All caught up"}</span></div>
                  <button type="button" className="notification-mark-all" disabled={unreadNotificationCount === 0} onClick={markAllNotificationsRead}>Mark all read</button>
                </header>
                {notificationStorageError && <p className="notification-storage-error" role="alert">{notificationStorageError}</p>}
                <div className="notification-list">
                  {notifications.length
                    ? notifications.map((notification) => {
                      const unread = !readNotificationIds.includes(notification.id);
                      return <button type="button" key={notification.id} className={`notification-item ${unread ? "unread" : ""}`} onClick={() => {
                        markNotificationRead(notification.id);
                        setNotificationsOpen(false);
                        navigate(notification.destination);
                      }}>
                        <span className="notification-item-indicator" aria-hidden="true" />
                        <span className="notification-item-content"><strong>{notification.title}</strong><span>{notification.detail}</span><small>{notification.section}</small></span>
                      </button>;
                    })
                    : <p className="notification-empty">No notifications right now.</p>}
                </div>
              </section>}
            </div>
            <button className="icon-button" aria-label="Settings" onClick={() => navigate("Settings")}><Settings size={19} /></button>
          </div>
        </header>
        <div className="page-wrap">
          {!(activeNav === "Payroll" && payrollDetailOpen) && !(activeNav === "Reports" && reportDetailOpen) && !(activeNav === "Inventory" && inventoryLocationOpen) && !(activeNav === "Reconciliation" && bankStatementDetailOpen) && !((activeNav === "Payables" || activeNav === "Receivables") && partyProfileDetailOpen) && !(activeNav === "Ledger" && ledgerAccountDetailOpen) && <section className="page-heading"><div><h1>{activeNav === "Overview" ? `Welcome back, ${profileSettings.name.split(" ")[0]}!` : activeNav === "Settings" ? "Settings" : activeNav === "Inventory" && inventorySection !== "Overview" ? inventorySection : activeNav}</h1>{activeNav !== "Settings" && <p>{activeNav === "Overview" ? "Here’s what’s happening across your business today." : activeNav === "Approvals" ? "Review submissions before they enter finance workflows." : activeNav === "Inventory" && inventorySection === "Procurement" ? "Manage procurement requests from your central finance workspace." : activeNav === "Inventory" && inventorySection === "Purchase Order" ? "Manage purchase orders from your central finance workspace." : `Manage ${activeNav.toLowerCase()} from your central finance workspace.`}</p>}</div><div className="page-heading-actions">
            {activeNav === "Inventory" && <InventorySectionTabs section={inventorySection} onChange={setInventorySection} />}
            {activeNav !== "Settings" && activeNav !== "Approvals" && activeNav !== "Inventory" && activeNav !== "Reports" && activeNav !== "Payroll" && <DateRangePicker onApply={(start, end) => setDateRange({ start, end })} />}
          </div></section>}
          {dataError
            ? <p className="dashboard-data-message" role="alert">{dataError}</p>
            : dashboardData
              ? <>
                {activeNav === "Overview" && dateFilteredData && <Overview data={dateFilteredData} search={search} updateStatus={updateStatus} />}
                {activeNav === "Approvals" && dashboardData && currentWorkspaceRole === "Finance Admin" && <ApprovalQueuePage requests={dashboardData.approvalRequests} customers={dashboardData.customers ?? []} search={search} onDecision={decideRequest} />}
                {activeNav === "Inventory" && dashboardData && <InventoryPage data={dashboardData} allData={dashboardData} section={inventorySection} search={search} onLocationDetailChange={setInventoryLocationOpen} suppliers={dashboardData.vendors ?? []} onAddSupplier={addSupplierProfile} onCreateOrder={createPurchaseOrder} onUpdatePurchaseOrderStatus={updatePurchaseOrderStatus} onUpdateProcurementStatus={updateProcurementStatus} onCreateProcurement={createProcurement} onResubmitApproval={resubmitRejectedApproval} onGenerateProcurementReference={generateProcurementReference} onAddInventoryItem={addInventoryItem} onUpdateInventorySellingPrice={updateInventorySellingPrice} onAddInventoryLocation={addInventoryLocation} onUpdateInventoryLocation={updateInventoryLocation} onAdjustStock={adjustInventoryStock} />}
                {activeNav === "Audit Logs" && dateFilteredData && <AudioTrailPage data={dateFilteredData} />}
                {activeNav === "Settings" && <SettingsPage savedProfile={profileSettings} onSaveProfile={setProfileSettings} organization={organizationSettings} onSaveOrganization={setOrganizationSettings} users={workspaceUsers ?? dashboardData.users} onSaveUsers={saveWorkspaceUsers} darkMode={darkMode} onDarkModeChange={setDarkMode} />}
                {activeNav !== "Overview" && activeNav !== "Approvals" && activeNav !== "Inventory" && activeNav !== "Audit Logs" && activeNav !== "Settings" && dateFilteredData && <ModulePage activeNav={activeNav} data={activeNav === "Reports" || activeNav === "Payroll" ? dashboardData : dateFilteredData} allData={dashboardData} organization={organizationSettings} search={search} periodLabel={`${formatDateKey(dateRange.start)} – ${formatDateKey(dateRange.end)}`} periodStart={dateRange.start} periodEnd={dateRange.end} existingJournalReferences={dashboardData.ledgerAccounts.map(({ reference }) => reference).filter((reference): reference is string => Boolean(reference))} onResubmitApproval={resubmitRejectedApproval} onRecordPayment={recordPayment} onPayrollDetailChange={setPayrollDetailOpen} onReportDetailChange={setReportDetailOpen} onBankStatementDetailChange={setBankStatementDetailOpen} onPartyProfileDetailChange={setPartyProfileDetailOpen} onLedgerAccountDetailChange={setLedgerAccountDetailOpen} onImportBankStatement={importBankStatement} onMatchBankStatementLine={matchBankStatementLine} onManualMatchBankStatementLine={manuallyMatchBankStatementLine} onAddLedgerAccount={addLedgerAccount} onCreateLedgerJournalEntry={createLedgerJournalEntry} onAddCustomerProfile={addCustomerProfile} onUpdateCustomerProfile={updateCustomerProfile} onDeleteCustomerProfile={deleteCustomerProfile} onUpdateSupplierProfile={updateSupplierProfile} onDeleteSupplierProfile={deleteSupplierProfile} customers={dashboardData.customers ?? []} suppliers={dashboardData.vendors ?? []} onAddSupplier={addSupplierProfile} onAddReceivable={addReceivable} onAddPayable={addPayable} onAddInvoice={addInvoice} onAddPayrollRecord={addPayrollRecord} onAddReport={addReport} />}
              </>
              : <p className="dashboard-data-message" role="status">Loading dashboard data…</p>}
        </div>
      </main>
      {feedbackOpen && <FeedbackDialog onClose={closeFeedback} />}
    </div>
  );
}

function ApprovalQueuePage({ requests, customers, search, onDecision }: {
  requests: ApprovalRequest[];
  customers: NonNullable<DashboardData["customers"]>;
  search: string;
  onDecision: (requestId: string, decision: "Approved" | "Rejected", reason: string) => string | null;
}) {
  const [view, setView] = useState<"Pending" | "History">("Pending");
  const [selectedId, setSelectedId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const reviewTriggerRef = useRef<HTMLButtonElement | null>(null);
  const pending = requests.filter(({ status }) => status === "Pending").sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
  const history = requests.filter(({ status }) => status !== "Pending").sort((left, right) => (right.decidedAt ?? "").localeCompare(left.decidedAt ?? ""));
  const records = (view === "Pending" ? pending : history).filter((request) => {
    const detail = request.type === "procurement"
      ? `${request.payload.billReference} ${request.payload.item} ${request.payload.supplier}`
      : request.type === "purchase-order"
        ? `${request.payload.supplier} ${request.payload.lines?.map(({ item }) => item).join(" ") ?? request.payload.item ?? ""}`
        : `${request.payload.invoice} ${customers.find(({ id }) => id === request.payload.customerId)?.name ?? ""}`;
    return !search.trim() || `${request.type} ${request.submittedBy} ${detail}`.toLowerCase().includes(search.trim().toLowerCase());
  });
  const selected = records.find(({ id }) => id === selectedId) ?? requests.find(({ id }) => id === selectedId);
  const closeReview = () => {
    setSelectedId("");
    setMessage("");
  };
  useEffect(() => {
    if (selected) return;
    reviewTriggerRef.current?.focus();
  }, [selected]);
  useEffect(() => {
    if (!selected) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeReview();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selected]);
  const typeLabel = (request: ApprovalRequest) => request.type === "procurement" ? "Procurement request" : request.type === "purchase-order" ? "Purchase order request" : "Customer invoice";
  const reference = (request: ApprovalRequest) => request.type === "procurement"
    ? request.payload.billReference || "—"
    : request.type === "purchase-order"
      ? request.resultingReference ?? request.payload.number ?? "—"
      : request.payload.invoice;
  const summary = (request: ApprovalRequest) => request.type === "procurement"
    ? `${request.payload.item} · ${request.payload.supplier}`
    : request.type === "purchase-order"
      ? `${request.payload.item ?? request.payload.lines?.map(({ item }) => item).join(", ") ?? "Purchase order"} · ${request.payload.supplier}`
      : `${request.payload.invoice} · ${customers.find(({ id }) => id === request.payload.customerId)?.name ?? "Customer"}`;
  const amount = (request: ApprovalRequest) => request.type === "purchase-order"
    ? request.payload.lines?.reduce((total, line) => total + line.quantity * line.unitPrice, 0) ?? request.payload.amount
    : request.payload.amount;
  const formatTimestamp = (value: string | undefined) => value ? new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";
  const decide = (decision: "Approved" | "Rejected") => {
    if (!selected) return;
    const error = onDecision(selected.id, decision, rejectionReason);
    setMessage(error ?? `Request ${decision.toLowerCase()}.`);
    setMessageIsError(Boolean(error));
    if (!error) {
      setSelectedId("");
      setRejectionReason("");
    }
  };

  if (selected) return <section className="approval-review-page">
    <div className="approval-review-page-toolbar"><button type="button" className="outline-button" onClick={closeReview}><ChevronLeft size={16} /> Back </button></div>
    <article className="panel approval-review-panel approval-review-page-panel" aria-labelledby="approval-review-title">
      <header><div><span>{typeLabel(selected)}</span><h2 id="approval-review-title">{summary(selected)}</h2></div><span className={`status ${selected.status === "Approved" ? "status-matched" : selected.status === "Rejected" ? "status-flagged" : "status-pending"}`}><i />{selected.status}</span></header>
      <dl className="record-drawer-fields">
        <div><dt>Submitted by</dt><dd>{selected.submittedBy}</dd></div>
        <div><dt>Submitted</dt><dd>{formatTimestamp(selected.submittedAt)}</dd></div>
        <div><dt>Reference</dt><dd>{reference(selected)}</dd></div>
        {selected.type === "procurement" && <>
          <div><dt>Category</dt><dd>{selected.payload.billType === "inventory" ? "Goods received into stock" : "Expense or service"}</dd></div>
          <div><dt>Required by</dt><dd>{selected.payload.due}</dd></div>
        </>}
        {selected.type === "purchase-order" && <>
          <div><dt>Supplier</dt><dd>{selected.payload.supplier}</dd></div>
          <div><dt>Receiving location</dt><dd>{selected.payload.location ?? "Not set"}</dd></div>
        </>}
        {selected.type === "customer-invoice" && <>
          <div><dt>Customer</dt><dd>{customers.find(({ id }) => id === selected.payload.customerId)?.name ?? "Customer profile unavailable"}</dd></div>
          <div><dt>Invoice date</dt><dd>{selected.payload.invoiceDate}</dd></div>
          <div><dt>Due date</dt><dd>{selected.payload.dueDate}</dd></div>
        </>}
        <div><dt>Amount</dt><dd>{formatNaira(amount(selected))}</dd></div>
        {selected.status !== "Pending" && <>
          <div><dt>Decision</dt><dd>{selected.status}</dd></div>
          <div><dt>Decided by</dt><dd>{selected.decidedBy ?? "—"}</dd></div>
          <div><dt>Decided</dt><dd>{formatTimestamp(selected.decidedAt)}</dd></div>
          {selected.resultingReference && <div><dt>Created record</dt><dd>{selected.resultingReference}</dd></div>}
          {selected.rejectionReason && <div><dt>Rejection reason</dt><dd>{selected.rejectionReason}</dd></div>}
        </>}
      </dl>
      {selected.type !== "customer-invoice" && selected.payload.document && <ApprovalDocumentPreview key={selected.payload.document.id} document={selected.payload.document} />}
      <ApprovalSubmissionItems request={selected} />
      {selected.type === "customer-invoice"
        ? (selected.payload.companyDetails || selected.payload.customerDetails) && <InvoicePartiesPreview company={selected.payload.companyDetails} customer={selected.payload.customerDetails} />
        : <section className="invoice-parties-preview" aria-label="Request parties">
          <h3>Request parties</h3>
          <div className="invoice-party-grid">
            <article className="invoice-party-card"><h4>Submitted by</h4><strong>{selected.submittedBy}</strong></article>
            <article className="invoice-party-card"><h4>Supplier</h4><strong>{selected.payload.supplier}</strong>{selected.payload.supplierAddress && <p>{selected.payload.supplierAddress}</p>}{selected.payload.supplierContact && <p>{selected.payload.supplierContact}</p>}</article>
          </div>
        </section>}
      {message && <p className={messageIsError ? "inventory-error approval-message" : "record-status-message approval-message"} role={messageIsError ? "alert" : "status"}>{message}</p>}
      {selected.status === "Pending" && <div className="approval-review-actions">
        <label htmlFor="approval-rejection-reason">Rejection reason</label>
        <textarea id="approval-rejection-reason" maxLength={500} value={rejectionReason} onChange={(event) => { setRejectionReason(event.target.value); setMessage(""); setMessageIsError(false); }} placeholder="Required to reject this request" />
        <div><button type="button" className="outline-button" onClick={() => decide("Rejected")} disabled={!rejectionReason.trim()}>Reject request</button><button type="button" className="primary-button" onClick={() => decide("Approved")}>Approve and post</button></div>
      </div>}
    </article>
  </section>;

  return <section className="approval-layout">
    <article className="panel approval-queue-panel">
      <div className="reconciliation-tabs approval-tabs" role="tablist" aria-label="Approval requests">
        <button type="button" role="tab" aria-selected={view === "Pending"} className={view === "Pending" ? "active" : ""} onClick={() => { setView("Pending"); setSelectedId(""); setMessage(""); }}>Pending <span>{pending.length}</span></button>
        <button type="button" role="tab" aria-selected={view === "History"} className={view === "History" ? "active" : ""} onClick={() => { setView("History"); setSelectedId(""); setMessage(""); }}>Decision history <span>{history.length}</span></button>
      </div>
      <div className="module-table-wrap">
        <table className="module-table approval-table">
          <thead><tr><th>Request</th><th>Reference</th><th>Submitted by</th><th>Submitted</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{records.map((request) => <tr key={request.id}>
            <td><strong>{typeLabel(request)}</strong><small>{summary(request)}</small></td>
            <td>{reference(request)}</td>
            <td>{request.submittedBy}</td>
            <td>{formatTimestamp(request.submittedAt)}</td>
            <td>{formatNaira(amount(request))}</td>
            <td><span className={`status ${request.status === "Approved" ? "status-matched" : request.status === "Rejected" ? "status-flagged" : "status-pending"}`}><i />{request.status}</span></td>
            <td><button type="button" className="table-action-button" onClick={(event) => { reviewTriggerRef.current = event.currentTarget; setSelectedId(request.id); setRejectionReason(""); setMessage(""); }}>{request.status === "Pending" ? "Review" : "Details"}</button></td>
          </tr>)}
          {records.length === 0 && <tr><td colSpan={7}>{search.trim() ? "No requests match your search." : view === "Pending" ? "No requests are waiting for approval." : "No decisions recorded yet."}</td></tr>}</tbody>
        </table>
      </div>
      {message && !selected && <p className={messageIsError ? "inventory-error approval-message" : "record-status-message approval-message"} role={messageIsError ? "alert" : "status"}>{message}</p>}
      <div className="approval-queue-footer" aria-live="polite">Showing {records.length} {records.length === 1 ? "request" : "requests"}</div>
    </article>
  </section>;
}

function Overview({ data, search, updateStatus }: { data: DashboardData; search: string; updateStatus: (id: string, status: Status) => void }) {
  const metrics = getOverviewMetrics(data);
  const cashFlowWaterfall = getCashFlowWaterfall(data);
  const activityIcons = { invoice: FileCheck2, match: ShieldCheck, alert: AlertIcon };
  const activityColors = { invoice: "yellow", match: "blue", alert: "red" };
  const isImportantActivity = (action: string) =>
    /^new (procurement|purchase order|invoice|customer|supplier|bill|inventory item|inventory location|report|payroll record|journal entry|ledger account)$/i.test(action) ||
    /^(bank statement imported|invoice created|invoice uploaded|payment allocation recorded)$/i.test(action);
  const auditEvents = data.auditEvents.filter(({ action }) => isImportantActivity(action)).sort((left, right) =>
    (right.dateKey ?? "").localeCompare(left.dateKey ?? "") || right.time.localeCompare(left.time),
  );
  const auditedActions = new Set(auditEvents.map(({ action }) => action));
  const processingRows: {
    id: string;
    event: string;
    detail: string;
    when: string;
    status: string;
    owner: string;
    kind: keyof typeof activityIcons;
    invoice?: Invoice;
  }[] = [
    ...data.activity.filter((item) => item.kind === "alert" && !auditedActions.has(item.title)).map((item, index) => {
      const relatedInvoice = data.invoices.find(({ invoice }) => item.detail.includes(invoice));
      return {
        id: `activity-${index}`,
        event: item.title,
        detail: item.detail,
        when: item.time,
        status: item.kind === "match" ? "Matched" : item.kind === "alert" ? "Flagged" : "Created",
        owner: relatedInvoice?.owner ?? (item.kind === "invoice" ? "—" : "System"),
        kind: item.kind,
        invoice: undefined,
      };
    }),
    ...auditEvents.map((event, index) => ({
      id: `audit-${event.dateKey ?? "undated"}-${index}`,
      event: event.action,
      detail: event.detail,
      when: event.dateKey
        ? `${formatDateKey(event.dateKey)}, ${event.time.match(/\d{2}:\d{2}$/)?.[0] ?? event.time}`
        : event.time,
      status: event.status,
      owner: event.user,
      kind: event.status === "Flagged" || /exception|flag/i.test(event.action)
        ? "alert" as const
        : /match|reconcil/i.test(`${event.type} ${event.action}`)
          ? "match" as const
          : "invoice" as const,
      invoice: undefined,
    })),
  ].filter((row) => `${row.event} ${row.detail} ${row.when} ${row.status} ${row.owner}`.toLowerCase().includes(search.toLowerCase()));

  return <>
    <section className="metrics-grid overview-metrics"><MetricCard icon={GrossProfitIcon} label="Gross Profit" value={formatNaira(metrics.grossProfit)} accent="yellow" /><MetricCard icon={PendingPayablesIcon} label="Pending payables" value={formatNaira(metrics.pendingPayables)} accent="red" /><MetricCard icon={OutstandingReceivablesIcon} label="Outstanding receivables" value={formatNaira(metrics.outstandingReceivables)} accent="blue" /></section>
    <section className="dashboard-grid overview-dashboard-grid">
      <article className="panel cash-flow-panel"><PanelHeader kicker="Performance" title="Cash flow overview" /><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={cashFlowWaterfall} margin={{ top: 14, right: 24, left: 12, bottom: 0 }}><CartesianGrid stroke="var(--chart-grid)" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--chart-tick)", fontSize: 12 }} dy={8} /><YAxis width={82} tickMargin={8} axisLine={false} tickLine={false} tick={{ fill: "var(--chart-tick)", fontSize: 12 }} tickFormatter={(value) => formatCompactNaira(Number(value))} /><Tooltip content={<WaterfallTooltip />} /><Bar dataKey="base" stackId="cash-flow" fill="transparent" isAnimationActive={false} /><Bar dataKey="increase" stackId="cash-flow" name="Net increase" fill="#ffe01b">{cashFlowWaterfall.map((step) => <Cell key={step.month} fill={step.total ? "var(--chart-total)" : "#ffe01b"} />)}</Bar><Bar dataKey="decrease" stackId="cash-flow" name="Net decrease" fill="#d7655b" /></BarChart></ResponsiveContainer></div><div className="chart-legend waterfall-legend"><span><i className="legend-dot positive" /> Net increase</span><span><i className="legend-dot negative" /> Net decrease</span><span><i className="legend-dot total" /> Cumulative total</span></div></article>
      <article className="panel activity-panel activity-table-panel"><PanelHeader kicker="Activity log" title="Recent activities" /><div className="activity-table-wrap"><table className="activity-table"><thead><tr><th>Activity</th><th>Details</th><th>Date / time</th><th>Status</th><th>Owner</th></tr></thead><tbody>{processingRows.map((row) => {
        const Icon = activityIcons[row.kind];
        const statusStyle = ["Matched", "Complete", "Uploaded", "Verified", "Recorded", "Signed", "Imported", "Created"].includes(row.status) ? "status-matched" : ["Pending", "Review", "Processing"].includes(row.status) ? "status-pending" : "status-flagged";
        const invoice = row.invoice;
        return <tr key={row.id}><td><span className="activity-table-event"><span className={`activity-table-icon ${activityColors[row.kind]}`}><Icon size={15} /></span><strong>{row.event}</strong></span></td><td>{row.detail}</td><td>{row.when}</td><td>{invoice ? <button type="button" className="activity-status-button" aria-label={`Update ${invoice.invoice} status`} onClick={() => updateStatus(invoice.id, invoice.status === "Matched" ? "Pending" : "Matched")}><span className={`status ${statusStyle}`}><i />{row.status}</span></button> : <span className={`status ${statusStyle}`}><i />{row.status}</span>}</td><td>{row.owner}</td></tr>;
      })}</tbody></table></div><div className="table-footer"><span>Showing {processingRows.length} important activities</span><span>Filtered by selected date range</span></div></article>
    </section>
  </>;
}

type ModuleCreateNav = "Receivables" | "Payables" | "Invoice" | "Payroll" | "Reports";

function ModulePage({ activeNav, data, allData, organization, search, periodLabel, periodStart, periodEnd, existingJournalReferences, onResubmitApproval, onRecordPayment, onPayrollDetailChange, onReportDetailChange, onBankStatementDetailChange, onPartyProfileDetailChange, onLedgerAccountDetailChange, onImportBankStatement, onMatchBankStatementLine, onManualMatchBankStatementLine, onAddLedgerAccount, onCreateLedgerJournalEntry, onAddCustomerProfile, onUpdateCustomerProfile, onDeleteCustomerProfile, onUpdateSupplierProfile, onDeleteSupplierProfile, customers, suppliers, onAddSupplier, onAddReceivable, onAddPayable, onAddInvoice, onAddPayrollRecord, onAddReport }: {
  activeNav: ModuleNavKey;
  data: DashboardData;
  allData: DashboardData;
  organization: OrganizationSettings;
  search: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  existingJournalReferences: string[];
  onResubmitApproval: (requestId: string, submission: ApprovalSubmission) => string | null;
  onRecordPayment: (nav: "Receivables" | "Payables" | "Payroll", invoice: string, amount: number, payrollDateKey?: string) => string | null;
  onPayrollDetailChange: (isOpen: boolean) => void;
  onReportDetailChange: (isOpen: boolean) => void;
  onBankStatementDetailChange: (isOpen: boolean) => void;
  onPartyProfileDetailChange: (isOpen: boolean) => void;
  onLedgerAccountDetailChange: (isOpen: boolean) => void;
  onImportBankStatement: (csv: string, mapping: BankCsvMapping, bank: string) => string | null;
  onMatchBankStatementLine: (reference: string) => string | null;
  onManualMatchBankStatementLine: (lineId: string, journalId: string) => string | null;
  onAddLedgerAccount: (account: NewLedgerAccount) => string | null;
  onCreateLedgerJournalEntry: (entry: LedgerJournalEntry) => string | null;
  onAddCustomerProfile: (draft: CustomerProfileDraft) => string | null;
  onUpdateCustomerProfile: (customerId: string, draft: CustomerProfileDraft) => string | null;
  onDeleteCustomerProfile: (customerId: string) => string | null;
  onUpdateSupplierProfile: (supplierId: string, draft: SupplierProfile) => string | null;
  onDeleteSupplierProfile: (supplierId: string) => string | null;
  customers: NonNullable<DashboardData["customers"]>;
  suppliers: SupplierProfile[];
  onAddSupplier: (draft: SupplierProfile) => string | null;
  onAddReceivable: (draft: ReceivableDraft) => string | null;
  onAddPayable: (draft: PayableDraft) => string | null;
  onAddInvoice: (draft: InvoiceDraft) => string | null;
  onAddPayrollRecord: (draft: PayrollDraft) => string | null;
  onAddReport: (draft: ReportDraft) => string | null;
}) {
  const [reconciliationView, setReconciliationView] = useState<ReconciliationView>("Payables");
  const [selected, setSelected] = useState<Record<string, string> | null>(null);
  const [selectedPayroll, setSelectedPayroll] = useState<Record<string, string> | null>(null);
  const [selectedPartyProfile, setSelectedPartyProfile] = useState<PartyProfileSelection | null>(null);
  const [selectedReport, setSelectedReport] = useState<Record<string, string> | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<{ batchId?: string; legacyLineId?: string } | null>(null);
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<Record<string, string> | null>(null);
  const [partyDirectoryView, setPartyDirectoryView] = useState(false);
  const [partyMenuOpen, setPartyMenuOpen] = useState<{ id: string; kind: "customer" | "supplier"; top: number; right: number } | null>(null);
  const [partyToEdit, setPartyToEdit] = useState<{ id: string; kind: "customer" | "supplier" } | null>(null);
  const [partyToDelete, setPartyToDelete] = useState<{ id: string; name: string; kind: "customer" | "supplier" } | null>(null);
  const [reportView, setReportView] = useState<"sheet" | "chart">("sheet");
  const [ledgerCreatePage, setLedgerCreatePage] = useState<"journal" | "account" | null>(null);
  const [ledgerChoiceOpen, setLedgerChoiceOpen] = useState(false);
  const [createRecordOpen, setCreateRecordOpen] = useState(false);
  const [editApproval, setEditApproval] = useState<ApprovalRequest | null>(null);
  const [bankImportOpen, setBankImportOpen] = useState(false);
  const [customerCreateOpen, setCustomerCreateOpen] = useState(false);
  const [supplierCreateOpen, setSupplierCreateOpen] = useState(false);
  const [ledgerNotice, setLedgerNotice] = useState("");
  const tableData = activeNav === "Reconciliation" && reconciliationView === "Bank"
    ? {
      ...data,
      bankStatementLines: (allData.bankStatementLines ?? []).filter((line) =>
        Boolean(line.batchId) || line.dateKey >= periodStart && line.dateKey <= periodEnd,
      ),
    }
    : data;
  const allRecords: Record<string, string>[] = partyDirectoryView && activeNav === "Receivables"
    ? (allData.customers ?? []).map(({ id, name, email, phone }) => ({ customer: name, email: email || "—", phone: phone || "—", __customerId: id }))
    : partyDirectoryView && activeNav === "Payables"
      ? (allData.vendors ?? []).map(({ id, name, email, phone }) => ({ vendor: name, email: email || "—", phone: phone || "—", __supplierId: id }))
      : activeNav === "Invoice"
        ? [
          ...getModuleRecords(tableData, activeNav, reconciliationView),
          ...allData.approvalRequests.flatMap((request) => request.type === "customer-invoice" && (request.status === "Pending" || request.status === "Rejected" && !allData.approvalRequests.some(({ revisionOf }) => revisionOf === request.id)) ? [{
            customer: allData.customers?.find(({ id }) => id === request.payload.customerId)?.name ?? "",
            invoice: request.payload.invoice,
            date: formatDateKey(request.payload.invoiceDate),
            dueDate: formatDateKey(request.payload.dueDate),
            amount: formatNaira(request.payload.amount),
            owner: request.submittedBy,
            status: request.status,
            __approvalRequestId: request.id,
          }] : []),
        ]
        : getModuleRecords(tableData, activeNav, reconciliationView);
  const searchTerm = search.trim().toLowerCase();
  const records = allRecords.filter((record) => !searchTerm || Object.entries(record).some(([key, value]) => !key.startsWith("__") && value.toLowerCase().includes(searchTerm)));
  const selectedInvoiceApproval = activeNav === "Invoice" && selected
    ? allData.approvalRequests.find((request) =>
      request.type === "customer-invoice" &&
      (request.id === selected.__approvalRequestId || request.payload.invoice === selected.invoice))
    : undefined;
  const savedSelectedInvoice = activeNav === "Invoice" && selected
    ? allData.invoices.find(({ invoice }) => invoice === selected.invoice)
    : undefined;
  const selectedInvoice: Invoice | undefined = savedSelectedInvoice ?? (selectedInvoiceApproval?.type === "customer-invoice"
    ? {
      id: selectedInvoiceApproval.id,
      vendor: "",
      customer: selectedInvoiceApproval.payload.customerDetails?.name ??
        allData.customers?.find(({ id }) => id === selectedInvoiceApproval.payload.customerId)?.name ?? "Customer",
      customerId: selectedInvoiceApproval.payload.customerId,
      invoice: selectedInvoiceApproval.payload.invoice,
      date: formatDateKey(selectedInvoiceApproval.payload.invoiceDate),
      dateKey: selectedInvoiceApproval.payload.invoiceDate,
      dueDate: selectedInvoiceApproval.payload.dueDate,
      amount: selectedInvoiceApproval.payload.amount,
      status: selectedInvoiceApproval.status === "Rejected" ? "Flagged" : "Pending",
      owner: selectedInvoiceApproval.submittedBy,
      companyDetails: selectedInvoiceApproval.payload.companyDetails,
      customerDetails: selectedInvoiceApproval.payload.customerDetails,
      items: selectedInvoiceApproval.payload.items,
    }
    : undefined);
  const selectedInvoiceCompany = selectedInvoice
    ? selectedInvoice.companyDetails ?? snapshotOrganizationForInvoice(organization)
    : undefined;
  const selectedInvoiceCustomer = selectedInvoice
    ? selectedInvoice.customerDetails ?? snapshotCustomerForInvoice(allData.customers?.find(({ id }) => id === selectedInvoice.customerId) ?? { id: selectedInvoice.customerId ?? "", name: selectedInvoice.customer ?? "Customer" })
    : undefined;
  const statementLines = selectedStatement
    ? (allData.bankStatementLines ?? [])
      .filter((line) => selectedStatement.batchId ? line.batchId === selectedStatement.batchId : line.id === selectedStatement.legacyLineId)
      .sort((left, right) => left.dateKey.localeCompare(right.dateKey) || left.id.localeCompare(right.id))
    : [];
  const selectedReportDetails = selectedReport
    ? allData.reports.find(({ report, period }) => report === selectedReport.report && period === selectedReport.period)
    : undefined;
  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);
  useEffect(() => { setSelected(null); }, [activeNav, reconciliationView]);
  useEffect(() => {
    setSelectedPayroll(null);
    onPayrollDetailChange(false);
  }, [activeNav, onPayrollDetailChange]);
  useEffect(() => {
    setSelectedReport(null);
    onReportDetailChange(false);
  }, [activeNav, onReportDetailChange]);
  useEffect(() => { setSelectedPartyProfile(null); }, [activeNav]);
  useEffect(() => {
    onPartyProfileDetailChange(false);
  }, [activeNav, onPartyProfileDetailChange]);
  useEffect(() => {
    setSelectedLedgerAccount(null);
    onLedgerAccountDetailChange(false);
  }, [activeNav, onLedgerAccountDetailChange]);
  useEffect(() => { setSelectedReport(null); }, [activeNav]);
  useEffect(() => { setSelectedStatement(null); }, [activeNav]);
  useEffect(() => {
    setSelectedStatement(null);
    onBankStatementDetailChange(false);
  }, [activeNav, onBankStatementDetailChange]);
  useEffect(() => { setSelectedLedgerAccount(null); }, [activeNav]);
  useEffect(() => { setLedgerCreatePage(null); setLedgerChoiceOpen(false); }, [activeNav]);
  useEffect(() => {
    if (!partyMenuOpen) return;
    const closeMenu = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest("[data-party-menu]")) setPartyMenuOpen(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPartyMenuOpen(null);
    };
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [partyMenuOpen]);

  const labels: Record<ModuleNavKey, string> = { Ledger: "General ledger", Receivables: "Accounts receivable", Payables: "Accounts payable", Reconciliation: "Reconciliation", Invoice: "Invoices", Inventory: "Inventory", Payroll: "Payroll", Reports: "Financial reports", "Audit Logs": "Audit logs", Overview: "Overview", Settings: "Settings" };
  const descriptions: Record<ModuleNavKey, string> = { Ledger: "Track balanced journal entries and account movements.", Receivables: "Track customer invoices, collections and credits.", Payables: "Review supplier obligations and scheduled payments.", Reconciliation: "Reconcile payables, receivables, and bank transactions.", Invoice: "Create & track customer invoices.", Inventory: "Monitor stock levels, movement, and valuation.", Payroll: "Review employee compensation and payment status.", Reports: "Build and export financial reporting views.", "Audit Logs": "Review secure, timestamped actions across every financial workflow.", Overview: "Overall system performance.", Settings: "Manage your workspace and automated workflows." };
  const columns = allRecords.length > 0 ? Object.keys(allRecords[0]).filter((column) => !column.startsWith("__")) : [];
  const createLabels: Partial<Record<ModuleNavKey, string>> = {
    Ledger: "Add record",
    Receivables: "New customer",
    Invoice: "Create invoice",
    Payroll: "Add payroll entry",
    Reports: "Create report",
  };
  const canCreateRecord = activeNav in createLabels;
  const showActionsColumn = activeNav !== "Reconciliation" || reconciliationView === "Bank";
  const statusClass = (value: string) => value === "Matched" || value === "Received" || value === "Paid" || value === "Ready" || value === "Healthy" ? "status-matched" : value === "Pending" || value === "Review" || value === "Approval" || value === "Quotation" || value === "Draft" || value === "Awaiting approval" ? "status-pending" : value === "Flagged" || value === "Overdue" || value === "Partial" || value === "Rejected" ? "status-flagged" : "status-pending";
  const label = (column: string) => activeNav === "Payables" && column === "invoice"
    ? "PO number/Reference"
    : column.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
  const nextSteps: Partial<Record<ModuleNavKey, string>> = {
    Invoice: "Confirm the ledger match and follow up on any open receivable.",
    Payables: "Confirm the supplier, amount and due date before scheduling the payment.",
    Receivables: "Check the balance and follow up with the customer if the invoice is overdue.",
    Reconciliation: "Confirm both sides of the transaction agree before marking it reconciled.",
    Ledger: "Verify the debit and credit lines balance and reference the source document.",
    Inventory: "Review stock against reorder levels and raise a purchase order if needed.",
    Payroll: "Confirm gross pay, deductions and payment status before the payroll run.",
    Reports: "Review the figures, then export or share the report.",
    "Audit Logs": "Review who made the change and when, for compliance records.",
  };

  const reportJournalDates = (allData.journalEntries ?? []).map(({ dateKey }) => dateKey).sort();
  const defaultReportPeriodStart = reportJournalDates[0] ?? toDateKey(new Date());
  const defaultReportPeriodEnd = reportJournalDates[reportJournalDates.length - 1] ?? defaultReportPeriodStart;

  if (activeNav === "Reports" && selectedReport) {
    const hasSavedReportPeriod = Boolean(selectedReportDetails?.periodStart && selectedReportDetails.periodEnd);
    const reportPeriodStart = selectedReportDetails?.periodStart ?? defaultReportPeriodStart;
    const reportPeriodEnd = selectedReportDetails?.periodEnd ?? defaultReportPeriodEnd;
    return <ReportSheet
      reportName={selectedReport.report}
      periodLabel={selectedReportDetails?.period ?? `${formatDateKey(reportPeriodStart)} – ${formatDateKey(reportPeriodEnd)}`}
      periodStart={reportPeriodStart}
      periodEnd={reportPeriodEnd}
      data={hasSavedReportPeriod ? filterDashboardData(allData, reportPeriodStart, reportPeriodEnd) : allData}
      view={reportView}
      onViewChange={setReportView}
      onBack={() => { setSelectedReport(null); onReportDetailChange(false); }}
    />;
  }
  if (activeNav === "Reconciliation" && selectedStatement) {
    return <BankStatementSheet
      lines={statementLines}
      journalEntries={allData.journalEntries ?? []}
      cashAccountIds={(allData.accounts ?? []).filter(({ type, code, name }) => type === "Asset" && (code === "1000" || name.toLowerCase().includes("cash"))).map(({ id }) => id)}
      matchedJournalIds={(allData.bankStatementLines ?? []).map(({ matchedJournalId }) => matchedJournalId).filter((id): id is string => Boolean(id))}
      onManualMatch={onManualMatchBankStatementLine}
      onBack={() => { setSelectedStatement(null); onBankStatementDetailChange(false); }}
    />;
  }
  if (selectedPartyProfile) {
    const profile = selectedPartyProfile.kind === "customer"
      ? allData.customers?.find(({ id, name }) => id === selectedPartyProfile.id || name === selectedPartyProfile.name)
      : allData.vendors?.find(({ id, name }) => id === selectedPartyProfile.id || name === selectedPartyProfile.name);
    return <PartyProfilePage
      kind={selectedPartyProfile.kind}
      profile={profile ?? { id: selectedPartyProfile.id ?? "", name: selectedPartyProfile.name }}
      data={allData}
      onRecordPayment={onRecordPayment}
      onBack={() => { setSelectedPartyProfile(null); onPartyProfileDetailChange(false); }}
    />;
  }
  if (activeNav === "Ledger" && selectedLedgerAccount) {
    return <LedgerSheetPage
      account={selectedLedgerAccount}
      periodLabel={periodLabel}
      data={data}
      onBack={() => { setSelectedLedgerAccount(null); onLedgerAccountDetailChange(false); }}
    />;
  }
  if (activeNav === "Payroll" && selectedPayroll) {
    const selectedPayrollRecord = allData.payroll.find((item) =>
      item.employee === selectedPayroll.employee &&
      item.role === selectedPayroll.role &&
      formatNaira(item.pay) === selectedPayroll.pay &&
      (item.dateKey ? formatDateKey(item.dateKey) : "") === selectedPayroll.date);
    if (!selectedPayrollRecord) return <section className="report-sheet-page">
      <div className="report-sheet-toolbar">
        <button type="button" className="outline-button" onClick={() => { setSelectedPayroll(null); onPayrollDetailChange(false); }}><ChevronLeft size={16} /> Back</button>
      </div>
      <p className="report-unavailable" role="status">This payroll record is no longer available.</p>
    </section>;
    const selectedPayrollDateKey = selectedPayrollRecord.dateKey;
    const payrollPayments = (allData.payrollPayments ?? [])
      .filter((payment) => payment.employee === selectedPayroll.employee &&
        (selectedPayrollDateKey
          ? payment.payrollDateKey === selectedPayrollDateKey
          : !payment.payrollDateKey && allData.payroll.filter(({ employee }) => employee === selectedPayroll.employee).length === 1))
      .map((payment) => ({
        ...payment,
        reference: allData.journalEntries?.find(({ id }) => id === payment.journalEntryId)?.reference ?? payment.journalEntryId,
      }))
      .sort((left, right) => right.dateKey.localeCompare(left.dateKey));
    const canRecordPayrollPayment = Boolean(selectedPayrollRecord.journalEntryId && selectedPayrollRecord.status !== "Paid");
    return <PayrollDetailsPage
      payroll={selectedPayrollRecord}
      payments={payrollPayments}
      onBack={() => { setSelectedPayroll(null); onPayrollDetailChange(false); }}
      onRecordPayment={canRecordPayrollPayment
        ? (amount) => onRecordPayment("Payroll", selectedPayroll.employee, amount, selectedPayrollDateKey)
        : undefined}
    />;
  }
  if (activeNav === "Ledger" && ledgerCreatePage) {
    return <LedgerRecordPage
      page={ledgerCreatePage}
      accounts={data.ledgerAccountCatalog}
      existingReferences={existingJournalReferences}
      onChooseAnother={() => { setLedgerCreatePage(null); setLedgerChoiceOpen(true); }}
      onBack={() => setLedgerCreatePage(null)}
      onAddAccount={onAddLedgerAccount}
      onCreateJournalEntry={onCreateLedgerJournalEntry}
      onSuccess={(message) => { setLedgerNotice(message); setLedgerCreatePage(null); }}
    />;
  }

  return <section className="module-layout">
    <div className="module-intro"><div><h2>{labels[activeNav]}</h2><p>{descriptions[activeNav]}</p></div>{(canCreateRecord || activeNav === "Payables" || activeNav === "Reconciliation" && reconciliationView === "Bank") && <div className="module-create-actions">{activeNav === "Reconciliation" && reconciliationView === "Bank" && <button type="button" className="primary-button" onClick={() => setBankImportOpen(true)}><Upload size={15} /> Upload statement</button>}{activeNav === "Payables" && <button type="button" className="outline-button" onClick={() => setSupplierCreateOpen(true)}><Plus size={16} /> New supplier</button>}{canCreateRecord && <button type="button" className="primary-button" onClick={() => {
      if (activeNav === "Ledger") { setLedgerNotice(""); setLedgerChoiceOpen(true); }
      else if (activeNav === "Receivables") setCustomerCreateOpen(true);
      else setCreateRecordOpen(true);
    }}><Plus size={16} /> {createLabels[activeNav]}</button>}</div>}</div>
    {ledgerNotice && <p className="inventory-confirmation" role="status">{ledgerNotice}</p>}
    <article className="panel module-table-panel">
      {activeNav === "Reconciliation" && <div className="reconciliation-tabs" role="tablist" aria-label="Reconciliation type">{(["Payables", "Receivables", "Bank"] as const).map((view) => <button key={view} id={`reconciliation-tab-${view.toLowerCase()}`} type="button" role="tab" aria-selected={reconciliationView === view} aria-controls="reconciliation-table-panel" tabIndex={reconciliationView === view ? 0 : -1} className={reconciliationView === view ? "active" : ""} onClick={() => setReconciliationView(view)}>{view}</button>)}</div>}
      {(activeNav === "Receivables" || activeNav === "Payables") && <div className="reconciliation-tabs party-directory-tabs" role="tablist" aria-label={activeNav === "Receivables" ? "Receivables view" : "Payables view"}>
        <button type="button" role="tab" aria-selected={!partyDirectoryView} className={!partyDirectoryView ? "active" : ""} onClick={() => setPartyDirectoryView(false)}>{activeNav === "Receivables" ? "Invoices" : "Bills & orders"}</button>
        <button type="button" role="tab" aria-selected={partyDirectoryView} className={partyDirectoryView ? "active" : ""} onClick={() => setPartyDirectoryView(true)}>{activeNav === "Receivables" ? "Customers" : "Suppliers"}</button>
      </div>}
      <div className="module-table-wrap" id={activeNav === "Reconciliation" ? "reconciliation-table-panel" : undefined} role={activeNav === "Reconciliation" ? "tabpanel" : undefined} aria-labelledby={activeNav === "Reconciliation" ? `reconciliation-tab-${reconciliationView.toLowerCase()}` : undefined}>
        <table className="module-table">
          <thead><tr>{columns.map((column) => <th key={column}>{label(column)}</th>)}{showActionsColumn && <th>Actions</th>}</tr></thead>
          <tbody>
            {records.map((record, index) => {
              const recordLabel = record[columns[0]] ?? `row ${index + 1}`;
              const statementLineId = record.__statementLineId;
              const statementBatchId = record.__statementBatchId;
              const customerId = record.__customerId;
              const supplierId = record.__supplierId;
              const isCustomerDirectoryRecord = activeNav === "Receivables" && partyDirectoryView && Boolean(customerId);
              const isSupplierDirectoryRecord = activeNav === "Payables" && partyDirectoryView && Boolean(supplierId);
              const isPartyDirectoryRecord = isCustomerDirectoryRecord || isSupplierDirectoryRecord;
              const partyId = customerId || supplierId;
              const partyKind = isCustomerDirectoryRecord ? "customer" : "supplier";
              const partyName = isCustomerDirectoryRecord ? record.customer : record.vendor;
              const isStatementRecord = activeNav === "Reconciliation" && reconciliationView === "Bank" && Boolean(statementLineId || statementBatchId);
              const isStatementLine = isStatementRecord && Boolean(statementLineId);
              return <tr key={`${recordLabel}-${index}`}>
                {columns.map((column) => {
                  const value = record[column];
                  const isStatus = column.toLowerCase().endsWith("status");
                  return <td key={column}>{isStatus ? <span className={`status ${statusClass(value)}`}><i />{value}</span> : value}</td>;
                })}
                {showActionsColumn && <td><div className="table-actions">
                  {isStatementLine && record.status !== "Matched" && <button type="button" className="table-action-button" onClick={() => { const error = onMatchBankStatementLine(statementLineId); setLedgerNotice(error ?? `Bank transaction ${record.reference} matched to the ledger.`); }}>Match</button>}
                  {activeNav === "Invoice" && record.status === "Rejected" && record.__approvalRequestId && <button type="button" className="table-action-button" onClick={() => {
                    const request = allData.approvalRequests.find(({ id }) => id === record.__approvalRequestId);
                    if (request?.type === "customer-invoice" && request.status === "Rejected") setEditApproval(request);
                  }}>Edit</button>}
                  <button type="button" className="table-action-button" aria-label={`View details for ${recordLabel}`} aria-haspopup={activeNav === "Reports" || activeNav === "Ledger" || activeNav === "Receivables" || activeNav === "Payables" || isStatementRecord ? undefined : "dialog"} onClick={() => {
                    if (activeNav === "Reports") {
                      setReportView("sheet");
                      setSelectedReport(record);
                      onReportDetailChange(true);
                    }
                    else if (activeNav === "Ledger") {
                      setSelectedLedgerAccount(record);
                      onLedgerAccountDetailChange(true);
                    }
                    else if (activeNav === "Receivables") {
                      setSelectedPartyProfile({ kind: "customer", id: customers.find(({ name }) => name === record.customer)?.id, name: record.customer });
                      onPartyProfileDetailChange(true);
                    }
                    else if (activeNav === "Payables") {
                      setSelectedPartyProfile({ kind: "supplier", id: suppliers.find(({ name }) => name === record.vendor)?.id, name: record.vendor });
                      onPartyProfileDetailChange(true);
                    }
                    else if (isStatementRecord) {
                      setSelectedStatement(statementBatchId ? { batchId: statementBatchId } : { legacyLineId: statementLineId });
                      onBankStatementDetailChange(true);
                    }
                    else if (activeNav === "Payroll") {
                      setSelectedPayroll(record);
                      onPayrollDetailChange(true);
                    }
                    else setSelected(record);
                  }}>View</button>
                  {isPartyDirectoryRecord ? <>
                    <button type="button" className="more-button" aria-label={`${partyKind === "customer" ? "Customer" : "Supplier"} options for ${partyName}`} aria-haspopup="menu" aria-expanded={partyMenuOpen?.id === partyId} data-party-menu onClick={(event) => {
                      if (partyMenuOpen?.id === partyId) {
                        setPartyMenuOpen(null);
                        return;
                      }
                      const rect = event.currentTarget.getBoundingClientRect();
                      setPartyMenuOpen({ id: partyId, kind: partyKind, top: rect.bottom + 4, right: window.innerWidth - rect.right });
                    }}><MoreHorizontal size={16} /></button>
                    {partyMenuOpen?.id === partyId && createPortal(
                      <div className="customer-row-menu" role="menu" aria-label={`Options for ${partyName}`} data-party-menu style={{ top: partyMenuOpen.top, right: partyMenuOpen.right }}>
                        <button type="button" role="menuitem" onClick={() => { setPartyToEdit({ id: partyId, kind: partyKind }); setPartyMenuOpen(null); }}><Pencil size={14} />Edit</button>
                        <button type="button" role="menuitem" className="danger" onClick={() => { setPartyToDelete({ id: partyId, name: partyName, kind: partyKind }); setPartyMenuOpen(null); }}><Trash2 size={14} />Delete</button>
                      </div>,
                      document.body,
                    )}
                  </> : null}
                </div></td>}
              </tr>;
            })}
            {records.length === 0 && searchTerm && <tr><td colSpan={columns.length + Number(showActionsColumn)}>No records match “{search}”.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="table-footer"><span>Showing {records.length} records</span><span>Updated just now</span></div>
    </article>
    {selected && <RecordDetailsDrawer
      key={`${activeNav}-${reconciliationView}-${Object.values(selected).join("-")}`}
      activeNav={activeNav}
      record={selected}
      nextStep={nextSteps[activeNav]}
      invoiceCompanyDetails={selectedInvoiceCompany}
      invoiceCustomerDetails={selectedInvoiceCustomer}
      invoiceItems={selectedInvoice?.items}
      invoiceDocument={selectedInvoice}
      invoiceRejectionReason={selectedInvoiceApproval?.status === "Rejected" ? selectedInvoiceApproval.rejectionReason : undefined}
      onClose={() => setSelected(null)}
      onRecordPayment={activeNav === "Receivables" || activeNav === "Payables"
        ? (amount) => onRecordPayment(activeNav, String(selected.invoice), amount)
        : activeNav === "Payroll" && data.payroll.some((item) => item.employee === selected.employee && item.journalEntryId && item.status !== "Paid")
          ? (amount) => onRecordPayment("Payroll", String(selected.employee), amount)
          : undefined}
    />}
    {activeNav === "Ledger" && ledgerChoiceOpen && <LedgerRecordTypeModal
      onClose={() => setLedgerChoiceOpen(false)}
      onChoose={(type) => { setLedgerChoiceOpen(false); setLedgerCreatePage(type); }}
    />}
    {bankImportOpen && <BankStatementImportPanel onClose={() => setBankImportOpen(false)} onImport={onImportBankStatement} onSuccess={(message) => { setLedgerNotice(message); setBankImportOpen(false); }} />}
    {(createRecordOpen || editApproval?.type === "customer-invoice") && (activeNav === "Receivables" || activeNav === "Payables" || activeNav === "Invoice" || activeNav === "Payroll" || activeNav === "Reports") && <ModuleCreateModal
      nav={activeNav}
      initialApproval={editApproval?.type === "customer-invoice" ? editApproval : undefined}
      onClose={() => { setCreateRecordOpen(false); setEditApproval(null); }}
      onSuccess={(message) => { setLedgerNotice(message); setCreateRecordOpen(false); setEditApproval(null); }}
      onResubmitApproval={onResubmitApproval}
      inventoryItems={data.inventoryItems}
      inventoryLocations={data.inventoryLocations}
      existingInvoiceReferences={[
        ...allData.invoices.map(({ invoice }) => invoice),
        ...allData.receivables.map(({ invoice }) => invoice),
        ...allData.approvalRequests.flatMap((request) => request.type === "customer-invoice" ? [request.payload.invoice] : []),
      ]}
      organization={organization}
      customers={customers}
      suppliers={suppliers}
      onAddSupplier={onAddSupplier}
      onAddReceivable={onAddReceivable}
      onAddPayable={onAddPayable}
      onAddInvoice={onAddInvoice}
      onAddPayrollRecord={onAddPayrollRecord}
      onAddReport={onAddReport}
    />}
    {customerCreateOpen && <CustomerProfileModal
      onClose={() => setCustomerCreateOpen(false)}
      onCreate={onAddCustomerProfile}
      onSuccess={(name) => { setLedgerNotice(`Customer profile for ${name} saved.`); setCustomerCreateOpen(false); }}
    />}
    {partyToEdit?.kind === "customer" && customers.find(({ id }) => id === partyToEdit.id) && <CustomerProfileEditModal
      customer={customers.find(({ id }) => id === partyToEdit.id)!}
      onClose={() => setPartyToEdit(null)}
      onUpdate={onUpdateCustomerProfile}
      onSuccess={(name) => { setLedgerNotice(`Customer profile for ${name} updated.`); setPartyToEdit(null); }}
    />}
    {partyToEdit?.kind === "supplier" && suppliers.find(({ id }) => id === partyToEdit.id) && <SupplierProfileEditModal
      supplier={suppliers.find(({ id }) => id === partyToEdit.id)!}
      onClose={() => setPartyToEdit(null)}
      onUpdate={onUpdateSupplierProfile}
      onSuccess={(name) => { setLedgerNotice(`Supplier profile for ${name} updated.`); setPartyToEdit(null); }}
    />}
    {partyToDelete && <PartyDeleteDialog
      kind={partyToDelete.kind}
      name={partyToDelete.name}
      onClose={() => setPartyToDelete(null)}
      onDelete={() => {
        const error = partyToDelete.kind === "customer"
          ? onDeleteCustomerProfile(partyToDelete.id)
          : onDeleteSupplierProfile(partyToDelete.id);
        if (error) {
          setLedgerNotice(error);
          return;
        }
        setLedgerNotice(`${partyToDelete.kind === "customer" ? "Customer" : "Supplier"} profile for ${partyToDelete.name} deleted. Linked financial records were retained.`);
        setPartyToDelete(null);
      }}
    />}
    {supplierCreateOpen && <SupplierProfileModal
      onClose={() => setSupplierCreateOpen(false)}
      onCreate={onAddSupplier}
      onSuccess={(name) => { setLedgerNotice(`Supplier profile for ${name} saved.`); setSupplierCreateOpen(false); }}
    />}
  </section>;
}

function BankStatementImportPanel({ onClose, onImport, onSuccess }: {
  onClose: () => void;
  onImport: (csv: string, mapping: BankCsvMapping, bank: string) => string | null;
  onSuccess: (message: string) => void;
}) {
  const [csv, setCsv] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [bank, setBank] = useState("");
  const [message, setMessage] = useState("");
  const [mapping, setMapping] = useState<BankCsvMapping>({ date: "", description: "", reference: "", amount: "", debit: "", credit: "" });
  const [previewError, setPreviewError] = useState("");
  const [previewCount, setPreviewCount] = useState(0);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const content = await file.text();
      const columns = (content.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "").split(",").map((header) => header.trim().replace(/^"|"$/g, ""));
      const choose = (pattern: RegExp) => columns.find((header) => pattern.test(header)) ?? "";
      const amountColumn = columns.find((header) => /amount|value/i.test(header) && !/debit|credit/i.test(header)) ?? "";
      setCsv(content);
      setHeaders(columns);
      setMapping({
        date: choose(/date/i),
        description: choose(/description|details|memo|narration/i),
        reference: choose(/reference|transaction|\bref\b/i),
        amount: amountColumn,
        debit: amountColumn ? "" : choose(/^debit(?:\b|[\s(])/i),
        credit: amountColumn ? "" : choose(/^credit(?:\b|[\s(])/i),
        bank: choose(/^bank$/i),
      });
      setMessage("");
      setPreviewError("");
      setPreviewCount(0);
    } catch {
      setPreviewError("The selected CSV file could not be read.");
    }
  };
  const validate = () => {
    try {
      const rows = parseBankStatementCsv(csv, mapping, bank.trim());
      setPreviewError("");
      setPreviewCount(rows.length);
      return rows;
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "The statement could not be parsed.");
      setPreviewCount(0);
      return [];
    }
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const rows = validate();
    if (!rows.length) return;
    const error = onImport(csv, mapping, bank);
    if (error) {
      setMessage(error);
      return;
    }
    onSuccess(`${rows.length} statement ${rows.length === 1 ? "transaction" : "transactions"} imported for review.`);
  };

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return <div className="module-create-backdrop" onClick={onClose}>
    <section className="module-create-modal bank-import-modal" role="dialog" aria-modal="true" aria-labelledby="bank-statement-upload-title" onClick={(event) => event.stopPropagation()}>
      <header className="module-create-header"><div><h2 id="bank-statement-upload-title">Upload bank statement</h2><p>Select a CSV file, map its columns, and preview transactions before importing.</p></div><button type="button" className="more-button" aria-label="Close upload dialog" autoFocus onClick={onClose}><X size={16} /></button></header>
    <form className="inventory-form bank-import-form" onSubmit={submit}>
      <label htmlFor="bank-statement-file">CSV file</label><input id="bank-statement-file" type="file" accept=".csv,text/csv" onChange={(event) => void readFile(event.target.files?.[0])} />
      {headers.length > 0 && <>
        <label htmlFor="bank-statement-name">Bank name</label><input id="bank-statement-name" value={bank} maxLength={80} onChange={(event) => setBank(event.target.value)} placeholder="Optional bank name" />
        <div className="inventory-form-row">
          {(["date", "description", "reference", "amount", "debit", "credit"] as const).map((field) => <div key={field}>
            <label htmlFor={`bank-column-${field}`}>{field === "date" ? "Date column" : field === "description" ? "Description column" : field === "reference" ? "Reference column" : field === "amount" ? "Signed amount column" : `${field[0].toUpperCase()}${field.slice(1)} column`}</label>
            <select id={`bank-column-${field}`} required={field === "date" || field === "description" || field === "reference"} value={mapping[field] ?? ""} onChange={(event) => setMapping((current) => ({ ...current, [field]: event.target.value }))}>
              <option value="" disabled={field === "date" || field === "description" || field === "reference"}>{field === "date" || field === "description" || field === "reference" ? "Select column" : "Not used"}</option>{headers.map((header) => <option key={`${field}-${header}`} value={header}>{header}</option>)}
            </select>
          </div>)}
        </div>
        <button type="button" className="outline-button" onClick={validate}>Preview CSV</button>
        {previewCount > 0 && <p className="inventory-form-hint">Preview contains {previewCount} valid transactions.</p>}
      </>}
      {previewError && <p className="inventory-error" role="alert">{previewError}</p>}
      {message && <p className={message.includes("imported") ? "inventory-confirmation" : "inventory-error"} role="status">{message}</p>}
      <footer><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={!csv || !headers.length}><Upload size={15} /> Import statement</button></footer>
    </form>
    </section>
  </div>;
}

function CustomerProfileModal({ onClose, onCreate, onSuccess }: {
  onClose: () => void;
  onCreate: (draft: CustomerProfileDraft) => string | null;
  onSuccess: (name: string) => void;
}) {
  const [profile, setProfile] = useState<CustomerProfileDraft>({ name: "", email: "", phone: "", billingAddress: "" });
  const [error, setError] = useState("");
  const update = (field: keyof CustomerProfileDraft, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
    setError("");
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const failure = onCreate(profile);
    if (failure) {
      setError(failure);
      return;
    }
    onSuccess(profile.name.trim());
  };
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return <div className="module-create-backdrop" onClick={onClose}>
    <section className="module-create-modal" role="dialog" aria-modal="true" aria-labelledby="customer-profile-title" onClick={(event) => event.stopPropagation()}>
      <header className="module-create-header"><div><h2 id="customer-profile-title">New customer profile</h2><p>Save a customer profile to use on future invoices.</p></div><button type="button" className="more-button" aria-label="Close dialog" autoFocus onClick={onClose}><X size={16} /></button></header>
      <form className="inventory-form module-create-form" onSubmit={submit}>
        <label htmlFor="customer-profile-name">Customer or business name</label><input id="customer-profile-name" value={profile.name} maxLength={120} required onChange={(event) => update("name", event.target.value)} autoFocus />
        <label htmlFor="customer-profile-email">Email <small>Optional</small></label><input id="customer-profile-email" type="email" value={profile.email} maxLength={160} onChange={(event) => update("email", event.target.value)} />
        <label htmlFor="customer-profile-phone">Phone <small>Optional</small></label><input id="customer-profile-phone" type="tel" value={profile.phone} maxLength={40} onChange={(event) => update("phone", event.target.value)} />
        <label htmlFor="customer-profile-address">Billing address <small>Optional</small></label><textarea id="customer-profile-address" value={profile.billingAddress} maxLength={300} rows={3} onChange={(event) => update("billingAddress", event.target.value)} />
        {error && <p className="inventory-error" role="alert">{error}</p>}
        <footer><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Plus size={15} /> Save customer</button></footer>
      </form>
    </section>
  </div>;
}

function CustomerProfileEditModal({ customer, onClose, onUpdate, onSuccess }: {
  customer: NonNullable<DashboardData["customers"]>[number];
  onClose: () => void;
  onUpdate: (customerId: string, draft: CustomerProfileDraft) => string | null;
  onSuccess: (name: string) => void;
}) {
  const [draft, setDraft] = useState<CustomerProfileDraft>({
    name: customer.name,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    billingAddress: customer.billingAddress ?? "",
  });
  const [error, setError] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const failure = onUpdate(customer.id, draft);
    if (failure) {
      setError(failure);
      return;
    }
    onSuccess(draft.name.trim());
  };
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return <div className="module-create-backdrop" onClick={onClose}>
    <section className="module-create-modal" role="dialog" aria-modal="true" aria-labelledby="customer-edit-title" onClick={(event) => event.stopPropagation()}>
      <header className="module-create-header"><div><h2 id="customer-edit-title">Edit customer</h2><p>Update this customer profile.</p></div><button type="button" className="more-button" aria-label="Close edit customer dialog" onClick={onClose}><X size={16} /></button></header>
      <form className="inventory-form module-create-form" onSubmit={submit}>
        <label htmlFor="edit-customer-name">Customer or business name</label><input id="edit-customer-name" value={draft.name} maxLength={120} required onChange={(event) => { setDraft((current) => ({ ...current, name: event.target.value })); setError(""); }} autoFocus />
        <label htmlFor="edit-customer-email">Email <small>Optional</small></label><input id="edit-customer-email" type="email" value={draft.email} maxLength={160} onChange={(event) => { setDraft((current) => ({ ...current, email: event.target.value })); setError(""); }} />
        <label htmlFor="edit-customer-phone">Phone <small>Optional</small></label><input id="edit-customer-phone" type="tel" value={draft.phone} maxLength={40} onChange={(event) => { setDraft((current) => ({ ...current, phone: event.target.value })); setError(""); }} />
        <label htmlFor="edit-customer-address">Billing address <small>Optional</small></label><textarea id="edit-customer-address" value={draft.billingAddress} maxLength={300} rows={3} onChange={(event) => { setDraft((current) => ({ ...current, billingAddress: event.target.value })); setError(""); }} />
        {error && <p className="inventory-error" role="alert">{error}</p>}
        <footer><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Check size={15} /> Save changes</button></footer>
      </form>
    </section>
  </div>;
}

function SupplierProfileEditModal({ supplier, onClose, onUpdate, onSuccess }: {
  supplier: SupplierProfile;
  onClose: () => void;
  onUpdate: (supplierId: string, draft: SupplierProfile) => string | null;
  onSuccess: (name: string) => void;
}) {
  const [draft, setDraft] = useState<SupplierProfile>({
    name: supplier.name,
    address: supplier.address ?? "",
    email: supplier.email ?? "",
    phone: supplier.phone ?? "",
    contact: supplier.contact ?? "",
  });
  const [error, setError] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supplier.id) {
      setError("This supplier profile cannot be edited because it has no saved ID.");
      return;
    }
    const failure = onUpdate(supplier.id, draft);
    if (failure) {
      setError(failure);
      return;
    }
    onSuccess(draft.name.trim());
  };
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return <div className="module-create-backdrop" onClick={onClose}>
    <section className="module-create-modal" role="dialog" aria-modal="true" aria-labelledby="supplier-edit-title" onClick={(event) => event.stopPropagation()}>
      <header className="module-create-header"><div><h2 id="supplier-edit-title">Edit supplier</h2><p>Update this supplier profile.</p></div><button type="button" className="more-button" aria-label="Close edit supplier dialog" onClick={onClose}><X size={16} /></button></header>
      <form className="inventory-form module-create-form" onSubmit={submit}>
        <label htmlFor="edit-supplier-name">Supplier or business name</label><input id="edit-supplier-name" value={draft.name} maxLength={120} required onChange={(event) => { setDraft((current) => ({ ...current, name: event.target.value })); setError(""); }} autoFocus />
        <label htmlFor="edit-supplier-email">Email <small>Optional</small></label><input id="edit-supplier-email" type="email" value={draft.email ?? ""} maxLength={160} onChange={(event) => { setDraft((current) => ({ ...current, email: event.target.value })); setError(""); }} />
        <label htmlFor="edit-supplier-phone">Phone <small>Optional</small></label><input id="edit-supplier-phone" type="tel" value={draft.phone ?? ""} maxLength={40} onChange={(event) => { setDraft((current) => ({ ...current, phone: event.target.value })); setError(""); }} />
        <label htmlFor="edit-supplier-address">Address <small>Optional</small></label><textarea id="edit-supplier-address" value={draft.address ?? ""} maxLength={300} rows={3} onChange={(event) => { setDraft((current) => ({ ...current, address: event.target.value })); setError(""); }} />
        {error && <p className="inventory-error" role="alert">{error}</p>}
        <footer><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Check size={15} /> Save changes</button></footer>
      </form>
    </section>
  </div>;
}

function PartyDeleteDialog({ kind, name, onClose, onDelete }: { kind: "customer" | "supplier"; name: string; onClose: () => void; onDelete: () => void }) {
  const label = kind === "customer" ? "Customer" : "Supplier";
  const retainedRecords = kind === "customer" ? "invoices and receivables" : "bills, purchase orders, and procurements";
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return <div className="module-create-backdrop" onClick={onClose}>
    <section className="module-create-modal customer-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="party-delete-title" onClick={(event) => event.stopPropagation()}>
      <header className="module-create-header"><div><h2 id="party-delete-title">Delete {label.toLowerCase()}?</h2><p>Delete {name} from the directory? Linked {retainedRecords} will be retained.</p></div><button type="button" className="more-button" aria-label={`Close delete ${label.toLowerCase()} dialog`} onClick={onClose}><X size={16} /></button></header>
      <footer><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="button" className="customer-delete-confirm" onClick={onDelete}><Trash2 size={15} />Delete {label.toLowerCase()}</button></footer>
    </section>
  </div>;
}

function SupplierProfileModal({ onClose, onCreate, onSuccess }: {
  onClose: () => void;
  onCreate: (draft: SupplierProfile) => string | null;
  onSuccess: (name: string) => void;
}) {
  const [profile, setProfile] = useState<SupplierProfile>({ name: "", address: "", contact: "" });
  const [error, setError] = useState("");
  const update = (field: keyof SupplierProfile, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
    setError("");
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const failure = onCreate(profile);
    if (failure) {
      setError(failure);
      return;
    }
    onSuccess(profile.name.trim());
  };
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return <div className="module-create-backdrop" onClick={onClose}>
    <section className="module-create-modal" role="dialog" aria-modal="true" aria-labelledby="supplier-profile-title" onClick={(event) => event.stopPropagation()}>
      <header className="module-create-header"><div><h2 id="supplier-profile-title">New supplier profile</h2><p>Save supplier details to reuse on future bills and purchase orders.</p></div><button type="button" className="more-button" aria-label="Close dialog" autoFocus onClick={onClose}><X size={16} /></button></header>
      <form className="inventory-form module-create-form" onSubmit={submit}>
        <label htmlFor="supplier-profile-name">Supplier or business name</label><input id="supplier-profile-name" value={profile.name} maxLength={120} required onChange={(event) => update("name", event.target.value)} autoFocus />
        <label htmlFor="supplier-profile-email">Email <small>Optional</small></label><input id="supplier-profile-email" type="email" value={profile.email ?? ""} maxLength={160} onChange={(event) => update("email", event.target.value)} />
        <label htmlFor="supplier-profile-phone">Phone <small>Optional</small></label><input id="supplier-profile-phone" type="tel" value={profile.phone ?? ""} maxLength={40} onChange={(event) => update("phone", event.target.value)} />
        <label htmlFor="supplier-profile-address">Address <small>Optional</small></label><textarea id="supplier-profile-address" value={profile.address ?? ""} maxLength={300} rows={3} onChange={(event) => update("address", event.target.value)} />
        {error && <p className="inventory-error" role="alert">{error}</p>}
        <footer><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Plus size={15} /> Save supplier</button></footer>
      </form>
    </section>
  </div>;
}

function ModuleCreateModal({ nav, initialApproval, onClose, onSuccess, onResubmitApproval, onAddReceivable, onAddPayable, onAddInvoice, onAddPayrollRecord, onAddReport, inventoryItems, inventoryLocations, existingInvoiceReferences, organization, customers, suppliers, onAddSupplier }: {
  nav: ModuleCreateNav;
  initialApproval?: Extract<ApprovalRequest, { type: "customer-invoice" }>;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onResubmitApproval: (requestId: string, submission: ApprovalSubmission) => string | null;
  onAddReceivable: (draft: ReceivableDraft) => string | null;
  onAddPayable: (draft: PayableDraft) => string | null;
  onAddInvoice: (draft: InvoiceDraft) => string | null;
  onAddPayrollRecord: (draft: PayrollDraft) => string | null;
  onAddReport: (draft: ReportDraft) => string | null;
  inventoryItems: DashboardData["inventoryItems"];
  inventoryLocations: DashboardData["inventoryLocations"];
  existingInvoiceReferences: string[];
  organization: OrganizationSettings;
  customers: NonNullable<DashboardData["customers"]>;
  suppliers: SupplierProfile[];
  onAddSupplier: (draft: SupplierProfile) => string | null;
}) {
  const today = toDateKey(new Date());
  const reportingPeriodStart = new Date();
  reportingPeriodStart.setDate(1);
  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + 30);
  const sellableInventoryItems = getSellableInventoryItems(inventoryItems);
  const firstSellableSku = sellableInventoryItems[0]?.sku ?? "";
  const invoiceApproval = nav === "Invoice" ? initialApproval : undefined;
  const getSavedUnitCost = (sku: string) => {
    const item = inventoryItems.find((entry) => entry.sku === sku);
    const unitCost = item?.unitCost ?? (item && item.stock > 0 ? item.value / item.stock : 0);
    return unitCost > 0 ? (Math.round((unitCost + Number.EPSILON) * 100) / 100).toFixed(2) : "";
  };
  const getSavedSellingPrice = (sku: string) => {
    const sellingPrice = inventoryItems.find((entry) => entry.sku === sku)?.sellingPrice ?? 0;
    return sellingPrice > 0 ? (Math.round((sellingPrice + Number.EPSILON) * 100) / 100).toFixed(2) : "";
  };
  const getSellableLocations = (sku: string) => inventoryItems.find(({ sku: itemSku }) => itemSku === sku)?.locationStock?.filter(({ quantity }) => quantity > 0) ?? [];
  const getDefaultSellableLocation = (sku: string) => getSellableLocations(sku)[0]?.location ?? "";
  const [values, setValues] = useState<Record<string, string>>({
    dateKey: invoiceApproval?.payload.invoiceDate ?? today,
    dueDate: invoiceApproval?.payload.dueDate ?? toDateKey(defaultDue),
    periodStart: toDateKey(reportingPeriodStart),
    periodEnd: today,
    report: "Income statement",
    billType: "expense",
    location: inventoryLocations[0]?.location ?? "",
    employeeDeductions: "0",
    employerLiabilities: "0",
    ...(invoiceApproval ? { customerId: invoiceApproval.payload.customerId, invoice: invoiceApproval.payload.invoice } : {}),
  });
  const [inventoryBillLines, setInventoryBillLines] = useState(() => {
    const sku = inventoryItems[0]?.sku ?? "";
    return [{ sku, quantity: "1", unitCost: getSavedUnitCost(sku) }];
  });
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLineFormDraft[]>(() => invoiceApproval?.payload.items.length
    ? invoiceApproval.payload.items.map((item) => ({
      kind: item.inventorySku ? "inventory" : "service",
      sku: item.inventorySku ?? firstSellableSku,
      location: item.inventoryLocation ?? "",
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
    }))
    : [{ kind: "service", sku: firstSellableSku, location: "", description: "", quantity: "1", unitPrice: "" }]);
  const [error, setError] = useState("");
  const inventoryBillTotal = inventoryBillLines.reduce((total, line) => total + (Number(line.quantity) || 0) * (Number(line.unitCost) || 0), 0);
  const invoiceTotal = Math.round(invoiceLines.reduce((total, line) => total + Math.round((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0) * 100) / 100, 0) * 100) / 100;
  const getInvoiceItems = (): InvoiceLine[] => invoiceLines.map((line) => ({
    description: line.kind === "inventory" ? inventoryItems.find(({ sku }) => sku === line.sku)?.item ?? "" : line.description,
    quantity: Number(line.quantity),
    unitPrice: Number(line.unitPrice),
    ...(line.kind === "inventory" ? { inventorySku: line.sku } : {}),
    ...(line.kind === "inventory" ? { inventoryLocation: line.location } : {}),
  }));
  const title: Record<ModuleCreateNav, string> = {
    Receivables: "Create customer invoice",
    Payables: "Add supplier bill",
    Invoice: invoiceApproval ? "Edit rejected invoice" : "Create invoice",
    Payroll: "Add payroll entry",
    Reports: "Create report",
  };
  const descriptions: Record<ModuleCreateNav, string> = {
    Receivables: "Submit a customer invoice for admin approval before it posts to receivables.",
    Payables: "Record a supplier bill for review before scheduling payment.",
    Invoice: invoiceApproval ? "Update the invoice details, then resubmit it for admin approval." : "Submit a customer invoice for admin approval before it posts to the ledger and receivables.",
    Payroll: "Add a pending employee pay record for the current payroll period.",
    Reports: "Create a draft report entry that can be opened and reviewed.",
  };
  const submitLabel: Record<ModuleCreateNav, string> = {
    Receivables: "Submit",
    Payables: "Add bill",
    Invoice: invoiceApproval ? "Resubmit" : "Submit",
    Payroll: "Add payroll entry",
    Reports: "Create draft",
  };
  const update = (field: string, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError("");
  };
  const updateInventoryBillLine = (index: number, field: "sku" | "quantity" | "unitCost", value: string) => {
    setInventoryBillLines((current) => current.map((line, lineIndex) => lineIndex === index
      ? field === "sku" ? { ...line, sku: value, unitCost: getSavedUnitCost(value) } : { ...line, [field]: value }
      : line));
    setError("");
  };
  const updateInvoiceLine = (index: number, field: keyof InvoiceLineFormDraft, value: string) => {
    setInvoiceLines((current) => current.map((line, lineIndex) => lineIndex === index
      ? field === "kind"
        ? value === "inventory"
          ? (() => {
            const sku = line.sku && sellableInventoryItems.some(({ sku }) => sku === line.sku) ? line.sku : firstSellableSku;
            return { ...line, kind: "inventory", sku, location: getDefaultSellableLocation(sku), unitPrice: getSavedSellingPrice(sku) };
          })()
          : { ...line, kind: "service", quantity: "1" }
        : field === "sku"
          ? { ...line, sku: value, location: getDefaultSellableLocation(value), unitPrice: getSavedSellingPrice(value) }
        : { ...line, [field]: value }
      : line));
    setError("");
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let failure: string | null = null;
    if (nav === "Receivables") {
      failure = onAddReceivable({
        customer: values.customer ?? "",
        invoice: values.invoice ?? "",
        amount: invoiceTotal,
        items: getInvoiceItems(),
        dueDate: values.dueDate ?? "",
      });
      if (!failure) onSuccess(`Customer invoice ${values.invoice} submitted for admin approval.`);
    } else if (nav === "Payables") {
      failure = onAddPayable({
        vendor: values.vendor ?? "",
        invoice: values.invoice ?? "",
        amount: values.billType === "inventory" ? inventoryBillTotal : Number(values.amount),
        dueDate: values.dueDate ?? "",
        billType: values.billType === "inventory" ? "inventory" : "expense",
        location: values.location,
        items: values.billType === "inventory" ? inventoryBillLines.map((line) => ({ sku: line.sku, quantity: Number(line.quantity), unitCost: Number(line.unitCost) })) : undefined,
      });
      if (!failure) onSuccess(values.billType === "inventory" ? `Stock bill ${values.invoice} posted to Inventory and Accounts Payable.` : `Supplier bill ${values.invoice} posted to Expense and Accounts Payable.`);
    } else if (nav === "Invoice") {
      const draft: InvoiceDraft = {
        customerId: values.customerId ?? "",
        invoice: values.invoice ?? "",
        amount: invoiceTotal,
        items: getInvoiceItems(),
        dateKey: values.dateKey ?? "",
        dueDate: values.dueDate ?? "",
      };
      failure = invoiceApproval
        ? onResubmitApproval(invoiceApproval.id, { type: "customer-invoice", payload: { customerId: draft.customerId, invoice: draft.invoice, amount: draft.amount, items: draft.items, invoiceDate: draft.dateKey, dueDate: draft.dueDate, companyDetails: invoiceApproval.payload.companyDetails, customerDetails: invoiceApproval.payload.customerDetails } })
        : onAddInvoice(draft);
      if (!failure) onSuccess(`Invoice ${values.invoice} ${invoiceApproval ? "resubmitted" : "submitted"} for admin approval.`);
    } else if (nav === "Payroll") {
      failure = onAddPayrollRecord({
        employee: values.employee ?? "",
        role: values.role ?? "",
        grossPay: Number(values.grossPay),
        employeeDeductions: Number(values.employeeDeductions),
        employerLiabilities: Number(values.employerLiabilities),
      });
      if (!failure) onSuccess(`Payroll accrual for ${values.employee} posted with net wages payable.`);
    } else {
      failure = onAddReport({ report: values.report ?? "", periodStart: values.periodStart ?? "", periodEnd: values.periodEnd ?? "" });
      if (!failure) onSuccess(`${values.report} report created as a draft.`);
    }
    if (failure) setError(failure);
  };
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  const selectedInvoiceCustomer = nav === "Invoice"
    ? customers.find(({ id }) => id === values.customerId)
    : nav === "Receivables" ? customers.find(({ name }) => name === values.customer) : undefined;

  return <div className="module-create-backdrop" onClick={onClose}>
    <section className="module-create-modal" role="dialog" aria-modal="true" aria-labelledby="module-create-title" onClick={(event) => event.stopPropagation()}>
      <header className="module-create-header"><div><h2 id="module-create-title">{title[nav]}</h2><p>{descriptions[nav]}</p></div><button type="button" className="more-button" aria-label="Close dialog" autoFocus onClick={onClose}><X size={16} /></button></header>
      <form className="inventory-form module-create-form" onSubmit={submit}>
        {invoiceApproval && <ApprovalRejectionNotice reason={invoiceApproval.rejectionReason} />}
        {(nav === "Receivables" || nav === "Payables" || nav === "Invoice") && <>
          <label htmlFor="module-create-party">{nav === "Payables" ? "Supplier / vendor" : "Customer profile"}</label>
          {nav === "Receivables" || nav === "Invoice"
            ? <select id="module-create-party" value={nav === "Invoice" ? values.customerId ?? "" : values.customer ?? ""} required onChange={(event) => update(nav === "Invoice" ? "customerId" : "customer", event.target.value)}><option value="" disabled>Select a saved customer</option>{customers.map((customer) => <option key={customer.id} value={nav === "Invoice" ? customer.id : customer.name}>{customer.name}</option>)}</select>
            : <SupplierPicker id="module-create-party" hideLabel suppliers={suppliers} onAddSupplier={onAddSupplier} value={values.vendor ?? ""} onSelect={(profile) => update("vendor", profile.name)} />}
          {(nav === "Receivables" || nav === "Invoice") && <InvoicePartiesPreview company={snapshotOrganizationForInvoice(organization)} customer={selectedInvoiceCustomer ? snapshotCustomerForInvoice(selectedInvoiceCustomer) : undefined} />}
          {nav === "Payables" ? <>
            <label htmlFor="module-create-reference">Bill reference</label>
            <input id="module-create-reference" value={values.invoice ?? ""} maxLength={50} required onChange={(event) => update("invoice", event.target.value)} placeholder="e.g. BILL-1042" />
          </> : <div className="invoice-reference-control">
            <label htmlFor="module-create-reference">Invoice number</label>
            <div><input id="module-create-reference" value={values.invoice ?? ""} maxLength={50} required onChange={(event) => update("invoice", event.target.value)} placeholder="e.g. INV-2026-0001" /><button type="button" className="table-action-button" onClick={() => update("invoice", generateInvoiceNumber(existingInvoiceReferences))}><FileCheck2 size={14} /> Generate</button></div>
          </div>}
          {nav === "Payables" && <>
            <label htmlFor="module-bill-type">Bill category</label><select id="module-bill-type" value={values.billType} onChange={(event) => update("billType", event.target.value)}><option value="expense">Expense or service</option><option value="inventory">Goods received into stock</option></select>
            {values.billType === "inventory" && <>
              <div className="purchase-order-lines-editor inventory-bill-lines-editor">
                <div className="purchase-order-lines-heading"><strong>Inventory items received</strong></div>
                {inventoryBillLines.map((line, index) => <div className="purchase-order-line" key={`inventory-bill-line-${index}`}>
                  <div className="purchase-order-line-heading"><strong>Item {index + 1}</strong>{inventoryBillLines.length > 1 && <button type="button" className="purchase-order-line-remove" aria-label={`Remove inventory item ${index + 1}`} onClick={() => setInventoryBillLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}><X size={14} /></button>}</div>
                  <label htmlFor={`module-bill-sku-${index}`}>Inventory item</label><select id={`module-bill-sku-${index}`} value={line.sku} required onChange={(event) => updateInventoryBillLine(index, "sku", event.target.value)}><option value="" disabled>Select item</option>{inventoryItems.map((item) => <option key={item.sku} value={item.sku}>{item.item} · {item.sku}</option>)}</select>
                  <div className="inventory-form-row"><div><label htmlFor={`module-bill-quantity-${index}`}>Quantity received</label><input id={`module-bill-quantity-${index}`} type="number" min="1" step="1" required value={line.quantity} onChange={(event) => updateInventoryBillLine(index, "quantity", event.target.value)} /></div><div><label htmlFor={`module-bill-unit-cost-${index}`}>Unit cost (₦)</label><input id={`module-bill-unit-cost-${index}`} type="number" min="0.01" step="0.01" required value={line.unitCost} readOnly placeholder="0.00" /></div></div>
                </div>)}
                <button type="button" className="table-action-button purchase-order-lines-add-button" onClick={() => setInventoryBillLines((current) => {
                  const sku = inventoryItems[0]?.sku ?? "";
                  return [...current, { sku, quantity: "1", unitCost: getSavedUnitCost(sku) }];
                })}><Plus size={13} /> Add item</button>
                <p className="inventory-form-hint">Unit cost is taken from Inventory and applied to the received stock.</p>
              </div>
              <label htmlFor="module-bill-location">Stock location</label><select id="module-bill-location" value={values.location} required onChange={(event) => update("location", event.target.value)}><option value="" disabled>Select location</option>{inventoryLocations.map((entry) => <option key={entry.location} value={entry.location}>{entry.location} · {entry.stock}/{entry.capacity} units</option>)}</select>
            </>}
          </>}
          {(nav === "Invoice" || nav === "Receivables") && <section className="invoice-line-editor" aria-label="Invoice items">
            <div className="invoice-line-editor-heading"><strong>Items and services</strong></div>
            {invoiceLines.map((line, index) => <div className="invoice-line-row" key={`invoice-line-${index}`}>
              <div className="invoice-line-row-heading"><strong>Line {index + 1}</strong>{invoiceLines.length > 1 && <button type="button" className="purchase-order-line-remove" aria-label={`Remove invoice line ${index + 1}`} onClick={() => setInvoiceLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}><X size={14} /></button>}</div>
              <label htmlFor={`invoice-line-kind-${index}`}>Type</label><select id={`invoice-line-kind-${index}`} value={line.kind} onChange={(event) => updateInvoiceLine(index, "kind", event.target.value)}><option value="inventory" disabled={!sellableInventoryItems.length}>Inventory item</option><option value="service">Service</option></select>
              {line.kind === "inventory"
                ? <><label htmlFor={`invoice-line-sku-${index}`}>Inventory item</label><select id={`invoice-line-sku-${index}`} value={line.sku} required disabled={!sellableInventoryItems.length} onChange={(event) => updateInvoiceLine(index, "sku", event.target.value)}><option value="" disabled>{sellableInventoryItems.length ? "Select item" : "No items in stock"}</option>{sellableInventoryItems.map((item) => <option key={item.sku} value={item.sku}>{item.item} · {item.sku} · {item.stock} in stock</option>)}</select><label htmlFor={`invoice-line-location-${index}`}>Deduct from location</label><select id={`invoice-line-location-${index}`} value={line.location} required onChange={(event) => updateInvoiceLine(index, "location", event.target.value)}><option value="" disabled>Select a stocked location</option>{getSellableLocations(line.sku).map((entry) => <option key={entry.location} value={entry.location}>{entry.location} · {entry.quantity} available</option>)}</select></>
                : <><label htmlFor={`invoice-line-description-${index}`}>Service description</label><input id={`invoice-line-description-${index}`} value={line.description} maxLength={160} required onChange={(event) => updateInvoiceLine(index, "description", event.target.value)} placeholder="e.g. Monthly accounting support" /></>}
              {line.kind === "inventory"
                ? <><div className="inventory-form-row"><div><label htmlFor={`invoice-line-quantity-${index}`}>Quantity</label><input id={`invoice-line-quantity-${index}`} type="number" min="1" step="1" required value={line.quantity} onChange={(event) => updateInvoiceLine(index, "quantity", event.target.value)} /></div><div><label htmlFor={`invoice-line-rate-${index}`}>Unit price (₦)</label><input id={`invoice-line-rate-${index}`} type="number" min="0.01" step="0.01" required value={line.unitPrice} onChange={(event) => updateInvoiceLine(index, "unitPrice", event.target.value)} placeholder="0.00" /></div></div><p className="invoice-line-subtotal">Line total <strong>{formatNaira(Math.round((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0) * 100) / 100)}</strong></p></>
                : <><label htmlFor={`invoice-line-rate-${index}`}>Service price (₦)</label><input id={`invoice-line-rate-${index}`} type="number" min="0.01" step="0.01" required value={line.unitPrice} onChange={(event) => updateInvoiceLine(index, "unitPrice", event.target.value)} placeholder="0.00" /></>}
            </div>)}
            <button type="button" className="table-action-button invoice-line-add-button" onClick={() => setInvoiceLines((current) => [...current, { kind: "service", sku: firstSellableSku, location: "", description: "", quantity: "1", unitPrice: "" }])}><Plus size={13} /> Add line</button>
            <p className="inventory-form-total">Invoice total <strong>{formatNaira(invoiceTotal)}</strong></p>
          </section>}
          {nav === "Payables" && values.billType === "inventory" && <p className="inventory-form-total">Bill total <strong>{formatNaira(inventoryBillTotal)}</strong></p>}
          {nav === "Payables" && values.billType !== "inventory" && <><label htmlFor="module-create-amount">Amount (₦)</label><input id="module-create-amount" type="number" min="0.01" step="0.01" value={values.amount ?? ""} required onChange={(event) => update("amount", event.target.value)} placeholder="0.00" /></>}
          {nav === "Invoice" && <><label htmlFor="module-create-date">Invoice date</label><input id="module-create-date" type="date" value={values.dateKey} max={today} required onChange={(event) => update("dateKey", event.target.value)} /></>}
          <label htmlFor="module-create-due-date">Due date</label><input id="module-create-due-date" type="date" value={values.dueDate} required onChange={(event) => update("dueDate", event.target.value)} />
        </>}
        {nav === "Payroll" && <>
          <label htmlFor="module-create-employee">Employee name</label><input id="module-create-employee" value={values.employee ?? ""} maxLength={120} required onChange={(event) => update("employee", event.target.value)} placeholder="Employee name" />
          <label htmlFor="module-create-role">Role / job title</label><input id="module-create-role" value={values.role ?? ""} maxLength={100} required onChange={(event) => update("role", event.target.value)} placeholder="Job title" />
          <label htmlFor="module-create-gross-pay">Gross pay (₦)</label><input id="module-create-gross-pay" type="number" min="0.01" step="0.01" value={values.grossPay ?? ""} required onChange={(event) => update("grossPay", event.target.value)} placeholder="0.00" />
          <label htmlFor="module-create-employee-deductions">Employee deductions / tax liabilities (₦)</label><input id="module-create-employee-deductions" type="number" min="0" step="0.01" value={values.employeeDeductions} required onChange={(event) => update("employeeDeductions", event.target.value)} placeholder="0.00" />
          <label htmlFor="module-create-employer-liabilities">Employer contributions / liabilities (₦)</label><input id="module-create-employer-liabilities" type="number" min="0" step="0.01" value={values.employerLiabilities} required onChange={(event) => update("employerLiabilities", event.target.value)} placeholder="0.00" />
          <p className="inventory-form-total">Net wages payable <strong>{formatNaira((Number(values.grossPay) || 0) - (Number(values.employeeDeductions) || 0))}</strong></p>
        </>}
        {nav === "Reports" && <>
          <label htmlFor="module-create-report-type">Report</label>
          <select id="module-create-report-type" value={values.report} onChange={(event) => update("report", event.target.value)}>
            {["Income statement", "Balance sheet", "Cash flow", "Accounts receivable", "Inventory movement", "Tax summary", "Budget variance", "Custom report"].map((report) => <option key={report}>{report}</option>)}
          </select>
          <label>Reporting period</label>
          <div className="inventory-form-row">
            <div><label htmlFor="module-create-period-start">Start date</label><input id="module-create-period-start" type="date" value={values.periodStart} max={values.periodEnd || today} required onChange={(event) => update("periodStart", event.target.value)} /></div>
            <div><label htmlFor="module-create-period-end">End date</label><input id="module-create-period-end" type="date" value={values.periodEnd} min={values.periodStart} max={today} required onChange={(event) => update("periodEnd", event.target.value)} /></div>
          </div>
        </>}
        {error && <p className="inventory-error" role="alert">{error}</p>}
        <footer><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Plus size={15} /> {submitLabel[nav]}</button></footer>
      </form>
    </section>
  </div>;
}

function InvoicePartiesPreview({ company, customer }: { company?: InvoiceCompanyDetails; customer?: InvoiceCustomerDetails }) {
  return <section className="invoice-parties-preview" aria-label="Invoice parties">
    <h3>Invoice parties</h3>
    <div className="invoice-party-grid">
      <article className="invoice-party-card">
        <h4>From</h4>
        {company ? <>
          {company.logoDataUrl && <img className="invoice-party-logo" src={company.logoDataUrl} alt={`${company.name} logo`} />}
          <strong>{company.name || "Company name not provided"}</strong>
          {company.address && <p>{company.address}</p>}
          {[company.contactEmail, company.contactPhone, company.website].filter(Boolean).map((detail) => <p key={detail}>{detail}</p>)}
          {company.registrationNumber && <p>Registration: {company.registrationNumber}</p>}
          {company.taxId && <p>Tax ID: {company.taxId}</p>}
          {company.bankAccounts.map((account, index) => <p key={`${account.bankName}-${account.accountNumber}-${index}`}>{account.bankName} · {account.accountName} · {account.accountNumber} · {account.currency}</p>)}
        </> : <p>Company details were not captured.</p>}
      </article>
      <article className="invoice-party-card">
        <h4>Bill to</h4>
        {customer ? <>
          <strong>{customer.name}</strong>
          {[customer.email, customer.phone, customer.address].filter(Boolean).map((detail) => <p key={detail}>{detail}</p>)}
        </> : <p>Select a customer to preview their saved details.</p>}
      </article>
    </div>
  </section>;
}

function InvoiceItemsPreview({ items }: { items: InvoiceLine[] }) {
  const total = items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPrice * 100) / 100, 0);
  return <section className="invoice-items-preview" aria-label="Invoice items">
    <h3>Invoice items</h3>
    <div className="invoice-items-table-wrap"><table><thead><tr><th>Description</th><th>Quantity</th><th>Price</th><th>Amount</th></tr></thead><tbody>
      {items.map((item, index) => <tr key={`${item.inventorySku ?? item.description}-${index}`}><td>{item.description}{item.inventorySku && <small>SKU {item.inventorySku}{item.inventoryLocation ? ` · ${item.inventoryLocation}` : ""}</small>}</td><td>{item.inventorySku ? item.quantity : "—"}</td><td><small>{item.inventorySku ? "Unit price" : "Service price"}</small>{formatNaira(item.unitPrice)}</td><td>{formatNaira(Math.round(item.quantity * item.unitPrice * 100) / 100)}</td></tr>)}
    </tbody></table></div>
    <p className="invoice-items-total"><span>Total</span><strong>{formatNaira(total)}</strong></p>
  </section>;
}

type ApprovalDisplayLine = {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
  sku?: string;
  location?: string;
};

function ApprovalDocumentPreview({ document }: { document: ApprovalDocument }) {
  const [preview, setPreview] = useState<{ url: string; error: string; loading: boolean }>({
    url: "",
    error: "",
    loading: true,
  });

  useEffect(() => {
    let active = true;
    let previewUrl = "";
    setPreview({ url: "", error: "", loading: true });
    void loadApprovalDocument(document.id).then((blob) => {
      if (!blob) throw new Error("The supporting document could not be found in browser storage.");
      if (!active) return;
      previewUrl = URL.createObjectURL(blob);
      setPreview({ url: previewUrl, error: "", loading: false });
    }).catch((error: unknown) => {
      if (active) setPreview({
        url: "",
        error: error instanceof Error ? error.message : "The supporting document could not be loaded.",
        loading: false,
      });
    });
    return () => {
      active = false;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [document.id]);

  return <section className="approval-document-preview" aria-label="Supporting document preview">
    <h3>Supporting document</h3>
    {preview.loading && <p role="status">Loading {document.name}…</p>}
    {preview.error && <p className="inventory-error" role="alert">{preview.error}</p>}
    {preview.url && (document.type === "image/jpeg"
      ? <img src={preview.url} alt={`Preview of ${document.name}`} />
      : <iframe src={preview.url} title={`Preview of ${document.name}`} />)}
  </section>;
}

function ApprovalSubmissionItems({ request }: { request: ApprovalRequest }) {
  const rows: ApprovalDisplayLine[] = request.type === "customer-invoice"
    ? request.payload.items.map((item) => ({
      description: item.description,
      quantity: item.inventorySku ? item.quantity : undefined,
      unitPrice: item.unitPrice,
      amount: item.quantity * item.unitPrice,
      sku: item.inventorySku,
      location: item.inventoryLocation,
    }))
    : request.type === "purchase-order"
      ? request.payload.lines?.map((line) => ({
        description: line.item,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        amount: line.quantity * line.unitPrice,
        sku: line.sku,
        location: request.payload.location,
      })) ?? [{
        description: request.payload.item ?? "Purchase order",
        quantity: request.payload.quantity,
        unitPrice: request.payload.quantity ? request.payload.amount / request.payload.quantity : undefined,
        amount: request.payload.amount,
      }]
      : [{
        description: request.payload.item,
        amount: request.payload.amount,
      }];
  if (rows.length === 0) return <p className="invoice-items-unavailable">No item details were captured for this request.</p>;
  const total = rows.reduce((sum, row) => sum + Math.round(row.amount * 100) / 100, 0);
  const title = request.type === "customer-invoice" ? "Invoice items" : "Requested items";
  return <section className="invoice-items-preview" aria-label={title}>
    <h3>{title}</h3>
    <div className="invoice-items-table-wrap"><table><thead><tr><th>Description</th><th>Quantity</th><th>Price</th><th>Amount</th></tr></thead><tbody>
      {rows.map((row, index) => <tr key={`${row.sku ?? row.description}-${index}`}>
        <td>{row.description}{row.sku && <small>SKU {row.sku}{row.location ? ` · ${row.location}` : ""}</small>}</td>
        <td>{row.quantity ?? "—"}</td>
        <td>{row.unitPrice === undefined ? "—" : <><small>{row.sku ? "Unit price" : "Price"}</small>{formatNaira(row.unitPrice)}</>}</td>
        <td>{formatNaira(Math.round(row.amount * 100) / 100)}</td>
      </tr>)}
    </tbody></table></div>
    <p className="invoice-items-total"><span>Total</span><strong>{formatNaira(total)}</strong></p>
  </section>;
}

function LedgerRecordTypeModal({ onClose, onChoose }: {
  onClose: () => void;
  onChoose: (type: "journal" | "account") => void;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return <div className="ledger-choice-backdrop" onClick={onClose}>
    <section className="ledger-choice-modal" role="dialog" aria-modal="true" aria-labelledby="ledger-choice-title" onClick={(event) => event.stopPropagation()}>
      <header className="ledger-choice-header"><div><h2 id="ledger-choice-title">What would you like to create?</h2><p>Choose a record type to continue.</p></div><button type="button" className="more-button" aria-label="Close dialog" autoFocus onClick={onClose}><X size={16} /></button></header>
      <div className="ledger-record-choices">
        <button type="button" className="ledger-record-choice" onClick={() => onChoose("journal")}><span><strong>Journal entry</strong><small>Record a balanced transaction across ledger accounts.</small></span><ChevronRight size={17} /></button>
        <button type="button" className="ledger-record-choice" onClick={() => onChoose("account")}><span><strong>Ledger account</strong><small>Add an account to the chart of accounts.</small></span><ChevronRight size={17} /></button>
      </div>
    </section>
  </div>;
}

function LedgerRecordPage({ page, accounts, existingReferences, onChooseAnother, onBack, onAddAccount, onCreateJournalEntry, onSuccess }: {
  page: "journal" | "account";
  accounts: LedgerAccount[];
  existingReferences: string[];
  onChooseAnother: () => void;
  onBack: () => void;
  onAddAccount: (account: NewLedgerAccount) => string | null;
  onCreateJournalEntry: (entry: LedgerJournalEntry) => string | null;
  onSuccess: (message: string) => void;
}) {
  const pageTitle = page === "journal" ? "Create journal entry" : "Add ledger account";
  return <section className="report-sheet-page ledger-record-page">
    <div className="report-sheet-toolbar"><button type="button" className="outline-button" onClick={onBack}><ChevronLeft size={16} /> Back </button></div>
    <article className="panel report-sheet-panel">
      <header className="report-sheet-header"><div><h2>{pageTitle}</h2><p>{page === "journal" ? "Enter a dated transaction with balanced debit and credit lines." : "Add a new account to the chart of accounts."}</p></div></header>
      {page === "journal"
        ? <JournalEntryForm accounts={accounts} existingReferences={existingReferences} onBack={onChooseAnother} onClose={onBack} onCreate={onCreateJournalEntry} onSuccess={onSuccess} />
        : <LedgerAccountForm accounts={accounts} onBack={onChooseAnother} onClose={onBack} onAdd={onAddAccount} onSuccess={onSuccess} />}
    </article>
  </section>;
}

function JournalEntryForm({ accounts, existingReferences, onBack, onClose, onCreate, onSuccess }: {
  accounts: LedgerAccount[];
  existingReferences: string[];
  onBack: () => void;
  onClose: () => void;
  onCreate: (entry: LedgerJournalEntry) => string | null;
  onSuccess: (message: string) => void;
}) {
  const [dateKey, setDateKey] = useState(toDateKey(new Date()));
  const [memo, setMemo] = useState("");
  const nextReferenceNumber = Math.max(0, ...existingReferences.map((reference) => Number(reference.match(/^JE-\d{4}-(\d+)$/)?.[1] ?? 0))) + 1;
  const [reference, setReference] = useState(`JE-${new Date().getFullYear()}-${String(nextReferenceNumber).padStart(4, "0")}`);
  const [lines, setLines] = useState(() => {
    const debitAccount = accounts[0]?.account ?? "";
    const creditAccount = accounts.find(({ type }) => type === "Income")?.account ?? accounts[1]?.account ?? debitAccount;
    return [
      { account: debitAccount, debit: "", credit: "" },
      { account: creditAccount, debit: "", credit: "" },
    ];
  });
  const [error, setError] = useState("");
  const totalDebits = lines.reduce((total, line) => total + (Number(line.debit) || 0), 0);
  const totalCredits = lines.reduce((total, line) => total + (Number(line.credit) || 0), 0);
  const debitsMinor = Math.round(totalDebits * 100);
  const creditsMinor = Math.round(totalCredits * 100);
  const isBalanced = debitsMinor > 0 && debitsMinor === creditsMinor;
  const todayKey = toDateKey(new Date());

  const updateLine = (index: number, field: "account" | "debit" | "credit", value: string) => {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line));
    setError("");
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedLines = lines.map((line) => ({
      account: line.account,
      debit: Number(line.debit) || 0,
      credit: Number(line.credit) || 0,
    }));
    if (parsedLines.some((line) => !line.account || (line.debit > 0) === (line.credit > 0))) {
      setError("Each journal line must select an account and enter an amount on exactly one side.");
      return;
    }
    if (!isBalanced) {
      setError("Total debits and credits must be equal and greater than zero.");
      return;
    }
    if (!dateKey || dateKey > todayKey) {
      setError("Choose a valid transaction date that is not in the future.");
      return;
    }
    const failure = onCreate({ dateKey, memo: memo.trim(), reference: reference.trim(), lines: parsedLines });
    if (failure) {
      setError(failure);
      return;
    }
    onSuccess(`Journal entry ${reference.trim()} created.`);
  };

  return <>
    <button type="button" className="ledger-dialog-back" onClick={onBack}><ChevronLeft size={15} /> Choose another record type</button>
    <form className="inventory-form ledger-entry-form" onSubmit={submit}>
      <label htmlFor="journal-date">Transaction date</label><input id="journal-date" type="date" value={dateKey} max={todayKey} required onChange={(event) => { setDateKey(event.target.value); setError(""); }} />
      <label htmlFor="journal-memo">Description / memo</label><input id="journal-memo" value={memo} maxLength={160} required onChange={(event) => { setMemo(event.target.value); setError(""); }} placeholder="Describe this transaction" />
      <label htmlFor="journal-reference">Reference</label><input id="journal-reference" value={reference} maxLength={40} required onChange={(event) => { setReference(event.target.value); setError(""); }} />
      <div className="ledger-entry-lines-heading"><strong>Journal lines</strong><button type="button" className="table-action-button" onClick={() => setLines((current) => [...current, { account: accounts[0]?.account ?? "", debit: "", credit: "" }])}>Add line</button></div>
      {lines.map((line, index) => <div className="ledger-entry-line" key={index}>
        <label htmlFor={`journal-account-${index}`}>Account {index + 1}</label>
        <select id={`journal-account-${index}`} value={line.account} required onChange={(event) => updateLine(index, "account", event.target.value)}>
          {accounts.map(({ account, code }) => <option key={code} value={account}>{code} · {account}</option>)}
        </select>
        <div className="inventory-form-row">
          <div><label htmlFor={`journal-debit-${index}`}>Debit (₦)</label><input id={`journal-debit-${index}`} type="number" min="0" step="0.01" value={line.debit} onChange={(event) => updateLine(index, "debit", event.target.value)} placeholder="0.00" /></div>
          <div><label htmlFor={`journal-credit-${index}`}>Credit (₦)</label><input id={`journal-credit-${index}`} type="number" min="0" step="0.01" value={line.credit} onChange={(event) => updateLine(index, "credit", event.target.value)} placeholder="0.00" /></div>
        </div>
        {lines.length > 2 && <button type="button" className="table-action-button ledger-remove-line" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>Remove line</button>}
      </div>)}
      <p className={`inventory-form-total ${isBalanced ? "ledger-balanced" : ""}`}><span>Debits {formatNaira(totalDebits)} · Credits {formatNaira(totalCredits)}</span><strong>{isBalanced ? "Balanced" : "Out of balance"}</strong></p>
      {error && <p className="inventory-error" role="alert">{error}</p>}
      <footer><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Plus size={15} /> Create journal entry</button></footer>
    </form>
  </>;
}

function LedgerAccountForm({ accounts, onBack, onClose, onAdd, onSuccess }: {
  accounts: LedgerAccount[];
  onBack: () => void;
  onClose: () => void;
  onAdd: (account: NewLedgerAccount) => string | null;
  onSuccess: (message: string) => void;
}) {
  const [account, setAccount] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<LedgerAccountType>("Asset");
  const [openingBalance, setOpeningBalance] = useState("");
  const [openingDate, setOpeningDate] = useState(toDateKey(new Date()));
  const [error, setError] = useState("");
  const hasOpeningBalance = Number(openingBalance) > 0;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newAccount = {
      account: account.trim(),
      code: code.trim(),
      type,
      openingBalance: Number(openingBalance) || 0,
      openingDate,
    };
    if (!/^\d{4,10}$/.test(newAccount.code)) {
      setError("Enter a numeric account code between 4 and 10 digits.");
      return;
    }
    if (openingBalance && (!Number.isFinite(newAccount.openingBalance) || newAccount.openingBalance < 0 || Math.abs(newAccount.openingBalance * 100 - Math.round(newAccount.openingBalance * 100)) > 1e-7)) {
      setError("Opening balance must be non-negative with no more than two decimal places.");
      return;
    }
    if (accounts.some((existing) => existing.account.toLowerCase() === newAccount.account.toLowerCase() || existing.code === newAccount.code)) {
      setError("That account name or code is already in use.");
      return;
    }
    const failure = onAdd(newAccount);
    if (failure) {
      setError(failure);
      return;
    }
    onSuccess(hasOpeningBalance
      ? `${newAccount.account} added with an opening balance posted to Opening Balance Equity.`
      : `${newAccount.account} added to the chart of accounts.`);
  };
  const supportsOpeningBalance = type === "Asset" || type === "Liability" || type === "Equity";
  const openingBalanceSide = type === "Asset" ? "debit" : "credit";

  return <>
    <button type="button" className="ledger-dialog-back" onClick={onBack}><ChevronLeft size={15} /> Choose another record type</button>
    <form className="inventory-form" onSubmit={submit}>
      <label htmlFor="ledger-account-name">Account name</label><input id="ledger-account-name" value={account} maxLength={80} required onChange={(event) => { setAccount(event.target.value); setError(""); }} placeholder="e.g. Prepaid expenses" />
      <label htmlFor="ledger-account-code">Account code</label><input id="ledger-account-code" inputMode="numeric" pattern="[0-9]{4,10}" value={code} required onChange={(event) => { setCode(event.target.value); setError(""); }} placeholder="e.g. 1200" />
      <label htmlFor="ledger-account-type">Account type</label><select id="ledger-account-type" value={type} onChange={(event) => { const nextType = event.target.value as LedgerAccountType; setType(nextType); if (nextType === "Income" || nextType === "Expense") setOpeningBalance(""); setError(""); }}><option>Asset</option><option>Liability</option><option>Equity</option><option>Income</option><option>Expense</option></select>
      {supportsOpeningBalance
        ? <>
          <label htmlFor="ledger-opening-balance">Opening balance (₦) <small>Optional</small></label>
          <input id="ledger-opening-balance" type="number" min="0" step="0.01" value={openingBalance} onChange={(event) => { setOpeningBalance(event.target.value); setError(""); }} placeholder="0.00" />
          {Number(openingBalance) > 0 && <>
            <label htmlFor="ledger-opening-date">Opening balance date</label>
            <input id="ledger-opening-date" type="date" value={openingDate} max={toDateKey(new Date())} required onChange={(event) => { setOpeningDate(event.target.value); setError(""); }} />
            <p className="inventory-form-hint">This creates a balanced opening entry: {openingBalanceSide} the new account and offset the Opening Balance Equity account.</p>
          </>}
        </>
        : <p className="inventory-form-hint">Income and expense accounts start at zero. Record their activity with journal entries.</p>}
      {error && <p className="inventory-error" role="alert">{error}</p>}
      <footer><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Plus size={15} /> Add account</button></footer>
    </form>
  </>;
}

function BankStatementSheet({ lines, journalEntries, cashAccountIds, matchedJournalIds, onManualMatch, onBack }: {
  lines: NonNullable<DashboardData["bankStatementLines"]>;
  journalEntries: JournalEntry[];
  cashAccountIds: string[];
  matchedJournalIds: string[];
  onManualMatch: (lineId: string, journalId: string) => string | null;
  onBack: () => void;
}) {
  const { download, ready, error: pdfError } = useFinancialPdfDownload();
  const [matchMessage, setMatchMessage] = useState("");
  const candidates = getUnmatchedCashJournalEntries(journalEntries, cashAccountIds, matchedJournalIds);
  const matchedCount = lines.filter(({ status }) => status === "Matched").length;
  const total = lines.reduce((sum, { amount }) => sum + amount, 0);
  const firstLine = lines[0];
  const lastLine = lines[lines.length - 1];
  const period = firstLine && lastLine
    ? firstLine.dateKey === lastLine.dateKey
      ? formatDateKey(firstLine.dateKey)
      : `${formatDateKey(firstLine.dateKey)} – ${formatDateKey(lastLine.dateKey)}`
    : "No statement dates";

  return <section className="report-sheet-page bank-statement-sheet-page">
    <div className="report-sheet-toolbar">
      <button type="button" className="outline-button" onClick={onBack}><ChevronLeft size={16} /> Back </button>
      <button type="button" className="outline-button" disabled={!ready} onClick={() => download({
        title: firstLine?.bank || "Bank statement",
        subtitle: `${lines.length} statement transactions`,
        period,
        summaries: [
          { label: "Statement lines", value: String(lines.length) },
          { label: "Matched", value: String(matchedCount) },
          { label: "Needs review", value: String(lines.length - matchedCount) },
          { label: "Net movement", value: formatNaira(total) },
        ],
        sections: [{
          title: "Statement activity",
          columns: ["Date", "Reference", "Description", "Amount", "Status", "Matched ledger entry"],
          rows: lines.length ? lines.map((line) => {
            const matchedEntry = line.matchedJournalId
              ? journalEntries.find(({ id }) => id === line.matchedJournalId)
              : undefined;
            return { cells: [formatDateKey(line.dateKey), line.reference, line.description, formatNaira(line.amount), line.status, matchedEntry ? `${matchedEntry.reference} / ${matchedEntry.memo}` : "Unmatched"] };
          }) : [{ cells: ["No statement transactions are available."] }],
        }],
        footer: "Values shown in Nigerian naira (NGN).",
        filename: `Bank-${firstLine?.bank || "Statement"}-${period}`,
      })}><Download size={14} /> {ready ? "Download PDF" : "Preparing PDF..."}</button>
    </div>
    <article className="panel report-sheet-panel">
      <header className="report-sheet-header">
        <div><h2>{firstLine?.bank || "Bank statement"}</h2><p>{lines.length} transactions · Statement period {period}</p></div>
        <div className="report-period"><span>Net statement movement</span><strong>{formatNaira(total)}</strong></div>
      </header>
      <div className="ledger-sheet-summary bank-statement-summary">
        <div><span>Statement lines</span><strong>{lines.length}</strong></div>
        <div><span>Matched</span><strong>{matchedCount}</strong></div>
        <div><span>Needs review</span><strong>{lines.length - matchedCount}</strong></div>
      </div>
      {pdfError && <p className="inventory-error" role="alert">{pdfError}</p>}
      {matchMessage && <p className="bank-statement-match-message" role="status">{matchMessage}</p>}
      {lines.length > 0
        ? <div className="report-sheet-table-wrap"><table className="report-sheet-table bank-statement-table">
          <thead><tr><th>Date</th><th>Reference</th><th>Description</th><th>Amount</th><th>Status</th><th>Match ledger entry</th></tr></thead>
          <tbody>{lines.map((line) => {
            const matchedEntry = line.matchedJournalId
              ? journalEntries.find(({ id }) => id === line.matchedJournalId)
              : undefined;
            return <tr key={line.id}>
              <td>{formatDateKey(line.dateKey)}</td>
              <td>{line.reference}</td>
              <td>{line.description}</td>
              <td>{formatNaira(line.amount)}</td>
              <td><span className={`status ${line.status === "Matched" ? "status-matched" : line.status === "Flagged" ? "status-flagged" : "status-pending"}`}><i />{line.status}</span></td>
              <td><select
                aria-label={`Match statement line ${line.reference} to a ledger entry`}
                value={line.matchedJournalId ?? ""}
                disabled={line.status === "Matched" || candidates.length === 0}
                onChange={(event) => {
                  if (!event.target.value) return;
                  const error = onManualMatch(line.id, event.target.value);
                  setMatchMessage(error ?? `Statement line ${line.reference} matched to the ledger.`);
                }}
              >
                <option value="">{candidates.length ? "Select ledger entry" : "No unmatched cash entries"}</option>
                {matchedEntry && <option value={matchedEntry.id}>{matchedEntry.dateKey} · {matchedEntry.reference} · {matchedEntry.memo}</option>}
                {candidates.map(({ entry, cashMovement }) => <option key={entry.id} value={entry.id}>{entry.dateKey} · {entry.reference} · {entry.memo} · {formatNaira(cashMovement)}</option>)}
              </select></td>
            </tr>;
          })}</tbody>
        </table></div>
        : <p className="report-unavailable" role="status">This statement could not be found.</p>}
      <footer className="report-sheet-footer"><span>{matchedCount} of {lines.length} transactions matched</span><span>Values shown in Nigerian naira (₦)</span></footer>
    </article>
  </section>;
}

function LedgerSheetPage({ account, periodLabel, data, onBack }: {
  account: Record<string, string>;
  periodLabel: string;
  data: DashboardData;
  onBack: () => void;
}) {
  const { download, ready, error: pdfError } = useFinancialPdfDownload();
  const accountName = account.account ?? "";
  const accountType = account.type ?? "";
  const accountTransactions = data.ledgerAccounts
    .filter((entry) => entry.account === accountName && entry.dateKey)
    .sort((left, right) =>
      (left.dateKey ?? "").localeCompare(right.dateKey ?? "") ||
      Number(Boolean(left.reference)) - Number(Boolean(right.reference)));
  const isDebitNormal = accountType === "Asset" || accountType === "Expense";
  let balance = 0;
  const rows = accountTransactions.map((entry) => {
    balance += isDebitNormal ? entry.debit - entry.credit : entry.credit - entry.debit;
    return { ...entry, balance };
  });
  const totalDebits = rows.reduce((total, row) => total + row.debit, 0);
  const totalCredits = rows.reduce((total, row) => total + row.credit, 0);
  const journalLineCount = rows.filter(({ memo, reference }) => memo || reference).length;
  const allocationCount = rows.length - journalLineCount;

  return <section className="report-sheet-page ledger-sheet-page">
    <div className="report-sheet-toolbar">
      <button type="button" className="outline-button" onClick={onBack}><ChevronLeft size={16} /> Back </button>
      <button type="button" className="outline-button" disabled={!ready} onClick={() => download({
        title: accountName,
        subtitle: `Account code ${account.code ?? "-"} / ${accountType} account activity`,
        period: periodLabel,
        summaries: [
          { label: "Total debits", value: formatNaira(totalDebits) },
          { label: "Total credits", value: formatNaira(totalCredits) },
          { label: "Net period balance", value: formatNaira(balance) },
        ],
        sections: [{
          title: "Account activity",
          columns: ["Date", "Description / memo", "Reference", "Debit", "Credit", "Balance"],
          rows: rows.length ? [
            ...rows.map((row) => ({ cells: [formatDateKey(row.dateKey ?? ""), row.memo ?? `Monthly ledger allocation - ${row.account}`, row.reference ?? "Not provided", row.debit ? formatNaira(row.debit) : "-", row.credit ? formatNaira(row.credit) : "-", formatNaira(row.balance)] })),
            { cells: ["Period totals", "", "", formatNaira(totalDebits), formatNaira(totalCredits), formatNaira(balance)], emphasize: true },
          ] : [{ cells: ["No dated activity is available for this account in the selected period."] }],
        }],
        footer: `${journalLineCount} journal lines / ${allocationCount} monthly allocations. Values shown in Nigerian naira (NGN).`,
        filename: `Ledger-${accountName}-${periodLabel}`,
      })}><Download size={14} /> {ready ? "Download PDF" : "Preparing PDF..."}</button>
    </div>
    <article className="panel report-sheet-panel">
      <header className="report-sheet-header">
        <div><h2>{accountName}</h2><p>Account code {account.code ?? "—"} · Account activity for the selected period.</p></div>
        <div className="report-period"><span>Reporting period</span><strong>{periodLabel}</strong></div>
      </header>
      <div className="ledger-sheet-summary">
        <div><span>Total debits</span><strong>{formatNaira(totalDebits)}</strong></div>
        <div><span>Total credits</span><strong>{formatNaira(totalCredits)}</strong></div>
        <div><span>Net period balance</span><strong>{formatNaira(balance)}</strong></div>
      </div>
      {pdfError && <p className="inventory-error" role="alert">{pdfError}</p>}
      {rows.length > 0
        ? <div className="report-sheet-table-wrap"><table className="report-sheet-table ledger-detail-table">
          <thead><tr><th>Date</th><th>Description / memo</th><th>Reference</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
          <tbody>{rows.map((row, index) => <tr key={row.id ?? `${row.account}-${row.dateKey}-${index}`}>
            <td>{formatDateKey(row.dateKey ?? "")}</td>
            <td>{row.memo ?? `Monthly ledger allocation — ${row.account}`}</td>
            <td>{row.reference ?? "Not provided"}</td>
            <td>{row.debit ? formatNaira(row.debit) : "—"}</td>
            <td>{row.credit ? formatNaira(row.credit) : "—"}</td>
            <td>{formatNaira(row.balance)}</td>
          </tr>)}
          <tr className="report-total-row"><td colSpan={3}>Period totals</td><td>{formatNaira(totalDebits)}</td><td>{formatNaira(totalCredits)}</td><td>{formatNaira(balance)}</td></tr>
          </tbody>
        </table></div>
        : <p className="report-unavailable">No dated activity is available for this account in the selected period.</p>}
      <p className="ledger-sheet-note">{journalLineCount > 0
        ? `This sheet includes ${journalLineCount} journal ${journalLineCount === 1 ? "line" : "lines"}${allocationCount > 0 ? ` and ${allocationCount} monthly ${allocationCount === 1 ? "allocation" : "allocations"}` : ""}. Legacy monthly allocations do not include original memo or reference metadata. The running balance starts at zero for the selected period.`
        : "Legacy mock ledger data contains monthly account totals without original transaction memo or reference metadata. The running balance starts at zero for the selected period."}</p>
      <footer className="report-sheet-footer"><span>{journalLineCount} journal {journalLineCount === 1 ? "line" : "lines"} · {allocationCount} monthly {allocationCount === 1 ? "allocation" : "allocations"}</span><span>Values shown in Nigerian naira (₦)</span></footer>
    </article>
  </section>;
}

function ReportSheet({ reportName, periodLabel, periodStart, periodEnd, data, view, onViewChange, onBack }: {
  reportName: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  data: DashboardData;
  view: "sheet" | "chart";
  onViewChange: (view: "sheet" | "chart") => void;
  onBack: () => void;
}) {
  const { download, ready, error: pdfError } = useFinancialPdfDownload();
  type ReportRow = { line: string; detail?: string; amount?: number; inflow?: number; outflow?: number; status?: string };
  const reportType = reportName.toLowerCase();
  let description = `Consolidated ${reportName.toLowerCase()} for ${periodLabel}.`;
  let rows: ReportRow[] = [];
  let unavailableMessage = "";
  let cashFlowReport = false;
  const statements = calculateFinancialStatements(
    data.journalEntries ?? [],
    data.accounts ?? [],
    periodStart,
    periodEnd,
    (data.accounts ?? []).filter(({ type, name }) => type === "Asset" && name.toLowerCase().includes("cash")).map(({ id }) => id),
  );

  if (reportType.includes("profit") || reportType.includes("loss") || reportType.includes("income statement")) {
    const income = statements.incomeStatement.income.filter(({ balance }) => balance !== 0);
    const expenses = statements.incomeStatement.expenses.filter(({ balance }) => balance !== 0);
    const incomeByAccount = income.map(({ account, balance }) => [account.name, balance] as const);
    const expenseByAccount = expenses.map(({ account, balance }) => [account.name, balance] as const);
    const costOfGoodsSold = expenseByAccount.filter(([account]) => account.toLowerCase().includes("cost of goods sold")).reduce((total, [, amount]) => total + amount, 0);
    const totalIncome = incomeByAccount.reduce((total, [, amount]) => total + amount, 0);
    const totalExpenses = expenseByAccount.reduce((total, [, amount]) => total + amount, 0);
    rows = [
      ...incomeByAccount.map(([line, amount]) => ({ line, detail: "Income", amount })),
      ...expenseByAccount.map(([line, amount]) => ({ line, detail: line.toLowerCase().includes("cost of goods sold") ? "Cost of goods sold" : "Operating expense", amount })),
      { line: "Total income", detail: "Subtotal", amount: totalIncome },
      { line: "Gross profit", detail: "Income less cost of goods sold", amount: totalIncome - costOfGoodsSold },
      { line: "Total expenses", detail: "Subtotal", amount: totalExpenses },
      { line: "Net profit / (loss)", detail: "Income less total expenses", amount: totalIncome - totalExpenses },
    ];
    if (income.length === 0 && expenses.length === 0) unavailableMessage = "No income or expense ledger entries are available for this period.";
  } else if (reportType.includes("balance sheet")) {
    description = `Assets, liabilities, and equity as of ${formatDateKey(periodEnd)}.`;
    const balanceSheet = statements.balanceSheet;
    rows = [
      ...balanceSheet.assets.filter(({ balance }) => balance !== 0).map(({ account, balance }) => ({ line: account.name, detail: "Asset", amount: balance })),
      { line: "Total assets", detail: "Subtotal", amount: balanceSheet.totalAssets },
      ...balanceSheet.liabilities.filter(({ balance }) => balance !== 0).map(({ account, balance }) => ({ line: account.name, detail: "Liability", amount: balance })),
      ...balanceSheet.equity.filter(({ balance }) => balance !== 0).map(({ account, balance }) => ({ line: account.name, detail: "Equity", amount: balance })),
      { line: "Retained earnings", detail: "Cumulative net income", amount: balanceSheet.retainedEarnings },
      { line: "Total liabilities and equity", detail: "Subtotal", amount: balanceSheet.totalLiabilitiesAndEquity },
    ];
    if (rows.length === 2) unavailableMessage = "No balance-sheet activity is available as of this date.";
  } else if (reportType.includes("cash flow")) {
    cashFlowReport = true;
    const flows = Object.entries(statements.cashFlow) as ["operating" | "investing" | "financing", (typeof statements.cashFlow)["operating"]][];
    const totalInflows = flows.reduce((total, [, flow]) => total + flow.inflows, 0);
    const totalOutflows = flows.reduce((total, [, flow]) => total + flow.outflows, 0);
    rows = [
      ...flows.map(([category, flow]) => ({ line: category[0].toUpperCase() + category.slice(1), inflow: flow.inflows, outflow: flow.outflows, amount: flow.net })),
      { line: "Total", detail: "Net cash flow", inflow: totalInflows, outflow: totalOutflows, amount: totalInflows - totalOutflows },
    ];
    if ((data.journalEntries ?? []).every(({ dateKey }) => dateKey < periodStart || dateKey > periodEnd)) unavailableMessage = "No cash-account activity is available for this period.";
  } else if (reportType.includes("receivable")) {
    rows = data.receivables.map(({ customer, invoice, amount, outstanding, status }) => ({
      line: customer, detail: invoice, amount: outstanding, status: `${status} · invoice total ${formatNaira(amount)}`,
    }));
    if (rows.length === 0) unavailableMessage = "No receivables are available for this period.";
  } else if (reportType.includes("inventory")) {
    description = `Current inventory position. Movement history is not available in the current data structure.`;
    rows = data.inventoryItems.map(({ item, sku, stock, value, status }) => ({
      line: item, detail: `${sku} · ${status}`, amount: value, status: `${stock} units`,
    }));
    if (rows.length === 0) unavailableMessage = "No inventory items are available.";
  } else if (reportType.includes("tax")) {
    unavailableMessage = "Tax-specific ledger accounts or tax transaction data are not available, so this report cannot be consolidated yet.";
  } else if (reportType.includes("budget")) {
    unavailableMessage = "Budget targets are not available in the current data structure, so budget variance cannot be calculated yet.";
  } else {
    unavailableMessage = "This report type does not have a matching data source in the current dashboard.";
  }

  const chartRows = rows.filter((row) => row.amount !== undefined || row.inflow !== undefined || row.outflow !== undefined);
  const valueFormat = (value: number) => formatNaira(value);
  return <section className="report-sheet-page">
    <div className="report-sheet-toolbar">
      <button type="button" className="outline-button" onClick={onBack}><ChevronLeft size={16} /> Back </button>
      <div className="report-sheet-actions">
        <div className="report-view-toggle" role="group" aria-label="Report display">
          <button type="button" aria-pressed={view === "sheet"} className={view === "sheet" ? "active" : ""} onClick={() => onViewChange("sheet")}>Sheet</button>
          <button type="button" aria-pressed={view === "chart"} className={view === "chart" ? "active" : ""} onClick={() => onViewChange("chart")}>Chart</button>
        </div>
        <button type="button" className="outline-button" disabled={!ready} onClick={() => download({
          title: reportName,
          subtitle: description,
          period: reportType.includes("balance sheet") ? formatDateKey(periodEnd) : periodLabel,
          sections: [{
            title: reportType.includes("cash flow") ? "Cash flow summary" : reportName,
            columns: cashFlowReport
              ? ["Period", "Cash inflow", "Cash outflow", "Net cash flow"]
              : [reportType.includes("profit") || reportType.includes("loss") || reportType.includes("income statement") ? "Account" : "Item", reportType.includes("receivable") ? "Invoice / status" : "Classification / details", reportType.includes("receivable") ? "Outstanding" : reportType.includes("inventory") ? "Inventory value" : "Amount"],
            rows: rows.length ? rows.map((row) => ({
              cells: cashFlowReport
                ? [row.line, formatNaira(row.inflow ?? 0), formatNaira(row.outflow ?? 0), formatNaira(row.amount ?? 0)]
                : [row.line, row.detail ?? row.status ?? "-", formatNaira(row.amount ?? 0)],
              emphasize: row.detail === "Subtotal" || row.line === "Gross profit" || row.line === "Net profit / (loss)" || row.line === "Total",
            })) : [{ cells: [unavailableMessage || "No report rows are available."] }],
          }],
          footer: unavailableMessage || "Values shown in Nigerian naira (NGN).",
          filename: `${reportName}-${periodLabel}`,
        })}><Download size={14} /> {ready ? "Download PDF" : "Preparing PDF..."}</button>
      </div>
    </div>
    <article className="panel report-sheet-panel">
      <header className="report-sheet-header">
        <div><h2>{reportName}</h2><p>{description}</p></div>
        <div className="report-period"><span>{reportType.includes("balance sheet") ? "As of" : "Reporting period"}</span><strong>{reportType.includes("balance sheet") ? formatDateKey(periodEnd) : periodLabel}</strong></div>
      </header>
      {unavailableMessage
        ? <p className="report-unavailable" role="status">{unavailableMessage}</p>
        : view === "sheet"
          ? <div className="report-sheet-table-wrap"><table className="report-sheet-table">
            <thead><tr><th>{reportType.includes("profit") || reportType.includes("loss") ? "Account" : cashFlowReport ? "Period" : "Item"}</th>{cashFlowReport ? <><th>Cash inflow</th><th>Cash outflow</th><th>Net cash flow</th></> : <><th>{reportType.includes("receivable") ? "Invoice / status" : "Classification / details"}</th><th>{reportType.includes("receivable") ? "Outstanding" : reportType.includes("inventory") ? "Inventory value" : "Amount"}</th></>}</tr></thead>
            <tbody>{rows.map((row) => <tr key={`${row.line}-${row.detail ?? ""}`} className={row.detail === "Subtotal" || row.line === "Gross profit" || row.line === "Net profit / (loss)" || row.line === "Total" ? "report-total-row" : ""}>
              <td>{row.line}</td>
              {cashFlowReport
                ? <><td>{formatNaira(row.inflow ?? 0)}</td><td>{formatNaira(row.outflow ?? 0)}</td><td>{formatNaira(row.amount ?? 0)}</td></>
                : <><td>{row.detail ?? row.status ?? "—"}</td><td>{valueFormat(row.amount ?? 0)}</td></>}
            </tr>)}</tbody>
          </table></div>
          : <div className="report-chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartRows} margin={{ top: 14, right: 18, left: 8, bottom: 36 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="line" axisLine={false} tickLine={false} tick={{ fill: "var(--chart-tick)", fontSize: 10 }} angle={-18} textAnchor="end" interval={0} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--chart-tick)", fontSize: 10 }} tickFormatter={(value) => formatCompactNaira(value)} />
            <Tooltip formatter={(value) => formatNaira(Number(value ?? 0))} />
            {cashFlowReport
              ? <><Bar dataKey="inflow" name="Cash inflow" fill="#ffe01b" radius={[4, 4, 0, 0]} /><Bar dataKey="outflow" name="Cash outflow" fill="#d7655b" radius={[4, 4, 0, 0]} /></>
              : <Bar dataKey="amount" name={reportType.includes("receivable") ? "Outstanding" : "Amount"} fill="var(--chart-bar)" radius={[4, 4, 0, 0]} />}
          </BarChart></ResponsiveContainer></div>}
      <footer className="report-sheet-footer"><span>{unavailableMessage ? "Data source required" : `${rows.length} consolidated lines`}</span><span>Values shown in Nigerian naira (₦)</span></footer>
      {pdfError && <p className="inventory-error" role="alert">{pdfError}</p>}
    </article>
  </section>;
}

type PartyAccountTransaction = {
  id: string;
  dateKey?: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  status: string;
};

function PartyProfilePage({ kind, profile, data, onRecordPayment, onBack }: {
  kind: "customer" | "supplier";
  profile: { id?: string; name: string; email?: string; phone?: string; billingAddress?: string; address?: string };
  data: DashboardData;
  onRecordPayment: (nav: "Receivables" | "Payables", invoice: string, amount: number) => string | null;
  onBack: () => void;
}) {
  const { download, ready, error: pdfError } = useFinancialPdfDownload();
  const isCustomer = kind === "customer";
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");
  const transactions: PartyAccountTransaction[] = [];
  const paymentOptions = isCustomer
    ? data.receivables.filter((item) => (profile.id && item.customerId === profile.id) || item.customer.toLowerCase() === profile.name.toLowerCase())
      .map(({ invoice, outstanding }) => ({ reference: invoice, outstanding }))
      .filter(({ outstanding }) => outstanding > 0)
    : data.payables.filter((item) => (profile.id && item.vendorId === profile.id) || item.vendor.toLowerCase() === profile.name.toLowerCase())
      .map(({ invoice, amount, paidAmount }) => ({ reference: invoice, outstanding: Math.max(0, amount - (paidAmount ?? 0)) }))
      .filter(({ outstanding }) => outstanding > 0);
  const selectedPayment = paymentOptions.find(({ reference }) => reference === paymentReference) ?? paymentOptions[0];
  const belongsToProfile = (partyId: string | undefined, partyName: string) =>
    (profile.id && partyId === profile.id) || partyName.toLowerCase() === profile.name.toLowerCase();
  const purchasingRecords = isCustomer ? [] : [
    ...data.procurements.filter((request) => belongsToProfile(undefined, request.supplier)).map((request, index) => ({
      id: `procurement-${request.reference ?? request.billReference ?? index}`,
      type: "Procurement request",
      reference: request.billReference || request.reference || "—",
      item: request.item,
      amount: request.amount,
      status: request.status,
    })),
    ...data.purchaseOrders.filter((order) => belongsToProfile(undefined, order.supplier)).map((order) => ({
      id: `purchase-order-${order.number}`,
      type: "Purchase order",
      reference: order.number,
      item: order.item || "—",
      amount: order.amount,
      status: order.status,
    })),
  ];

  if (isCustomer) {
    const invoices = data.receivables.filter((item) => belongsToProfile(item.customerId, item.customer));
    for (const invoice of invoices) {
      transactions.push({ id: `invoice-${invoice.invoice}`, dateKey: invoice.dateKey, reference: invoice.invoice, description: "Customer invoice", debit: invoice.amount, credit: 0, status: invoice.status });
      const payments = (data.customerPayments ?? []).filter((payment) => payment.invoice === invoice.invoice);
      for (const payment of payments) {
        transactions.push({ id: payment.id, dateKey: payment.dateKey, reference: invoice.invoice, description: "Payment received", debit: 0, credit: payment.amount, status: "Posted" });
      }
      const unlinkedPaidAmount = Math.max(0, invoice.amount - invoice.outstanding - payments.reduce((total, payment) => total + payment.amount, 0));
      if (unlinkedPaidAmount > 0.005) {
        transactions.push({ id: `prior-payment-${invoice.invoice}`, dateKey: invoice.dateKey, reference: invoice.invoice, description: "Previously recorded payment", debit: 0, credit: unlinkedPaidAmount, status: "Recorded" });
      }
    }
  } else {
    const bills = data.payables.filter((item) => belongsToProfile(item.vendorId, item.vendor));
    for (const bill of bills) {
      transactions.push({ id: `bill-${bill.invoice}`, dateKey: bill.dateKey, reference: bill.invoice, description: "Supplier bill", debit: 0, credit: bill.amount, status: bill.paymentStatus });
      const payments = (data.vendorPayments ?? []).filter((payment) => payment.bill === bill.invoice);
      for (const payment of payments) {
        transactions.push({ id: payment.id, dateKey: payment.dateKey, reference: bill.invoice, description: "Payment made", debit: payment.amount, credit: 0, status: "Posted" });
      }
      const unlinkedPaidAmount = Math.max(0, (bill.paidAmount ?? 0) - payments.reduce((total, payment) => total + payment.amount, 0));
      if (unlinkedPaidAmount > 0.005) {
        transactions.push({ id: `prior-payment-${bill.invoice}`, dateKey: bill.dateKey, reference: bill.invoice, description: "Previously recorded payment", debit: unlinkedPaidAmount, credit: 0, status: "Recorded" });
      }
    }
  }

  transactions.sort((left, right) => {
    const dateOrder = (left.dateKey ?? "").localeCompare(right.dateKey ?? "");
    if (dateOrder) return dateOrder;
    const leftIsPayment = left.description.toLowerCase().includes("payment");
    const rightIsPayment = right.description.toLowerCase().includes("payment");
    return Number(leftIsPayment) - Number(rightIsPayment) || left.id.localeCompare(right.id);
  });
  let balance = 0;
  const rows = transactions.map((transaction) => {
    balance = Math.round((balance + transaction.debit - transaction.credit + Number.EPSILON) * 100) / 100;
    return { ...transaction, balance };
  });
  const totalDebits = transactions.reduce((total, transaction) => total + transaction.debit, 0);
  const totalCredits = transactions.reduce((total, transaction) => total + transaction.credit, 0);
  const address = profile.billingAddress ?? profile.address;
  const submitPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(paymentAmount);
    if (!selectedPayment || !Number.isFinite(amount) || amount <= 0 || amount > selectedPayment.outstanding) {
      setPaymentError("Enter a payment up to the outstanding balance.");
      return;
    }
    const failure = onRecordPayment(isCustomer ? "Receivables" : "Payables", selectedPayment.reference, amount);
    if (failure) {
      setPaymentError(failure);
      return;
    }
    setPaymentAmount("");
    setPaymentError("");
    setPaymentNotice(`${formatNaira(amount)} payment recorded for ${selectedPayment.reference}.`);
  };

  return <section className="report-sheet-page party-profile-page">
    <div className="report-sheet-toolbar">
      <button type="button" className="outline-button" onClick={onBack}><ChevronLeft size={16} /> Back </button>
      <button type="button" className="outline-button" disabled={!ready} onClick={() => download({
        title: profile.name,
        subtitle: [profile.email, profile.phone, address].filter(Boolean).join(" / ") || "Contact details not provided",
        period: "Account statement",
        summaries: [
          { label: "Total debits", value: formatNaira(totalDebits) },
          { label: "Total credits", value: formatNaira(totalCredits) },
          { label: isCustomer ? "Amount due" : "Amount payable", value: formatNaira(Math.abs(balance)) },
        ],
        sections: [
          {
            title: "Account activity",
            columns: ["Date", "Description", "Reference", "Status", "Debit", "Credit", "Balance"],
            rows: rows.map((row) => ({ cells: [row.dateKey ? formatDateKey(row.dateKey) : "-", row.description, row.reference, row.status, row.debit ? formatNaira(row.debit) : "-", row.credit ? formatNaira(row.credit) : "-", formatNaira(row.balance)] })),
          },
          ...(purchasingRecords.length ? [{
            title: "Bill activity",
            columns: ["Type", "Reference", "Item", "Amount", "Status"],
            rows: purchasingRecords.map((record) => ({ cells: [record.type, record.reference, record.item, formatNaira(record.amount), record.status] })),
          }] : []),
        ],
        footer: isCustomer ? "Customer account statement / Nigerian naira (NGN)." : "Supplier account statement / Nigerian naira (NGN).",
        filename: `${isCustomer ? "Customer" : "Supplier"}-${profile.name}-Statement`,
      })}><Download size={14} /> {ready ? "Download PDF" : "Preparing PDF..."}</button>
    </div>
    <article className="panel report-sheet-panel">
      <header className="report-sheet-header">
        <div><h2>{profile.name}</h2><p>{[profile.email, profile.phone, address].filter(Boolean).join(" · ") || "Contact details not provided"}</p></div>
        <div className="report-period"><span>Account balance</span><strong>{formatNaira(Math.abs(balance))}</strong></div>
      </header>
      <div className="ledger-sheet-summary">
        <div><span>Total debits</span><strong>{formatNaira(totalDebits)}</strong></div>
        <div><span>Total credits</span><strong>{formatNaira(totalCredits)}</strong></div>
        <div><span>{isCustomer ? "Amount due" : "Amount payable"}</span><strong>{formatNaira(Math.abs(balance))}</strong></div>
      </div>
      {pdfError && <p className="inventory-error" role="alert">{pdfError}</p>}
      {paymentOptions.length > 0 && <form className="record-status-editor party-payment-form" onSubmit={submitPayment}>
        <h4>Record {isCustomer ? "customer payment" : "supplier payment"}</h4>
        <div className="party-payment-select-wrap">
          <select id="party-payment-reference" aria-label={isCustomer ? "Invoice" : "Bill"} value={selectedPayment?.reference ?? ""} onChange={(event) => { setPaymentReference(event.target.value); setPaymentError(""); setPaymentNotice(""); }}>
            {paymentOptions.map((option) => <option key={option.reference} value={option.reference}>{option.reference} · outstanding {formatNaira(option.outstanding)}</option>)}
          </select>
          <ChevronDown size={15} aria-hidden="true" />
        </div>
        <label htmlFor="party-payment-amount">Amount (₦)</label>
        <div className="record-status-control"><input id="party-payment-amount" type="number" min="0.01" max={selectedPayment?.outstanding} step="0.01" required value={paymentAmount} onChange={(event) => { setPaymentAmount(event.target.value); setPaymentError(""); setPaymentNotice(""); }} /><button type="submit" className="table-action-button">Post payment</button></div>
        {paymentError && <p className="inventory-error" role="alert">{paymentError}</p>}
        {paymentNotice && <p className="record-status-message" role="status">{paymentNotice}</p>}
      </form>}
      {rows.length > 0
        ? <div className="report-sheet-table-wrap"><table className="report-sheet-table ledger-detail-table">
          <thead><tr><th>Date</th><th>Description</th><th>Reference</th><th>Status</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}>
            <td>{row.dateKey ? formatDateKey(row.dateKey) : "—"}</td>
            <td>{row.description}</td>
            <td>{row.reference}</td>
            <td>{row.status}</td>
            <td>{row.debit ? formatNaira(row.debit) : "—"}</td>
            <td>{row.credit ? formatNaira(row.credit) : "—"}</td>
            <td>{formatNaira(Math.abs(row.balance))}</td>
          </tr>)}</tbody>
        </table></div>
        : <p className="report-unavailable">No posted invoices, bills, or payments are linked to this profile yet.</p>}
      {purchasingRecords.length > 0 && <section className="party-purchasing-activity">
        <h3>Bill activity</h3>
        <div className="report-sheet-table-wrap"><table className="report-sheet-table">
          <thead><tr><th>Type</th><th>Reference</th><th>Item</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>{purchasingRecords.map((record) => <tr key={record.id}>
            <td>{record.type}</td><td>{record.reference}</td><td>{record.item}</td><td>{formatNaira(record.amount)}</td><td>{record.status}</td>
          </tr>)}</tbody>
        </table></div>
      </section>}
      <footer className="report-sheet-footer"><span>{rows.length} account {rows.length === 1 ? "transaction" : "transactions"}</span><span>{isCustomer ? "Debit increases the customer balance; credit records a payment." : "Credit increases the amount payable; debit records a payment."}</span></footer>
    </article>
  </section>;
}

function PayrollDetailsPage({ payroll, payments, onBack, onRecordPayment }: {
  payroll: NonNullable<DashboardData["payroll"]>[number];
  payments: (NonNullable<DashboardData["payrollPayments"]>[number] & { reference: string })[];
  onBack: () => void;
  onRecordPayment?: (amount: number) => string | null;
}) {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");
  const recordedPaymentTotal = payments.reduce((total, payment) => total + payment.amount, 0);
  const initialPaidAmount = Math.min(payroll.pay, Math.max(0,
    payroll.paidAmount ?? (recordedPaymentTotal || (payroll.status === "Paid" ? payroll.pay : 0))));
  const [paidAmount, setPaidAmount] = useState(initialPaidAmount);
  const outstanding = Math.max(0, payroll.pay - paidAmount);

  const submitPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onRecordPayment) return;
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > outstanding) {
      setPaymentError("Enter a payment up to the outstanding balance.");
      return;
    }
    const error = onRecordPayment(amount);
    if (error) {
      setPaymentError(error);
      return;
    }
    const updatedPaidAmount = Math.round((paidAmount + amount + Number.EPSILON) * 100) / 100;
    const remaining = Math.max(0, payroll.pay - updatedPaidAmount);
    setPaidAmount(updatedPaidAmount);
    setPaymentAmount("");
    setPaymentError("");
    setPaymentNotice(`Payment of ${formatNaira(amount)} recorded. ${formatNaira(remaining)} remains.`);
  };

  return <section className="report-sheet-page">
    <header className="report-sheet-header payroll-detail-header">
      <button type="button" className="outline-button payroll-detail-back" onClick={onBack}><ChevronLeft size={16} /> Back</button>
      <div className="payroll-detail-identity">
        <h2>{payroll.employee}</h2>
        <p>{payroll.role}</p>
      </div>
      {payroll.dateKey && <div className="payroll-detail-date">
        <span>Pay date</span>
        <strong>{formatDateKey(payroll.dateKey)}</strong>
      </div>}
    </header>
    <article className="panel report-sheet-summary">
      <h3>Pay breakdown</h3>
      <dl className="record-drawer-fields">
        <div><dt>Gross pay</dt><dd>{payroll.grossPay === undefined ? "Not recorded" : formatNaira(payroll.grossPay)}</dd></div>
        <div><dt>Employee deductions</dt><dd>{payroll.employeeDeductions === undefined ? "Not recorded" : formatNaira(payroll.employeeDeductions)}</dd></div>
        <div><dt>Employer contributions</dt><dd>{payroll.employerLiabilities === undefined ? "Not recorded" : formatNaira(payroll.employerLiabilities)}</dd></div>
        <div><dt>Net wages</dt><dd>{formatNaira(payroll.pay)}</dd></div>
        <div><dt>Paid to date</dt><dd>{formatNaira(paidAmount)}</dd></div>
        <div><dt>Outstanding</dt><dd>{formatNaira(outstanding)}</dd></div>
        <div><dt>Status</dt><dd>{payroll.status}</dd></div>
      </dl>
    </article>
    <article className="panel report-sheet-summary">
      <h3>Payment history</h3>
      {payments.length > 0
        ? <div className="report-sheet-table-wrap"><table className="report-sheet-table">
          <thead><tr><th>Payment date</th><th>Amount</th><th>Journal reference</th></tr></thead>
          <tbody>{payments.map((payment) => <tr key={payment.id}>
            <td>{formatDateKey(payment.dateKey)}</td>
            <td>{formatNaira(payment.amount)}</td>
            <td>{payment.reference}</td>
          </tr>)}</tbody>
        </table></div>
        : <p className="report-unavailable">No payment transactions have been recorded for this payroll entry.</p>}
    </article>
    {onRecordPayment && outstanding > 0 && <form className="panel record-status-editor" onSubmit={submitPayment}>
      <h3>Record payment</h3>
      <label htmlFor="payroll-detail-payment-amount">Amount (₦)</label>
      <div className="record-status-control">
        <input id="payroll-detail-payment-amount" type="number" min="0.01" max={outstanding} step="0.01" required value={paymentAmount} onChange={(event) => { setPaymentAmount(event.target.value); setPaymentError(""); setPaymentNotice(""); }} />
        <button type="submit" className="table-action-button">Post payment</button>
      </div>
      <p className="inventory-form-hint">Outstanding: {formatNaira(outstanding)}</p>
      {paymentError && <p className="inventory-error" role="alert">{paymentError}</p>}
      {paymentNotice && <p className="record-status-message" role="status">{paymentNotice}</p>}
    </form>}
  </section>;
}

function RecordDetailsDrawer({ activeNav, record: initialRecord, nextStep, invoiceCompanyDetails, invoiceCustomerDetails, invoiceItems, invoiceDocument, invoiceRejectionReason, onClose, onRecordPayment }: {
  activeNav: ModuleNavKey;
  record: Record<string, string>;
  nextStep?: string;
  invoiceCompanyDetails?: InvoiceCompanyDetails;
  invoiceCustomerDetails?: InvoiceCustomerDetails;
  invoiceItems?: InvoiceLine[];
  invoiceDocument?: Invoice;
  invoiceRejectionReason?: string;
  onClose: () => void;
  onRecordPayment?: (amount: number) => string | null;
}) {
  const [record, setRecord] = useState(initialRecord);
  const [statusMessage, setStatusMessage] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [downloadInvoice, setDownloadInvoice] = useState<typeof import("./services/invoicePdf").downloadInvoicePdf | null>(null);
  const [invoicePdfError, setInvoicePdfError] = useState("");
  const label = (column: string) => column.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
  const fields = Object.keys(record).filter((field) => !field.startsWith("__"));
  const title = String(record[fields[0]] ?? "");

  useEffect(() => {
    if (activeNav !== "Invoice" || !invoiceDocument) return;
    let cancelled = false;
    void import("./services/invoicePdf").then(({ downloadInvoicePdf }) => {
      if (!cancelled) setDownloadInvoice(() => downloadInvoicePdf);
    }).catch(() => {
      if (!cancelled) setInvoicePdfError("The invoice PDF could not be prepared.");
    });
    return () => { cancelled = true; };
  }, [activeNav, invoiceDocument?.id]);

  const outstanding = Number((record.outstanding ?? "").replace(/[^\d.-]/g, ""));
  const submitPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onRecordPayment) return;
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > outstanding) {
      setPaymentError("Enter a payment up to the outstanding balance.");
      return;
    }
    const error = onRecordPayment(amount);
    if (error) {
      setPaymentError(error);
      return;
    }
    const remaining = Math.round((outstanding - amount + Number.EPSILON) * 100) / 100;
    setRecord((current) => ({ ...current, outstanding: formatNaira(remaining), status: remaining === 0 ? "Paid" : "Partial" }));
    setPaymentAmount("");
    setPaymentError("");
    setStatusMessage(`Payment of ${formatNaira(amount)} recorded. ${formatNaira(remaining)} remains.`);
  };

  return <div className="record-drawer-backdrop" onClick={onClose}>
    <aside className="record-drawer" role="dialog" aria-modal="true" aria-labelledby="record-drawer-title" onClick={(event) => event.stopPropagation()}>
      <header className="record-drawer-header"><div><h3 id="record-drawer-title">{title}</h3></div><button type="button" className="more-button" aria-label="Close details" autoFocus onClick={onClose}><X size={16} /></button></header>
      <dl className="record-drawer-fields">{fields.map((field) => <div key={field}><dt>{label(field)}</dt><dd>{record[field]}</dd></div>)}</dl>
      {activeNav === "Invoice" && invoiceCompanyDetails && invoiceCustomerDetails && <InvoicePartiesPreview company={invoiceCompanyDetails} customer={invoiceCustomerDetails} />}
      {activeNav === "Invoice" && invoiceItems && <InvoiceItemsPreview items={invoiceItems} />}
      {activeNav === "Invoice" && invoiceRejectionReason !== undefined && <ApprovalRejectionNotice reason={invoiceRejectionReason} />}
      {onRecordPayment && outstanding > 0 && <form className="record-status-editor" onSubmit={submitPayment}>
        <h4>Record payment</h4>
        <label htmlFor="record-payment-amount">Amount (₦)</label>
        <div className="record-status-control"><input id="record-payment-amount" type="number" min="0.01" max={outstanding} step="0.01" required value={paymentAmount} onChange={(event) => { setPaymentAmount(event.target.value); setPaymentError(""); }} /><button type="submit" className="table-action-button">Post payment</button></div>
        <p className="inventory-form-hint">Outstanding: {formatNaira(outstanding)}</p>
        {paymentError && <p className="inventory-error" role="alert">{paymentError}</p>}
      </form>}
      {nextStep && <div className="record-drawer-note"><strong>Next step</strong><p>{nextStep}</p></div>}
      {invoicePdfError && <p className="inventory-error" role="alert">{invoicePdfError}</p>}
      <footer className="record-drawer-footer">{activeNav === "Invoice" && invoiceDocument
        ? <button type="button" className="outline-button invoice-download-button" disabled={!downloadInvoice} onClick={() => {
          if (!downloadInvoice) return;
          setInvoicePdfError("");
          try { downloadInvoice(invoiceDocument, invoiceCompanyDetails, invoiceCustomerDetails); }
          catch { setInvoicePdfError("The invoice PDF could not be downloaded."); }
        }}><Download size={14} /> {downloadInvoice ? "Download PDF" : "Preparing PDF..."}</button>
        : <button type="button" className="table-action-button" onClick={() => window.print()}>Print</button>}<button type="button" className="primary-button" onClick={onClose}>Done</button></footer>
    </aside>
  </div>;
}

type InventoryItem = DashboardData["inventoryItems"][number];

function InventorySectionTabs({ section, onChange }: {
  section: "Overview" | "Procurement" | "Purchase Order";
  onChange: (section: "Overview" | "Procurement" | "Purchase Order") => void;
}) {
  return <div className="inventory-section-tabs" role="tablist" aria-label="Inventory screens">
    {(["Overview", "Procurement", "Purchase Order"] as const).map((tab) => <button key={tab} type="button" role="tab" aria-selected={section === tab} className={section === tab ? "active" : ""} onClick={() => onChange(tab)}>{tab}</button>)}
  </div>;
}

function InventoryLocationPage({ location, items, onBack, onEditCapacity }: {
  location: DashboardData["inventoryLocations"][number];
  items: DashboardData["inventoryItems"];
  onBack: () => void;
  onEditCapacity: () => void;
}) {
  const stocks = items.map((item) => ({ item, quantity: getLocationQuantity(item, location.location) }))
    .filter(({ quantity }) => quantity > 0);
  const inventoryValue = stocks.reduce((total, { item, quantity }) => total + (item.unitCost ?? (item.stock > 0 ? item.value / item.stock : 0)) * quantity, 0);
  const utilization = Math.min(100, Math.round((location.stock / Math.max(location.capacity, 1)) * 100));
  return <section className="inventory-location-page">
    <header className="inventory-location-page-header">
      <button type="button" className="outline-button" onClick={onBack}><ChevronLeft size={15} /> All locations</button>
      <div className="inventory-location-page-heading"><h2>{location.location}</h2><p>Stock distribution by item</p></div>
      <button type="button" className="outline-button" onClick={onEditCapacity}><Pencil size={14} /> Edit capacity</button>
    </header>
    <section className="metrics-grid inventory-location-metrics">
      <MetricCard icon={Boxes} label="Units on hand" value={String(location.stock)} accent="yellow" />
      <MetricCard icon={Building2} label="Capacity" value={`${location.capacity} units`} accent="blue" />
      <MetricCard icon={PackageCheck} label="Utilization" value={`${utilization}% · ${formatCompactNaira(inventoryValue)}`} accent="green" />
    </section>
    <article className="panel inventory-management-panel inventory-location-stock-panel">
      <div className="panel-heading"><div><h2>Stock at {location.location}</h2><p>{stocks.length} stocked {stocks.length === 1 ? "item" : "items"}</p></div></div>
      {stocks.length
        ? <div className="purchase-table-wrap"><table><thead><tr><th>Item</th><th>SKU</th><th>On hand</th><th>Unit cost</th><th>Stock value</th><th>Status</th></tr></thead><tbody>{stocks.map(({ item, quantity }) => {
          const unitCost = item.unitCost ?? (item.stock > 0 ? item.value / item.stock : 0);
          return <tr key={item.sku}><td><strong>{item.item}</strong></td><td>{item.sku}</td><td>{quantity}</td><td>{formatNaira(unitCost)}</td><td>{formatNaira(unitCost * quantity)}</td><td>{quantity <= (item.reorderLevel ?? 5) ? "Low stock" : "Healthy"}</td></tr>;
        })}</tbody></table></div>
        : <p className="inventory-form-hint">No item stock is currently assigned to this location.</p>}
    </article>
  </section>;
}

function InventoryPage({ data, allData, section, search, suppliers, onLocationDetailChange, onAddSupplier, onCreateOrder, onUpdatePurchaseOrderStatus, onUpdateProcurementStatus, onCreateProcurement, onResubmitApproval, onGenerateProcurementReference, onAddInventoryItem, onUpdateInventorySellingPrice, onAddInventoryLocation, onUpdateInventoryLocation, onAdjustStock }: {
  data: DashboardData;
  allData: DashboardData;
  section: "Overview" | "Procurement" | "Purchase Order";
  search: string;
  onLocationDetailChange: (isOpen: boolean) => void;
  onCreateOrder: (order: SupplierDetails & { number: string; lines: PurchaseOrderLine[]; location: string; document: ApprovalDocument }) => string | null;
  onUpdatePurchaseOrderStatus: (number: string, status: string, receivingLocation?: string) => string | null;
  onUpdateProcurementStatus: (reference: string | undefined, item: string, supplier: string, status: string) => string | null;
  onCreateProcurement: (request: SupplierDetails & { item: string; amount: number; dueDate: string; billReference?: string; billType?: "expense" | "inventory"; document: ApprovalDocument }) => string | null;
  onResubmitApproval: (requestId: string, submission: ApprovalSubmission) => string | null;
  onGenerateProcurementReference: (reference: string | undefined, item: string) => string | null;
  onAddInventoryItem: (item: { item: string; sku: string; location: string; quantity: number; unitCost: number; sellingPrice: number; reorderLevel: number }) => string | null;
  onUpdateInventorySellingPrice: (sku: string, sellingPrice: number) => string | null;
  onAddInventoryLocation: (location: { location: string; capacity: number }) => string | null;
  onUpdateInventoryLocation: (location: { location: string; capacity: number }) => string | null;
  onAdjustStock: (adjustment: { sku: string; location: string; quantity: number; direction: "Add" | "Remove"; unitCost?: number }) => string | null;
  suppliers: SupplierProfile[];
  onAddSupplier: (draft: SupplierProfile) => string | null;
}) {
  const metrics = getInventoryMetrics(data);
  const purchaseOrderStatusClass = (status: string) => status === "Received"
    ? "status-matched"
    : ["Pending", "Approved"].includes(status) ? "status-pending" : "status-flagged";
  const [dialog, setDialog] = useState<"order" | "procurement" | "add-inventory" | "add-location" | InventoryItem | null>(null);
  const [priceEditor, setPriceEditor] = useState<InventoryItem | null>(null);
  const [locationEditor, setLocationEditor] = useState<DashboardData["inventoryLocations"][number] | null>(null);
  const [selectedInventoryLocation, setSelectedInventoryLocation] = useState<DashboardData["inventoryLocations"][number] | null>(null);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<DashboardData["purchaseOrders"][number] | null>(null);
  const [selectedProcurement, setSelectedProcurement] = useState<DashboardData["procurements"][number] | null>(null);
  const [editApproval, setEditApproval] = useState<ApprovalRequest | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const searchTerm = search.trim().toLowerCase();
  const matchesSearch = (record: object) => !searchTerm || Object.values(record).some((value) => String(value ?? "").toLowerCase().includes(searchTerm));
  const inventoryItems = data.inventoryItems.filter(matchesSearch);
  const inventoryLocations = data.inventoryLocations.filter(matchesSearch);
  const pendingProcurements = data.approvalRequests.flatMap((request) => request.type === "procurement" && (request.status === "Pending" || request.status === "Rejected" && !data.approvalRequests.some(({ revisionOf }) => revisionOf === request.id))
    ? [{ ...request.payload, status: request.status, dateKey: request.submittedAt.slice(0, 10), approvalRequestId: request.id }]
    : []);
  const procurements = [...pendingProcurements, ...data.procurements].filter(matchesSearch);
  const purchaseOrders = data.purchaseOrders.filter(matchesSearch);
  const pendingPurchaseOrders = data.approvalRequests.flatMap((request) => {
    if (request.type !== "purchase-order" || request.status !== "Pending" && (request.status !== "Rejected" || data.approvalRequests.some(({ revisionOf }) => revisionOf === request.id))) return [];
    const lines = request.payload.lines ?? [];
    return [{
      ...request.payload,
      lines,
      number: request.payload.number ?? "—",
      items: lines.length,
      quantity: lines.reduce((total, line) => total + line.quantity, 0),
      amount: lines.reduce((total, line) => total + line.quantity * line.unitPrice, 0),
      status: request.status,
      dateKey: request.submittedAt.slice(0, 10),
      approvalRequestId: request.id,
    }];
  }).filter(matchesSearch);
  const nextPurchaseOrderNumber = `PO-${new Date().getFullYear()}-${Math.max(
    0,
    ...allData.purchaseOrders.map(({ number }) => Number(number.match(/(\d+)$/)?.[1] ?? 0)),
    ...allData.approvalRequests.flatMap((request) => request.type === "purchase-order" ? [Number(request.payload.number?.match(/(\d+)$/)?.[1] ?? 0)] : []),
  ) + 1}`;
  return <>{selectedInventoryLocation
    ? <InventoryLocationPage location={selectedInventoryLocation} items={data.inventoryItems} onBack={() => { setSelectedInventoryLocation(null); onLocationDetailChange(false); }} onEditCapacity={() => setLocationEditor(selectedInventoryLocation)} />
    : <>
  <section className="inventory-layout">
    {section === "Overview" && <>
    <section className="metrics-grid inventory-metrics"><MetricCard icon={Boxes} label="Open orders" value={String(metrics.openOrders)} accent="yellow" /><MetricCard icon={PackageCheck} label="Stock availability" value={`${metrics.stockAvailability}%`} accent="green" /><MetricCard icon={FileCheck2} label="Pending approvals" value={String(metrics.pendingApprovals)} accent="red" /><MetricCard icon={Building2} label="Inventory value" value={formatCompactNaira(metrics.inventoryValue)} accent="blue" /></section>
    <article className="panel inventory-chart-panel"><div className="panel-heading"><div><h2>Inventory by location</h2></div></div><div className="inventory-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={inventoryLocations} margin={{ top: 12, right: 10, left: -25, bottom: 0 }}><CartesianGrid stroke="var(--chart-grid)" vertical={false} /><XAxis dataKey="location" axisLine={false} tickLine={false} tick={{ fill: "var(--chart-tick)", fontSize: 10 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--chart-tick)", fontSize: 10 }} /><Tooltip cursor={{ fill: "var(--chart-hover)" }} /><Bar dataKey="stock" fill="var(--chart-bar)" radius={[5, 5, 0, 0]} maxBarSize={38} /></BarChart></ResponsiveContainer></div></article>
    <article className="panel inventory-locations-panel"><div className="panel-heading"><div><h2>Locations</h2></div><button type="button" className="primary-button inventory-add-button" onClick={() => { setConfirmation(""); setLocationEditor(null); setDialog("add-location"); }}><Plus size={15} /> Add location</button></div><div className="purchase-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Location</th>
            <th>Stock</th>
            <th>Capacity</th>
            <th>Utilization</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {inventoryLocations.map((entry) => {
            const utilization = Math.min(100, Math.round((entry.stock / Math.max(entry.capacity, 1)) * 100));
            return <tr key={entry.location}>
              <td><button type="button" className="inventory-location-name" aria-label={`View stock at ${entry.location}`} onClick={() => { setSelectedInventoryLocation(entry); onLocationDetailChange(true); }}>{entry.location}</button></td>
              <td>{entry.stock} units</td>
              <td>{entry.capacity} units</td>
              <td><span className={`status ${utilization >= 85 ? "status-flagged" : utilization >= 60 ? "status-pending" : "status-matched"}`}><i />{utilization}%</span></td>
              <td><button type="button" className="table-action-button" onClick={() => { setConfirmation(""); setDialog(null); setLocationEditor(entry); }}>Edit capacity</button></td>
            </tr>;
          })}
          {inventoryLocations.length === 0 && searchTerm && <tr><td colSpan={5}>No locations match this search.</td></tr>}
        </tbody>
      </table>
    </div></article>
    {confirmation && <p className="inventory-confirmation inventory-global-confirmation" role="status">{confirmation}</p>}
    </>}
    {confirmation && <p className="inventory-confirmation inventory-global-confirmation" role="status">{confirmation}</p>}
    {section === "Procurement" && <article className="panel procurement-panel"><div className="panel-heading"><div><h2>Procurement requests</h2></div><button type="button" className="primary-button procurement-create-button" onClick={() => { setConfirmation(""); setDialog("procurement"); }}><Plus size={15} /> Create</button></div><div className="procurement-table-wrap"><table><thead><tr><th>Reference</th><th>Item</th><th>Supplier</th><th>Amount</th><th>Due date</th><th>Status</th><th>Action</th></tr></thead><tbody>{procurements.map((item) => <tr key={`${"approvalRequestId" in item ? item.approvalRequestId : item.reference ?? item.item}`}><td><strong>{item.reference ?? "—"}</strong></td><td>{item.item}</td><td><div className="purchase-supplier-details"><strong>{item.supplier}</strong>{item.supplierAddress && <small>{item.supplierAddress}</small>}{item.supplierContact && <small>{item.supplierContact}</small>}</div></td><td>{formatNaira(item.amount)}</td><td>{item.due}</td><td><span className={`status ${item.status === "Rejected" || item.status.toLowerCase().includes("quotation") ? "status-flagged" : item.status.toLowerCase().includes("approval") || item.status === "Pending" ? "status-pending" : "status-pending"}`}><i />{item.status}</span></td><td>{"approvalRequestId" in item ? item.status === "Rejected" ? <button type="button" className="row-action" onClick={() => { const request = data.approvalRequests.find(({ id }) => id === item.approvalRequestId); if (request?.type === "procurement" && request.status === "Rejected") setEditApproval(request); }}>Edit</button> : <span className="inventory-form-hint">Awaiting approval</span> : <button type="button" className="row-action" aria-label={`Review procurement ${item.reference ?? item.item}`} onClick={() => setSelectedProcurement(item)}>Review</button>}</td></tr>)}{procurements.length === 0 && searchTerm && <tr><td colSpan={7}>No procurement requests match this search.</td></tr>}</tbody></table></div></article>}
    {section === "Overview" && <>
    <article className="panel inventory-management-panel"><div className="panel-heading"><div><h2>Inventory items</h2></div><button type="button" className="primary-button inventory-add-button" onClick={() => { setConfirmation(""); setDialog("add-inventory"); }}><Plus size={15} /> Add</button></div><div className="purchase-table-wrap"><table><thead><tr><th>Item</th><th>SKU</th><th>On hand</th><th>Unit cost</th><th>Unit selling price</th><th>Reorder at</th><th>Inventory value</th><th>Status</th><th>Action</th></tr></thead><tbody>{inventoryItems.map((item) => <tr key={item.sku}><td><strong>{item.item}</strong></td><td>{item.sku}</td><td>{item.stock}</td><td>{formatNaira(item.unitCost ?? (item.stock > 0 ? item.value / item.stock : 0))}</td><td>{item.sellingPrice && item.sellingPrice > 0 ? formatNaira(item.sellingPrice) : <span className="inventory-unpriced">Not set</span>}</td><td>{item.reorderLevel ?? 5}</td><td>{formatNaira(item.value)}</td><td><span className={`status ${item.stock <= (item.reorderLevel ?? 5) ? "status-flagged" : "status-matched"}`}><i />{item.stock <= (item.reorderLevel ?? 5) ? "Low stock" : "Healthy"}</span></td><td><div className="table-actions"><button type="button" className="table-action-button stock-adjust-button" onClick={() => { setConfirmation(""); setPriceEditor(item); }}>{item.sellingPrice && item.sellingPrice > 0 ? "Edit price" : "Set price"}</button><button type="button" className="table-action-button stock-adjust-button" aria-label={`Adjust stock for ${item.item}`} onClick={() => { setConfirmation(""); setDialog(item); }}>Adjust stock</button></div></td></tr>)}{inventoryItems.length === 0 && searchTerm && <tr><td colSpan={9}>No inventory items match this search.</td></tr>}</tbody></table></div></article>
    </>}
    {section === "Purchase Order" && <article className="panel purchase-panel"><div className="panel-heading"><div><h2>Recent purchase orders</h2></div><button type="button" className="primary-button purchase-create-button" onClick={() => { setConfirmation(""); setDialog("order"); }}><Plus size={15} /> Create</button></div><div className="purchase-table-wrap"><table><thead><tr><th>PO number</th><th>Supplier</th><th>Items</th><th>Quantity</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>{pendingPurchaseOrders.map((order) => <tr key={order.approvalRequestId}>    <td><strong>{order.number ?? "—"}</strong></td><td><div className="purchase-supplier-details"><strong>{order.supplier}</strong>{order.supplierAddress && <small>{order.supplierAddress}</small>}{order.supplierContact && <small>{order.supplierContact}</small>}</div></td><td><div className="purchase-order-lines">{order.lines?.map((line) => <span key={line.sku}>{line.item} <small>× {line.quantity}</small></span>)}</div></td><td>{order.quantity}</td><td>{formatNaira(order.amount)}</td><td><span className={`status ${purchaseOrderStatusClass(order.status)}`}><i />{order.status}</span></td><td>{order.status === "Rejected" ? <button type="button" className="row-action" onClick={() => { const request = data.approvalRequests.find(({ id }) => id === order.approvalRequestId); if (request?.type === "purchase-order" && request.status === "Rejected") setEditApproval(request); }}>Edit</button> : <span className="inventory-form-hint">Awaiting approval</span>}</td></tr>)}{purchaseOrders.map((order) => <tr key={order.number}><td><strong>{order.number}</strong></td><td><div className="purchase-supplier-details"><strong>{order.supplier}</strong>{order.supplierAddress && <small>{order.supplierAddress}</small>}{order.supplierContact && <small>{order.supplierContact}</small>}</div></td><td>{order.lines ? <div className="purchase-order-lines">{order.lines.map((line) => <span key={line.sku}>{line.item} <small>× {line.quantity}</small></span>)}</div> : order.item ?? "—"}</td><td>{order.quantity ?? order.items}</td><td>{formatNaira(order.amount)}</td><td><span className={`status ${purchaseOrderStatusClass(order.status)}`}><i />{order.status}</span></td><td><button type="button" className="row-action" aria-label={`Review purchase order ${order.number}`} onClick={() => setSelectedPurchaseOrder(order)}>Review</button></td></tr>)}{purchaseOrders.length === 0 && pendingPurchaseOrders.length === 0 && searchTerm && <tr><td colSpan={7}>No purchase orders match this search.</td></tr>}</tbody></table></div></article>}
  </section>
    </>}
  {(dialog === "order" || editApproval?.type === "purchase-order") && <PurchaseOrderDialog items={data.inventoryItems} locations={data.inventoryLocations} suppliers={suppliers} suggestedNumber={nextPurchaseOrderNumber} initialApproval={editApproval?.type === "purchase-order" ? editApproval : undefined} onAddSupplier={onAddSupplier} onClose={() => { setDialog(null); setEditApproval(null); }} onCreate={(order) => {
    const initialApproval = editApproval?.type === "purchase-order" ? editApproval : null;
    const error = initialApproval
      ? onResubmitApproval(initialApproval.id, { type: "purchase-order", payload: {
        number: order.number,
        supplier: order.supplier,
        supplierAddress: order.supplierAddress,
        supplierContact: order.supplierContact,
        location: order.location,
        item: order.lines.map(({ item }) => item).join(", "),
        items: order.lines.length,
        quantity: order.lines.reduce((total, line) => total + line.quantity, 0),
        lines: order.lines,
        document: order.document,
        amount: order.lines.reduce((total, line) => total + line.quantity * line.unitPrice, 0),
      } })
      : onCreateOrder(order);
    if (error) return error;
    setConfirmation(initialApproval ? "Purchase order request resubmitted for admin approval." : "Purchase order request submitted for admin approval.");
    setDialog(null);
    setEditApproval(null);
    return null;
  }} />}
  {(dialog === "procurement" || editApproval?.type === "procurement") && <ProcurementDialog suppliers={suppliers} initialApproval={editApproval?.type === "procurement" ? editApproval : undefined} onAddSupplier={onAddSupplier} onClose={() => { setDialog(null); setEditApproval(null); }} onCreate={(request) => {
    const initialApproval = editApproval?.type === "procurement" ? editApproval : null;
    const error = initialApproval
      ? onResubmitApproval(initialApproval.id, { type: "procurement", payload: {
        ...initialApproval.payload,
        item: request.item,
        supplier: request.supplier,
        supplierAddress: request.supplierAddress,
        supplierContact: request.supplierContact,
        amount: request.amount,
        due: new Date(`${request.dueDate}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        billReference: request.billReference,
        billType: request.billType,
        document: request.document,
      } })
      : onCreateProcurement(request);
    if (error) return error;
    setConfirmation(initialApproval ? "Procurement request resubmitted for admin approval." : "Procurement request submitted for admin approval.");
    setDialog(null);
    setEditApproval(null);
    return null;
  }} />}
  {dialog === "add-inventory" && <AddInventoryDialog locations={data.inventoryLocations} onClose={() => setDialog(null)} onAdd={onAddInventoryItem} onSuccess={(item, quantity) => { setConfirmation(`${item} added to inventory with ${quantity} ${quantity === 1 ? "unit" : "units"}.`); setDialog(null); }} />}
  {priceEditor && <InventorySellingPriceDialog item={priceEditor} onClose={() => setPriceEditor(null)} onSave={onUpdateInventorySellingPrice} onSuccess={(price) => { setConfirmation(price > 0 ? `Selling price for ${priceEditor.item} updated to ${formatNaira(price)}.` : `Selling price for ${priceEditor.item} cleared.`); setPriceEditor(null); }} />}
  {dialog === "add-location" && <AddInventoryLocationDialog onClose={() => setDialog(null)} onAdd={onAddInventoryLocation} onSuccess={(location) => { setConfirmation(`${location} added as an inventory location.`); setDialog(null); }} />}
  {locationEditor && <AddInventoryLocationDialog initialLocation={locationEditor} onClose={() => setLocationEditor(null)} onAdd={(updated) => onUpdateInventoryLocation(updated)} onSuccess={(location) => { setConfirmation(`Capacity for ${location} updated.`); setLocationEditor(null); }} />}
  {dialog && typeof dialog === "object" && <StockAdjustmentDialog items={data.inventoryItems} locations={data.inventoryLocations} initialItem={dialog} onClose={() => setDialog(null)} onAdjust={(adjustment) => { const error = onAdjustStock(adjustment); if (error) return error; setConfirmation(`${adjustment.direction === "Add" ? "Added" : "Removed"} ${adjustment.quantity} ${adjustment.quantity === 1 ? "unit" : "units"} ${adjustment.direction === "Add" ? "to" : "from"} ${dialog.item} at ${adjustment.location}.`); setDialog(null); return null; }} />}
  {selectedPurchaseOrder && <PurchaseOrderReviewDrawer order={selectedPurchaseOrder} locations={data.inventoryLocations} onClose={() => setSelectedPurchaseOrder(null)} onStatusChange={(status, location) => {
    const error = onUpdatePurchaseOrderStatus(selectedPurchaseOrder.number, status, location);
    if (!error) setSelectedPurchaseOrder((current) => current ? { ...current, status, location } : current);
    return error;
  }} />}
  {selectedProcurement && <ProcurementReviewDrawer
    request={selectedProcurement}
    onClose={() => setSelectedProcurement(null)}
    onStatusChange={(status) => {
      const error = onUpdateProcurementStatus(selectedProcurement.reference, selectedProcurement.item, selectedProcurement.supplier, status);
      if (!error) setSelectedProcurement((current) => current ? { ...current, status } : current);
      return error;
    }}
    onGenerateReference={() => {
      const reference = onGenerateProcurementReference(selectedProcurement.reference, selectedProcurement.item);
      if (reference) setSelectedProcurement((current) => current ? { ...current, reference } : current);
      return reference;
    }}
  />}
  </>;
}

function InventoryDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return <div className="inventory-dialog-backdrop" onClick={onClose}>
    <section className="inventory-dialog" role="dialog" aria-modal="true" aria-labelledby="inventory-dialog-title" onClick={(event) => event.stopPropagation()}>
      <header className="inventory-dialog-header"><div><h2 id="inventory-dialog-title">{title}</h2></div><button type="button" className="more-button" aria-label="Close dialog" onClick={onClose}><X size={16} /></button></header>
      {children}
    </section>
  </div>;
}

function StatusChangeConfirmation({ title, message, onCancel, onConfirm }: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return <div className="status-confirmation-backdrop" onClick={onCancel}>
    <section className="status-confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="status-confirmation-title" aria-describedby="status-confirmation-message" onClick={(event) => event.stopPropagation()}>
      <h2 id="status-confirmation-title">{title}</h2>
      <p id="status-confirmation-message">{message}</p>
      <footer><button type="button" className="outline-button" onClick={onCancel}>Cancel</button><button type="button" className="primary-button" onClick={onConfirm}>Confirm</button></footer>
    </section>
  </div>;
}

function ApprovalDocumentUploadField({ id, file, existingDocument, onChange }: {
  id: string;
  file: File | null;
  existingDocument?: ApprovalDocument;
  onChange: (file: File | null, error: string) => void;
}) {
  return <div className="approval-document-field">
    <label htmlFor={id}>Supporting document (JPEG or PDF)</label>
    <input id={id} type="file" accept=".jpg,.jpeg,.pdf,image/jpeg,application/pdf" required={!existingDocument} onChange={(event) => {
      const selected = event.currentTarget.files?.[0] ?? null;
      if (!selected) { onChange(null, ""); return; }
      if (!getApprovalDocumentType(selected)) {
        event.currentTarget.value = "";
        onChange(null, "Choose a JPEG or PDF document.");
        return;
      }
      if (selected.size === 0) {
        event.currentTarget.value = "";
        onChange(null, "The selected document is empty.");
        return;
      }
      if (selected.size > maximumApprovalDocumentSize) {
        event.currentTarget.value = "";
        onChange(null, "The document must be 2 MB or smaller.");
        return;
      }
      onChange(selected, "");
    }} />
    <small>{file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB` : existingDocument ? `${existingDocument.name} · existing document retained unless replaced.` : "Required · JPEG or PDF, up to 2 MB."}</small>
  </div>;
}

function ApprovalRejectionNotice({ reason }: { reason?: string }) {
  return <aside className="approval-rejection-notice" role="note">
    <strong>Reason for rejection</strong>
    <p>{reason?.trim() || "No rejection reason was recorded."}</p>
  </aside>;
}

function PurchaseOrderDialog({ items, locations, suppliers, suggestedNumber, onAddSupplier, onClose, onCreate, initialApproval }: {
  items: InventoryItem[];
  locations: DashboardData["inventoryLocations"];
  suppliers: SupplierProfile[];
  suggestedNumber: string;
  onAddSupplier: (draft: SupplierProfile) => string | null;
  onClose: () => void;
  onCreate: (order: SupplierDetails & { number: string; lines: PurchaseOrderLine[]; location: string; document: ApprovalDocument }) => string | null;
  initialApproval?: Extract<ApprovalRequest, { type: "purchase-order" }>;
}) {
  const [number, setNumber] = useState(initialApproval?.payload.number ?? suggestedNumber);
  const [supplier, setSupplier] = useState(initialApproval?.payload.supplier ?? "");
  const [supplierAddress, setSupplierAddress] = useState(initialApproval?.payload.supplierAddress ?? "");
  const [supplierContact, setSupplierContact] = useState(initialApproval?.payload.supplierContact ?? "");
  const [location, setLocation] = useState(() => initialApproval?.payload.location ?? locations[0]?.location ?? "");
  const [lines, setLines] = useState(() => initialApproval?.payload.lines?.map((line) => ({ sku: line.sku, quantity: String(line.quantity), unitPrice: String(line.unitPrice) })) ?? [{ sku: items[0]?.sku ?? "", quantity: "1", unitPrice: "" }]);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const updateLine = (index: number, field: "sku" | "quantity" | "unitPrice", value: string) => {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line));
  };
  const orderTotal = lines.reduce((total, line) => total + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0), 0);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const orderLines = lines.map((line) => {
      const selectedItem = items.find(({ sku }) => sku === line.sku);
      return {
        item: selectedItem?.item ?? "",
        sku: line.sku,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
      };
    });
    if (!supplier.trim() || !location || orderLines.some((line) => !line.item || !Number.isInteger(line.quantity) || line.quantity < 1 || !Number.isFinite(line.unitPrice) || line.unitPrice <= 0)) return;
    if (!documentFile && !initialApproval?.payload.document) { setError("Attach a JPEG or PDF document before submitting for approval."); return; }
    setIsSubmitting(true);
    try {
      const document = documentFile ? await storeApprovalDocument(documentFile) : initialApproval?.payload.document;
      if (!document) throw new Error("The supporting document is unavailable. Attach a replacement before submitting.");
      const failure = onCreate({ number: number.trim(), supplier, supplierAddress, supplierContact, lines: orderLines, location, document });
      if (failure) {
        if (documentFile) await removeApprovalDocument(document.id).catch(() => undefined);
        setError(failure);
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The document could not be saved.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return <InventoryDialog title={initialApproval ? "Edit rejected purchase order" : "Request purchase order"} onClose={onClose}>
    <form className="inventory-form" onSubmit={submit}>
      {initialApproval && <ApprovalRejectionNotice reason={initialApproval.rejectionReason} />}
      <SupplierPicker id="po-supplier" suppliers={suppliers} onAddSupplier={onAddSupplier} value={supplier} onSelect={(profile) => { setSupplier(profile.name); setSupplierAddress(profile.address ?? ""); setSupplierContact([profile.phone, profile.email, profile.contact].filter(Boolean).join(" • ") || ""); }} />
      <div className="invoice-reference-control">
        <label htmlFor="po-number">Purchase order number</label>
        <div><input id="po-number" required maxLength={50} value={number} onChange={(event) => setNumber(event.target.value)} placeholder="e.g. PO-2026-184" /><button type="button" className="table-action-button" onClick={() => setNumber(suggestedNumber)}><FileCheck2 size={14} /> Generate</button></div>
      </div>
      <label htmlFor="po-location">Receiving location</label><select id="po-location" required value={location} onChange={(event) => setLocation(event.target.value)}><option value="" disabled>Select location</option>{locations.map((entry) => <option key={entry.location} value={entry.location}>{entry.location} · {entry.stock}/{entry.capacity} units</option>)}</select>
      <div className="purchase-order-lines-editor">
        <div className="purchase-order-lines-heading"><strong>Order items</strong></div>
        {lines.map((line, index) => <div className="purchase-order-line" key={`${index}-${line.sku}`}>
          <div className="purchase-order-line-heading"><strong>Item {index + 1}</strong>{lines.length > 1 && <button type="button" className="purchase-order-line-remove" aria-label={`Remove item ${index + 1}`} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}><X size={14} /></button>}</div>
          <label htmlFor={`po-item-${index}`}>Inventory item</label><select id={`po-item-${index}`} required value={line.sku} onChange={(event) => updateLine(index, "sku", event.target.value)}>{items.map((item) => <option key={item.sku} value={item.sku}>{item.item} · {item.sku}</option>)}</select>
          <div className="inventory-form-row"><div><label htmlFor={`po-quantity-${index}`}>Quantity</label><input id={`po-quantity-${index}`} type="number" required min="1" step="1" value={line.quantity} onChange={(event) => updateLine(index, "quantity", event.target.value)} /></div><div><label htmlFor={`po-unit-price-${index}`}>Unit price (₦)</label><input id={`po-unit-price-${index}`} type="number" required min="0.01" step="0.01" value={line.unitPrice} onChange={(event) => updateLine(index, "unitPrice", event.target.value)} /></div></div>
        </div>)}
        <button type="button" className="table-action-button purchase-order-lines-add-button" onClick={() => setLines((current) => [...current, { sku: items[0]?.sku ?? "", quantity: "1", unitPrice: "" }])}><Plus size={13} /> Add item</button>
      </div>
      <ApprovalDocumentUploadField id="purchase-order-document" file={documentFile} existingDocument={initialApproval?.payload.document} onChange={(file, validationError) => { setDocumentFile(file); setError(validationError); }} />
      <p className="inventory-form-total">Order total <strong>{formatNaira(orderTotal)}</strong></p>
      {error && <p className="inventory-error" role="alert">{error}</p>}
      <footer><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={isSubmitting}><Plus size={15} /> {initialApproval ? "Resubmit" : "Submit"}</button></footer>
    </form>
  </InventoryDialog>;
}

function PurchaseOrderReviewDrawer({ order, locations, onClose, onStatusChange }: {
  order: DashboardData["purchaseOrders"][number];
  locations: DashboardData["inventoryLocations"];
  onClose: () => void;
  onStatusChange: (status: string, location: string) => string | null;
}) {
  const [status, setStatus] = useState("");
  const [location, setLocation] = useState(order.location ?? "");
  const [message, setMessage] = useState("");
  const [confirmingStatus, setConfirmingStatus] = useState(false);
  const { download, ready: pdfReady, error: pdfError } = useFinancialPdfDownload();
  const statuses = ["Received", "Canceled"];
  const saveStatus = () => {
    setConfirmingStatus(true);
  };
  const confirmStatusChange = () => {
    setConfirmingStatus(false);
    const error = onStatusChange(status, location);
    setMessage(error ?? `Purchase order status updated to ${status}.`);
    if (!error) setStatus("");
  };
  const downloadOrderPdf = () => download({
    title: `Purchase Order ${order.number}`,
    subtitle: order.supplier,
    period: order.dateKey ? `Created ${formatDateKey(order.dateKey)}` : undefined,
    summaries: [
      { label: "Status", value: order.status },
      { label: "Receiving location", value: order.location ?? "Not specified" },
      { label: "Supplier", value: order.supplier },
    ],
    sections: [{
      title: "Order items",
      columns: ["Item", "SKU", "Quantity", "Unit price", "Line total"],
      rows: [
        ...(order.lines ?? []).map((line) => ({
          cells: [line.item, line.sku, String(line.quantity), formatNaira(line.unitPrice), formatNaira(line.quantity * line.unitPrice)],
        })),
        {
        cells: ["Order total", "", String(order.quantity ?? order.items), "", formatNaira(order.amount)],
        emphasize: true,
        },
      ],
    }],
    footer: `Supplier address: ${order.supplierAddress || "Not provided"} · Contact: ${order.supplierContact || "Not provided"}`,
    filename: `Purchase-Order-${order.number}`,
  });
  return <InventoryDialog title={`Purchase order ${order.number}`} onClose={onClose}>
    <div className="purchase-order-review">
      <section><h3>Supplier</h3><dl className="record-drawer-fields">
        <div><dt>Name</dt><dd>{order.supplier}</dd></div>
        <div><dt>Address</dt><dd>{order.supplierAddress ?? "Not provided"}</dd></div>
        <div><dt>Contact</dt><dd>{order.supplierContact ?? "Not provided"}</dd></div>
      </dl></section>
      <section><h3>Order items</h3>{order.lines?.length
        ? <div className="purchase-order-review-lines">{order.lines.map((line, index) => <div key={`${line.sku}-${index}`}><div><strong>{line.item}</strong><small>SKU: {line.sku}</small><small>Quantity: {line.quantity} {line.quantity === 1 ? "unit" : "units"}</small><small>Unit price: {formatNaira(line.unitPrice)}</small></div><div className="purchase-order-line-total"><small>Line total</small><strong>{formatNaira(line.quantity * line.unitPrice)}</strong></div></div>)}</div>
        : <p className="purchase-order-no-lines">No item-level details are available for this order.</p>}
      </section>
      <dl className="record-drawer-fields">
        <div><dt>Receiving location</dt><dd>{order.location ?? "Choose before receipt"}</dd></div>
        <div><dt>Total quantity</dt><dd>{order.quantity ?? order.items}</dd></div>
        <div><dt>Order total</dt><dd>{formatNaira(order.amount)}</dd></div>
        <div><dt>Status</dt><dd>{order.status}</dd></div>
        {order.dateKey && <div><dt>Created</dt><dd>{formatDateKey(order.dateKey)}</dd></div>}
      </dl>
      <section className="procurement-status-editor"><h3>Update status</h3>
        <p>Current status: <strong>{order.status}</strong></p>
        <label htmlFor="purchase-order-receiving-location">Receiving location</label>
        <select id="purchase-order-receiving-location" value={location} onChange={(event) => { setLocation(event.target.value); setMessage(""); }}><option value="" disabled>Select location</option>{locations.map((entry) => <option key={entry.location} value={entry.location}>{entry.location} · {entry.stock}/{entry.capacity} units</option>)}</select>
        <label htmlFor="purchase-order-review-status">Status</label>
        <select id="purchase-order-review-status" value={status} onChange={(event) => { setStatus(event.target.value); setMessage(""); }}><option value="" disabled>Select status</option>{statuses.map((option) => <option key={option} value={option} disabled={order.status === "Received" && option !== "Received"}>{option}</option>)}</select>
        <button type="button" className="primary-button" disabled={!status || status === order.status && location === order.location} onClick={saveStatus}>Save changes</button>
        {message && <p className="record-status-message" role="status">{message}</p>}
      </section>
      {pdfError && <p className="inventory-error" role="alert">{pdfError}</p>}
      {confirmingStatus && <StatusChangeConfirmation
        title="Confirm purchase order status change"
        message={`Change purchase order ${order.number} from ${order.status} to ${status}?`}
        onCancel={() => setConfirmingStatus(false)}
        onConfirm={confirmStatusChange}
      />}
    </div>
    <footer className="record-drawer-footer"><button type="button" className="outline-button" disabled={!pdfReady} onClick={downloadOrderPdf}><Download size={14} /> {pdfReady ? "Download PDF" : "Preparing PDF..."}</button><button type="button" className="primary-button" onClick={onClose}>Done</button></footer>
  </InventoryDialog>;
}

function ProcurementReviewDrawer({ request, onClose, onGenerateReference, onStatusChange }: {
  request: DashboardData["procurements"][number];
  onClose: () => void;
  onGenerateReference: () => string | null;
  onStatusChange: (status: string) => string | null;
}) {
  const [reference, setReference] = useState(request.reference ?? "");
  const [status, setStatus] = useState(() => procurementStatuses.find((option) => option === request.status) ?? "");
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [confirmingStatus, setConfirmingStatus] = useState(false);
  const generateReference = () => {
    const generatedReference = onGenerateReference();
    if (!generatedReference) {
      setMessage("Could not generate a reference. Please close and retry.");
      return;
    }
    setReference(generatedReference);
    setMessage("Procurement reference generated.");
  };
  const saveStatus = () => {
    setConfirmingStatus(true);
  };
  const confirmStatusChange = () => {
    setConfirmingStatus(false);
    const error = onStatusChange(status);
    setMessage(error ?? `Procurement status updated to ${status}.`);
    setMessageIsError(Boolean(error));
    if (!error) setStatus("");
  };
  return <InventoryDialog title={`Review ${request.reference ?? "procurement"}`} onClose={onClose}>
    <div className="purchase-order-review">
      <section><h3>Procurement reference</h3><div className="procurement-reference-control">
        <input aria-label="Procurement reference" value={reference} readOnly placeholder="No reference generated" />
        {!reference && <button type="button" className="table-action-button" onClick={generateReference}><FileCheck2 size={14} /> Generate reference</button>}
      </div></section>
      <section><h3>Request details</h3><dl className="record-drawer-fields">
        <div><dt>Item or service</dt><dd>{request.item}</dd></div>
        <div><dt>Amount</dt><dd>{formatNaira(request.amount)}</dd></div>
        <div><dt>Required by</dt><dd>{request.due}</dd></div>
        <div><dt>Status</dt><dd>{request.status}</dd></div>
      </dl></section>
      <section><h3>Supplier details</h3><dl className="record-drawer-fields">
        <div><dt>Name</dt><dd>{request.supplier}</dd></div>
        <div><dt>Address</dt><dd>{request.supplierAddress ?? "Not provided"}</dd></div>
        <div><dt>Contact</dt><dd>{request.supplierContact ?? "Not provided"}</dd></div>
      </dl></section>
      <section className="procurement-status-editor"><h3>Update status</h3>
        <p>Current status: <strong>{request.status}</strong></p>
        <label htmlFor="procurement-review-status">Status</label>
        <select id="procurement-review-status" value={status} onChange={(event) => { setStatus(event.target.value); setMessage(""); setMessageIsError(false); }}>
          <option value="" disabled>Select status</option>
          {procurementStatuses.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <button type="button" className="primary-button" disabled={!status || status === request.status} onClick={saveStatus}>Save changes</button>
      </section>
      {message && <p className={messageIsError ? "inventory-error" : "record-status-message"} role={messageIsError ? "alert" : "status"}>{message}</p>}
      {confirmingStatus && <StatusChangeConfirmation
        title="Confirm procurement status change"
        message={`Change procurement ${request.reference ?? request.item} from ${request.status} to ${status}?`}
        onCancel={() => setConfirmingStatus(false)}
        onConfirm={confirmStatusChange}
      />}
    </div>
    <footer className="record-drawer-footer"><button type="button" className="primary-button" onClick={onClose}>Done</button></footer>
  </InventoryDialog>;
}

export function ProcurementDialog({ suppliers, onAddSupplier, onClose, onCreate, initialApproval }: {
  suppliers: SupplierProfile[];
  onAddSupplier: (draft: SupplierProfile) => string | null;
  onClose: () => void;
  onCreate: (request: SupplierDetails & { item: string; amount: number; dueDate: string; billReference?: string; billType?: "expense" | "inventory"; document: ApprovalDocument }) => string | null;
  initialApproval?: Extract<ApprovalRequest, { type: "procurement" }>;
}) {
  const getDueDateInputValue = (due: string) => {
    const [dayText, monthText] = due.trim().split(/\s+/);
    const monthIndex = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(monthText);
    const day = Number(dayText);
    if (monthIndex < 0 || !Number.isInteger(day) || day < 1 || day > 31) return toDateKey(new Date());
    const date = new Date(new Date().getFullYear(), monthIndex, day);
    return date.getMonth() === monthIndex ? toDateKey(date) : toDateKey(new Date());
  };
  const [item, setItem] = useState(initialApproval?.payload.item ?? "");
  const [supplier, setSupplier] = useState(initialApproval?.payload.supplier ?? "");
  const [supplierAddress, setSupplierAddress] = useState(initialApproval?.payload.supplierAddress ?? "");
  const [supplierContact, setSupplierContact] = useState(initialApproval?.payload.supplierContact ?? "");
  const [billReference, setBillReference] = useState(initialApproval?.payload.billReference ?? "");
  const [billType, setBillType] = useState<"expense" | "inventory">(initialApproval?.payload.billType ?? "expense");
  const [amount, setAmount] = useState(initialApproval ? String(initialApproval.payload.amount) : "");
  const [dueDate, setDueDate] = useState(() => initialApproval ? getDueDateInputValue(initialApproval.payload.due) : toDateKey(new Date()));
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const generateBillReferenceValue = () => setBillReference(generateBillReference([billReference]));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!item.trim() || !supplier.trim() || !billReference.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || !dueDate) return;
    if (!documentFile && !initialApproval?.payload.document) { setError("Attach a JPEG or PDF document before submitting for approval."); return; }
    setIsSubmitting(true);
    try {
      const document = documentFile ? await storeApprovalDocument(documentFile) : initialApproval?.payload.document;
      if (!document) throw new Error("The supporting document is unavailable. Attach a replacement before submitting.");
      const failure = onCreate({ item, supplier, supplierAddress, supplierContact, billReference: billReference.trim(), billType, amount: parsedAmount, dueDate, document });
      if (failure) {
        if (documentFile) await removeApprovalDocument(document.id).catch(() => undefined);
        setError(failure);
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The document could not be saved.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return <InventoryDialog title={initialApproval ? "Edit rejected procurement request" : "Create procurement request"} onClose={onClose}>
    <form className="inventory-form" onSubmit={submit}>
      {initialApproval && <ApprovalRejectionNotice reason={initialApproval.rejectionReason} />}
      <label htmlFor="procurement-item">Item or service</label><input id="procurement-item" required maxLength={120} value={item} onChange={(event) => setItem(event.target.value)} placeholder="What needs to be procured?" autoFocus />
      <SupplierPicker id="procurement-supplier" suppliers={suppliers} onAddSupplier={onAddSupplier} value={supplier} onSelect={(profile) => { setSupplier(profile.name); setSupplierAddress(profile.address ?? ""); setSupplierContact([profile.phone, profile.email, profile.contact].filter(Boolean).join(" • ") || ""); }} />
      <div className="procurement-reference-control" style={{ display: "grid", gap: 8 }}>
        <label htmlFor="procurement-reference">Bill reference</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input id="procurement-reference" required maxLength={50} value={billReference} onChange={(event) => setBillReference(event.target.value)} placeholder="e.g. BILL-1042" style={{ flex: 1 }} />
          <button type="button" className="table-action-button" onClick={generateBillReferenceValue}><FileCheck2 size={14} /> Generate</button>
        </div>
      </div>
      <label htmlFor="procurement-bill-type">Bill category</label><select id="procurement-bill-type" value={billType} onChange={(event) => setBillType(event.target.value === "inventory" ? "inventory" : "expense")}><option value="expense">Expense or service</option><option value="inventory">Goods received into stock</option></select>
      <label htmlFor="procurement-amount">Amount (₦)</label><input id="procurement-amount" type="number" required min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" />
      <label htmlFor="procurement-due">Due date</label><input id="procurement-due" type="date" required min={initialApproval ? undefined : toDateKey(new Date())} value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
      <ApprovalDocumentUploadField id="procurement-document" file={documentFile} existingDocument={initialApproval?.payload.document} onChange={(file, validationError) => { setDocumentFile(file); setError(validationError); }} />
      <p className="inventory-form-hint">The request will be added to the approval queue. A purchase order can be created after approval.</p>
      {error && <p className="inventory-error" role="alert">{error}</p>}
      <footer><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={isSubmitting}><FileCheck2 size={15} /> {initialApproval ? "Resubmit" : "Submit"}</button></footer>
    </form>
  </InventoryDialog>;
}

function AddInventoryDialog({ locations, onClose, onAdd, onSuccess }: {
  locations: DashboardData["inventoryLocations"];
  onClose: () => void;
  onAdd: (item: { item: string; sku: string; location: string; quantity: number; unitCost: number; sellingPrice: number; reorderLevel: number }) => string | null;
  onSuccess: (item: string, quantity: number) => void;
}) {
  const [item, setItem] = useState("");
  const [sku, setSku] = useState("");
  const [locationName, setLocationName] = useState(() => locations.find(({ stock, capacity }) => stock < capacity)?.location ?? "");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [reorderLevel, setReorderLevel] = useState("5");
  const [error, setError] = useState("");
  const availableLocations = locations.filter(({ stock, capacity }) => stock < capacity);
  const location = locations.find(({ location: name }) => name === locationName);
  const maxQuantity = location ? location.capacity - location.stock : 0;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedQuantity = Number(quantity);
    const parsedUnitCost = Number(unitCost);
    const parsedSellingPrice = Number(sellingPrice || 0);
    if (!item.trim() || !sku.trim() || !location || !Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > maxQuantity || !Number.isFinite(parsedUnitCost) || parsedUnitCost <= 0 || !Number.isFinite(parsedSellingPrice) || parsedSellingPrice < 0 || Math.abs(parsedSellingPrice * 100 - Math.round(parsedSellingPrice * 100)) > 1e-7) {
      setError("Enter valid item details, a positive quantity within the location capacity, a positive unit cost, and an optional sale price with up to two decimal places.");
      return;
    }
    const parsedReorderLevel = Number(reorderLevel);
    if (!Number.isInteger(parsedReorderLevel) || parsedReorderLevel < 0) {
      setError("Enter a non-negative whole-number reorder level.");
      return;
    }
    const failure = onAdd({ item, sku, location: locationName, quantity: parsedQuantity, unitCost: parsedUnitCost, sellingPrice: parsedSellingPrice, reorderLevel: parsedReorderLevel });
    if (failure) {
      setError(failure);
      return;
    }
    onSuccess(item.trim(), parsedQuantity);
  };
  return <InventoryDialog title="Add inventory" onClose={onClose}>
    <form className="inventory-form" onSubmit={submit}>
      <label htmlFor="new-inventory-item">Item name</label><input id="new-inventory-item" required maxLength={120} value={item} onChange={(event) => { setItem(event.target.value); setError(""); }} placeholder="Enter inventory item name" autoFocus />
      <label htmlFor="new-inventory-sku">SKU</label><input id="new-inventory-sku" required maxLength={32} value={sku} onChange={(event) => { setSku(event.target.value); setError(""); }} placeholder="e.g. ACC-021" />
      <label htmlFor="new-inventory-location">Stock location</label><select id="new-inventory-location" required value={locationName} onChange={(event) => { setLocationName(event.target.value); setError(""); }}><option value="" disabled>Select a location</option>{availableLocations.map((entry) => <option key={entry.location} value={entry.location}>{entry.location} · {entry.stock}/{entry.capacity} units</option>)}</select>
      <div className="inventory-form-row"><div><label htmlFor="new-inventory-quantity">Opening quantity</label><input id="new-inventory-quantity" type="number" required min="1" max={maxQuantity} step="1" value={quantity} onChange={(event) => { setQuantity(event.target.value); setError(""); }} /></div><div><label htmlFor="new-inventory-unit-cost">Unit cost (₦)</label><input id="new-inventory-unit-cost" type="number" required min="0.01" step="0.01" value={unitCost} onChange={(event) => { setUnitCost(event.target.value); setError(""); }} /></div></div>
      <label htmlFor="new-inventory-selling-price">Unit selling price (₦) <small>Optional</small></label><input id="new-inventory-selling-price" type="number" min="0" step="0.01" value={sellingPrice} onChange={(event) => { setSellingPrice(event.target.value); setError(""); }} placeholder="Not set" />
      <label htmlFor="new-inventory-reorder-level">Reorder level</label><input id="new-inventory-reorder-level" type="number" required min="0" step="1" value={reorderLevel} onChange={(event) => { setReorderLevel(event.target.value); setError(""); }} />
      <p className="inventory-form-total">Opening inventory value <strong>{formatNaira((Number(quantity) || 0) * (Number(unitCost) || 0))}</strong></p>
      {!availableLocations.length && <p className="inventory-form-hint">All locations are at capacity. Increase a location's capacity before adding stock.</p>}
      {error && <p className="inventory-error" role="alert">{error}</p>}
      <footer><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={!availableLocations.length}><Plus size={15} /> Add</button></footer>
    </form>
  </InventoryDialog>;
}

function InventorySellingPriceDialog({ item, onClose, onSave, onSuccess }: {
  item: InventoryItem;
  onClose: () => void;
  onSave: (sku: string, sellingPrice: number) => string | null;
  onSuccess: (sellingPrice: number) => void;
}) {
  const [sellingPrice, setSellingPrice] = useState(item.sellingPrice && item.sellingPrice > 0 ? String(item.sellingPrice) : "");
  const [error, setError] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedPrice = Number(sellingPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0 || Math.abs(parsedPrice * 100 - Math.round(parsedPrice * 100)) > 1e-7) {
      setError("Enter a selling price with no more than two decimal places, or leave it unset.");
      return;
    }
    const failure = onSave(item.sku, parsedPrice);
    if (failure) {
      setError(failure);
      return;
    }
    onSuccess(parsedPrice);
  };
  return <InventoryDialog title="Set unit selling price" onClose={onClose}>
    <form className="inventory-form" onSubmit={submit}>
      <p className="inventory-price-item">{item.item} · {item.sku}</p>
      <label htmlFor="inventory-selling-price">Unit selling price (₦) <small>Optional</small></label>
      <input id="inventory-selling-price" type="number" min="0" step="0.01" value={sellingPrice} onChange={(event) => { setSellingPrice(event.target.value); setError(""); }} autoFocus placeholder="Not set" />
      <p className="inventory-form-hint">Leave blank to clear the sale price. This is separate from the unit cost used to value stock.</p>
      {error && <p className="inventory-error" role="alert">{error}</p>}
      <footer><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Check size={15} /> Save price</button></footer>
    </form>
  </InventoryDialog>;
}

function AddInventoryLocationDialog({ initialLocation, onClose, onAdd, onSuccess }: {
  initialLocation?: DashboardData["inventoryLocations"][number];
  onClose: () => void;
  onAdd: (location: { location: string; capacity: number }) => string | null;
  onSuccess: (location: string) => void;
}) {
  const [location, setLocation] = useState(initialLocation?.location ?? "");
  const [capacity, setCapacity] = useState(initialLocation ? String(initialLocation.capacity) : "");
  const [error, setError] = useState("");
  const isEditing = Boolean(initialLocation);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedCapacity = Number(capacity);
    if (!location.trim() || !Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
      setError("Enter a location name and a positive whole-number capacity.");
      return;
    }
    const failure = onAdd({ location, capacity: parsedCapacity });
    if (failure) {
      setError(failure);
      return;
    }
    onSuccess(location.trim());
  };
  return <InventoryDialog title={isEditing ? "Edit inventory location" : "Add inventory location"} onClose={onClose}>
    <form className="inventory-form" onSubmit={submit}>
      <label htmlFor="new-inventory-location-name">Location name</label><input id="new-inventory-location-name" required maxLength={80} value={location} onChange={(event) => { setLocation(event.target.value); setError(""); }} placeholder="e.g. Enugu warehouse" autoFocus readOnly={isEditing} />
      <label htmlFor="new-inventory-location-capacity">Stock capacity (units)</label><input id="new-inventory-location-capacity" type="number" required min="1" step="1" value={capacity} onChange={(event) => { setCapacity(event.target.value); setError(""); }} placeholder="Enter maximum stock units" />
      <p className="inventory-form-hint">{isEditing ? `Current stock is ${initialLocation?.stock ?? 0} units. Increase the capacity above this level or reduce it only if the stock level allows.` : "The new location will start with zero stock. You can add inventory to it after creation."}</p>
      {error && <p className="inventory-error" role="alert">{error}</p>}
      <footer><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Plus size={15} /> {isEditing ? "Save changes" : "Add location"}</button></footer>
    </form>
  </InventoryDialog>;
}

function StockAdjustmentDialog({ items, locations, initialItem, onClose, onAdjust }: {
  items: InventoryItem[];
  locations: DashboardData["inventoryLocations"];
  initialItem: InventoryItem;
  onClose: () => void;
  onAdjust: (adjustment: { sku: string; location: string; quantity: number; direction: "Add" | "Remove"; unitCost?: number }) => string | null;
}) {
  const [direction, setDirection] = useState<"Add" | "Remove">("Add");
  const [sku, setSku] = useState(initialItem.sku);
  const [locationName, setLocationName] = useState(locations[0]?.location ?? "");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [error, setError] = useState("");
  const item = items.find(({ sku: itemSku }) => itemSku === sku);
  const availableLocations = locations.filter((location) => direction === "Add" ? location.stock < location.capacity : location.stock > 0);
  useEffect(() => {
    if (!availableLocations.some(({ location }) => location === locationName)) setLocationName(availableLocations[0]?.location ?? "");
  }, [direction, locations, locationName]);
  const location = locations.find(({ location: name }) => name === locationName);
  const maxAllowed = item && location
    ? direction === "Add" ? location.capacity - location.stock : Math.min(item.stock, location.stock)
    : 0;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedQuantity = Number(quantity);
    if (!item || !location || !Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > maxAllowed) return;
    const parsedUnitCost = Number(unitCost);
    if (direction === "Add" && (!Number.isFinite(parsedUnitCost) || parsedUnitCost <= 0)) {
      setError("Enter a positive unit cost for incoming stock.");
      return;
    }
    const failure = onAdjust({ sku, location: locationName, quantity: parsedQuantity, direction, unitCost: direction === "Add" ? parsedUnitCost : undefined });
    if (failure) {
      setError(failure);
      return;
    }
  };
  return <InventoryDialog title="Adjust stock" onClose={onClose}>
    <form className="inventory-form" onSubmit={submit}>
      <label htmlFor="stock-item">Inventory item</label><select id="stock-item" value={sku} onChange={(event) => setSku(event.target.value)}>{items.map((entry) => <option key={entry.sku} value={entry.sku}>{entry.item} · {entry.sku} ({entry.stock} on hand)</option>)}</select>
      <label htmlFor="stock-direction">Adjustment</label><select id="stock-direction" value={direction} onChange={(event) => setDirection(event.target.value === "Add" ? "Add" : "Remove")}><option value="Add">Add stock</option><option value="Remove">Remove stock</option></select>
      <label htmlFor="stock-location">Location</label><select id="stock-location" required value={locationName} onChange={(event) => setLocationName(event.target.value)}>{availableLocations.map((entry) => <option key={entry.location} value={entry.location}>{entry.location} · {entry.stock}/{entry.capacity} units</option>)}</select>
      <label htmlFor="stock-quantity">Quantity</label><input id="stock-quantity" type="number" required min="1" max={maxAllowed} step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
      {direction === "Add" && <><label htmlFor="stock-unit-cost">Receipt unit cost (₦)</label><input id="stock-unit-cost" type="number" required min="0.01" step="0.01" value={unitCost} onChange={(event) => { setUnitCost(event.target.value); setError(""); }} /></>}
      <p className="inventory-form-hint">{maxAllowed > 0 ? `Up to ${maxAllowed} units can be ${direction === "Add" ? "added at this location" : "removed from this location"}.` : direction === "Add" ? "All locations are at capacity." : "There is no stock available to remove from this location."}</p>
      {error && <p className="inventory-error" role="alert">{error}</p>}
      <footer><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={maxAllowed < 1}>{direction === "Add" ? "Add stock" : "Remove stock"}</button></footer>
    </form>
  </InventoryDialog>;
}

function AudioTrailPage({ data }: { data: DashboardData }) {
  const [roleFilter, setRoleFilter] = useState("");
  const [roleFilterOpen, setRoleFilterOpen] = useState(false);
  const roleFilterRef = useRef<HTMLDivElement>(null);
  const getAuditUser = (event: DashboardData["auditEvents"][number]) =>
    data.users.find(({ name }) => name === event.user);
  const getAuditUserEmail = (event: DashboardData["auditEvents"][number]) =>
    event.email ?? getAuditUser(event)?.email ??
    (data.profile.name === event.user ? data.profile.email : undefined);
  const roles = [...new Set(data.users.map(({ role }) => role))].sort();
  const auditEvents = data.auditEvents.filter((event) => !roleFilter || getAuditUser(event)?.role === roleFilter);

  useEffect(() => {
    if (!roleFilterOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !roleFilterRef.current?.contains(event.target)) {
        setRoleFilterOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRoleFilterOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [roleFilterOpen]);

  return <section className="audio-trail-layout">
    <article className="panel audio-timeline-panel">
      <div className="audio-table-wrap">
        <div className="audio-filter-bar">
          <div className="audio-filter-menu" ref={roleFilterRef}>
            <button
              type="button"
              className={`audio-filter-chip ${roleFilter ? "selected" : ""}`}
              aria-label={roleFilter ? `Filter by role: ${roleFilter}` : "Add audit log filter"}
              aria-haspopup="dialog"
              aria-expanded={roleFilterOpen}
              onClick={() => setRoleFilterOpen((open) => !open)}
            >
              {!roleFilter && <Plus size={14} aria-hidden="true" />}
              <span>{roleFilter ? `Role: ${roleFilter}` : "Add filter"}</span>
              <ChevronDown size={13} aria-hidden="true" />
            </button>
            {roleFilterOpen && <div className="audio-filter-popover" role="dialog" aria-label="Filter audit logs">
              <strong>Filter by role</strong>
              <div className="audio-filter-options">
                {roles.map((role) => <button
                  key={role}
                  type="button"
                  className={roleFilter === role ? "active" : ""}
                  aria-pressed={roleFilter === role}
                  onClick={() => { setRoleFilter(role); setRoleFilterOpen(false); }}
                >
                  <span>{role}</span>{roleFilter === role && <Check size={14} aria-hidden="true" />}
                </button>)}
              </div>
            </div>}
          </div>
          {roleFilter && <button type="button" className="audio-filter-clear" onClick={() => setRoleFilter("")}>Clear filter</button>}
        </div>
        <div className="audio-mobile-list">
          {auditEvents.map((event) => <div className="audio-mobile-row" key={`${event.time}-${event.action}`}>
            <span>{event.dateKey ? `${formatDateKey(event.dateKey)}, ${event.time.match(/\d{2}:\d{2}$/)?.[0] ?? ""}` : event.time}</span>
            <strong>{event.user} {event.action}</strong>
            <span>{getAuditUserEmail(event) ?? "—"}</span>
          </div>)}
          {auditEvents.length === 0 && <p className="audio-empty">No audit logs match this filter.</p>}
        </div>
        <table className="audio-desktop-table">
          <thead><tr><th scope="col">Time</th><th scope="col">Activity</th><th scope="col">Email address</th><th scope="col">Role</th></tr></thead>
          <tbody>{auditEvents.map((event) => <tr key={`${event.time}-${event.action}`}>
            <td>{event.dateKey ? `${formatDateKey(event.dateKey)}, ${event.time.match(/\d{2}:\d{2}$/)?.[0] ?? ""}` : event.time}</td>
            <td>{event.user} {event.action}</td>
            <td>{getAuditUserEmail(event) ?? "—"}</td>
            <td>{getAuditUser(event)?.role ?? "—"}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </article>
  </section>;
}

function ProfileSettingsCards({
  savedProfile,
  onSave,
  organization,
  onSaveOrganization,
  workspaceRole,
  darkMode,
  onDarkModeChange,
  approvalRules,
  userManagement,
}: {
  savedProfile: ProfileSettings;
  onSave: (profile: ProfileSettings) => void;
  organization: OrganizationSettings;
  onSaveOrganization: (organization: OrganizationSettings) => void;
  workspaceRole: string;
  darkMode: boolean;
  onDarkModeChange: (enabled: boolean) => void;
  approvalRules?: ReactNode;
  userManagement?: ReactNode;
}) {
  type SettingsSection = "Profile" | "Appearance" | "Notifications" | "Security & session" | "Organization" | "Approval rules" | "Users & roles";
  const [selectedSection, setSelectedSection] = useState<SettingsSection>("Profile");
  const [profile, setProfile] = useState(savedProfile);
  const [saveMessage, setSaveMessage] = useState("");
  const updateProfile = <Key extends keyof ProfileSettings>(key: Key, value: ProfileSettings[Key]) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setSaveMessage("");
  };
  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      localStorage.setItem(profileStorageKey, JSON.stringify(profile));
      onSave(profile);
      setSaveMessage("Your profile settings have been saved on this device.");
    } catch (error) {
      console.error("Could not save profile settings.", error);
      setSaveMessage("We couldn't save your changes. Check browser storage and try again.");
    }
  };
  const preferenceRows: { key: "invoiceAlerts" | "reconciliationAlerts" | "weeklySummary"; title: string; description: string }[] = [
    { key: "invoiceAlerts", title: "Invoice activity", description: "Updates when invoices need your review or approval." },
    { key: "reconciliationAlerts", title: "Reconciliation alerts", description: "Notify me about unmatched or flagged transactions." },
    { key: "weeklySummary", title: "Weekly finance summary", description: "Receive a weekly overview of key finance activity." },
  ];

  const canManageWorkspace = workspaceRole === "Finance Admin";
  const sections: { group: string; items: SettingsSection[] }[] = [
    { group: "Personal", items: ["Profile", "Appearance", "Notifications", "Security & session"] },
    ...(canManageWorkspace ? [{ group: "Workspace", items: ["Organization"] as SettingsSection[] }] : []),
    ...(canManageWorkspace ? [{ group: "Administration", items: ["Approval rules", "Users & roles"] as SettingsSection[] }] : []),
  ];
  const visibleSections = sections.flatMap(({ items }) => items);
  const activeSection = visibleSections.includes(selectedSection) ? selectedSection : "Profile";
  const sectionDescriptions: Record<SettingsSection, string> = {
    Profile: "Update your personal details.",
    Appearance: "Choose the dashboard color theme.",
    Notifications: "Choose which finance activity and summaries you hear about.",
    "Security & session": "View sign-in security and the current device session.",
    Organization: "Manage your organization’s identity, contact information, and registration details.",
    "Approval rules": "Set review requirements for invoices and receivables.",
    "Users & roles": "Invite teammates and manage their workspace roles.",
  };

  return <section className="settings-layout">
    <nav className="panel settings-navigation" aria-label="Settings sections">
      {sections.map(({ group, items }) => <div className="settings-nav-group" key={group}>
        <h3>{group}</h3>
        {items.map((item) => <button
          type="button"
          key={item}
          className={`settings-nav-item ${activeSection === item ? "active" : ""}`}
          aria-current={activeSection === item ? "page" : undefined}
          onClick={() => setSelectedSection(item)}
        >{item}</button>)}
      </div>)}
    </nav>
    <main className="settings-content">
      <header className="settings-content-heading">
        <h2>{activeSection}</h2>
        <p>{sectionDescriptions[activeSection]}</p>
      </header>
      {activeSection === "Profile" && <div className="settings-section-body">
        <form className="panel profile-editor-form" onSubmit={saveProfile}>
          <div className="profile-fields-grid">
            <label className="profile-field"><span>Full name</span><div><UserRound size={16} /><input required value={profile.name} onChange={(event) => updateProfile("name", event.target.value)} autoComplete="name" /></div></label>
            <div className="profile-field profile-field-readonly" role="group" aria-label="Work email"><span>Work email</span><div><Mail size={16} aria-hidden="true" /><span className="profile-field-value">{profile.email}</span></div></div>
            <label className="profile-field"><span>Phone number <small>Optional</small></span><div><Phone size={16} /><input type="tel" value={profile.phone} onChange={(event) => updateProfile("phone", event.target.value)} autoComplete="tel" placeholder="Add a contact number" /></div></label>
            <div className="profile-field profile-field-readonly" role="group" aria-label="Role"><span>Role</span><div><Building2 size={16} aria-hidden="true" /><span className="profile-field-value">{workspaceRole}</span></div></div>
          </div>
          <div className="profile-form-footer">
            <span className={saveMessage.startsWith("We couldn't") ? "profile-save-error" : ""} role="status" aria-live="polite">{saveMessage}</span>
            <button type="submit" className="primary-button"><Check size={15} /> Save changes</button>
          </div>
        </form>
      </div>}
      {activeSection === "Appearance" && <section className="panel settings-section-panel appearance-settings-panel">
        <div className="setting-row">
          <div><strong>Dark mode</strong><span>Use a darker color theme across the dashboard.</span></div>
          <button type="button" role="switch" aria-label="Dark mode" aria-checked={darkMode} className={`toggle ${darkMode ? "active" : ""}`} onClick={() => onDarkModeChange(!darkMode)}><i /></button>
        </div>
      </section>}
      {activeSection === "Notifications" && <form className="panel settings-section-panel" onSubmit={saveProfile}>
          <div className="profile-preference-list">
            {preferenceRows.map(({ key, title, description }) => <div className="profile-preference-row" key={key}>
              <div><strong>{title}</strong><span>{description}</span></div>
              <button type="button" role="switch" aria-checked={profile[key]} aria-label={title} className={`toggle ${profile[key] ? "active" : ""}`} onClick={() => updateProfile(key, !profile[key])}><i /></button>
            </div>)}
          </div>
          <div className="profile-form-footer">
            <span className={saveMessage.startsWith("We couldn't") ? "profile-save-error" : ""} role="status" aria-live="polite">{saveMessage}</span>
            <button type="submit" className="primary-button"><Check size={15} /> Save preferences</button>
          </div>
      </form>}
      {activeSection === "Organization" && canManageWorkspace && <OrganizationSettingsForm organization={organization} onSave={onSaveOrganization} />}
      {activeSection === "Security & session" && <div className="settings-section-body">
        <article className="panel settings-section-panel profile-security-panel">
        <div className="profile-security-status"><span><LockKeyhole size={16} /></span><div><strong>Sign-in isn't configured</strong><p>Password and two-step verification options will be available when workspace authentication is enabled.</p></div></div>
        </article>
        <article className="panel settings-section-panel profile-session-panel">
        <div className="profile-panel-heading">
          <div><h2>This device</h2></div>
          <Check size={18} aria-hidden="true" />
        </div>
        <div className="profile-session-detail"><span>Session status</span><strong>Active</strong></div>
        <div className="profile-session-detail"><span>Time zone</span><strong>{profile.timezone}</strong></div>
        </article>
      </div>}
      {activeSection === "Approval rules" && approvalRules}
      {activeSection === "Users & roles" && userManagement}
    </main>
  </section>;
}

function OrganizationSettingsForm({ organization, onSave }: {
  organization: OrganizationSettings;
  onSave: (organization: OrganizationSettings) => void;
}) {
  const [draft, setDraft] = useState(organization);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const allowedImageTypes = ["image/png", "image/jpeg", "image/webp"];

  const selectLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    setError("");
    setMessage("");
    if (!file) return;
    if (!allowedImageTypes.includes(file.type)) {
      setError("Choose a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setError("Choose an image smaller than 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string" || !/^data:image\/(?:png|jpeg|webp);base64,/i.test(result)) {
        setError("The selected image couldn't be read. Try another file.");
        return;
      }
      setDraft((current) => ({ ...current, logoDataUrl: result }));
    };
    reader.onerror = () => setError("The selected image couldn't be read. Try another file.");
    reader.onabort = () => setError("Reading the selected image was cancelled. Try again.");
    try {
      reader.readAsDataURL(file);
    } catch (readError) {
      console.error("Could not read organization logo.", readError);
      setError("The selected image couldn't be read. Try another file.");
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) {
      setError("Enter an organization name.");
      return;
    }
    const bankAccounts = draft.bankAccounts.map((account) => ({
      ...account,
      bankName: account.bankName.trim(),
      accountName: account.accountName.trim(),
      accountNumber: account.accountNumber.trim(),
      currency: account.currency.trim().toUpperCase(),
    }));
    if (bankAccounts.some((account) => !account.bankName || !account.accountName || !account.accountNumber || !account.currency)) {
      setError("Complete or remove each bank account before saving.");
      return;
    }
    const next = { ...draft, name, bankAccounts };
    try {
      localStorage.setItem(organizationStorageKey, JSON.stringify(next));
      setDraft(next);
      onSave(next);
      setError("");
      setMessage("Organization details saved on this device.");
    } catch (saveError) {
      console.error("Could not save organization settings.", saveError);
      setError("Organization details couldn't be saved. Check browser storage and try again.");
    }
  };
  const updateBankAccount = (id: string, field: Exclude<keyof OrganizationBankAccount, "id">, value: string) => {
    setDraft((current) => ({
      ...current,
      bankAccounts: current.bankAccounts.map((account) => account.id === id ? { ...account, [field]: value } : account),
    }));
    setMessage("");
    setError("");
  };

  return <form className="panel organization-settings-form" onSubmit={submit}>
    <div className="organization-logo-editor">
      {draft.logoDataUrl
        ? <img className="organization-logo-preview" src={draft.logoDataUrl} alt={`${draft.name || "Organization"} logo preview`} />
        : <span className="organization-logo-preview organization-logo-fallback" aria-hidden="true">{profileInitials(draft.name)}</span>}
      <div className="organization-logo-actions">
        <strong>Organization logo</strong>
        <span>PNG, JPG, or WebP. Maximum size 1 MB.</span>
        <div>
          <label className="outline-button organization-upload-button">Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={selectLogo} /></label>
          {draft.logoDataUrl && <button type="button" className="organization-remove-logo" onClick={() => { setDraft((current) => ({ ...current, logoDataUrl: "" })); setMessage(""); setError(""); }}>Remove logo</button>}
        </div>
      </div>
    </div>
    <div className="organization-code-card">
      <span><small>Unique identifier for this organization</small></span>
      <code>{draft.code}</code>
    </div>
    <div className="organization-details-grid">
      <label className="profile-field"><span>Organization name</span><div><Building2 size={16} aria-hidden="true" /><input required maxLength={120} autoComplete="organization" value={draft.name} onChange={(event) => { setDraft((current) => ({ ...current, name: event.target.value })); setMessage(""); }} /></div></label>
      <label className="profile-field"><span>Contact email</span><div><Mail size={16} aria-hidden="true" /><input type="email" maxLength={160} autoComplete="email" value={draft.contactEmail} onChange={(event) => { setDraft((current) => ({ ...current, contactEmail: event.target.value })); setMessage(""); }} placeholder="name@company.com" /></div></label>
      <label className="profile-field"><span>Contact phone</span><div><Phone size={16} aria-hidden="true" /><input type="tel" maxLength={40} autoComplete="tel" value={draft.contactPhone} onChange={(event) => { setDraft((current) => ({ ...current, contactPhone: event.target.value })); setMessage(""); }} placeholder="+234..." /></div></label>
      <label className="profile-field"><span>Website</span><div><Building2 size={16} aria-hidden="true" /><input type="url" maxLength={200} autoComplete="url" value={draft.website} onChange={(event) => { setDraft((current) => ({ ...current, website: event.target.value })); setMessage(""); }} placeholder="https://company.com" /></div></label>
      <label className="profile-field"><span>Registration number</span><div><FileCheck2 size={16} aria-hidden="true" /><input maxLength={80} value={draft.registrationNumber} onChange={(event) => { setDraft((current) => ({ ...current, registrationNumber: event.target.value })); setMessage(""); }} placeholder="Company registration" /></div></label>
      <label className="profile-field"><span>Tax ID</span><div><FileCheck2 size={16} aria-hidden="true" /><input maxLength={80} value={draft.taxId} onChange={(event) => { setDraft((current) => ({ ...current, taxId: event.target.value })); setMessage(""); }} placeholder="Tax identification number" /></div></label>
      <label className="profile-field organization-field-full organization-address-field"><span>Registered address</span><textarea rows={3} maxLength={500} autoComplete="street-address" value={draft.address} onChange={(event) => { setDraft((current) => ({ ...current, address: event.target.value })); setMessage(""); }} placeholder="Street address, city, region, postal code, country" /></label>
    </div>
    <section className="organization-bank-section" aria-labelledby="organization-bank-heading">
      <div className="organization-bank-heading"><div><h3 id="organization-bank-heading">Company bank accounts</h3><p>Add one or more accounts for company payments.</p></div><button type="button" className="table-action-button" onClick={() => { setDraft((current) => ({ ...current, bankAccounts: [...current.bankAccounts, createOrganizationBankAccount()] })); setError(""); setMessage(""); }}><Plus size={14} /> Add account</button></div>
      {draft.bankAccounts.map((account, index) => <fieldset className="organization-bank-account" key={account.id}>
        <legend>Bank account {index + 1}</legend>
        <button type="button" className="organization-bank-remove" aria-label={`Remove bank account ${index + 1}`} onClick={() => { setDraft((current) => ({ ...current, bankAccounts: current.bankAccounts.filter(({ id }) => id !== account.id) })); setError(""); setMessage(""); }}><Trash2 size={14} /> Remove</button>
        <div className="organization-bank-fields">
          <label className="profile-field"><span>Bank name</span><input required maxLength={100} value={account.bankName} onChange={(event) => updateBankAccount(account.id, "bankName", event.target.value)} placeholder="Bank name" /></label>
          <label className="profile-field"><span>Account name</span><input required maxLength={120} autoComplete="organization" value={account.accountName} onChange={(event) => updateBankAccount(account.id, "accountName", event.target.value)} placeholder="Company account name" /></label>
          <label className="profile-field"><span>Account number</span><input required maxLength={40} inputMode="numeric" value={account.accountNumber} onChange={(event) => updateBankAccount(account.id, "accountNumber", event.target.value)} placeholder="Account number" /></label>
          <label className="profile-field"><span>Currency</span><input required maxLength={3} minLength={3} value={account.currency} onChange={(event) => updateBankAccount(account.id, "currency", event.target.value)} placeholder="NGN" /></label>
        </div>
      </fieldset>)}
    </section>
    {error && <p className="organization-settings-message error" role="alert">{error}</p>}
    {message && <p className="organization-settings-message" role="status">{message}</p>}
    <footer className="profile-form-footer"><span /><button type="submit" className="primary-button"><Check size={15} /> Save organization</button></footer>
  </form>;
}

function SettingsPage({
  savedProfile,
  onSaveProfile,
  organization,
  onSaveOrganization,
  users,
  onSaveUsers,
  darkMode,
  onDarkModeChange,
}: {
  savedProfile: ProfileSettings;
  onSaveProfile: (profile: ProfileSettings) => void;
  organization: OrganizationSettings;
  onSaveOrganization: (organization: OrganizationSettings) => void;
  users: DashboardData["users"];
  onSaveUsers: (users: DashboardData["users"]) => boolean;
  darkMode: boolean;
  onDarkModeChange: (enabled: boolean) => void;
}) {
  const [settings, setSettings] = useState(() => readAdminSettings(defaultAdminSettings()));
  const [saveError, setSaveError] = useState("");
  const workspaceRole = getCurrentWorkspaceRole(users);
  const canManageWorkspace = workspaceRole === "Finance Admin";
  const saveSettings = (next: AdminSettings) => {
    try {
      localStorage.setItem(adminSettingsStorageKey, JSON.stringify(next));
      setSettings(next);
      setSaveError("");
    } catch (error) {
      console.error("Could not save admin settings.", error);
      setSaveError("Settings couldn't be saved on this device.");
    }
  };
  const toggleApprovalRule = (key: keyof AdminSettings["approvalRules"]) => saveSettings({
    ...settings,
    approvalRules: { ...settings.approvalRules, [key]: !settings.approvalRules[key] },
  });
  const saveUsers = (next: DashboardData["users"]) => {
    const saved = onSaveUsers(next);
    if (saved) {
      setSaveError("");
    } else {
      setSaveError("User changes couldn't be saved on this device.");
    }
    return saved;
  };
  const renderToggle = (title: string, checked: boolean, onToggle: () => void) => <button type="button" role="switch" aria-label={title} aria-checked={checked} className={`toggle ${checked ? "active" : ""}`} onClick={onToggle}><i /></button>;

  return <>
    {saveError && <p className="settings-save-error" role="alert">{saveError}</p>}
    <ProfileSettingsCards
      savedProfile={savedProfile}
      onSave={onSaveProfile}
      organization={organization}
      onSaveOrganization={onSaveOrganization}
      workspaceRole={workspaceRole}
      darkMode={darkMode}
      onDarkModeChange={onDarkModeChange}
      approvalRules={canManageWorkspace ? <article className="panel settings-section-panel settings-panel">
          <div className="setting-row"><div><strong>Flagged invoices require approval</strong><span>Keep flagged invoices out of the payment queue until reviewed.</span></div>{renderToggle("Flagged invoices require approval", settings.approvalRules.flaggedInvoicesRequireApproval, () => toggleApprovalRule("flaggedInvoicesRequireApproval"))}</div>
          <div className="setting-row"><div><strong>Require a purchase order</strong><span>Flag supplier invoices that do not reference an approved PO.</span></div>{renderToggle("Require a purchase order", settings.approvalRules.purchaseOrderRequired, () => toggleApprovalRule("purchaseOrderRequired"))}</div>
          <div className="setting-row"><div><strong>Overdue receivable alerts</strong><span>Notify workspace admins when customer balances pass due.</span></div>{renderToggle("Overdue receivable alerts", settings.approvalRules.overdueReceivableAlerts, () => toggleApprovalRule("overdueReceivableAlerts"))}</div>
        </article> : undefined}
      userManagement={canManageWorkspace ? <UserManagementTable users={users} onSave={saveUsers} /> : undefined}
    />
  </>;
}

function UserManagementTable({ users, onSave }: {
  users: DashboardData["users"];
  onSave: (users: DashboardData["users"]) => boolean;
}) {
  const [selectedUser, setSelectedUser] = useState<DashboardData["users"][number] | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  return <article className="panel settings-panel settings-users-panel">
    <div className="settings-users-table-wrap"><table className="settings-users-table">
      <thead><tr><th>User</th><th>Role</th><th>Action</th></tr></thead>
      <tbody>{users.map((user) => <tr key={user.name}>
        <td><div className="settings-user-cell"><span aria-hidden="true">{user.initials}</span><div><strong>{user.name}</strong>{user.email && <small>{user.email}</small>}</div></div></td>
        <td>{user.role}</td>
        <td><button type="button" className="table-action-button settings-edit-user-button" onClick={() => setSelectedUser(user)}>Edit user</button></td>
      </tr>)}</tbody>
    </table></div>
    <button type="button" className="outline-button" onClick={() => setInviteOpen(true)}><Plus size={15} /> Invite user</button>
    {selectedUser && <EditUserDialog
      user={selectedUser}
      users={users}
      onClose={() => setSelectedUser(null)}
      onSave={(updatedUser) => {
        const saved = onSave(users.map((user) => user.name === selectedUser.name ? updatedUser : user));
        if (saved) setSelectedUser(null);
        return saved;
      }}
      onDelete={() => {
        const saved = onSave(users.filter((user) => user.name !== selectedUser.name));
        if (saved) setSelectedUser(null);
        return saved;
      }}
    />}
    {inviteOpen && <InviteUserDialog
      users={users}
      onClose={() => setInviteOpen(false)}
      onInvite={(newUser) => {
        const saved = onSave([...users, newUser]);
        if (saved) setInviteOpen(false);
        return saved;
      }}
    />}
  </article>;
}

function InviteUserDialog({ users, onClose, onInvite }: {
  users: DashboardData["users"];
  onClose: () => void;
  onInvite: (user: DashboardData["users"][number]) => boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Viewer");
  const [error, setError] = useState("");
  const roles = ["Finance Admin", "Accounts Officer", "Bookkeeper", "Viewer"];
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (!trimmedName || !normalizedEmail || !roles.includes(role)) {
      setError("Enter a name, a valid email address, and select a role.");
      return;
    }
    if (users.some((user) => user.email?.toLowerCase() === normalizedEmail || user.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError("A user with that name or email already exists.");
      return;
    }
    if (!onInvite({ name: trimmedName, email: normalizedEmail, role, initials: profileInitials(trimmedName) })) {
      setError("The invitation couldn't be saved. Check browser storage and try again.");
    }
  };
  return <InventoryDialog title="Invite user" onClose={onClose}>
    <form className="inventory-form" onSubmit={submit}>
      <label htmlFor="invite-user-name">Full name</label><input id="invite-user-name" required maxLength={100} value={name} onChange={(event) => { setName(event.target.value); setError(""); }} placeholder="Enter user's full name" autoFocus />
      <label htmlFor="invite-user-email">Email address</label><input id="invite-user-email" type="email" required maxLength={254} value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} placeholder="name@example.com" />
      <label htmlFor="invite-user-role">Workspace role</label><select id="invite-user-role" required value={role} onChange={(event) => { setRole(event.target.value); setError(""); }}>{roles.map((option) => <option key={option} value={option}>{option}</option>)}</select>
      <p className="inventory-form-hint">This will add the user to the workspace user list on this device.</p>
      {error && <p className="inventory-error" role="alert">{error}</p>}
      <footer><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Plus size={15} /> Add user</button></footer>
    </form>
  </InventoryDialog>;
}

function EditUserDialog({ user, users, onClose, onSave, onDelete }: {
  user: DashboardData["users"][number];
  users: DashboardData["users"];
  onClose: () => void;
  onSave: (user: DashboardData["users"][number]) => boolean;
  onDelete: () => boolean;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email ?? "");
  const [role, setRole] = useState(user.role);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const roles = ["Finance Admin", "Accounts Officer", "Bookkeeper", "Viewer"];
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (!trimmedName || !roles.includes(role)) {
      setError("Enter a valid name and select a role.");
      return;
    }
    if (normalizedEmail && users.some((entry) => entry.email?.toLowerCase() === normalizedEmail && entry.name !== user.name)) {
      setError("That email address is already assigned to another user.");
      return;
    }
    if (trimmedName.toLowerCase() !== user.name.toLowerCase() && users.some((entry) => entry.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError("A user with that name already exists.");
      return;
    }
    if (!onSave({ ...user, name: trimmedName, ...(normalizedEmail ? { email: normalizedEmail } : { email: undefined }), role, initials: profileInitials(trimmedName) })) {
      setError("Changes couldn't be saved. Check browser storage and try again.");
    }
  };
  return <InventoryDialog title={`Edit ${user.name}`} onClose={onClose}>
    <form className="inventory-form" onSubmit={submit}>
      <label htmlFor="edit-user-name">Full name</label><input id="edit-user-name" required maxLength={100} value={name} onChange={(event) => { setName(event.target.value); setError(""); }} autoFocus />
      <label htmlFor="edit-user-email">Email address</label><input id="edit-user-email" type="email" maxLength={254} value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} placeholder="Add email address" />
      <label htmlFor="edit-user-role">Role</label><select id="edit-user-role" required value={role} onChange={(event) => { setRole(event.target.value); setError(""); }}>{roles.map((option) => <option key={option} value={option}>{option}</option>)}</select>
      {error && <p className="inventory-error" role="alert">{error}</p>}
      {confirmDelete
        ? <div className="settings-delete-confirm" role="group" aria-label={`Confirm deleting ${user.name}`}><strong>Delete {user.name}?</strong><p>This removes them from the workspace user list. This cannot be undone.</p><div><button type="button" className="outline-button" onClick={() => setConfirmDelete(false)}>Cancel</button><button type="button" className="settings-delete-button" onClick={() => { if (!onDelete()) setError("The user couldn't be deleted. Please try again."); }}>Delete user</button></div></div>
        : <footer><button type="button" className="settings-delete-link" onClick={() => { setConfirmDelete(true); setError(""); }}>Delete user</button><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Check size={15} /> Save changes</button></footer>}
    </form>
  </InventoryDialog>;
}

function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState("Suggestion");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const messageRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { messageRef.current?.focus(); }, []);

  const submitFeedback = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const stored = localStorage.getItem(feedbackStorageKey);
      const previous: unknown = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(previous)) throw new Error("Saved feedback has an invalid format.");
      const entry = { category, message: message.trim(), createdAt: new Date().toISOString() };
      localStorage.setItem(feedbackStorageKey, JSON.stringify([...previous, entry]));
      setSaved(true);
      setError("");
    } catch (cause) {
      console.error("Could not save feedback.", cause);
      setError("Feedback couldn't be saved on this device. Please try again.");
    }
  };

  return <div className="feedback-backdrop" onClick={onClose}>
    <section className="feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="feedback-title" onClick={(event) => event.stopPropagation()}>
      <header className="feedback-dialog-header"><div><h2 id="feedback-title">Share feedback</h2></div><button type="button" className="more-button" aria-label="Close feedback" autoFocus onClick={onClose}><X size={16} /></button></header>
      {saved
        ? <div className="feedback-success" role="status"><span><Check size={18} /></span><div><strong>Thank you for your feedback</strong><p>Your response is saved on this device. Feedback submission to a workspace is not connected yet.</p></div></div>
        : <form className="feedback-form" onSubmit={submitFeedback}>
          <label htmlFor="feedback-category">Feedback type</label>
          <select id="feedback-category" value={category} onChange={(event) => setCategory(event.target.value)}><option>Suggestion</option><option>Issue</option><option>Question</option><option>Other</option></select>
          <label htmlFor="feedback-message">Your feedback</label>
          <textarea ref={messageRef} id="feedback-message" required minLength={5} maxLength={2000} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell us what you think or how we can improve…" />
          <p className="feedback-helper">{message.length}/2000 characters</p>
          {error && <p className="feedback-error" role="alert">{error}</p>}
          <footer><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><MessageSquare size={15} /> Submit feedback</button></footer>
        </form>}
      {saved && <footer className="feedback-dialog-footer"><button type="button" className="primary-button" onClick={onClose}>Done</button></footer>}
    </section>
  </div>;
}

function MetricCard({ icon: Icon, label, value, accent }: { icon: ComponentType<{ size?: number }>; label: string; value: string; accent: string }) { return <article className="metric-card"><div className={`metric-icon ${accent}`}><Icon size={20} /></div><div className="metric-content"><p>{label}</p><div className="metric-value"><strong>{value}</strong></div></div></article>; }
function AlertIcon({ size = 18 }: { size?: number }) { return <div style={{ width: size, height: size, display: "grid", placeItems: "center", borderRadius: 50, color: "#a4433c", background: "#fbe5e2", fontSize: 12, fontWeight: 700 }}>!</div>; }
function PanelHeader({ title, showMore = true }: { kicker?: string; title: string; showMore?: boolean }) { return <div className="panel-heading"><div><h2>{title}</h2></div>{showMore && <button type="button" className="more-button" aria-label="More options"><MoreHorizontal size={19} /></button>}</div>; }
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; name?: string }>; label?: string }) { if (!active || !payload?.length) return null; return <div className="chart-tooltip"><span>{label}</span>{payload.map((item) => <strong key={item.name}>{item.name}: ₦{item.value}k</strong>)}</div>; }
function WaterfallTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: CashFlowStep }> }) {
  const step = payload?.[0]?.payload;
  if (!active || !step) return null;

  return <div className="chart-tooltip"><span>{step.total ? "Cumulative total" : step.month}</span>{!step.total && <strong>Net change: {step.net < 0 ? "−" : "+"}{formatNaira(Math.abs(step.net))}</strong>}<strong>Cumulative: {formatNaira(step.cumulative)}</strong></div>;
}

export default App;
function SupplierPicker({ id, suppliers, onAddSupplier, value, onSelect, hideLabel }: {
  id: string;
  suppliers: SupplierProfile[];
  onAddSupplier: (draft: SupplierProfile) => string | null;
  value: string;
  onSelect: (profile: SupplierProfile) => void;
  hideLabel?: boolean;
}) {
  const [adding, setAdding] = useState(suppliers.length === 0);
  const [draft, setDraft] = useState<SupplierProfile>({ name: "", address: "", email: "", phone: "", contact: "" });
  const [error, setError] = useState("");
  const save = () => {
    const failure = onAddSupplier(draft);
    if (failure) { setError(failure); return; }
    onSelect({
      name: draft.name.trim(),
      address: draft.address?.trim(),
      email: draft.email?.trim(),
      phone: draft.phone?.trim(),
      contact: draft.contact?.trim(),
    });
    setDraft({ name: "", address: "", email: "", phone: "", contact: "" });
    setError("");
    setAdding(false);
  };
  const selected = suppliers.find((supplier) => supplier.name === value);
  return <>
    {!hideLabel && <label htmlFor={id}>Supplier</label>}
    <div className="supplier-picker-row" style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <select id={id} style={{ flex: 1 }} required value={value} onChange={(event) => { const profile = suppliers.find(({ name }) => name === event.target.value); if (profile) onSelect(profile); }}>
        <option value="" disabled>Select a saved supplier</option>
        {suppliers.map((supplier) => <option key={supplier.name} value={supplier.name}>{supplier.name}</option>)}
      </select>
    </div>
    {selected && !adding && (selected.address || selected.email || selected.phone || selected.contact) && <small className="supplier-picker-details">{[selected.address, [selected.phone, selected.email, selected.contact].filter(Boolean).join(" • ")].filter(Boolean).join(" · ")}</small>}
    {adding && <div className="supplier-picker-new" role="group" aria-label="New supplier profile" style={{ display: "grid", gap: 6, padding: 12, border: "1px solid #ebe6de", borderRadius: 10 }}>
      <strong>New supplier profile</strong>
      <label htmlFor={`${id}-new-name`}>Supplier name</label><input id={`${id}-new-name`} maxLength={100} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Business name" />
      <label htmlFor={`${id}-new-email`}>Email <small>Optional</small></label><input id={`${id}-new-email`} type="email" maxLength={160} value={draft.email ?? ""} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder="supplier@example.com" />
      <label htmlFor={`${id}-new-phone`}>Phone <small>Optional</small></label><input id={`${id}-new-phone`} type="tel" maxLength={40} value={draft.phone ?? ""} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="+234..." />
      <label htmlFor={`${id}-new-address`}>Address <small>Optional</small></label><textarea id={`${id}-new-address`} className="supplier-address-input" maxLength={250} rows={2} value={draft.address} onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))} placeholder="Street, city, region" />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="button" className="primary-button" onClick={save}>Save supplier</button>
    </div>}
  </>;
}
