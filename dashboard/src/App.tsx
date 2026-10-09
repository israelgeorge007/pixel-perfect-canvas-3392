import { useEffect, useMemo, useRef, useState, type ComponentType, type FormEvent } from "react";
import {
  ArrowDownRight, ArrowUpRight, Bell, Boxes, Building2, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight,
  FileCheck2, FileText, Headphones, HelpCircle, LockKeyhole, Mail,
  Menu, MoreHorizontal, PackageCheck, Phone, Plus, Search, Settings, ShieldCheck, Sparkles,
  TrendingUp, Upload, UserRound, X,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import type { DashboardData, DashboardNav, InvoiceStatus, ReconciliationView } from "./data/mockData";
import { fetchDashboardData, filterDashboardData, formatCompactNaira, formatDateKey, formatNaira, getCashFlowWaterfall, getInventoryMetrics, getModuleRecords, getOverviewMetrics, getSpendCategories, toDateKey, type CashFlowStep } from "./services/dashboardData";
import { mockDashboardData } from "./data/mockData";

type NavKey = "Overview" | "Ledger" | "Receivables" | "Payables" | "Reconciliation" | "Invoice" | "Inventory" | "Payroll" | "Reports" | "Audit Trail" | "Settings" | "Profile";
type ModuleNavKey = DashboardNav;
type Status = InvoiceStatus;
type Invoice = DashboardData["invoices"][number];
type ProfileSettings = DashboardData["profile"];
const profileStorageKey = "corelogic-dashboard-profile";
const adminSettingsStorageKey = "corelogic-dashboard-admin-settings";
const profileInitials = (name: string) => name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "U";
type AdminSettings = {
  automationEnabled: Record<string, boolean>;
  approvalRules: {
    flaggedInvoicesRequireApproval: boolean;
    purchaseOrderRequired: boolean;
    dualPaymentApproval: boolean;
    overdueReceivableAlerts: boolean;
  };
  workspaceAlerts: {
    exceptionAlerts: boolean;
    weeklyAdminSummary: boolean;
  };
};

function defaultAdminSettings(data: DashboardData): AdminSettings {
  return {
    automationEnabled: Object.fromEntries(data.automations.map(({ title, enabled }) => [title, enabled])),
    approvalRules: {
      flaggedInvoicesRequireApproval: true,
      purchaseOrderRequired: true,
      dualPaymentApproval: false,
      overdueReceivableAlerts: true,
    },
    workspaceAlerts: {
      exceptionAlerts: true,
      weeklyAdminSummary: false,
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
      !isBooleanObject(values.approvalRules, ["flaggedInvoicesRequireApproval", "purchaseOrderRequired", "dualPaymentApproval", "overdueReceivableAlerts"]) ||
      !isBooleanObject(values.workspaceAlerts, ["exceptionAlerts", "weeklyAdminSummary"])
    ) throw new Error("Saved admin settings are incomplete.");
    return {
      automationEnabled: { ...defaults.automationEnabled, ...values.automationEnabled },
      approvalRules: {
        flaggedInvoicesRequireApproval: values.approvalRules.flaggedInvoicesRequireApproval,
        purchaseOrderRequired: values.approvalRules.purchaseOrderRequired,
        dualPaymentApproval: values.approvalRules.dualPaymentApproval,
        overdueReceivableAlerts: values.approvalRules.overdueReceivableAlerts,
      },
      workspaceAlerts: {
        exceptionAlerts: values.workspaceAlerts.exceptionAlerts,
        weeklyAdminSummary: values.workspaceAlerts.weeklyAdminSummary,
      },
    };
  } catch (error) {
    console.error("Could not load saved admin settings.", error);
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
  const [profileSettings, setProfileSettings] = useState(readProfileSettings);
  const profileMenuRef = useRef<HTMLDivElement>(null);
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
  const invoices = dateFilteredData?.invoices ?? [];

  const navigate = (page: NavKey) => { setActiveNav(page); setSidebarOpen(false); setSearch(""); };
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
  const updateStatus = (id: string, status: Status) => {
    setDashboardData((current) => current ? {
      ...current,
      invoices: current.invoices.map((invoice) => invoice.id === id ? { ...invoice, status } : invoice),
    } : current);
  };

  return (
    <div className={`dashboard-app ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand"><span className="brand-mark">C</span><div><strong>Corelogic</strong><span>ERP & finance System</span></div></div>
        <nav aria-label="Dashboard navigation">
          {navItems.filter(({ label }) => label !== "Settings").map(({ label, icon: Icon }) => <button key={label} aria-label={label} title={sidebarCollapsed ? label : undefined} className={activeNav === label ? "nav-item active" : "nav-item"} onClick={() => navigate(label)}><Icon size={18} /><span>{label}</span>{label === "Invoice" && <span className="nav-count">{dateFilteredData?.invoices.filter(({ status }) => status !== "Matched").length ?? 0}</span>}</button>)}
        </nav>
        <button type="button" className="sidebar-collapse-button" aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!sidebarCollapsed} onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}><SidebarSwitchIcon /></button>
      </aside>
      {sidebarOpen && <button className="sidebar-overlay" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><div className="breadcrumb"><span>Finance</span><span>/</span><strong>{activeNav}</strong></div></div>
          <div className="topbar-actions">
            <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records..." /></label>
            <button className="icon-button" aria-label="Help"><HelpCircle size={19} /></button>
            <button className="icon-button notification" aria-label="Notifications"><Bell size={19} /><span /></button>
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
          <section className="page-heading"><div><h1>{activeNav === "Overview" ? `Welcome back, ${profileSettings.name.split(" ")[0]}!` : activeNav === "Profile" ? "Profile settings" : activeNav}</h1><p>{activeNav === "Overview" ? "Here’s what’s happening across your business today." : activeNav === "Profile" ? "Manage your personal details, preferences, and account security." : activeNav === "Settings" ? "Configure workspace automation, approval controls, and access." : `Manage ${activeNav.toLowerCase()} from your central finance workspace.`}</p></div>{activeNav !== "Profile" && activeNav !== "Settings" && <DateRangePicker onApply={(start, end) => setDateRange({ start, end })} />}</section>
          {dataError
            ? <p className="dashboard-data-message" role="alert">{dataError}</p>
            : dashboardData
              ? <>
                {activeNav === "Overview" && dateFilteredData && <Overview data={dateFilteredData} search={search} updateStatus={updateStatus} />}
                {activeNav === "Inventory" && dateFilteredData && <InventoryPage data={dateFilteredData} />}
                {activeNav === "Audit Trail" && dateFilteredData && <AudioTrailPage data={dateFilteredData} />}
                {activeNav === "Settings" && <SettingsPage data={dashboardData} />}
                {activeNav === "Profile" && <ProfilePage savedProfile={profileSettings} onSave={setProfileSettings} />}
                {activeNav !== "Overview" && activeNav !== "Inventory" && activeNav !== "Audit Trail" && activeNav !== "Settings" && activeNav !== "Profile" && dateFilteredData && <ModulePage activeNav={activeNav} data={dateFilteredData} />}
              </>
              : <p className="dashboard-data-message" role="status">Loading dashboard data…</p>}
        </div>
      </main>
    </div>
  );
}

function Overview({ data, search, updateStatus }: { data: DashboardData; search: string; updateStatus: (id: string, status: Status) => void }) {
  const metrics = getOverviewMetrics(data);
  const cashFlowWaterfall = getCashFlowWaterfall(data);
  const spend = getSpendCategories(data);
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
    <section className="dashboard-grid">
      <article className="panel cash-flow-panel"><PanelHeader kicker="Performance" title="Cash flow overview" /><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={cashFlowWaterfall} margin={{ top: 14, right: 10, left: -20, bottom: 0 }}><CartesianGrid stroke="#ebe6de" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#77716a", fontSize: 12 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#77716a", fontSize: 12 }} tickFormatter={(value) => `₦${value}k`} /><Tooltip content={<WaterfallTooltip />} /><Bar dataKey="base" stackId="cash-flow" fill="transparent" isAnimationActive={false} /><Bar dataKey="increase" stackId="cash-flow" name="Net increase" fill="#ffe01b">{cashFlowWaterfall.map((step) => <Cell key={step.month} fill={step.total ? "#241c15" : "#ffe01b"} />)}</Bar><Bar dataKey="decrease" stackId="cash-flow" name="Net decrease" fill="#d7655b" /></BarChart></ResponsiveContainer></div><div className="chart-legend waterfall-legend"><span><i className="legend-dot positive" /> Net increase</span><span><i className="legend-dot negative" /> Net decrease</span><span><i className="legend-dot total" /> Cumulative total</span></div></article>
      <article className="panel spend-panel"><PanelHeader kicker="Distribution" title="Spend by category" /><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={spend.categories} dataKey="value" innerRadius={58} outerRadius={82} paddingAngle={4} stroke="none">{spend.categories.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{formatCompactNaira(spend.totalSpend)}</strong><span>Total spend</span></div></div><div className="category-list">{spend.categories.map((item) => <div key={item.name}><span><i style={{ background: item.color }} />{item.name}</span><strong>{item.value}%</strong></div>)}</div></article>
      <article className="panel activity-panel activity-table-panel"><PanelHeader kicker="Activity log" title="Recent activities" /><div className="activity-table-wrap"><table className="activity-table"><thead><tr><th>Activity</th><th>Details</th><th>Date / time</th><th>Status</th><th>Owner</th></tr></thead><tbody>{processingRows.map((row) => {
        const Icon = activityIcons[row.kind];
        const statusStyle = row.status === "Matched" || row.status === "Complete" || row.status === "Uploaded" ? "status-matched" : row.status === "Pending" ? "status-pending" : "status-flagged";
        const invoice = row.invoice;
        return <tr key={row.id}><td><span className="activity-table-event"><span className={`activity-table-icon ${activityColors[row.kind]}`}><Icon size={15} /></span><strong>{row.event}</strong></span></td><td>{row.detail}</td><td>{row.when}</td><td>{invoice ? <button type="button" className="activity-status-button" aria-label={`Update ${invoice.invoice} status`} onClick={() => updateStatus(invoice.id, invoice.status === "Matched" ? "Pending" : "Matched")}><span className={`status ${statusStyle}`}><i />{row.status}</span></button> : <span className={`status ${statusStyle}`}><i />{row.status}</span>}</td><td>{row.owner}</td></tr>;
      })}</tbody></table></div><div className="table-footer"><span>Showing {processingRows.length} processing and invoice records</span><span>Filtered by selected date range</span></div></article>
    </section>
  </>;
}

function ModulePage({ activeNav, data }: { activeNav: ModuleNavKey; data: DashboardData }) {
  const [reconciliationView, setReconciliationView] = useState<"Payables" | "Receivables" | "Bank">("Payables");
  const records = getModuleRecords(data, activeNav, reconciliationView);
  const labels: Record<ModuleNavKey, string> = { Ledger: "General ledger", Receivables: "Accounts receivable", Payables: "Accounts payable", Reconciliation: "Reconciliation", "Invoice": "Invoice review", Inventory: "Inventory", Payroll: "Payroll", Reports: "Financial reports", "Audit Trail": "Audit trail", Overview: "Overview", Settings: "Settings" };
  const description: Record<ModuleNavKey, string> = { Ledger: "Track balanced journal entries and account movements.", Receivables: "Monitor customer invoices, collections, and credit exposure.", Payables: "Review supplier obligations and scheduled payments, including approved purchase orders.", Reconciliation: "Reconcile payables, receivables, and bank transactions.", "Invoice": "Verify OCR results and resolve matching exceptions.", Inventory: "Monitor stock levels, movement, and valuation.", Payroll: "Review employee compensation and payment status.", Reports: "Build and export financial reporting views.", "Audit Trail": "Review secure, timestamped actions across every financial workflow.", Overview: "Overall system performance.", Settings: "Manage your workspace and automated workflows." };
  const columns = records.length > 0 ? Object.keys(records[0]) : [];
  const statusClass = (value: string) => value === "Matched" || value === "Received" || value === "Paid" || value === "Ready" || value === "Healthy" ? "status-matched" : value === "Pending" || value === "Review" || value === "Approval" || value === "Quotation" || value === "Draft" || value === "Awaiting approval" ? "status-pending" : value === "Flagged" || value === "Overdue" || value === "Partial" ? "status-flagged" : "status-pending";
  return <section className="module-layout"><div className="module-intro"><div><p className="panel-kicker">{activeNav}</p><h2>{labels[activeNav]}</h2><p>{description[activeNav]}</p></div><button className="primary-button"><Plus size={16} /> Add record</button></div><article className="panel module-table-panel">{activeNav === "Reconciliation" && <div className="reconciliation-tabs" role="tablist" aria-label="Reconciliation type">{(["Payables", "Receivables", "Bank"] as const).map((view) => <button key={view} id={`reconciliation-tab-${view.toLowerCase()}`} type="button" role="tab" aria-selected={reconciliationView === view} aria-controls="reconciliation-table-panel" tabIndex={reconciliationView === view ? 0 : -1} className={reconciliationView === view ? "active" : ""} onClick={() => setReconciliationView(view)}>{view}</button>)}</div>}<div className="module-table-wrap" id={activeNav === "Reconciliation" ? "reconciliation-table-panel" : undefined} role={activeNav === "Reconciliation" ? "tabpanel" : undefined} aria-labelledby={activeNav === "Reconciliation" ? `reconciliation-tab-${reconciliationView.toLowerCase()}` : undefined}><table className="module-table"><thead><tr>{columns.map((column) => <th key={column}>{column.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}</th>)}<th>Actions</th></tr></thead><tbody>{records.map((record, index) => <tr key={index}>{columns.map((column) => { const value = record[column]; const isStatus = column.toLowerCase().endsWith("status"); return <td key={column}>{isStatus ? <span className={`status ${statusClass(value)}`}><i />{value}</span> : value}</td>; })}<td><div className="table-actions"><button className="table-action-button">View</button><button className="more-button" aria-label={`More actions for row ${index + 1}`}><MoreHorizontal size={16} /></button></div></td></tr>)}</tbody></table></div><div className="table-footer"><span>Showing {records.length} records</span><span>Updated just now</span></div></article></section>;
}

function InventoryPage({ data }: { data: DashboardData }) {
  const metrics = getInventoryMetrics(data);
  return <section className="inventory-layout">
    <section className="metrics-grid inventory-metrics"><MetricCard icon={Boxes} label="Open orders" value={String(metrics.openOrders)} accent="yellow" /><MetricCard icon={PackageCheck} label="Stock availability" value={`${metrics.stockAvailability}%`} accent="green" /><MetricCard icon={FileCheck2} label="Pending approvals" value={String(metrics.pendingApprovals)} accent="red" /><MetricCard icon={Building2} label="Inventory value" value={formatCompactNaira(metrics.inventoryValue)} accent="blue" /></section>
    <article className="panel inventory-chart-panel"><PanelHeader kicker="Stock distribution" title="Inventory by location" /><div className="inventory-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.inventoryLocations} margin={{ top: 12, right: 10, left: -25, bottom: 0 }}><CartesianGrid stroke="#ebe6de" vertical={false} /><XAxis dataKey="location" axisLine={false} tickLine={false} tick={{ fill: "#77716a", fontSize: 10 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#77716a", fontSize: 10 }} /><Tooltip cursor={{ fill: "#f7f4ef" }} /><Bar dataKey="stock" fill="#241c15" radius={[5, 5, 0, 0]} maxBarSize={38} /></BarChart></ResponsiveContainer></div></article>
    <article className="panel procurement-panel"><PanelHeader kicker="Procurement queue" title="Pending procurements" /><div className="inventory-list">{data.procurements.map((item) => <div className="inventory-list-row" key={item.item}><div><strong>{item.item}</strong><span>{item.supplier}</span></div><div className="inventory-list-value"><strong>{formatNaira(item.amount)}</strong><span>{item.due} · {item.status}</span></div><button className="row-action">Review</button></div>)}</div></article>
    <article className="panel purchase-panel"><PanelHeader kicker="Purchase orders" title="Recent purchase orders" /><div className="purchase-table-wrap"><table><thead><tr><th>PO number</th><th>Supplier</th><th>Items</th><th>Amount</th><th>Status</th></tr></thead><tbody>{data.purchaseOrders.map((order) => <tr key={order.number}><td><strong>{order.number}</strong></td><td>{order.supplier}</td><td>{order.items}</td><td>{formatNaira(order.amount)}</td><td><span className={`status ${order.status === "Received" ? "status-matched" : order.status === "Approved" ? "status-pending" : "status-flagged"}`}><i />{order.status}</span></td></tr>)}</tbody></table></div></article>
  </section>;
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
  const toggleWorkspaceAlert = (key: keyof AdminSettings["workspaceAlerts"]) => saveSettings({
    ...settings,
    workspaceAlerts: { ...settings.workspaceAlerts, [key]: !settings.workspaceAlerts[key] },
  });
  const renderToggle = (title: string, checked: boolean, onToggle: () => void) => <button type="button" role="switch" aria-label={title} aria-checked={checked} className={`toggle ${checked ? "active" : ""}`} onClick={onToggle}><i /></button>;

  return <>
    {saveError && <p className="settings-save-error" role="alert">{saveError}</p>}
    <section className="settings-grid">
    <article className="panel settings-panel"><PanelHeader kicker="Workspace" title="Automations" />{data.automations.map((automation) => {
      const enabled = settings.automationEnabled[automation.title] ?? automation.enabled;
      return <div className="setting-row" key={automation.title}><div><strong>{automation.title}</strong><span>{automation.description}</span></div>{renderToggle(automation.title, enabled, () => toggleAutomation(automation.title))}</div>;
    })}</article>
    <article className="panel settings-panel"><PanelHeader kicker="Finance controls" title="Approval rules" />
      <div className="setting-row"><div><strong>Flagged invoices require approval</strong><span>Keep flagged invoices out of the payment queue until reviewed.</span></div>{renderToggle("Flagged invoices require approval", settings.approvalRules.flaggedInvoicesRequireApproval, () => toggleApprovalRule("flaggedInvoicesRequireApproval"))}</div>
      <div className="setting-row"><div><strong>Require a purchase order</strong><span>Flag supplier invoices that do not reference an approved PO.</span></div>{renderToggle("Require a purchase order", settings.approvalRules.purchaseOrderRequired, () => toggleApprovalRule("purchaseOrderRequired"))}</div>
      <div className="setting-row"><div><strong>Two-person payment approval</strong><span>Require a second approver before payments are released.</span></div>{renderToggle("Two-person payment approval", settings.approvalRules.dualPaymentApproval, () => toggleApprovalRule("dualPaymentApproval"))}</div>
      <div className="setting-row"><div><strong>Overdue receivable alerts</strong><span>Notify workspace admins when customer balances pass due.</span></div>{renderToggle("Overdue receivable alerts", settings.approvalRules.overdueReceivableAlerts, () => toggleApprovalRule("overdueReceivableAlerts"))}</div>
    </article>
    <article className="panel settings-panel"><PanelHeader kicker="Workspace notifications" title="Admin alerts" />
      <div className="setting-row"><div><strong>Exception alerts</strong><span>Notify admins about unmatched transactions and processing failures.</span></div>{renderToggle("Exception alerts", settings.workspaceAlerts.exceptionAlerts, () => toggleWorkspaceAlert("exceptionAlerts"))}</div>
      <div className="setting-row"><div><strong>Weekly admin summary</strong><span>Send a weekly digest of approvals, exceptions, and cash activity.</span></div>{renderToggle("Weekly admin summary", settings.workspaceAlerts.weeklyAdminSummary, () => toggleWorkspaceAlert("weeklyAdminSummary"))}</div>
    </article>
    <article className="panel settings-panel"><PanelHeader kicker="Access control" title="Users & roles" /><div className="user-list">{data.users.map((user) => <UserRow key={user.name} name={user.name} role={user.role} initials={user.initials} />)}</div><button className="outline-button"><Plus size={15} /> Invite user</button></article>
    </section>
  </>;
}

function MetricCard({ icon: Icon, label, value, accent }: { icon: ComponentType<{ size?: number }>; label: string; value: string; accent: string }) { return <article className="metric-card"><div className={`metric-icon ${accent}`}><Icon size={20} /></div><div className="metric-content"><p>{label}</p><div className="metric-value"><strong>{value}</strong></div></div></article>; }
function AlertIcon({ size = 18 }: { size?: number }) { return <div style={{ width: size, height: size, display: "grid", placeItems: "center", borderRadius: 50, color: "#a4433c", background: "#fbe5e2", fontSize: 12, fontWeight: 700 }}>!</div>; }
function PanelHeader({ kicker, title }: { kicker: string; title: string }) { return <div className="panel-heading"><div><p className="panel-kicker">{kicker}</p><h2>{title}</h2></div><button className="more-button" aria-label="More options"><MoreHorizontal size={19} /></button></div>; }
function UserRow({ name, role, initials }: { name: string; role: string; initials: string }) { return <div className="user-row"><span>{initials}</span><div><strong>{name}</strong><small>{role}</small></div><button className="more-button"><MoreHorizontal size={17} /></button></div>; }
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; name?: string }>; label?: string }) { if (!active || !payload?.length) return null; return <div className="chart-tooltip"><span>{label}</span>{payload.map((item) => <strong key={item.name}>{item.name}: ₦{item.value}k</strong>)}</div>; }
function WaterfallTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: CashFlowStep }> }) {
  const step = payload?.[0]?.payload;
  if (!active || !step) return null;

  return <div className="chart-tooltip"><span>{step.total ? "Cumulative total" : step.month}</span>{!step.total && <strong>Net change: {step.net < 0 ? "−" : "+"}₦{Math.abs(step.net)}k</strong>}<strong>Cumulative: ₦{step.cumulative}k</strong></div>;
}

export default App;
