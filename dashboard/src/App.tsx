import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import {
  ArrowDownRight, ArrowUpRight, Bell, Boxes, Building2, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight,
  FileCheck2, FileText, Headphones, HelpCircle, LockKeyhole, Mail, MessageSquare,
  Menu, MoreHorizontal, PackageCheck, Phone, Plus, Search, Settings, ShieldCheck, Sparkles,
  TrendingUp, Upload, UserRound, X,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import type { DashboardData, DashboardNav, InvoiceStatus, LedgerAccountType, ReconciliationView } from "./data/mockData";
import { cashFlowAmountToNaira, fetchDashboardData, filterDashboardData, formatCompactNaira, formatDateKey, formatNaira, getCashFlowWaterfall, getInventoryMetrics, getModuleRecords, getOverviewMetrics, toDateKey, type CashFlowStep } from "./services/dashboardData";
import { mockDashboardData } from "./data/mockData";

type NavKey = "Overview" | "Ledger" | "Receivables" | "Payables" | "Reconciliation" | "Invoice" | "Inventory" | "Payroll" | "Reports" | "Audit Trail" | "Settings" | "Profile";
type ModuleNavKey = DashboardNav;
type Status = InvoiceStatus;
type Invoice = DashboardData["invoices"][number];
type PurchaseOrderLine = { item: string; sku: string; quantity: number; unitPrice: number };
type SupplierDetails = { supplier: string; supplierAddress: string; supplierContact: string };
type LedgerJournalEntry = { dateKey: string; memo: string; reference: string; lines: { account: string; debit: number; credit: number }[] };
type LedgerAccount = DashboardData["ledgerAccountCatalog"][number];
type NewLedgerAccount = LedgerAccount & { openingBalance: number; openingDate: string };
type ReceivableDraft = { customer: string; invoice: string; amount: number; dueDate: string };
type PayableDraft = { vendor: string; invoice: string; amount: number; dueDate: string };
type InvoiceDraft = { vendor: string; invoice: string; amount: number; dateKey: string };
type PayrollDraft = { employee: string; role: string; pay: number };
type ReportDraft = { report: string; period: string };
type ProfileSettings = DashboardData["profile"];
type DashboardNotification = { id: string; title: string; detail: string; section: string; destination: NavKey };
const isInvoiceStatus = (value: string): value is InvoiceStatus => value === "Matched" || value === "Pending" || value === "Flagged";
const notificationStorageKey = "corelogic-dashboard-read-notifications";

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

function getDashboardNotifications(data: DashboardData): DashboardNotification[] {
  return [
    ...data.invoices
      .filter(({ status }) => status === "Pending" || status === "Flagged")
      .map((invoice) => ({
        id: `invoice-${invoice.id}`,
        title: `Invoice ${invoice.invoice} needs review`,
        detail: `${invoice.vendor} · ${formatNaira(invoice.amount)} · ${invoice.status}`,
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

function getStatusOptions(nav: ModuleNavKey, view: ReconciliationView, record: Record<string, string>, field: string): string[] {
  if (nav === "Invoice") return ["Pending", "Matched", "Flagged"];
  if (nav === "Receivables" || nav === "Reconciliation" && view === "Receivables") return ["Open", "Partial", "Overdue", "Paid"];
  if (nav === "Payables" && record.category === "Purchase order") return ["Pending", "Quotation", "Approval", "Approved", "Received"];
  if (nav === "Payables") return ["Pending", "Review", "Approval", "Scheduled", "Paid"];
  if (nav === "Reconciliation" && view === "Payables") {
    return field === "paymentStatus" ? ["Pending", "Review", "Approval", "Scheduled", "Paid"] : ["Review", "Matched", "Flagged"];
  }
  if (nav === "Reconciliation" && view === "Bank") return ["Review", "Matched", "Flagged"];
  if (nav === "Payroll") return ["Pending", "Processing", "Paid", "Failed"];
  if (nav === "Reports") return ["Draft", "Review", "Ready"];
  return [];
}
const profileStorageKey = "corelogic-dashboard-profile";
const adminSettingsStorageKey = "corelogic-dashboard-admin-settings";
const adminUsersStorageKey = "corelogic-dashboard-admin-users";
const feedbackStorageKey = "corelogic-dashboard-feedback";
const profileInitials = (name: string) => name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "U";
type AdminSettings = {
  automationEnabled: Record<string, boolean>;
  approvalRules: {
    flaggedInvoicesRequireApproval: boolean;
    purchaseOrderRequired: boolean;
    overdueReceivableAlerts: boolean;
  };
};

function defaultAdminSettings(data: DashboardData): AdminSettings {
  return {
    automationEnabled: Object.fromEntries(data.automations.map(({ title, enabled }) => [title, enabled])),
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
    const isBooleanRecord = (record: unknown): record is Record<string, boolean> =>
      typeof record === "object" && record !== null && Object.values(record).every((value) => typeof value === "boolean");
    const isBooleanObject = (record: unknown, keys: string[]): record is Record<string, boolean> =>
      isBooleanRecord(record) && keys.every((key) => typeof record[key] === "boolean");
    if (
      !isBooleanRecord(values.automationEnabled) ||
      !isBooleanObject(values.approvalRules, ["flaggedInvoicesRequireApproval", "purchaseOrderRequired", "overdueReceivableAlerts"])
    ) throw new Error("Saved admin settings are incomplete.");
    return {
      automationEnabled: { ...defaults.automationEnabled, ...values.automationEnabled },
      approvalRules: {
        flaggedInvoicesRequireApproval: values.approvalRules.flaggedInvoicesRequireApproval,
        purchaseOrderRequired: values.approvalRules.purchaseOrderRequired,
        overdueReceivableAlerts: values.approvalRules.overdueReceivableAlerts,
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
    return parsed;
  } catch (error) {
    console.error("Could not load saved workspace users.", error);
    return defaults;
  }
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
  return <img src="/dashboard.png" alt="" width="18" height="18" />;
}

function TransferIcon() {
  return <img src="/transfer.png" alt="" width="18" height="18" />;
}

function PayableIcon() {
  return <img src="/up-arrow.png" alt="" width="18" height="18" />;
}

function ReceivableIcon() {
  return <img src="/down-arrow.png" alt="" width="18" height="18" />;
}

function LedgerIcon() {
  return <img src="/ledger.png" alt="" width="18" height="18" />;
}

function InvoiceIcon() {
  return <img src="/invoice.png" alt="" width="18" height="18" />;
}

function InventoryIcon() {
  return <img src="/inventory.png" alt="" width="18" height="18" />;
}

function SidebarSwitchIcon() {
  return <img src="/Switch.png" alt="" width="20" height="20" />;
}

function GrossProfitIcon({ size = 20 }: { size?: number }) {
  return <img src="/Gross%20Profit.png" alt="" width={size} height={size} />;
}

function PendingPayablesIcon({ size = 20 }: { size?: number }) {
  return <img src="/Pending%20Payables.png" alt="" width={size} height={size} />;
}

function OutstandingReceivablesIcon({ size = 20 }: { size?: number }) {
  return <img src="/Outstanding%20Receivables.png" alt="" width={size} height={size} />;
}

function PayrollIcon() {
  return <img src="/payroll.png" alt="" width="18" height="18" />;
}

function ReportsIcon() {
  return <img src="/reports.png" alt="" width="18" height="18" />;
}

function AuditTrailIcon() {
  return <img src="/audit.png" alt="" width="18" height="18" />;
}

function SettingsIcon() {
  return <img src="/settings.png" alt="" width="18" height="18" />;
}

const navItems: { label: NavKey; icon: ComponentType<{ size?: number }> }[] = [
  { label: "Overview", icon: DashboardIcon }, { label: "Ledger", icon: LedgerIcon },
  { label: "Receivables", icon: ReceivableIcon }, { label: "Payables", icon: PayableIcon },
  { label: "Reconciliation", icon: TransferIcon }, { label: "Invoice", icon: InvoiceIcon }, { label: "Inventory", icon: InventoryIcon },
  { label: "Payroll", icon: PayrollIcon }, { label: "Reports", icon: ReportsIcon },
  { label: "Audit Trail", icon: AuditTrailIcon }, { label: "Settings", icon: SettingsIcon },
];

function DateRangePicker({ onApply }: { onApply: (startDate: string, endDate: string) => void }) {
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const todayKey = toDateKey(today);
  const yearStartKey = toDateKey(yearStart);
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(yearStart);
  const [endDate, setEndDate] = useState(today);
  const [draftStart, setDraftStart] = useState(yearStart);
  const [draftEnd, setDraftEnd] = useState(today);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
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

  return <div className="date-range-picker">
    <button className="date-control" type="button" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((current) => !current)}><CalendarDays size={17} /><span>{formatDate(startDate)} – {formatDate(endDate)}</span><ChevronDown size={15} /></button>
    {open && <div className="calendar-popover" role="dialog" aria-label="Choose date range">
      <div className="calendar-header"><div><span>Selected range</span><strong>{formatDate(draftStart)} – {formatDate(draftEnd)}</strong></div><button type="button" aria-label="Close calendar" onClick={() => setOpen(false)}><X size={16} /></button></div>
      <div className="calendar-navigation"><button type="button" aria-label="Previous month" disabled={visibleMonth.getMonth() === 0} onClick={previousMonth}><ChevronLeft size={16} /></button><span>Choose start and end dates</span><button type="button" aria-label="Next month" disabled={visibleMonth.getMonth() + 1 >= monthCount} onClick={nextMonth}><ChevronRight size={16} /></button></div>
      <div className="calendar-months">{renderMonth(0)}{renderMonth(1)}</div>
      <div className="calendar-footer"><button type="button" onClick={() => applyRange(yearStart, today)}>Year to date</button><button type="button" className="apply-range" onClick={() => applyRange(draftStart, draftEnd)}>Apply range</button></div>
    </div>}
  </div>;
}

function App() {
  const [activeNav, setActiveNav] = useState<NavKey>("Overview");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dataError, setDataError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [profileSettings, setProfileSettings] = useState(readProfileSettings);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const feedbackButtonRef = useRef<HTMLButtonElement>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState(readSavedNotificationIds);
  const [notificationStorageError, setNotificationStorageError] = useState("");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    return { start: toDateKey(new Date(today.getFullYear(), 0, 1)), end: toDateKey(today) };
  });
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
      dateFilteredData.bankTransactions.filter(({ status }) => status !== "Matched").length
    : 0;
  const payrollAlertCount = dateFilteredData?.payroll.filter(({ status }) => status !== "Paid").length ?? 0;

  const navigate = (page: NavKey) => { setActiveNav(page); setSidebarOpen(false); setSearch(""); };
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
  const markNotificationRead = (notificationId: string) => {
    setReadNotificationIds((current) => current.includes(notificationId) ? current : [...current, notificationId]);
  };
  const markAllNotificationsRead = () => {
    setReadNotificationIds((current) => [...new Set([...current, ...notifications.map(({ id }) => id)])]);
  };
  useEffect(() => {
    if (!profileMenuOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !profileMenuRef.current?.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileMenuOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileMenuOpen]);
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
  const updateModuleStatus = (nav: ModuleNavKey, view: ReconciliationView, record: Record<string, string>, field: string, status: string) => {
    setDashboardData((current) => {
      if (!current) return current;
      if (nav === "Invoice" && field === "status" && isInvoiceStatus(status)) {
        return { ...current, invoices: current.invoices.map((invoice) => invoice.invoice === record.invoice ? { ...invoice, status } : invoice) };
      }
      if (nav === "Receivables" || nav === "Reconciliation" && view === "Receivables") {
        return { ...current, receivables: current.receivables.map((item) => item.invoice === record.invoice ? { ...item, status } : item) };
      }
      if (nav === "Payables" || nav === "Reconciliation" && view === "Payables") {
        if (record.category === "Purchase order") {
          return { ...current, purchaseOrders: current.purchaseOrders.map((item) => item.number === record.invoice ? { ...item, status } : item) };
        }
        return {
          ...current,
          payables: current.payables.map((item) => item.invoice === record.invoice
            ? { ...item, ...(field === "paymentStatus" || field === "status" ? { paymentStatus: status } : { ledgerStatus: status }) }
            : item),
        };
      }
      if (nav === "Reconciliation" && view === "Bank") {
        return { ...current, bankTransactions: current.bankTransactions.map((item) => item.reference === record.reference ? { ...item, status } : item) };
      }
      if (nav === "Payroll") {
        return { ...current, payroll: current.payroll.map((item) => item.employee === record.employee ? { ...item, status } : item) };
      }
      if (nav === "Reports") {
        return { ...current, reports: current.reports.map((item) => item.report === record.report ? { ...item, status } : item) };
      }
      return current;
    });
  };
  const createPurchaseOrder = (order: SupplierDetails & { lines: PurchaseOrderLine[] }) => {
    setDashboardData((current) => {
      if (!current) return current;
      const nextNumber = Math.max(0, ...current.purchaseOrders.map(({ number }) => Number(number.match(/(\d+)$/)?.[1] ?? 0))) + 1;
      const year = new Date().getFullYear();
      const quantity = order.lines.reduce((total, line) => total + line.quantity, 0);
      const amount = order.lines.reduce((total, line) => total + line.quantity * line.unitPrice, 0);
      return {
        ...current,
        purchaseOrders: [{
          number: `PO-${year}-${nextNumber}`,
          supplier: order.supplier.trim(),
          supplierAddress: order.supplierAddress.trim(),
          supplierContact: order.supplierContact.trim(),
          item: order.lines.map(({ item }) => item).join(", "),
          items: order.lines.length,
          quantity,
          lines: order.lines,
          amount,
          status: "Pending",
          dateKey: toDateKey(new Date()),
        }, ...current.purchaseOrders],
      };
    });
  };
  const createProcurement = (request: SupplierDetails & { item: string; amount: number; dueDate: string }) => {
    setDashboardData((current) => {
      if (!current) return current;
      const nextNumber = Math.max(0, ...current.procurements.map(({ reference }) => Number(reference?.match(/(\d+)$/)?.[1] ?? 0))) + 1;
      const [year, month, day] = request.dueDate.split("-").map(Number);
      const due = new Date(year, month - 1, day).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      return {
        ...current,
        procurements: [{
          reference: `PR-${new Date().getFullYear()}-${String(nextNumber).padStart(3, "0")}`,
          item: request.item.trim(),
          supplier: request.supplier.trim(),
          supplierAddress: request.supplierAddress.trim(),
          supplierContact: request.supplierContact.trim(),
          amount: request.amount,
          due,
          status: "Awaiting approval",
          dateKey: toDateKey(new Date()),
        }, ...current.procurements],
      };
    });
  };
  const updateProcurementStatus = (reference: string | undefined, itemName: string, status: string) => {
    setDashboardData((current) => current ? {
      ...current,
      procurements: current.procurements.map((procurement) =>
        (reference ? procurement.reference === reference : !procurement.reference && procurement.item === itemName)
          ? { ...procurement, status }
          : procurement),
    } : current);
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
  const addInventoryItem = (newItem: { item: string; sku: string; location: string; quantity: number; unitCost: number }): string | null => {
    if (!dashboardData) return "Inventory data isn't ready yet. Please try again.";
    if (dashboardData.inventoryItems.some(({ sku }) => sku.trim().toLowerCase() === newItem.sku.trim().toLowerCase())) {
      return "That SKU already exists. Enter a unique SKU.";
    }
    const location = dashboardData.inventoryLocations.find(({ location: name }) => name === newItem.location);
    if (!location) return "Choose a valid stock location.";
    if (location.stock + newItem.quantity > location.capacity) {
      return `This location only has capacity for ${location.capacity - location.stock} more units.`;
    }
    setDashboardData((current) => {
      if (!current || current.inventoryItems.some(({ sku }) => sku.trim().toLowerCase() === newItem.sku.trim().toLowerCase())) return current;
      return {
        ...current,
        inventoryItems: [{
          item: newItem.item.trim(),
          sku: newItem.sku.trim().toUpperCase(),
          stock: newItem.quantity,
          value: newItem.quantity * newItem.unitCost,
          status: newItem.quantity <= 10 ? "Low stock" : "Healthy",
        }, ...current.inventoryItems],
        inventoryLocations: current.inventoryLocations.map((entry) => entry.location === newItem.location
          ? { ...entry, stock: entry.stock + newItem.quantity }
          : entry),
      };
    });
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
    } : current);
    return null;
  };
  const addLedgerAccount = (newAccount: NewLedgerAccount): string | null => {
    if (!dashboardData) return "Ledger data isn't ready yet. Please try again.";
    if (!newAccount.account.trim() || !/^\d{4,10}$/.test(newAccount.code.trim()) || !["Asset", "Liability", "Equity", "Income", "Expense"].includes(newAccount.type)) {
      return "Enter a valid account name, numeric code, and account type.";
    }
    if (!Number.isSafeInteger(newAccount.openingBalance) || newAccount.openingBalance < 0) {
      return "Enter a valid non-negative whole-number opening balance.";
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
      ? `OB-${newAccount.openingDate.slice(0, 4)}-${String(Math.max(0, ...dashboardData.ledgerAccounts
        .map(({ reference }) => Number(reference?.match(/^OB-\d{4}-(\d+)$/)?.[1] ?? 0))) + 1).padStart(4, "0")}`
      : "";
    const debitNormal = newAccount.type === "Asset";
    const openingLine = hasOpeningBalance ? [
      {
        account: newAccount.account.trim(),
        code: newAccount.code.trim(),
        type: newAccount.type,
        debit: debitNormal ? newAccount.openingBalance : 0,
        credit: debitNormal ? 0 : newAccount.openingBalance,
      },
      {
        account: "Opening Balance Equity",
        code: "3000",
        type: "Equity" as const,
        debit: debitNormal ? 0 : newAccount.openingBalance,
        credit: debitNormal ? newAccount.openingBalance : 0,
      },
    ].map((line, index) => ({
      ...line,
      dateKey: newAccount.openingDate,
      id: `${openingReference}-${index + 1}`,
      memo: `Opening balance — ${newAccount.account.trim()}`,
      reference: openingReference,
    })) : [];
    setDashboardData((current) => current ? {
      ...current,
      ledgerAccountCatalog: [...current.ledgerAccountCatalog, {
        account: newAccount.account.trim(),
        code: newAccount.code.trim(),
        type: newAccount.type,
      }],
      ledgerAccounts: [...openingLine, ...current.ledgerAccounts],
    } : current);
    return null;
  };
  const createLedgerJournalEntry = (entry: LedgerJournalEntry): string | null => {
    if (!dashboardData) return "Ledger data isn't ready yet. Please try again.";
    const debitTotal = entry.lines.reduce((total, line) => total + line.debit, 0);
    const creditTotal = entry.lines.reduce((total, line) => total + line.credit, 0);
    const todayKey = toDateKey(new Date());
    const transactionDate = new Date(`${entry.dateKey}T00:00:00`);
    if (!entry.memo.trim() || !entry.reference.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(entry.dateKey) ||
      toDateKey(transactionDate) !== entry.dateKey || entry.dateKey > todayKey) {
      return "Enter a description and a valid transaction date that is not in the future.";
    }
    if (entry.lines.length < 2) {
      return "A journal entry needs at least two lines.";
    }
    if (entry.lines.some(({ debit, credit }) =>
      !Number.isSafeInteger(debit) || !Number.isSafeInteger(credit) || debit < 0 || credit < 0 || (debit > 0) === (credit > 0))) {
      return "Each journal line needs a positive whole-number amount on exactly one side.";
    }
    if (!Number.isSafeInteger(debitTotal) || !Number.isSafeInteger(creditTotal) || debitTotal <= 0 || debitTotal !== creditTotal) {
      return "Journal entry debit and credit totals must be equal and greater than zero.";
    }
    if (entry.lines.some(({ account }) => !dashboardData.ledgerAccountCatalog.some((known) => known.account === account))) {
      return "Choose an account from the chart of accounts for every journal line.";
    }
    const lineAccounts = entry.lines.map((line) => dashboardData.ledgerAccountCatalog.find((known) => known.account === line.account));
    const validLineAccounts = lineAccounts.filter((account): account is LedgerAccount => account !== undefined);
    const references = dashboardData.ledgerAccounts.map(({ reference }) => reference).filter((reference): reference is string => Boolean(reference));
    const nextNumber = Math.max(0, ...references.map((reference) => Number(reference.match(/^JE-\d{4}-(\d+)$/)?.[1] ?? 0))) + 1;
    const reference = entry.reference.trim() || `JE-${entry.dateKey.slice(0, 4)}-${String(nextNumber).padStart(4, "0")}`;
    if (references.some((existing) => existing.toLowerCase() === reference.toLowerCase())) {
      return "That journal reference is already in use.";
    }
    setDashboardData((current) => current ? {
      ...current,
      ledgerAccounts: [
        ...entry.lines.map((line, index) => {
          return {
            ...validLineAccounts[index],
            debit: line.debit,
            credit: line.credit,
            dateKey: entry.dateKey,
            id: `${reference}-${index + 1}`,
            memo: entry.memo.trim(),
            reference,
          };
        }),
        ...current.ledgerAccounts,
      ],
    } : current);
    return null;
  };
  const addReceivable = (draft: ReceivableDraft): string | null => {
    if (!dashboardData) return "Receivables data isn't ready yet. Please try again.";
    if (dashboardData.receivables.some(({ invoice }) => invoice.trim().toLowerCase() === draft.invoice.trim().toLowerCase())) {
      return "That invoice number is already in use.";
    }
    if (!draft.customer.trim() || !draft.invoice.trim() || !Number.isSafeInteger(draft.amount) || draft.amount <= 0) {
      return "Enter a customer, unique invoice number, and positive whole-number amount.";
    }
    const dueDate = new Date(`${draft.dueDate}T00:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.dueDate) || toDateKey(dueDate) !== draft.dueDate) return "Choose a valid due date.";
    const [year, month, day] = draft.dueDate.split("-").map(Number);
    const due = new Date(year, month - 1, day).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    setDashboardData((current) => current ? {
      ...current,
      receivables: [{ customer: draft.customer.trim(), invoice: draft.invoice.trim(), amount: draft.amount, due, outstanding: draft.amount, status: "Open", dateKey: toDateKey(new Date()) }, ...current.receivables],
    } : current);
    return null;
  };
  const addPayable = (draft: PayableDraft): string | null => {
    if (!dashboardData) return "Payables data isn't ready yet. Please try again.";
    if (dashboardData.payables.some(({ invoice }) => invoice.trim().toLowerCase() === draft.invoice.trim().toLowerCase())) {
      return "That bill reference is already in use.";
    }
    if (!draft.vendor.trim() || !draft.invoice.trim() || !Number.isSafeInteger(draft.amount) || draft.amount <= 0) {
      return "Enter a supplier, unique bill reference, and positive whole-number amount.";
    }
    const dueDate = new Date(`${draft.dueDate}T00:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.dueDate) || toDateKey(dueDate) !== draft.dueDate) return "Choose a valid due date.";
    const [year, month, day] = draft.dueDate.split("-").map(Number);
    const due = new Date(year, month - 1, day).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    setDashboardData((current) => current ? {
      ...current,
      payables: [{ vendor: draft.vendor.trim(), invoice: draft.invoice.trim(), amount: draft.amount, due, ledgerStatus: "Review", paymentStatus: "Pending", dateKey: toDateKey(new Date()) }, ...current.payables],
    } : current);
    return null;
  };
  const addInvoice = (draft: InvoiceDraft): string | null => {
    if (!dashboardData) return "Invoice data isn't ready yet. Please try again.";
    if (dashboardData.invoices.some(({ invoice }) => invoice.trim().toLowerCase() === draft.invoice.trim().toLowerCase())) {
      return "That invoice number is already in use.";
    }
    if (!draft.vendor.trim() || !draft.invoice.trim() || !Number.isSafeInteger(draft.amount) || draft.amount <= 0) {
      return "Enter a vendor, unique invoice number, and positive whole-number amount.";
    }
    const invoiceDate = new Date(`${draft.dateKey}T00:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.dateKey) || toDateKey(invoiceDate) !== draft.dateKey || draft.dateKey > toDateKey(new Date())) {
      return "Choose a valid invoice date that is not in the future.";
    }
    setDashboardData((current) => current ? {
      ...current,
      invoices: [{
        id: draft.invoice.trim(),
        vendor: draft.vendor.trim(),
        invoice: draft.invoice.trim(),
        date: formatDateKey(draft.dateKey),
        dateKey: draft.dateKey,
        amount: draft.amount,
        status: "Pending",
        owner: current.profile.name,
      }, ...current.invoices],
    } : current);
    return null;
  };
  const addPayrollRecord = (draft: PayrollDraft): string | null => {
    if (!dashboardData) return "Payroll data isn't ready yet. Please try again.";
    if (dashboardData.payroll.some(({ employee }) => employee.trim().toLowerCase() === draft.employee.trim().toLowerCase())) {
      return "A payroll record already exists for that employee.";
    }
    if (!draft.employee.trim() || !draft.role.trim() || !Number.isSafeInteger(draft.pay) || draft.pay <= 0) {
      return "Enter an employee, role, and positive whole-number net pay.";
    }
    setDashboardData((current) => current ? {
      ...current,
      payroll: [{ employee: draft.employee.trim(), role: draft.role.trim(), pay: draft.pay, status: "Pending", dateKey: toDateKey(new Date()) }, ...current.payroll],
    } : current);
    return null;
  };
  const addReport = (draft: ReportDraft): string | null => {
    if (!dashboardData) return "Reports data isn't ready yet. Please try again.";
    if (!draft.report.trim() || !draft.period.trim()) return "Enter a report name and reporting period.";
    if (dashboardData.reports.some(({ report, period }) =>
      report.trim().toLowerCase() === draft.report.trim().toLowerCase() && period.trim().toLowerCase() === draft.period.trim().toLowerCase())) {
      return "A report with that name and period already exists.";
    }
    setDashboardData((current) => current ? {
      ...current,
      reports: [{ report: draft.report.trim(), period: draft.period.trim(), owner: current.profile.name, status: "Draft", dateKey: toDateKey(new Date()) }, ...current.reports],
    } : current);
    return null;
  };
  const adjustInventoryStock = (adjustment: { sku: string; location: string; quantity: number; direction: "Add" | "Remove" }) => {
    setDashboardData((current) => {
      if (!current) return current;
      const item = current.inventoryItems.find(({ sku }) => sku === adjustment.sku);
      const location = current.inventoryLocations.find(({ location }) => location === adjustment.location);
      if (!item || !location) return current;
      const delta = adjustment.direction === "Add" ? adjustment.quantity : -adjustment.quantity;
      if (item.stock + delta < 0 || location.stock + delta < 0 || location.stock + delta > location.capacity) return current;
      const unitValue = item.stock > 0 ? item.value / item.stock : 0;
      const nextStock = item.stock + delta;
      return {
        ...current,
        inventoryItems: current.inventoryItems.map((entry) => entry.sku === adjustment.sku
          ? { ...entry, stock: nextStock, value: Math.max(0, entry.value + unitValue * delta), status: nextStock <= 10 ? "Low stock" : "Healthy" }
          : entry),
        inventoryLocations: current.inventoryLocations.map((entry) => entry.location === adjustment.location
          ? { ...entry, stock: entry.stock + delta }
          : entry),
      };
    });
  };

  return (
    <div className={`dashboard-app ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand"><span className="brand-mark">C</span><div><strong>Corelogic</strong><span>ERP & finance System</span></div></div>
        <nav aria-label="Dashboard navigation">
          {navItems.filter(({ label }) => label !== "Settings").map(({ label, icon: Icon }) => {
            const alertCount = label === "Invoice"
              ? invoices.filter(({ status }) => status !== "Matched").length
              : label === "Reconciliation" ? reconciliationAlertCount
                : label === "Payroll" ? payrollAlertCount
                  : null;
            return <button key={label} aria-label={label} title={sidebarCollapsed ? label : undefined} className={activeNav === label ? "nav-item active" : "nav-item"} onClick={() => navigate(label)}><Icon size={18} /><span>{label}</span>{alertCount !== null && <span className="nav-count" aria-label={`${alertCount} pending alerts`}>{alertCount}</span>}</button>;
          })}
        </nav>
        <button type="button" className="sidebar-collapse-button" aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!sidebarCollapsed} onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}><SidebarSwitchIcon /></button>
      </aside>
      {sidebarOpen && <button className="sidebar-overlay" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><div className="breadcrumb"><span>Finance</span><span>/</span><strong>{activeNav}</strong></div></div>
          <div className="topbar-actions">
            <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records..." /></label>
            <button ref={feedbackButtonRef} type="button" className="feedback-button" aria-haspopup="dialog" aria-expanded={feedbackOpen} onClick={() => setFeedbackOpen(true)}><MessageSquare size={15} /><span>Feedback</span></button>
            <button className="icon-button" aria-label="Help"><HelpCircle size={19} /></button>
            <div className="notification-menu-wrap" ref={notificationMenuRef}>
              <button ref={notificationButtonRef} type="button" className="icon-button notification" aria-label={unreadNotificationCount ? `Notifications, ${unreadNotificationCount} unread` : "Notifications"} aria-haspopup="dialog" aria-expanded={notificationsOpen} onClick={() => { setProfileMenuOpen(false); setNotificationsOpen((open) => !open); }}>
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
            <div className="profile-menu-wrap" ref={profileMenuRef}>
              <button type="button" className="profile-trigger" aria-label={`Open user menu for ${profileSettings.name}`} aria-haspopup="menu" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((open) => !open)}>
                <span className="workspace-avatar">{profileInitials(profileSettings.name)}</span><ChevronDown size={14} aria-hidden="true" />
              </button>
              {profileMenuOpen && <div className="profile-dropdown" role="menu" aria-label="User profile">
                <div className="profile-menu-user"><span className="workspace-avatar">{profileInitials(profileSettings.name)}</span><div><strong>{profileSettings.name}</strong><span>Finance Admin</span></div></div>
                <div className="profile-menu-divider" />
                <button type="button" className="profile-menu-link" role="menuitem" onClick={() => { navigate("Profile"); setProfileMenuOpen(false); }}><UserRound size={15} /> Profile settings</button>
                <div className="profile-menu-divider" />
                <button type="button" className="profile-logout" role="menuitem" disabled title="Sign-in is not configured">Log out</button>
                <p className="profile-menu-note">Sign-in is not configured</p>
              </div>}
            </div>
          </div>
        </header>
        <div className="page-wrap">
          <section className="page-heading"><div><h1>{activeNav === "Overview" ? `Welcome back, ${profileSettings.name.split(" ")[0]}!` : activeNav === "Profile" ? "Profile settings" : activeNav === "Settings" ? "Workspace Settings" : activeNav}</h1><p>{activeNav === "Overview" ? "Here’s what’s happening across your business today." : activeNav === "Profile" ? "Manage your personal details, preferences, and account security." : activeNav === "Settings" ? "Configure workspace automation, approval controls, and access." : `Manage ${activeNav.toLowerCase()} from your central finance workspace.`}</p></div>{activeNav !== "Profile" && activeNav !== "Settings" && <DateRangePicker onApply={(start, end) => setDateRange({ start, end })} />}</section>
          {dataError
            ? <p className="dashboard-data-message" role="alert">{dataError}</p>
            : dashboardData
              ? <>
                {activeNav === "Overview" && dateFilteredData && <Overview data={dateFilteredData} search={search} updateStatus={updateStatus} />}
                {activeNav === "Inventory" && dateFilteredData && <InventoryPage data={dateFilteredData} onCreateOrder={createPurchaseOrder} onCreateProcurement={createProcurement} onUpdateProcurementStatus={updateProcurementStatus} onGenerateProcurementReference={generateProcurementReference} onAddInventoryItem={addInventoryItem} onAddInventoryLocation={addInventoryLocation} onAdjustStock={adjustInventoryStock} />}
                {activeNav === "Audit Trail" && dateFilteredData && <AudioTrailPage data={dateFilteredData} />}
                {activeNav === "Settings" && <SettingsPage data={dashboardData} />}
                {activeNav === "Profile" && <ProfilePage savedProfile={profileSettings} onSave={setProfileSettings} />}
                {activeNav !== "Overview" && activeNav !== "Inventory" && activeNav !== "Audit Trail" && activeNav !== "Settings" && activeNav !== "Profile" && dateFilteredData && <ModulePage activeNav={activeNav} data={dateFilteredData} periodLabel={`${formatDateKey(dateRange.start)} – ${formatDateKey(dateRange.end)}`} existingJournalReferences={dashboardData.ledgerAccounts.map(({ reference }) => reference).filter((reference): reference is string => Boolean(reference))} onStatusChange={(view, record, field, status) => updateModuleStatus(activeNav, view, record, field, status)} onAddLedgerAccount={addLedgerAccount} onCreateLedgerJournalEntry={createLedgerJournalEntry} onAddReceivable={addReceivable} onAddPayable={addPayable} onAddInvoice={addInvoice} onAddPayrollRecord={addPayrollRecord} onAddReport={addReport} />}
              </>
              : <p className="dashboard-data-message" role="status">Loading dashboard data…</p>}
        </div>
      </main>
      {feedbackOpen && <FeedbackDialog onClose={closeFeedback} />}
    </div>
  );
}

function Overview({ data, search, updateStatus }: { data: DashboardData; search: string; updateStatus: (id: string, status: Status) => void }) {
  const metrics = getOverviewMetrics(data);
  const cashFlowWaterfall = getCashFlowWaterfall(data);
  const activityIcons = { invoice: Upload, ocr: FileCheck2, match: ShieldCheck, alert: AlertIcon };
  const activityColors = { invoice: "yellow", ocr: "green", match: "blue", alert: "red" };
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
    ...data.activity.map((item, index) => {
      const relatedInvoice = data.invoices.find(({ invoice }) => item.detail.includes(invoice));
      return {
        id: `activity-${index}`,
        event: item.title,
        detail: item.detail,
        when: item.time,
        status: item.kind === "ocr" ? "Complete" : item.kind === "match" ? "Matched" : item.kind === "alert" ? "Flagged" : "Uploaded",
        owner: relatedInvoice?.owner ?? (item.kind === "invoice" ? "—" : "System"),
        kind: item.kind,
        invoice: undefined,
      };
    }),
    ...data.invoices.map((invoice) => ({
      id: invoice.id,
      event: "Invoice verification",
      detail: `${invoice.vendor} · ${invoice.invoice}`,
      when: invoice.date,
      status: invoice.status,
      owner: invoice.owner,
      invoice,
      kind: "invoice" as const,
    })),
  ].filter((row) => `${row.event} ${row.detail} ${row.when} ${row.status} ${row.owner}`.toLowerCase().includes(search.toLowerCase()));

  return <>
    <section className="metrics-grid overview-metrics"><MetricCard icon={GrossProfitIcon} label="Gross Profit" value={formatNaira(metrics.grossProfit)} accent="yellow" /><MetricCard icon={PendingPayablesIcon} label="Pending payables" value={formatNaira(metrics.pendingPayables)} accent="red" /><MetricCard icon={OutstandingReceivablesIcon} label="Outstanding receivables" value={formatNaira(metrics.outstandingReceivables)} accent="blue" /></section>
    <section className="dashboard-grid overview-dashboard-grid">
      <article className="panel cash-flow-panel"><PanelHeader kicker="Performance" title="Cash flow overview" /><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={cashFlowWaterfall} margin={{ top: 14, right: 24, left: 12, bottom: 0 }}><CartesianGrid stroke="#ebe6de" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#77716a", fontSize: 12 }} dy={8} /><YAxis width={82} tickMargin={8} axisLine={false} tickLine={false} tick={{ fill: "#77716a", fontSize: 12 }} tickFormatter={(value) => formatCompactNaira(Number(value))} /><Tooltip content={<WaterfallTooltip />} /><Bar dataKey="base" stackId="cash-flow" fill="transparent" isAnimationActive={false} /><Bar dataKey="increase" stackId="cash-flow" name="Net increase" fill="#ffe01b">{cashFlowWaterfall.map((step) => <Cell key={step.month} fill={step.total ? "#241c15" : "#ffe01b"} />)}</Bar><Bar dataKey="decrease" stackId="cash-flow" name="Net decrease" fill="#d7655b" /></BarChart></ResponsiveContainer></div><div className="chart-legend waterfall-legend"><span><i className="legend-dot positive" /> Net increase</span><span><i className="legend-dot negative" /> Net decrease</span><span><i className="legend-dot total" /> Cumulative total</span></div></article>
      <article className="panel activity-panel activity-table-panel"><PanelHeader kicker="Activity log" title="Recent activities" /><div className="activity-table-wrap"><table className="activity-table"><thead><tr><th>Activity</th><th>Details</th><th>Date / time</th><th>Status</th><th>Owner</th></tr></thead><tbody>{processingRows.map((row) => {
        const Icon = activityIcons[row.kind];
        const statusStyle = row.status === "Matched" || row.status === "Complete" || row.status === "Uploaded" ? "status-matched" : row.status === "Pending" ? "status-pending" : "status-flagged";
        const invoice = row.invoice;
        return <tr key={row.id}><td><span className="activity-table-event"><span className={`activity-table-icon ${activityColors[row.kind]}`}><Icon size={15} /></span><strong>{row.event}</strong></span></td><td>{row.detail}</td><td>{row.when}</td><td>{invoice ? <button type="button" className="activity-status-button" aria-label={`Update ${invoice.invoice} status`} onClick={() => updateStatus(invoice.id, invoice.status === "Matched" ? "Pending" : "Matched")}><span className={`status ${statusStyle}`}><i />{row.status}</span></button> : <span className={`status ${statusStyle}`}><i />{row.status}</span>}</td><td>{row.owner}</td></tr>;
      })}</tbody></table></div><div className="table-footer"><span>Showing {processingRows.length} processing and invoice records</span><span>Filtered by selected date range</span></div></article>
    </section>
  </>;
}

type ModuleCreateNav = "Receivables" | "Payables" | "Invoice" | "Payroll" | "Reports";

function ModulePage({ activeNav, data, periodLabel, existingJournalReferences, onStatusChange, onAddLedgerAccount, onCreateLedgerJournalEntry, onAddReceivable, onAddPayable, onAddInvoice, onAddPayrollRecord, onAddReport }: {
  activeNav: ModuleNavKey;
  data: DashboardData;
  periodLabel: string;
  existingJournalReferences: string[];
  onStatusChange: (view: ReconciliationView, record: Record<string, string>, field: string, status: string) => void;
  onAddLedgerAccount: (account: NewLedgerAccount) => string | null;
  onCreateLedgerJournalEntry: (entry: LedgerJournalEntry) => string | null;
  onAddReceivable: (draft: ReceivableDraft) => string | null;
  onAddPayable: (draft: PayableDraft) => string | null;
  onAddInvoice: (draft: InvoiceDraft) => string | null;
  onAddPayrollRecord: (draft: PayrollDraft) => string | null;
  onAddReport: (draft: ReportDraft) => string | null;
}) {
  const [reconciliationView, setReconciliationView] = useState<ReconciliationView>("Payables");
  const [selected, setSelected] = useState<Record<string, string> | null>(null);
  const [selectedReport, setSelectedReport] = useState<Record<string, string> | null>(null);
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<Record<string, string> | null>(null);
  const [reportView, setReportView] = useState<"sheet" | "chart">("sheet");
  const [ledgerCreatePage, setLedgerCreatePage] = useState<"journal" | "account" | null>(null);
  const [ledgerChoiceOpen, setLedgerChoiceOpen] = useState(false);
  const [createRecordOpen, setCreateRecordOpen] = useState(false);
  const [ledgerNotice, setLedgerNotice] = useState("");
  const records = getModuleRecords(data, activeNav, reconciliationView);
  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);
  useEffect(() => { setSelected(null); }, [activeNav, reconciliationView]);
  useEffect(() => { setSelectedReport(null); }, [activeNav]);
  useEffect(() => { setSelectedLedgerAccount(null); }, [activeNav]);
  useEffect(() => { setLedgerCreatePage(null); setLedgerChoiceOpen(false); }, [activeNav]);

  const labels: Record<ModuleNavKey, string> = { Ledger: "General ledger", Receivables: "Accounts receivable", Payables: "Accounts payable", Reconciliation: "Reconciliation", Invoice: "Invoice review", Inventory: "Inventory", Payroll: "Payroll", Reports: "Financial reports", "Audit Trail": "Audit trail", Overview: "Overview", Settings: "Settings" };
  const descriptions: Record<ModuleNavKey, string> = { Ledger: "Track balanced journal entries and account movements.", Receivables: "Monitor customer invoices, collections, and credit exposure.", Payables: "Review supplier obligations and scheduled payments, including approved purchase orders.", Reconciliation: "Reconcile payables, receivables, and bank transactions.", Invoice: "Verify OCR results and resolve matching exceptions.", Inventory: "Monitor stock levels, movement, and valuation.", Payroll: "Review employee compensation and payment status.", Reports: "Build and export financial reporting views.", "Audit Trail": "Review secure, timestamped actions across every financial workflow.", Overview: "Overall system performance.", Settings: "Manage your workspace and automated workflows." };
  const columns = records.length > 0 ? Object.keys(records[0]) : [];
  const createLabels: Partial<Record<ModuleNavKey, string>> = {
    Ledger: "Add record",
    Receivables: "Create invoice",
    Payables: "Add bill",
    Invoice: "Add invoice",
    Payroll: "Add payroll entry",
    Reports: "Create report",
  };
  const canCreateRecord = activeNav in createLabels;
  const statusClass = (value: string) => value === "Matched" || value === "Received" || value === "Paid" || value === "Ready" || value === "Healthy" ? "status-matched" : value === "Pending" || value === "Review" || value === "Approval" || value === "Quotation" || value === "Draft" || value === "Awaiting approval" ? "status-pending" : value === "Flagged" || value === "Overdue" || value === "Partial" ? "status-flagged" : "status-pending";
  const label = (column: string) => column.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
  const nextSteps: Partial<Record<ModuleNavKey, string>> = {
    Invoice: "Compare the OCR fields against the supplier document, then match it to its purchase order or flag the exception.",
    Payables: "Confirm the supplier, amount and due date before scheduling the payment.",
    Receivables: "Check the balance and follow up with the customer if the invoice is overdue.",
    Reconciliation: "Confirm both sides of the transaction agree before marking it reconciled.",
    Ledger: "Verify the debit and credit lines balance and reference the source document.",
    Inventory: "Review stock against reorder levels and raise a purchase order if needed.",
    Payroll: "Confirm gross pay, deductions and payment status before the payroll run.",
    Reports: "Review the figures, then export or share the report.",
    "Audit Trail": "Review who made the change and when, for compliance records.",
  };

  if (activeNav === "Reports" && selectedReport) {
    return <ReportSheet
      reportName={selectedReport.report}
      periodLabel={periodLabel}
      data={data}
      view={reportView}
      onViewChange={setReportView}
      onBack={() => setSelectedReport(null)}
    />;
  }
  if (activeNav === "Ledger" && selectedLedgerAccount) {
    return <LedgerSheetPage
      account={selectedLedgerAccount}
      periodLabel={periodLabel}
      data={data}
      onBack={() => setSelectedLedgerAccount(null)}
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
    <div className="module-intro"><div><p className="panel-kicker">{activeNav}</p><h2>{labels[activeNav]}</h2><p>{descriptions[activeNav]}</p></div>{canCreateRecord && <button type="button" className="primary-button" onClick={() => {
      if (activeNav === "Ledger") { setLedgerNotice(""); setLedgerChoiceOpen(true); }
      else if (activeNav === "Receivables" || activeNav === "Payables" || activeNav === "Invoice" || activeNav === "Payroll" || activeNav === "Reports") setCreateRecordOpen(true);
    }}><Plus size={16} /> {createLabels[activeNav]}</button>}</div>
    {ledgerNotice && <p className="inventory-confirmation" role="status">{ledgerNotice}</p>}
    <article className="panel module-table-panel">
      {activeNav === "Reconciliation" && <div className="reconciliation-tabs" role="tablist" aria-label="Reconciliation type">{(["Payables", "Receivables", "Bank"] as const).map((view) => <button key={view} id={`reconciliation-tab-${view.toLowerCase()}`} type="button" role="tab" aria-selected={reconciliationView === view} aria-controls="reconciliation-table-panel" tabIndex={reconciliationView === view ? 0 : -1} className={reconciliationView === view ? "active" : ""} onClick={() => setReconciliationView(view)}>{view}</button>)}</div>}
      <div className="module-table-wrap" id={activeNav === "Reconciliation" ? "reconciliation-table-panel" : undefined} role={activeNav === "Reconciliation" ? "tabpanel" : undefined} aria-labelledby={activeNav === "Reconciliation" ? `reconciliation-tab-${reconciliationView.toLowerCase()}` : undefined}>
        <table className="module-table">
          <thead><tr>{columns.map((column) => <th key={column}>{label(column)}</th>)}<th>Actions</th></tr></thead>
          <tbody>{records.map((record, index) => {
            const recordLabel = record[columns[0]] ?? `row ${index + 1}`;
            return <tr key={`${recordLabel}-${index}`}>{columns.map((column) => {
              const value = record[column];
              const isStatus = column.toLowerCase().endsWith("status");
              return <td key={column}>{isStatus ? <span className={`status ${statusClass(value)}`}><i />{value}</span> : value}</td>;
            })}<td><div className="table-actions"><button type="button" className="table-action-button" aria-label={`View details for ${recordLabel}`} aria-haspopup={activeNav === "Reports" || activeNav === "Ledger" ? undefined : "dialog"} onClick={() => activeNav === "Reports" ? (setReportView("sheet"), setSelectedReport(record)) : activeNav === "Ledger" ? setSelectedLedgerAccount(record) : setSelected(record)}>View</button><button className="more-button" aria-label={`More actions for row ${index + 1}`}><MoreHorizontal size={16} /></button></div></td></tr>;
          })}</tbody>
        </table>
      </div>
      <div className="table-footer"><span>Showing {records.length} records</span><span>Updated just now</span></div>
    </article>
    {selected && <RecordDetailsDrawer
      key={`${activeNav}-${reconciliationView}-${Object.values(selected).join("-")}`}
      activeNav={activeNav}
      reconciliationView={reconciliationView}
      record={selected}
      nextStep={nextSteps[activeNav]}
      statusClass={statusClass}
      onClose={() => setSelected(null)}
      onStatusChange={(field, status) => onStatusChange(reconciliationView, selected, field, status)}
    />}
    {activeNav === "Ledger" && ledgerChoiceOpen && <LedgerRecordTypeModal
      onClose={() => setLedgerChoiceOpen(false)}
      onChoose={(type) => { setLedgerChoiceOpen(false); setLedgerCreatePage(type); }}
    />}
    {createRecordOpen && (activeNav === "Receivables" || activeNav === "Payables" || activeNav === "Invoice" || activeNav === "Payroll" || activeNav === "Reports") && <ModuleCreateModal
      nav={activeNav}
      onClose={() => setCreateRecordOpen(false)}
      onSuccess={(message) => { setLedgerNotice(message); setCreateRecordOpen(false); }}
      onAddReceivable={onAddReceivable}
      onAddPayable={onAddPayable}
      onAddInvoice={onAddInvoice}
      onAddPayrollRecord={onAddPayrollRecord}
      onAddReport={onAddReport}
    />}
  </section>;
}

function ModuleCreateModal({ nav, onClose, onSuccess, onAddReceivable, onAddPayable, onAddInvoice, onAddPayrollRecord, onAddReport }: {
  nav: ModuleCreateNav;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onAddReceivable: (draft: ReceivableDraft) => string | null;
  onAddPayable: (draft: PayableDraft) => string | null;
  onAddInvoice: (draft: InvoiceDraft) => string | null;
  onAddPayrollRecord: (draft: PayrollDraft) => string | null;
  onAddReport: (draft: ReportDraft) => string | null;
}) {
  const today = toDateKey(new Date());
  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + 30);
  const [values, setValues] = useState<Record<string, string>>({
    dateKey: today,
    dueDate: toDateKey(defaultDue),
    period: new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    report: "Profit & loss",
  });
  const [error, setError] = useState("");
  const title: Record<ModuleCreateNav, string> = {
    Receivables: "Create customer invoice",
    Payables: "Add supplier bill",
    Invoice: "Add invoice for review",
    Payroll: "Add payroll entry",
    Reports: "Create report",
  };
  const descriptions: Record<ModuleCreateNav, string> = {
    Receivables: "Create an open customer balance with an amount and due date.",
    Payables: "Record a supplier bill for review before scheduling payment.",
    Invoice: "Add invoice details to the review queue. Document upload and OCR are not configured.",
    Payroll: "Add a pending employee pay record for the current payroll period.",
    Reports: "Create a draft report entry that can be opened and reviewed.",
  };
  const submitLabel: Record<ModuleCreateNav, string> = {
    Receivables: "Create invoice",
    Payables: "Add bill",
    Invoice: "Add to review",
    Payroll: "Add payroll entry",
    Reports: "Create draft",
  };
  const update = (field: string, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError("");
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let failure: string | null = null;
    if (nav === "Receivables") {
      failure = onAddReceivable({
        customer: values.customer ?? "",
        invoice: values.invoice ?? "",
        amount: Number(values.amount),
        dueDate: values.dueDate ?? "",
      });
      if (!failure) onSuccess(`Customer invoice ${values.invoice} created as open.`);
    } else if (nav === "Payables") {
      failure = onAddPayable({
        vendor: values.vendor ?? "",
        invoice: values.invoice ?? "",
        amount: Number(values.amount),
        dueDate: values.dueDate ?? "",
      });
      if (!failure) onSuccess(`Supplier bill ${values.invoice} added for review.`);
    } else if (nav === "Invoice") {
      failure = onAddInvoice({
        vendor: values.vendor ?? "",
        invoice: values.invoice ?? "",
        amount: Number(values.amount),
        dateKey: values.dateKey ?? "",
      });
      if (!failure) onSuccess(`Invoice ${values.invoice} added to the pending review queue.`);
    } else if (nav === "Payroll") {
      failure = onAddPayrollRecord({
        employee: values.employee ?? "",
        role: values.role ?? "",
        pay: Number(values.pay),
      });
      if (!failure) onSuccess(`Payroll entry for ${values.employee} added as pending.`);
    } else {
      failure = onAddReport({ report: values.report ?? "", period: values.period ?? "" });
      if (!failure) onSuccess(`${values.report} report created as a draft.`);
    }
    if (failure) setError(failure);
  };
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return <div className="module-create-backdrop" onClick={onClose}>
    <section className="module-create-modal" role="dialog" aria-modal="true" aria-labelledby="module-create-title" onClick={(event) => event.stopPropagation()}>
      <header className="module-create-header"><div><p className="panel-kicker">{nav} · New record</p><h2 id="module-create-title">{title[nav]}</h2><p>{descriptions[nav]}</p></div><button type="button" className="more-button" aria-label="Close dialog" autoFocus onClick={onClose}><X size={16} /></button></header>
      <form className="inventory-form module-create-form" onSubmit={submit}>
        {(nav === "Receivables" || nav === "Payables" || nav === "Invoice") && <>
          <label htmlFor="module-create-party">{nav === "Receivables" ? "Customer" : "Supplier / vendor"}</label>
          <input id="module-create-party" value={nav === "Receivables" ? values.customer ?? "" : values.vendor ?? ""} maxLength={120} required onChange={(event) => update(nav === "Receivables" ? "customer" : "vendor", event.target.value)} placeholder={nav === "Receivables" ? "Customer name" : "Supplier name"} />
          <label htmlFor="module-create-reference">{nav === "Receivables" ? "Invoice number" : nav === "Payables" ? "Bill reference" : "Invoice number"}</label>
          <input id="module-create-reference" value={values.invoice ?? ""} maxLength={50} required onChange={(event) => update("invoice", event.target.value)} placeholder={nav === "Payables" ? "e.g. BILL-1042" : "e.g. INV-2050"} />
          <label htmlFor="module-create-amount">{nav === "Invoice" ? "Invoice amount (₦)" : "Amount (₦)"}</label>
          <input id="module-create-amount" type="number" min="1" step="1" value={values.amount ?? ""} required onChange={(event) => update("amount", event.target.value)} placeholder="0" />
          {nav === "Invoice"
            ? <><label htmlFor="module-create-date">Invoice date</label><input id="module-create-date" type="date" value={values.dateKey} max={today} required onChange={(event) => update("dateKey", event.target.value)} /></>
            : <><label htmlFor="module-create-due-date">Due date</label><input id="module-create-due-date" type="date" value={values.dueDate} required onChange={(event) => update("dueDate", event.target.value)} /></>}
        </>}
        {nav === "Payroll" && <>
          <label htmlFor="module-create-employee">Employee name</label><input id="module-create-employee" value={values.employee ?? ""} maxLength={120} required onChange={(event) => update("employee", event.target.value)} placeholder="Employee name" />
          <label htmlFor="module-create-role">Role / job title</label><input id="module-create-role" value={values.role ?? ""} maxLength={100} required onChange={(event) => update("role", event.target.value)} placeholder="Job title" />
          <label htmlFor="module-create-pay">Net pay (₦)</label><input id="module-create-pay" type="number" min="1" step="1" value={values.pay ?? ""} required onChange={(event) => update("pay", event.target.value)} placeholder="0" />
        </>}
        {nav === "Reports" && <>
          <label htmlFor="module-create-report-type">Report</label>
          <select id="module-create-report-type" value={values.report} onChange={(event) => update("report", event.target.value)}>
            {["Profit & loss", "Cash flow", "Accounts receivable", "Inventory movement", "Tax summary", "Budget variance", "Custom report"].map((report) => <option key={report}>{report}</option>)}
          </select>
          <label htmlFor="module-create-period">Reporting period</label><input id="module-create-period" value={values.period} maxLength={60} required onChange={(event) => update("period", event.target.value)} placeholder="e.g. October 2026" />
        </>}
        {error && <p className="inventory-error" role="alert">{error}</p>}
        <footer><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Plus size={15} /> {submitLabel[nav]}</button></footer>
      </form>
    </section>
  </div>;
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
      <header className="ledger-choice-header"><div><p className="panel-kicker">Ledger · New record</p><h2 id="ledger-choice-title">What would you like to create?</h2><p>Choose a record type to continue.</p></div><button type="button" className="more-button" aria-label="Close dialog" autoFocus onClick={onClose}><X size={16} /></button></header>
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
    <div className="report-sheet-toolbar"><button type="button" className="outline-button" onClick={onBack}><ChevronLeft size={16} /> Back to ledger</button></div>
    <article className="panel report-sheet-panel">
      <header className="report-sheet-header"><div><p className="panel-kicker">Ledger · New record</p><h2>{pageTitle}</h2><p>{page === "journal" ? "Enter a dated transaction with balanced debit and credit lines." : "Add a new account to the chart of accounts."}</p></div></header>
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
    if (totalDebits <= 0 || totalDebits !== totalCredits) {
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
          <div><label htmlFor={`journal-debit-${index}`}>Debit (₦)</label><input id={`journal-debit-${index}`} type="number" min="0" step="1" value={line.debit} onChange={(event) => updateLine(index, "debit", event.target.value)} placeholder="0" /></div>
          <div><label htmlFor={`journal-credit-${index}`}>Credit (₦)</label><input id={`journal-credit-${index}`} type="number" min="0" step="1" value={line.credit} onChange={(event) => updateLine(index, "credit", event.target.value)} placeholder="0" /></div>
        </div>
        {lines.length > 2 && <button type="button" className="table-action-button ledger-remove-line" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>Remove line</button>}
      </div>)}
      <p className={`inventory-form-total ${totalDebits === totalCredits && totalDebits > 0 ? "ledger-balanced" : ""}`}><span>Debits {formatNaira(totalDebits)} · Credits {formatNaira(totalCredits)}</span><strong>{totalDebits === totalCredits && totalDebits > 0 ? "Balanced" : "Out of balance"}</strong></p>
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
    if (openingBalance && (!Number.isSafeInteger(newAccount.openingBalance) || newAccount.openingBalance < 0)) {
      setError("Opening balance must be a non-negative whole number.");
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
          <input id="ledger-opening-balance" type="number" min="0" step="1" value={openingBalance} onChange={(event) => { setOpeningBalance(event.target.value); setError(""); }} placeholder="0" />
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

function LedgerSheetPage({ account, periodLabel, data, onBack }: {
  account: Record<string, string>;
  periodLabel: string;
  data: DashboardData;
  onBack: () => void;
}) {
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
      <button type="button" className="outline-button" onClick={onBack}><ChevronLeft size={16} /> Back to ledgers</button>
      <button type="button" className="outline-button" onClick={() => window.print()}>Print</button>
    </div>
    <article className="panel report-sheet-panel">
      <header className="report-sheet-header">
        <div><p className="panel-kicker">Consolidated ledger sheet · {accountType}</p><h2>{accountName}</h2><p>Account code {account.code ?? "—"} · Account activity for the selected period.</p></div>
        <div className="report-period"><span>Reporting period</span><strong>{periodLabel}</strong></div>
      </header>
      <div className="ledger-sheet-summary">
        <div><span>Total debits</span><strong>{formatNaira(totalDebits)}</strong></div>
        <div><span>Total credits</span><strong>{formatNaira(totalCredits)}</strong></div>
        <div><span>Net period balance</span><strong>{formatNaira(balance)}</strong></div>
      </div>
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

function ReportSheet({ reportName, periodLabel, data, view, onViewChange, onBack }: {
  reportName: string;
  periodLabel: string;
  data: DashboardData;
  view: "sheet" | "chart";
  onViewChange: (view: "sheet" | "chart") => void;
  onBack: () => void;
}) {
  type ReportRow = { line: string; detail?: string; amount?: number; inflow?: number; outflow?: number; status?: string };
  const reportType = reportName.toLowerCase();
  let description = `Consolidated ${reportName.toLowerCase()} for ${periodLabel}.`;
  let rows: ReportRow[] = [];
  let unavailableMessage = "";
  let cashFlowReport = false;

  if (reportType.includes("profit") || reportType.includes("loss")) {
    const income = data.ledgerAccounts.filter(({ type }) => type === "Income");
    const expenses = data.ledgerAccounts.filter(({ type }) => type === "Expense");
    const incomeByAccount = income.reduce<Record<string, number>>((totals, entry) => {
      totals[entry.account] = (totals[entry.account] ?? 0) + entry.credit;
      return totals;
    }, {});
    const expenseByAccount = expenses.reduce<Record<string, number>>((totals, entry) => {
      totals[entry.account] = (totals[entry.account] ?? 0) + entry.debit;
      return totals;
    }, {});
    const costOfGoodsSold = Object.entries(expenseByAccount).filter(([account]) => account.toLowerCase().includes("cost of goods sold")).reduce((total, [, amount]) => total + amount, 0);
    const totalIncome = Object.values(incomeByAccount).reduce((total, amount) => total + amount, 0);
    const totalExpenses = Object.values(expenseByAccount).reduce((total, amount) => total + amount, 0);
    rows = [
      ...Object.entries(incomeByAccount).map(([line, amount]) => ({ line, detail: "Income", amount })),
      ...Object.entries(expenseByAccount).map(([line, amount]) => ({ line, detail: line.toLowerCase().includes("cost of goods sold") ? "Cost of goods sold" : "Operating expense", amount })),
      { line: "Total income", detail: "Subtotal", amount: totalIncome },
      { line: "Gross profit", detail: "Income less cost of goods sold", amount: totalIncome - costOfGoodsSold },
      { line: "Total expenses", detail: "Subtotal", amount: totalExpenses },
      { line: "Net profit / (loss)", detail: "Income less total expenses", amount: totalIncome - totalExpenses },
    ];
    if (income.length === 0 && expenses.length === 0) unavailableMessage = "No income or expense ledger entries are available for this period.";
  } else if (reportType.includes("cash flow")) {
    cashFlowReport = true;
    const totalInflows = data.cashFlow.reduce((total, entry) => total + cashFlowAmountToNaira(entry.inflow), 0);
    const totalOutflows = data.cashFlow.reduce((total, entry) => total + cashFlowAmountToNaira(entry.outflow), 0);
    rows = [
      ...data.cashFlow.map(({ month, inflow, outflow }) => ({ line: month, inflow: cashFlowAmountToNaira(inflow), outflow: cashFlowAmountToNaira(outflow), amount: cashFlowAmountToNaira(inflow - outflow) })),
      { line: "Total", detail: "Net cash flow", inflow: totalInflows, outflow: totalOutflows, amount: totalInflows - totalOutflows },
    ];
    if (data.cashFlow.length === 0) unavailableMessage = "No cash-flow data is available for this period.";
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
      <button type="button" className="outline-button" onClick={onBack}><ChevronLeft size={16} /> Back to reports</button>
      <div className="report-sheet-actions">
        <div className="report-view-toggle" role="group" aria-label="Report display">
          <button type="button" aria-pressed={view === "sheet"} className={view === "sheet" ? "active" : ""} onClick={() => onViewChange("sheet")}>Sheet</button>
          <button type="button" aria-pressed={view === "chart"} className={view === "chart" ? "active" : ""} onClick={() => onViewChange("chart")}>Chart</button>
        </div>
        <button type="button" className="outline-button" onClick={() => window.print()}>Print</button>
      </div>
    </div>
    <article className="panel report-sheet-panel">
      <header className="report-sheet-header">
        <div><p className="panel-kicker">Consolidated financial report</p><h2>{reportName}</h2><p>{description}</p></div>
        <div className="report-period"><span>Reporting period</span><strong>{periodLabel}</strong></div>
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
            <CartesianGrid stroke="#ebe6de" vertical={false} />
            <XAxis dataKey="line" axisLine={false} tickLine={false} tick={{ fill: "#77716a", fontSize: 10 }} angle={-18} textAnchor="end" interval={0} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#77716a", fontSize: 10 }} tickFormatter={(value) => formatCompactNaira(value)} />
            <Tooltip formatter={(value) => formatNaira(Number(value ?? 0))} />
            {cashFlowReport
              ? <><Bar dataKey="inflow" name="Cash inflow" fill="#ffe01b" radius={[4, 4, 0, 0]} /><Bar dataKey="outflow" name="Cash outflow" fill="#d7655b" radius={[4, 4, 0, 0]} /></>
              : <Bar dataKey="amount" name={reportType.includes("receivable") ? "Outstanding" : "Amount"} fill="#241c15" radius={[4, 4, 0, 0]} />}
          </BarChart></ResponsiveContainer></div>}
      <footer className="report-sheet-footer"><span>{unavailableMessage ? "Data source required" : `${rows.length} consolidated lines`}</span><span>Values shown in Nigerian naira (₦)</span></footer>
    </article>
  </section>;
}

function RecordDetailsDrawer({ activeNav, reconciliationView, record: initialRecord, nextStep, statusClass, onClose, onStatusChange }: {
  activeNav: ModuleNavKey;
  reconciliationView: ReconciliationView;
  record: Record<string, string>;
  nextStep?: string;
  statusClass: (value: string) => string;
  onClose: () => void;
  onStatusChange: (field: string, status: string) => void;
}) {
  const [record, setRecord] = useState(initialRecord);
  const [draftStatuses, setDraftStatuses] = useState(() => Object.fromEntries(
    Object.entries(initialRecord).filter(([field]) => field.toLowerCase().endsWith("status")),
  ));
  const [statusMessage, setStatusMessage] = useState("");
  const label = (column: string) => column.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
  const fields = Object.keys(record);
  const title = String(record[fields[0]] ?? "");
  const statusFields = fields.filter((field) => field.toLowerCase().endsWith("status"));

  const saveStatus = (field: string) => {
    const status = draftStatuses[field];
    if (!status || status === record[field]) return;
    onStatusChange(field, status);
    setRecord((current) => ({ ...current, [field]: status }));
    setStatusMessage(`${label(field)} updated to ${status}.`);
  };

  return <div className="record-drawer-backdrop" onClick={onClose}>
    <aside className="record-drawer" role="dialog" aria-modal="true" aria-labelledby="record-drawer-title" onClick={(event) => event.stopPropagation()}>
      <header className="record-drawer-header"><div><p className="panel-kicker">{activeNav}{activeNav === "Reconciliation" ? ` · ${reconciliationView}` : ""}</p><h3 id="record-drawer-title">{title}</h3></div><button type="button" className="more-button" aria-label="Close details" autoFocus onClick={onClose}><X size={16} /></button></header>
      <dl className="record-drawer-fields">{fields.map((field) => <div key={field}><dt>{label(field)}</dt><dd>{record[field]}</dd></div>)}</dl>
      {statusFields.length > 0 && <section className="record-status-editor" aria-label="Update record status">
        <h4>Update status</h4>
        {statusFields.map((field) => {
          const options = getStatusOptions(activeNav, reconciliationView, record, field);
          if (options.length === 0) return null;
          return <div className="record-status-control" key={field}>
            <label htmlFor={`status-${field}`}>{label(field)}</label>
            <div><select id={`status-${field}`} value={draftStatuses[field] ?? record[field]} onChange={(event) => { setDraftStatuses((current) => ({ ...current, [field]: event.target.value })); setStatusMessage(""); }}>{options.map((status) => <option key={status} value={status}>{status}</option>)}</select><button type="button" className="table-action-button" disabled={(draftStatuses[field] ?? record[field]) === record[field]} onClick={() => saveStatus(field)}>Save</button></div>
          </div>;
        })}
        {statusMessage && <p role="status" className="record-status-message">{statusMessage}</p>}
      </section>}
      {nextStep && <div className="record-drawer-note"><strong>Next step</strong><p>{nextStep}</p></div>}
      <footer className="record-drawer-footer"><button type="button" className="table-action-button" onClick={() => window.print()}>Print</button><button type="button" className="primary-button" onClick={onClose}>Done</button></footer>
    </aside>
  </div>;
}

type InventoryItem = DashboardData["inventoryItems"][number];

function InventoryPage({ data, onCreateOrder, onCreateProcurement, onUpdateProcurementStatus, onGenerateProcurementReference, onAddInventoryItem, onAddInventoryLocation, onAdjustStock }: {
  data: DashboardData;
  onCreateOrder: (order: SupplierDetails & { lines: PurchaseOrderLine[] }) => void;
  onCreateProcurement: (request: SupplierDetails & { item: string; amount: number; dueDate: string }) => void;
  onUpdateProcurementStatus: (reference: string | undefined, item: string, status: string) => void;
  onGenerateProcurementReference: (reference: string | undefined, item: string) => string | null;
  onAddInventoryItem: (item: { item: string; sku: string; location: string; quantity: number; unitCost: number }) => string | null;
  onAddInventoryLocation: (location: { location: string; capacity: number }) => string | null;
  onAdjustStock: (adjustment: { sku: string; location: string; quantity: number; direction: "Add" | "Remove" }) => void;
}) {
  const metrics = getInventoryMetrics(data);
  const [dialog, setDialog] = useState<"order" | "procurement" | "add-inventory" | "add-location" | InventoryItem | null>(null);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<DashboardData["purchaseOrders"][number] | null>(null);
  const [selectedProcurement, setSelectedProcurement] = useState<DashboardData["procurements"][number] | null>(null);
  const [confirmation, setConfirmation] = useState("");
  return <>
  <section className="inventory-layout">
    <section className="metrics-grid inventory-metrics"><MetricCard icon={Boxes} label="Open orders" value={String(metrics.openOrders)} accent="yellow" /><MetricCard icon={PackageCheck} label="Stock availability" value={`${metrics.stockAvailability}%`} accent="green" /><MetricCard icon={FileCheck2} label="Pending approvals" value={String(metrics.pendingApprovals)} accent="red" /><MetricCard icon={Building2} label="Inventory value" value={formatCompactNaira(metrics.inventoryValue)} accent="blue" /></section>
    <article className="panel inventory-chart-panel"><div className="panel-heading"><div><p className="panel-kicker">Stock distribution</p><h2>Inventory by location</h2></div><button type="button" className="primary-button inventory-add-button" onClick={() => { setConfirmation(""); setDialog("add-location"); }}><Plus size={15} /> Add location</button></div><div className="inventory-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.inventoryLocations} margin={{ top: 12, right: 10, left: -25, bottom: 0 }}><CartesianGrid stroke="#ebe6de" vertical={false} /><XAxis dataKey="location" axisLine={false} tickLine={false} tick={{ fill: "#77716a", fontSize: 10 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#77716a", fontSize: 10 }} /><Tooltip cursor={{ fill: "#f7f4ef" }} /><Bar dataKey="stock" fill="#241c15" radius={[5, 5, 0, 0]} maxBarSize={38} /></BarChart></ResponsiveContainer></div></article>
    {confirmation && <p className="inventory-confirmation inventory-global-confirmation" role="status">{confirmation}</p>}
    <article className="panel procurement-panel"><div className="panel-heading"><div><p className="panel-kicker">Procurement queue</p><h2>Pending requests</h2></div><button type="button" className="primary-button procurement-create-button" onClick={() => { setConfirmation(""); setDialog("procurement"); }}><Plus size={15} /> Create</button></div><div className="procurement-table-wrap"><table><thead><tr><th>Reference</th><th>Item</th><th>Supplier</th><th>Amount</th><th>Due date</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.procurements.map((item) => <tr key={item.reference ?? item.item}><td><strong>{item.reference ?? "—"}</strong></td><td>{item.item}</td><td><div className="purchase-supplier-details"><strong>{item.supplier}</strong>{item.supplierAddress && <small>{item.supplierAddress}</small>}{item.supplierContact && <small>{item.supplierContact}</small>}</div></td><td>{formatNaira(item.amount)}</td><td>{item.due}</td><td><span className={`status ${item.status.toLowerCase().includes("approval") ? "status-pending" : item.status.toLowerCase().includes("quotation") ? "status-flagged" : "status-pending"}`}><i />{item.status}</span></td><td><button type="button" className="row-action" aria-label={`Review procurement ${item.reference ?? item.item}`} onClick={() => setSelectedProcurement(item)}>Review</button></td></tr>)}</tbody></table></div></article>
    <article className="panel inventory-management-panel"><div className="panel-heading"><div><p className="panel-kicker">Stock control</p><h2>Inventory items</h2></div><button type="button" className="primary-button inventory-add-button" onClick={() => { setConfirmation(""); setDialog("add-inventory"); }}><Plus size={15} /> Add</button></div><div className="purchase-table-wrap"><table><thead><tr><th>Item</th><th>SKU</th><th>On hand</th><th>Inventory value</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.inventoryItems.map((item) => <tr key={item.sku}><td><strong>{item.item}</strong></td><td>{item.sku}</td><td>{item.stock}</td><td>{formatNaira(item.value)}</td><td><span className={`status ${item.status === "Healthy" ? "status-matched" : "status-flagged"}`}><i />{item.status}</span></td><td><button type="button" className="table-action-button stock-adjust-button" aria-label={`Adjust stock for ${item.item}`} onClick={() => { setConfirmation(""); setDialog(item); }}>Adjust stock</button></td></tr>)}</tbody></table></div></article>
    <article className="panel purchase-panel"><div className="panel-heading"><div><p className="panel-kicker">Purchase orders</p><h2>Recent purchase orders</h2></div><button type="button" className="primary-button purchase-create-button" onClick={() => { setConfirmation(""); setDialog("order"); }}><Plus size={15} /> Create</button></div><div className="purchase-table-wrap"><table><thead><tr><th>PO number</th><th>Supplier</th><th>Items</th><th>Quantity</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.purchaseOrders.map((order) => <tr key={order.number}><td><strong>{order.number}</strong></td><td><div className="purchase-supplier-details"><strong>{order.supplier}</strong>{order.supplierAddress && <small>{order.supplierAddress}</small>}{order.supplierContact && <small>{order.supplierContact}</small>}</div></td><td>{order.lines ? <div className="purchase-order-lines">{order.lines.map((line) => <span key={line.sku}>{line.item} <small>× {line.quantity}</small></span>)}</div> : order.item ?? "—"}</td><td>{order.quantity ?? order.items}</td><td>{formatNaira(order.amount)}</td><td><span className={`status ${order.status === "Received" ? "status-matched" : order.status === "Approved" ? "status-pending" : "status-flagged"}`}><i />{order.status}</span></td><td><button type="button" className="row-action" aria-label={`Review purchase order ${order.number}`} onClick={() => setSelectedPurchaseOrder(order)}>Review</button></td></tr>)}</tbody></table></div></article>
  </section>
  {dialog === "order" && <PurchaseOrderDialog items={data.inventoryItems} onClose={() => setDialog(null)} onCreate={(order) => { onCreateOrder(order); setConfirmation(`Purchase order with ${order.lines.length} ${order.lines.length === 1 ? "item" : "items"} added as pending.`); setDialog(null); }} />}
  {dialog === "procurement" && <ProcurementDialog onClose={() => setDialog(null)} onCreate={(request) => { onCreateProcurement(request); setConfirmation(`Procurement document for ${request.item} added to the approval queue.`); setDialog(null); }} />}
  {dialog === "add-inventory" && <AddInventoryDialog locations={data.inventoryLocations} onClose={() => setDialog(null)} onAdd={onAddInventoryItem} onSuccess={(item, quantity) => { setConfirmation(`${item} added to inventory with ${quantity} ${quantity === 1 ? "unit" : "units"}.`); setDialog(null); }} />}
  {dialog === "add-location" && <AddInventoryLocationDialog onClose={() => setDialog(null)} onAdd={onAddInventoryLocation} onSuccess={(location) => { setConfirmation(`${location} added as an inventory location.`); setDialog(null); }} />}
  {dialog && typeof dialog === "object" && <StockAdjustmentDialog items={data.inventoryItems} locations={data.inventoryLocations} initialItem={dialog} onClose={() => setDialog(null)} onAdjust={(adjustment) => { onAdjustStock(adjustment); setConfirmation(`${adjustment.direction === "Add" ? "Added" : "Removed"} ${adjustment.quantity} ${adjustment.quantity === 1 ? "unit" : "units"} ${adjustment.direction === "Add" ? "to" : "from"} ${dialog.item} at ${adjustment.location}.`); setDialog(null); }} />}
  {selectedPurchaseOrder && <PurchaseOrderReviewDrawer order={selectedPurchaseOrder} onClose={() => setSelectedPurchaseOrder(null)} />}
  {selectedProcurement && <ProcurementReviewDrawer
    request={selectedProcurement}
    onClose={() => setSelectedProcurement(null)}
    onStatusChange={(status) => { onUpdateProcurementStatus(selectedProcurement.reference, selectedProcurement.item, status); setSelectedProcurement((current) => current ? { ...current, status } : current); }}
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

function PurchaseOrderDialog({ items, onClose, onCreate }: {
  items: InventoryItem[];
  onClose: () => void;
  onCreate: (order: SupplierDetails & { lines: PurchaseOrderLine[] }) => void;
}) {
  const [supplier, setSupplier] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [lines, setLines] = useState([{ sku: items[0]?.sku ?? "", quantity: "1", unitPrice: "" }]);
  const updateLine = (index: number, field: "sku" | "quantity" | "unitPrice", value: string) => {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line));
  };
  const orderTotal = lines.reduce((total, line) => total + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0), 0);
  const submit = (event: FormEvent<HTMLFormElement>) => {
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
    if (!supplier.trim() || !supplierAddress.trim() || !supplierContact.trim() || orderLines.some((line) => !line.item || !Number.isInteger(line.quantity) || line.quantity < 1 || !Number.isFinite(line.unitPrice) || line.unitPrice <= 0)) return;
    onCreate({ supplier, supplierAddress, supplierContact, lines: orderLines });
  };
  return <InventoryDialog title="Create purchase order" onClose={onClose}>
    <form className="inventory-form" onSubmit={submit}>
      <label htmlFor="po-supplier">Supplier name</label><input id="po-supplier" required maxLength={100} value={supplier} onChange={(event) => setSupplier(event.target.value)} placeholder="Enter supplier name" autoFocus />
      <label htmlFor="po-supplier-address">Supplier address</label><textarea id="po-supplier-address" className="supplier-address-input" required maxLength={250} value={supplierAddress} onChange={(event) => setSupplierAddress(event.target.value)} placeholder="Street, city, region" rows={2} />
      <label htmlFor="po-supplier-contact">Supplier contact (phone or email)</label><input id="po-supplier-contact" type="text" required maxLength={120} value={supplierContact} onChange={(event) => setSupplierContact(event.target.value)} placeholder="Phone number or email address" />
      <div className="purchase-order-lines-editor">
        <div className="purchase-order-lines-heading"><strong>Order items</strong><button type="button" className="table-action-button" onClick={() => setLines((current) => [...current, { sku: items[0]?.sku ?? "", quantity: "1", unitPrice: "" }])}><Plus size={13} /> Add item</button></div>
        {lines.map((line, index) => <div className="purchase-order-line" key={`${index}-${line.sku}`}>
          <div className="purchase-order-line-heading"><strong>Item {index + 1}</strong>{lines.length > 1 && <button type="button" className="purchase-order-line-remove" aria-label={`Remove item ${index + 1}`} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}><X size={14} /></button>}</div>
          <label htmlFor={`po-item-${index}`}>Inventory item</label><select id={`po-item-${index}`} required value={line.sku} onChange={(event) => updateLine(index, "sku", event.target.value)}>{items.map((item) => <option key={item.sku} value={item.sku}>{item.item} · {item.sku}</option>)}</select>
          <div className="inventory-form-row"><div><label htmlFor={`po-quantity-${index}`}>Quantity</label><input id={`po-quantity-${index}`} type="number" required min="1" step="1" value={line.quantity} onChange={(event) => updateLine(index, "quantity", event.target.value)} /></div><div><label htmlFor={`po-unit-price-${index}`}>Unit price (₦)</label><input id={`po-unit-price-${index}`} type="number" required min="0.01" step="0.01" value={line.unitPrice} onChange={(event) => updateLine(index, "unitPrice", event.target.value)} /></div></div>
        </div>)}
      </div>
      <p className="inventory-form-total">Order total <strong>{formatNaira(orderTotal)}</strong></p>
      <footer><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Plus size={15} /> Create</button></footer>
    </form>
  </InventoryDialog>;
}

function PurchaseOrderReviewDrawer({ order, onClose }: {
  order: DashboardData["purchaseOrders"][number];
  onClose: () => void;
}) {
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
        <div><dt>Total quantity</dt><dd>{order.quantity ?? order.items}</dd></div>
        <div><dt>Order total</dt><dd>{formatNaira(order.amount)}</dd></div>
        <div><dt>Status</dt><dd>{order.status}</dd></div>
        {order.dateKey && <div><dt>Created</dt><dd>{formatDateKey(order.dateKey)}</dd></div>}
      </dl>
    </div>
    <footer className="record-drawer-footer"><button type="button" className="table-action-button" onClick={() => window.print()}>Print</button><button type="button" className="primary-button" onClick={onClose}>Done</button></footer>
  </InventoryDialog>;
}

function ProcurementReviewDrawer({ request, onClose, onStatusChange, onGenerateReference }: {
  request: DashboardData["procurements"][number];
  onClose: () => void;
  onStatusChange: (status: string) => void;
  onGenerateReference: () => string | null;
}) {
  const [status, setStatus] = useState(request.status);
  const [reference, setReference] = useState(request.reference ?? "");
  const [message, setMessage] = useState("");
  const statuses = ["Awaiting approval", "Approved", "Rejected", "Quotation review", "Pending PO", "Ordered"];
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
    onStatusChange(status);
    setMessage(`Status updated to ${status}.`);
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
      </dl></section>
      <section><h3>Supplier details</h3><dl className="record-drawer-fields">
        <div><dt>Name</dt><dd>{request.supplier}</dd></div>
        <div><dt>Address</dt><dd>{request.supplierAddress ?? "Not provided"}</dd></div>
        <div><dt>Contact</dt><dd>{request.supplierContact ?? "Not provided"}</dd></div>
      </dl></section>
      <section className="procurement-status-editor"><h3>Update status</h3>
        <label htmlFor="procurement-review-status">Status</label>
        <select id="procurement-review-status" value={status} onChange={(event) => setStatus(event.target.value)}>{statuses.map((option) => <option key={option}>{option}</option>)}</select>
        <button type="button" className="primary-button" disabled={status === request.status} onClick={saveStatus}>Save status</button>
      </section>
      {message && <p className="record-status-message" role="status">{message}</p>}
    </div>
    <footer className="record-drawer-footer"><button type="button" className="primary-button" onClick={onClose}>Done</button></footer>
  </InventoryDialog>;
}

function ProcurementDialog({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (request: SupplierDetails & { item: string; amount: number; dueDate: string }) => void;
}) {
  const [item, setItem] = useState("");
  const [supplier, setSupplier] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(toDateKey(new Date()));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!item.trim() || !supplier.trim() || !supplierAddress.trim() || !supplierContact.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || !dueDate) return;
    onCreate({ item, supplier, supplierAddress, supplierContact, amount: parsedAmount, dueDate });
  };
  return <InventoryDialog title="Create procurement request" onClose={onClose}>
    <form className="inventory-form" onSubmit={submit}>
      <label htmlFor="procurement-item">Item or service</label><input id="procurement-item" required maxLength={120} value={item} onChange={(event) => setItem(event.target.value)} placeholder="What needs to be procured?" autoFocus />
      <label htmlFor="procurement-supplier">Supplier name</label><input id="procurement-supplier" required maxLength={100} value={supplier} onChange={(event) => setSupplier(event.target.value)} placeholder="Enter supplier name" />
      <label htmlFor="procurement-supplier-address">Supplier address</label><textarea id="procurement-supplier-address" className="supplier-address-input" required maxLength={250} value={supplierAddress} onChange={(event) => setSupplierAddress(event.target.value)} placeholder="Street, city, region" rows={2} />
      <label htmlFor="procurement-supplier-contact">Supplier contact (phone or email)</label><input id="procurement-supplier-contact" type="text" required maxLength={120} value={supplierContact} onChange={(event) => setSupplierContact(event.target.value)} placeholder="Phone number or email address" />
      <label htmlFor="procurement-amount">Estimated amount (₦)</label><input id="procurement-amount" type="number" required min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
      <label htmlFor="procurement-due">Required by</label><input id="procurement-due" type="date" required min={toDateKey(new Date())} value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
      <p className="inventory-form-hint">The request will be added to the approval queue. A purchase order can be created after approval.</p>
      <footer><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><FileCheck2 size={15} /> Create</button></footer>
    </form>
  </InventoryDialog>;
}

function AddInventoryDialog({ locations, onClose, onAdd, onSuccess }: {
  locations: DashboardData["inventoryLocations"];
  onClose: () => void;
  onAdd: (item: { item: string; sku: string; location: string; quantity: number; unitCost: number }) => string | null;
  onSuccess: (item: string, quantity: number) => void;
}) {
  const [item, setItem] = useState("");
  const [sku, setSku] = useState("");
  const [locationName, setLocationName] = useState(() => locations.find(({ stock, capacity }) => stock < capacity)?.location ?? "");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [error, setError] = useState("");
  const availableLocations = locations.filter(({ stock, capacity }) => stock < capacity);
  const location = locations.find(({ location: name }) => name === locationName);
  const maxQuantity = location ? location.capacity - location.stock : 0;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedQuantity = Number(quantity);
    const parsedUnitCost = Number(unitCost);
    if (!item.trim() || !sku.trim() || !location || !Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > maxQuantity || !Number.isFinite(parsedUnitCost) || parsedUnitCost <= 0) {
      setError("Enter valid item details, a positive quantity within the location capacity, and a positive unit cost.");
      return;
    }
    const failure = onAdd({ item, sku, location: locationName, quantity: parsedQuantity, unitCost: parsedUnitCost });
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
      <p className="inventory-form-total">Opening inventory value <strong>{formatNaira((Number(quantity) || 0) * (Number(unitCost) || 0))}</strong></p>
      {!availableLocations.length && <p className="inventory-form-hint">All locations are at capacity. Increase a location's capacity before adding stock.</p>}
      {error && <p className="inventory-error" role="alert">{error}</p>}
      <footer><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={!availableLocations.length}><Plus size={15} /> Add</button></footer>
    </form>
  </InventoryDialog>;
}

function AddInventoryLocationDialog({ onClose, onAdd, onSuccess }: {
  onClose: () => void;
  onAdd: (location: { location: string; capacity: number }) => string | null;
  onSuccess: (location: string) => void;
}) {
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [error, setError] = useState("");
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
  return <InventoryDialog title="Add inventory location" onClose={onClose}>
    <form className="inventory-form" onSubmit={submit}>
      <label htmlFor="new-inventory-location-name">Location name</label><input id="new-inventory-location-name" required maxLength={80} value={location} onChange={(event) => { setLocation(event.target.value); setError(""); }} placeholder="e.g. Enugu warehouse" autoFocus />
      <label htmlFor="new-inventory-location-capacity">Stock capacity (units)</label><input id="new-inventory-location-capacity" type="number" required min="1" step="1" value={capacity} onChange={(event) => { setCapacity(event.target.value); setError(""); }} placeholder="Enter maximum stock units" />
      <p className="inventory-form-hint">The new location will start with zero stock. You can add inventory to it after creation.</p>
      {error && <p className="inventory-error" role="alert">{error}</p>}
      <footer><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Plus size={15} /> Add location</button></footer>
    </form>
  </InventoryDialog>;
}

function StockAdjustmentDialog({ items, locations, initialItem, onClose, onAdjust }: {
  items: InventoryItem[];
  locations: DashboardData["inventoryLocations"];
  initialItem: InventoryItem;
  onClose: () => void;
  onAdjust: (adjustment: { sku: string; location: string; quantity: number; direction: "Add" | "Remove" }) => void;
}) {
  const [direction, setDirection] = useState<"Add" | "Remove">("Add");
  const [sku, setSku] = useState(initialItem.sku);
  const [locationName, setLocationName] = useState(locations[0]?.location ?? "");
  const [quantity, setQuantity] = useState("1");
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
    onAdjust({ sku, location: locationName, quantity: parsedQuantity, direction });
  };
  return <InventoryDialog title="Adjust stock" onClose={onClose}>
    <form className="inventory-form" onSubmit={submit}>
      <label htmlFor="stock-item">Inventory item</label><select id="stock-item" value={sku} onChange={(event) => setSku(event.target.value)}>{items.map((entry) => <option key={entry.sku} value={entry.sku}>{entry.item} · {entry.sku} ({entry.stock} on hand)</option>)}</select>
      <label htmlFor="stock-direction">Adjustment</label><select id="stock-direction" value={direction} onChange={(event) => setDirection(event.target.value === "Add" ? "Add" : "Remove")}><option value="Add">Add stock</option><option value="Remove">Remove stock</option></select>
      <label htmlFor="stock-location">Location</label><select id="stock-location" required value={locationName} onChange={(event) => setLocationName(event.target.value)}>{availableLocations.map((entry) => <option key={entry.location} value={entry.location}>{entry.location} · {entry.stock}/{entry.capacity} units</option>)}</select>
      <label htmlFor="stock-quantity">Quantity</label><input id="stock-quantity" type="number" required min="1" max={maxAllowed} step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
      <p className="inventory-form-hint">{maxAllowed > 0 ? `Up to ${maxAllowed} units can be ${direction === "Add" ? "added at this location" : "removed from this location"}.` : direction === "Add" ? "All locations are at capacity." : "There is no stock available to remove from this location."}</p>
      <footer><button type="button" className="outline-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={maxAllowed < 1}>{direction === "Add" ? "Add stock" : "Remove stock"}</button></footer>
    </form>
  </InventoryDialog>;
}

function AudioTrailPage({ data }: { data: DashboardData }) {
  return <section className="audio-trail-layout">
    <article className="panel audio-timeline-panel"><PanelHeader kicker="Live activity" title="Recent audit events" /><div className="audio-table-wrap"><table><thead><tr><th>Time</th><th>Action</th><th>User</th><th>Type</th><th>Status</th></tr></thead><tbody>{data.auditEvents.map((event) => <tr key={`${event.time}-${event.action}`}><td><strong>{event.dateKey ? `${formatDateKey(event.dateKey)}, ${event.time.match(/\d{2}:\d{2}$/)?.[0] ?? ""}` : event.time}</strong></td><td><span className="audio-action"><i />{event.action}</span><small>{event.detail}</small></td><td>{event.user}</td><td><span className="type-pill">{event.type}</span></td><td><span className="status status-matched"><i />{event.status}</span></td></tr>)}</tbody></table></div></article>
  </section>;
}

function ProfilePage({ savedProfile, onSave }: { savedProfile: ProfileSettings; onSave: (profile: ProfileSettings) => void }) {
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

  return <section className="profile-settings-grid">
    <div className="profile-settings-main">
      <article className="panel profile-summary-panel">
        <div className="profile-large-avatar" aria-hidden="true">{profileInitials(profile.name)}</div>
        <div className="profile-summary-copy">
          <span className="profile-summary-kicker">Account profile</span>
          <h2>{profile.name || "Your profile"}</h2>
          <p>{profile.jobTitle} · {profile.team}</p>
        </div>
        <span className="profile-status-pill"><i /> Active</span>
      </article>

      <form className="profile-editor-form" onSubmit={saveProfile}>
        <article className="panel profile-details-panel">
          <div className="profile-panel-heading">
            <div><p className="panel-kicker">Personal information</p><h2>Profile details</h2></div>
            <UserRound size={19} aria-hidden="true" />
          </div>
          <div className="profile-fields-grid">
            <label className="profile-field"><span>Full name</span><div><UserRound size={16} /><input required value={profile.name} onChange={(event) => updateProfile("name", event.target.value)} autoComplete="name" /></div></label>
            <label className="profile-field"><span>Work email</span><div><Mail size={16} /><input required type="email" value={profile.email} onChange={(event) => updateProfile("email", event.target.value)} autoComplete="email" /></div></label>
            <label className="profile-field"><span>Phone number <small>Optional</small></span><div><Phone size={16} /><input type="tel" value={profile.phone} onChange={(event) => updateProfile("phone", event.target.value)} autoComplete="tel" placeholder="Add a contact number" /></div></label>
            <label className="profile-field"><span>Job title</span><div><Building2 size={16} /><input value={profile.jobTitle} onChange={(event) => updateProfile("jobTitle", event.target.value)} /></div></label>
            <label className="profile-field"><span>Team</span><div><Building2 size={16} /><input value={profile.team} onChange={(event) => updateProfile("team", event.target.value)} /></div></label>
            <label className="profile-field"><span>Time zone</span><div><select value={profile.timezone} onChange={(event) => updateProfile("timezone", event.target.value)}><option value="Africa/Lagos">Africa/Lagos (WAT)</option><option value="Europe/London">Europe/London (GMT/BST)</option><option value="America/New_York">America/New_York (ET)</option><option value="UTC">UTC</option></select><ChevronDown size={15} aria-hidden="true" /></div></label>
          </div>
        </article>

        <article className="panel profile-preferences-panel">
          <div className="profile-panel-heading">
            <div><p className="panel-kicker">Notifications</p><h2>What you hear about</h2></div>
            <Bell size={19} aria-hidden="true" />
          </div>
          <div className="profile-preference-list">
            {preferenceRows.map(({ key, title, description }) => <div className="profile-preference-row" key={key}>
              <div><strong>{title}</strong><span>{description}</span></div>
              <button type="button" role="switch" aria-checked={profile[key]} aria-label={title} className={`toggle ${profile[key] ? "active" : ""}`} onClick={() => updateProfile(key, !profile[key])}><i /></button>
            </div>)}
          </div>
          <div className="profile-form-footer">
            <span className={saveMessage.startsWith("We couldn't") ? "profile-save-error" : ""} role="status" aria-live="polite">{saveMessage}</span>
            <button type="submit" className="primary-button"><Check size={15} /> Save changes</button>
          </div>
        </article>
      </form>
    </div>

    <aside className="profile-settings-aside">
      <article className="panel profile-access-panel">
        <div className="profile-panel-heading">
          <div><p className="panel-kicker">Workspace access</p><h2>Role & permissions</h2></div>
          <ShieldCheck size={19} aria-hidden="true" />
        </div>
        <div className="profile-access-list">
          <div><span>Role</span><strong>Finance Admin</strong></div>
          <div><span>Team</span><strong>{profile.team}</strong></div>
          <div><span>Access level</span><strong>Administrator</strong></div>
        </div>
        <p className="profile-access-note">Your workspace administrator manages account roles and access permissions.</p>
      </article>

      <article className="panel profile-security-panel">
        <div className="profile-panel-heading">
          <div><p className="panel-kicker">Account security</p><h2>Sign-in & security</h2></div>
          <LockKeyhole size={19} aria-hidden="true" />
        </div>
        <div className="profile-security-status"><span><LockKeyhole size={16} /></span><div><strong>Sign-in isn't configured</strong><p>Password and two-step verification options will be available when workspace authentication is enabled.</p></div></div>
      </article>

      <article className="panel profile-session-panel">
        <div className="profile-panel-heading">
          <div><p className="panel-kicker">Current session</p><h2>This device</h2></div>
          <Check size={18} aria-hidden="true" />
        </div>
        <div className="profile-session-detail"><span>Session status</span><strong><i /> Active</strong></div>
        <div className="profile-session-detail"><span>Time zone</span><strong>{profile.timezone}</strong></div>
      </article>
    </aside>
  </section>;
}

function SettingsPage({ data }: { data: DashboardData }) {
  const [settings, setSettings] = useState(() => readAdminSettings(defaultAdminSettings(data)));
  const [users, setUsers] = useState(() => readAdminUsers(data.users));
  const [saveError, setSaveError] = useState("");
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
  const toggleAutomation = (title: string) => saveSettings({
    ...settings,
    automationEnabled: { ...settings.automationEnabled, [title]: !settings.automationEnabled[title] },
  });
  const toggleApprovalRule = (key: keyof AdminSettings["approvalRules"]) => saveSettings({
    ...settings,
    approvalRules: { ...settings.approvalRules, [key]: !settings.approvalRules[key] },
  });
  const saveUsers = (next: DashboardData["users"]) => {
    try {
      localStorage.setItem(adminUsersStorageKey, JSON.stringify(next));
      setUsers(next);
      setSaveError("");
      return true;
    } catch (error) {
      console.error("Could not save workspace users.", error);
      setSaveError("User changes couldn't be saved on this device.");
      return false;
    }
  };
  const renderToggle = (title: string, checked: boolean, onToggle: () => void) => <button type="button" role="switch" aria-label={title} aria-checked={checked} className={`toggle ${checked ? "active" : ""}`} onClick={onToggle}><i /></button>;

  return <>
    {saveError && <p className="settings-save-error" role="alert">{saveError}</p>}
    <section className="settings-grid">
    <article className="panel settings-panel"><PanelHeader kicker="Workspace" title="Automations" showMore={false} />{data.automations.map((automation) => {
      const enabled = settings.automationEnabled[automation.title] ?? automation.enabled;
      return <div className="setting-row" key={automation.title}><div><strong>{automation.title}</strong><span>{automation.description}</span></div>{renderToggle(automation.title, enabled, () => toggleAutomation(automation.title))}</div>;
    })}</article>
    <article className="panel settings-panel"><PanelHeader kicker="Finance controls" title="Approval rules" showMore={false} />
      <div className="setting-row"><div><strong>Flagged invoices require approval</strong><span>Keep flagged invoices out of the payment queue until reviewed.</span></div>{renderToggle("Flagged invoices require approval", settings.approvalRules.flaggedInvoicesRequireApproval, () => toggleApprovalRule("flaggedInvoicesRequireApproval"))}</div>
      <div className="setting-row"><div><strong>Require a purchase order</strong><span>Flag supplier invoices that do not reference an approved PO.</span></div>{renderToggle("Require a purchase order", settings.approvalRules.purchaseOrderRequired, () => toggleApprovalRule("purchaseOrderRequired"))}</div>
      <div className="setting-row"><div><strong>Overdue receivable alerts</strong><span>Notify workspace admins when customer balances pass due.</span></div>{renderToggle("Overdue receivable alerts", settings.approvalRules.overdueReceivableAlerts, () => toggleApprovalRule("overdueReceivableAlerts"))}</div>
    </article>
    <UserManagementTable users={users} onSave={saveUsers} />
    </section>
  </>;
}

function UserManagementTable({ users, onSave }: {
  users: DashboardData["users"];
  onSave: (users: DashboardData["users"]) => boolean;
}) {
  const [selectedUser, setSelectedUser] = useState<DashboardData["users"][number] | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  return <article className="panel settings-panel settings-users-panel">
    <PanelHeader kicker="Access control" title="Users & roles" showMore={false} />
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
      <header className="feedback-dialog-header"><div><p className="panel-kicker">Help us improve</p><h2 id="feedback-title">Share feedback</h2></div><button type="button" className="more-button" aria-label="Close feedback" autoFocus onClick={onClose}><X size={16} /></button></header>
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
function PanelHeader({ kicker, title, showMore = true }: { kicker: string; title: string; showMore?: boolean }) { return <div className="panel-heading"><div><p className="panel-kicker">{kicker}</p><h2>{title}</h2></div>{showMore && <button type="button" className="more-button" aria-label="More options"><MoreHorizontal size={19} /></button>}</div>; }
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; name?: string }>; label?: string }) { if (!active || !payload?.length) return null; return <div className="chart-tooltip"><span>{label}</span>{payload.map((item) => <strong key={item.name}>{item.name}: ₦{item.value}k</strong>)}</div>; }
function WaterfallTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: CashFlowStep }> }) {
  const step = payload?.[0]?.payload;
  if (!active || !step) return null;

  return <div className="chart-tooltip"><span>{step.total ? "Cumulative total" : step.month}</span>{!step.total && <strong>Net change: {step.net < 0 ? "−" : "+"}{formatNaira(Math.abs(step.net))}</strong>}<strong>Cumulative: {formatNaira(step.cumulative)}</strong></div>;
}

export default App;