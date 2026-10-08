import { useMemo, useState, type ComponentType } from "react";
import {
  ArrowDownRight, ArrowUpRight, Bell, Boxes, Building2, CalendarDays, Check, ChevronDown,
  CircleDollarSign, Clock3, FileCheck2, FileText, Headphones, HelpCircle,
  Menu, MoreHorizontal, PackageCheck, Plus, Search, Settings, ShieldCheck, Sparkles,
  TrendingUp, Upload, Users, WalletCards, X,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

type NavKey = "Overview" | "Ledger" | "Receivables" | "Payables" | "Reconciliation" | "Invoice" | "Inventory" | "Payroll" | "Reports" | "Audit Trail" | "Settings";
type Status = "Matched" | "Pending" | "Flagged";
type Invoice = { id: string; vendor: string; invoice: string; date: string; amount: string; status: Status; owner: string };

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

const cashFlowData = [{ month: "Jan", inflow: 42, outflow: 24 }, { month: "Feb", inflow: 48, outflow: 28 }, { month: "Mar", inflow: 45, outflow: 25 }, { month: "Apr", inflow: 58, outflow: 31 }, { month: "May", inflow: 66, outflow: 35 }, { month: "Jun", inflow: 72, outflow: 38 }, { month: "Jul", inflow: 79, outflow: 39 }];
const categoryData = [{ name: "Software", value: 42, color: "#ffe01b" }, { name: "Operations", value: 28, color: "#241c15" }, { name: "Marketing", value: 18, color: "#d7cfc3" }, { name: "Other", value: 12, color: "#eee9e1" }];
const initialInvoices: Invoice[] = [
  { id: "INV-2048", vendor: "Northstar Labs", invoice: "INV-2048", date: "29 Jul 2026", amount: "₦24,850,000", status: "Matched", owner: "Maya Chen" },
  { id: "INV-2047", vendor: "Atlas Systems", invoice: "INV-2047", date: "28 Jul 2026", amount: "₦18,420,000", status: "Pending", owner: "Alex Morgan" },
  { id: "INV-2046", vendor: "Fieldwork Co.", invoice: "INV-2046", date: "27 Jul 2026", amount: "₦9,675,000", status: "Flagged", owner: "Priya Shah" },
  { id: "INV-2045", vendor: "Brightline", invoice: "INV-2045", date: "26 Jul 2026", amount: "₦12,300,000", status: "Matched", owner: "Maya Chen" },
];
const ledgerRows = [
  { account: "Cash & Cash Equivalents", code: "1000", type: "Asset", debit: "₦1,284,420,000", credit: "—", balance: "₦1,284,420,000" },
  { account: "Accounts Receivable", code: "1100", type: "Asset", debit: "₦126,800,000", credit: "—", balance: "₦126,800,000" },
  { account: "Accounts Payable", code: "2000", type: "Liability", debit: "—", credit: "₦84,250,000", balance: "₦84,250,000" },
  { account: "Sales Revenue", code: "4000", type: "Income", debit: "—", credit: "₦1,420,000,000", balance: "₦1,420,000,000" },
  { account: "Office Supplies", code: "5010", type: "Expense", debit: "₦8,420,000", credit: "—", balance: "₦8,420,000" },
  { account: "Inventory", code: "1500", type: "Asset", debit: "₦68,400,000", credit: "—", balance: "₦68,400,000" },
];
const receivables = [
  { customer: "Lagos Premium Hotels", amount: "₦42,800,000", due: "31 Aug 2026", status: "Overdue" },
  { customer: "Sahara Retail Group", amount: "₦31,450,000", due: "05 Sep 2026", status: "Open" },
  { customer: "Kite Technologies", amount: "₦18,200,000", due: "12 Sep 2026", status: "Open" },
  { customer: "Apex Media Limited", amount: "₦14,750,000", due: "19 Sep 2026", status: "Open" },
  { customer: "Tideway Logistics", amount: "₦9,600,000", due: "24 Sep 2026", status: "Partial" },
  { customer: "Crown Health Group", amount: "₦6,300,000", due: "02 Oct 2026", status: "Open" },
];
const payables = [
  { vendor: "Northstar Labs", amount: "₦24,850,000", due: "02 Aug 2026", status: "Scheduled" },
  { vendor: "Atlas Systems", amount: "₦18,420,000", due: "09 Aug 2026", status: "Review" },
  { vendor: "Fieldwork Co.", amount: "₦9,675,000", due: "14 Aug 2026", status: "Scheduled" },
  { vendor: "PrintFlow Ltd.", amount: "₦3,250,000", due: "18 Aug 2026", status: "Pending" },
  { vendor: "Oak & Pine Co.", amount: "₦8,420,000", due: "22 Aug 2026", status: "Approval" },
  { vendor: "SecureNet Systems", amount: "₦12,800,000", due: "27 Aug 2026", status: "Review" },
];
const inventory = [{ item: "ERP Core License", sku: "ERP-024", stock: "42", value: "₦18,900,000", status: "Healthy" }, { item: "Accounting Workstation", sku: "ACC-018", stock: "8", value: "₦7,200,000", status: "Low stock" }];
const inventoryLocationData = [{ location: "Lagos", stock: 78 }, { location: "Abuja", stock: 54 }, { location: "Port Harcourt", stock: 42 }, { location: "Ibadan", stock: 31 }, { location: "Kano", stock: 19 }];
const pendingProcurements = [{ item: "Office furniture", supplier: "Oak & Pine Co.", amount: "₦8,420,000", due: "04 Aug", status: "Awaiting approval" }, { item: "Printer accessories", supplier: "PrintFlow Ltd.", amount: "₦3,250,000", due: "07 Aug", status: "Pending PO" }, { item: "Security devices", supplier: "SecureNet Systems", amount: "₦12,800,000", due: "11 Aug", status: "Quotation review" }];
const purchaseOrders = [{ number: "PO-2026-184", supplier: "Northstar Labs", items: "12 items", amount: "₦24,850,000", status: "Received" }, { number: "PO-2026-183", supplier: "Atlas Systems", items: "4 items", amount: "₦18,420,000", status: "Approved" }, { number: "PO-2026-182", supplier: "Fieldwork Co.", items: "8 items", amount: "₦9,675,000", status: "Pending" }];
const reconciliationRows = [
  { bank: "Access Bank", reference: "TRN-90841", amount: "₦24,850,000", status: "Matched" },
  { bank: "First Bank", reference: "TRN-90840", amount: "₦18,420,000", status: "Matched" },
  { bank: "Guaranty Bank", reference: "TRN-90839", amount: "₦8,420,000", status: "Review" },
  { bank: "Access Bank", reference: "TRN-90838", amount: "₦3,250,000", status: "Matched" },
  { bank: "First Bank", reference: "TRN-90837", amount: "₦12,800,000", status: "Review" },
  { bank: "Guaranty Bank", reference: "TRN-90836", amount: "₦2,100,000", status: "Matched" },
];
const procurementRows = [
  { order: "PO-2026-184", supplier: "Northstar Labs", items: "12", amount: "₦24,850,000", status: "Received" },
  { order: "PO-2026-183", supplier: "Atlas Systems", items: "4", amount: "₦18,420,000", status: "Approved" },
  { order: "PO-2026-182", supplier: "Fieldwork Co.", items: "8", amount: "₦9,675,000", status: "Pending" },
  { order: "PO-2026-181", supplier: "PrintFlow Ltd.", items: "3", amount: "₦3,250,000", status: "Quotation" },
  { order: "PO-2026-180", supplier: "Oak & Pine Co.", items: "9", amount: "₦8,420,000", status: "Approval" },
  { order: "PO-2026-179", supplier: "SecureNet Systems", items: "6", amount: "₦12,800,000", status: "Pending" },
];
const invoiceReviewRows = [
  { vendor: "Northstar Labs", invoice: "INV-2048", amount: "₦24,850,000", owner: "Maya Chen", status: "Matched" },
  { vendor: "Atlas Systems", invoice: "INV-2047", amount: "₦18,420,000", owner: "Alex Morgan", status: "Pending" },
  { vendor: "Fieldwork Co.", invoice: "INV-2046", amount: "₦9,675,000", owner: "Priya Shah", status: "Flagged" },
  { vendor: "Brightline", invoice: "INV-2045", amount: "₦12,300,000", owner: "Maya Chen", status: "Matched" },
  { vendor: "PrintFlow Ltd.", invoice: "INV-2044", amount: "₦3,250,000", owner: "Alex Morgan", status: "Pending" },
  { vendor: "Oak & Pine Co.", invoice: "INV-2043", amount: "₦8,420,000", owner: "Priya Shah", status: "Matched" },
];
const payroll = [{ employee: "Maya Chen", role: "Finance Admin", pay: "₦1,850,000", status: "Paid" }, { employee: "Alex Morgan", role: "Accounts Officer", pay: "₦1,650,000", status: "Paid" }, { employee: "Priya Shah", role: "Bookkeeper", pay: "₦1,420,000", status: "Processing" }];
const reportRows = [
  { report: "Profit & loss", period: "July 2026", owner: "Maya Chen", status: "Ready" },
  { report: "Cash flow", period: "July 2026", owner: "Alex Morgan", status: "Ready" },
  { report: "Accounts receivable", period: "July 2026", owner: "Priya Shah", status: "Review" },
  { report: "Inventory movement", period: "July 2026", owner: "Maya Chen", status: "Ready" },
  { report: "Tax summary", period: "Q3 2026", owner: "Alex Morgan", status: "Ready" },
  { report: "Budget variance", period: "YTD 2026", owner: "Priya Shah", status: "Draft" },
];
const audioTrail = [
  { time: "29 Jul, 10:42", action: "Invoice uploaded", detail: "Northstar Labs · INV-2048", user: "Maya Chen", type: "Upload", status: "Verified" },
  { time: "29 Jul, 10:43", action: "OCR extraction complete", detail: "18 fields extracted and validated", user: "Automation", type: "OCR", status: "Complete" },
  { time: "29 Jul, 10:44", action: "Three-way match passed", detail: "PO + Goods received + Invoice", user: "System", type: "Match", status: "Matched" },
  { time: "29 Jul, 10:46", action: "Payment allocation recorded", detail: "₦24,850,000 · Bank reference NRG-9012", user: "Alex Morgan", type: "Payment", status: "Recorded" },
  { time: "29 Jul, 10:48", action: "Audit event signed", detail: "Retention policy · 7 years", user: "Security", type: "Audit", status: "Signed" },
];
const statusClass: Record<Status, string> = { Matched: "status-matched", Pending: "status-pending", Flagged: "status-flagged" };

function DateRangePicker() {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(new Date(2026, 6, 1));
  const [endDate, setEndDate] = useState(new Date(2026, 6, 31));
  const [draftStart, setDraftStart] = useState(new Date(2026, 6, 1));
  const [draftEnd, setDraftEnd] = useState(new Date(2026, 6, 31));
  const month = new Date(2026, 6, 1);
  const days = Array.from({ length: 42 }, (_, index) => new Date(2026, 6, 1 + index));
  const isSameDay = (first: Date, second: Date) => first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate();
  const formatDate = (date: Date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const selectDate = (date: Date) => {
    if (!draftStart || draftStart.getTime() > date.getTime()) {
      setDraftStart(date);
      setDraftEnd(date);
    } else {
      setDraftEnd(date);
    }
  };

  return <div className="date-range-picker">
    <button className="date-control" type="button" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((current) => !current)}><CalendarDays size={17} /><span>{formatDate(startDate)} – {formatDate(endDate)}</span><ChevronDown size={15} /></button>
    {open && <div className="calendar-popover" role="dialog" aria-label="Choose date range">
      <div className="calendar-header"><div><span>Start date</span><strong>{formatDate(draftStart)}</strong></div><button type="button" aria-label="Close calendar" onClick={() => setOpen(false)}><X size={16} /></button></div>
      <div className="calendar-months">
        <div className="calendar-month"><h3>July 2026</h3><div className="calendar-weekdays">{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{days.map((date) => { const inMonth = date.getMonth() === month.getMonth(); const selected = (draftStart && isSameDay(date, draftStart)) || (draftEnd && isSameDay(date, draftEnd)); const between = Boolean(draftStart && draftEnd && date > draftStart && date < draftEnd); return <button key={date.toISOString()} type="button" className={`${inMonth ? "" : "outside-month"} ${selected ? "selected" : ""} ${between ? "in-range" : ""}`} disabled={!inMonth} onClick={() => selectDate(date)}>{date.getDate()}</button>; })}</div></div>
        <div className="calendar-month calendar-month-next"><h3>August 2026</h3><div className="calendar-weekdays">{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{Array.from({ length: 42 }, (_, index) => new Date(2026, 7, 1 + index)).map((date) => { const inMonth = date.getMonth() === 7; const selected = (draftStart && isSameDay(date, draftStart)) || (draftEnd && isSameDay(date, draftEnd)); const between = Boolean(draftStart && draftEnd && date > draftStart && date < draftEnd); return <button key={date.toISOString()} type="button" className={`${inMonth ? "" : "outside-month"} ${selected ? "selected" : ""} ${between ? "in-range" : ""}`} disabled={!inMonth} onClick={() => selectDate(date)}>{date.getDate()}</button>; })}</div></div>
      </div>
      <div className="calendar-footer"><button type="button" onClick={() => { setDraftStart(new Date(2026, 6, 1)); setDraftEnd(new Date(2026, 6, 31)); }}>Clear</button><button type="button" className="apply-range" onClick={() => { setStartDate(draftStart); setEndDate(draftEnd); setOpen(false); }}>Apply range</button></div>
    </div>}
  </div>;
}

function App() {
  const [activeNav, setActiveNav] = useState<NavKey>("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const filteredInvoices = useMemo(() => invoices.filter((invoice) => `${invoice.vendor} ${invoice.id} ${invoice.status}`.toLowerCase().includes(search.toLowerCase())), [invoices, search]);

  const navigate = (page: NavKey) => { setActiveNav(page); setSidebarOpen(false); setSearch(""); };
  const updateStatus = (id: string, status: Status) => {
    setInvoices((current) => current.map((invoice) => invoice.id === id ? { ...invoice, status } : invoice));
  };

  return (
    <div className="dashboard-app">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand"><span className="brand-mark">C</span><div><strong>Corelogic</strong><span>ERP & finance System</span></div></div>
        <nav aria-label="Dashboard navigation">
          {navItems.map(({ label, icon: Icon }) => <button key={label} className={activeNav === label ? "nav-item active" : "nav-item"} onClick={() => navigate(label)}><Icon size={18} /><span>{label}</span>{label === "Invoice" && <span className="nav-count">3</span>}</button>)}
        </nav>
        <div className="sidebar-footer"><div className="workspace-avatar">MC</div><div><strong>Maya Chen</strong><span>Finance Admin</span></div><MoreHorizontal size={18} /></div>
      </aside>
      {sidebarOpen && <button className="sidebar-overlay" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><div className="breadcrumb"><span>Finance</span><span>/</span><strong>{activeNav}</strong></div></div>
          <div className="topbar-actions"><label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records..." /></label><button className="icon-button" aria-label="Help"><HelpCircle size={19} /></button><button className="icon-button notification" aria-label="Notifications"><Bell size={19} /><span /></button><button className="primary-button"><Plus size={17} /> New entry</button></div>
        </header>
        <div className="page-wrap">
          <section className="page-heading"><div><p className="eyebrow"><span /> Financial control centre</p><h1>{activeNav === "Overview" ? "Good morning, Maya." : activeNav}</h1><p>{activeNav === "Overview" ? "Here’s what’s happening across your business today." : `Manage ${activeNav.toLowerCase()} from your central finance workspace.`}</p></div><DateRangePicker /></section>
          {activeNav === "Overview" && <Overview filteredInvoices={filteredInvoices} invoiceCount={invoices.length} search={search} setSearch={setSearch} updateStatus={updateStatus} />}
          {activeNav === "Inventory" && <InventoryPage />}
          {activeNav === "Audit Trail" && <AudioTrailPage />}
          {activeNav === "Settings" && <SettingsPage />}
          {activeNav !== "Overview" && activeNav !== "Inventory" && activeNav !== "Audit Trail" && activeNav !== "Settings" && <ModulePage activeNav={activeNav} />}
        </div>
      </main>
    </div>
  );
}

function Overview({ filteredInvoices, invoiceCount, search, setSearch, updateStatus }: { filteredInvoices: Invoice[]; invoiceCount: number; search: string; setSearch: (value: string) => void; updateStatus: (id: string, status: Status) => void }) {
  return <>
    <section className="metrics-grid overview-metrics"><MetricCard icon={CircleDollarSign} label="Net cash flow" value="₦1,284,420,000" accent="yellow" /><MetricCard icon={Clock3} label="Pending payables" value="₦84,250,000" accent="red" /><MetricCard icon={WalletCards} label="Outstanding receivables" value="₦126,800,000" accent="blue" /></section>
    <section className="dashboard-grid">
      <article className="panel cash-flow-panel"><PanelHeader kicker="Performance" title="Cash flow overview" /><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={cashFlowData} margin={{ top: 14, right: 10, left: -20, bottom: 0 }}><defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffe01b" stopOpacity={0.42} /><stop offset="100%" stopColor="#ffe01b" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="#ebe6de" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#77716a", fontSize: 12 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#77716a", fontSize: 12 }} tickFormatter={(value) => `₦${value}k`} /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="inflow" stroke="#241c15" strokeWidth={2.5} fill="url(#incomeFill)" /><Area type="monotone" dataKey="outflow" stroke="#b8afa4" strokeWidth={2} fill="transparent" strokeDasharray="5 5" /></AreaChart></ResponsiveContainer></div><div className="chart-legend"><span><i className="legend-dot dark" /> Inflow</span><span><i className="legend-dot gray" /> Outflow</span></div></article>
      <article className="panel spend-panel"><PanelHeader kicker="Distribution" title="Spend by category" /><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="value" innerRadius={58} outerRadius={82} paddingAngle={4} stroke="none">{categoryData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="donut-center"><strong>₦42.8M</strong><span>Total spend</span></div></div><div className="category-list">{categoryData.map((item) => <div key={item.name}><span><i style={{ background: item.color }} />{item.name}</span><strong>{item.value}%</strong></div>)}</div></article>
      <article className="panel activity-panel"><PanelHeader kicker="Automations" title="Processing activity" /><div className="activity-list"><ActivityRow icon={Upload} title="Invoice uploaded" detail="Northstar Labs · INV-2048" time="4 min ago" color="yellow" /><ActivityRow icon={FileCheck2} title="OCR extraction complete" detail="18 fields validated" time="8 min ago" color="green" /><ActivityRow icon={ShieldCheck} title="Three-way match passed" detail="PO + Goods received + Invoice" time="12 min ago" color="blue" /><ActivityRow icon={AlertIcon} title="Exception flagged" detail="Tax amount discrepancy" time="28 min ago" color="red" /></div><button className="text-button">View processing log <ArrowUpRight size={15} /></button></article>
      <article className="panel reviews-panel"><PanelHeader kicker="Review queue" title="Invoice verification" /><div className="table-tools"><label className="table-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoices" /></label><button className="filter-button"><span>All statuses</span><ChevronDown size={14} /></button></div><DataTable rows={filteredInvoices} updateStatus={updateStatus} /><div className="table-footer"><span>Showing {filteredInvoices.length} of {invoiceCount} invoices</span><button className="text-button">View all invoices <ArrowUpRight size={15} /></button></div></article>
    </section>
  </>;
}

function ModulePage({ activeNav }: { activeNav: NavKey }) {
  const records: Record<string, string>[] = activeNav === "Ledger" ? ledgerRows : activeNav === "Receivables" ? receivables : activeNav === "Payables" ? [
    ...payables.map((item) => ({ vendor: item.vendor, category: "Supplier invoice", amount: item.amount, status: item.status })),
    ...procurementRows.map((item) => ({ vendor: item.supplier, category: "Purchase order", amount: item.amount, status: item.status })),
  ] : activeNav === "Reconciliation" ? reconciliationRows : activeNav === "Invoice" ? invoiceReviewRows : activeNav === "Payroll" ? payroll : activeNav === "Reports" ? reportRows : [];
  const labels: Record<NavKey, string> = { Ledger: "General ledger", Receivables: "Accounts receivable", Payables: "Accounts payable", Reconciliation: "Reconciliation", "Invoice": "Invoice review", Inventory: "Inventory", Payroll: "Payroll", Reports: "Financial reports", "Audit Trail": "Audit trail", Overview: "Overview", Settings: "Settings" };
  const description: Record<NavKey, string> = { Ledger: "Track balanced journal entries and account movements.", Receivables: "Monitor customer invoices, collections, and credit exposure.", Payables: "Review supplier obligations and scheduled payments, including approved purchase orders.", Reconciliation: "Match bank activity, invoices, and internal records.", "Invoice": "Verify OCR results and resolve matching exceptions.", Inventory: "Monitor stock levels, movement, and valuation.", Payroll: "Review employee compensation and payment status.", Reports: "Build and export financial reporting views.", "Audit Trail": "Review secure, timestamped actions across every financial workflow.", Overview: "Overall system performance.", Settings: "Manage your workspace and automated workflows." };
  const columns = records.length > 0 ? Object.keys(records[0]) : [];
  const statusClass = (value: string) => value === "Matched" || value === "Received" || value === "Paid" || value === "Ready" || value === "Healthy" ? "status-matched" : value === "Pending" || value === "Review" || value === "Approval" || value === "Quotation" || value === "Draft" || value === "Awaiting approval" ? "status-pending" : value === "Flagged" || value === "Overdue" || value === "Partial" ? "status-flagged" : "status-pending";
  return <section className="module-layout"><div className="module-intro"><div><p className="panel-kicker">{activeNav}</p><h2>{labels[activeNav]}</h2><p>{description[activeNav]}</p></div><button className="primary-button"><Plus size={16} /> Add record</button></div><article className="panel module-table-panel"><div className="module-table-wrap"><table className="module-table"><thead><tr>{columns.map((column) => <th key={column}>{column.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}</th>)}<th>Actions</th></tr></thead><tbody>{records.map((record, index) => <tr key={index}>{columns.map((column) => { const value = record[column]; const isStatus = column.toLowerCase() === "status"; return <td key={column}>{isStatus ? <span className={`status ${statusClass(value)}`}><i />{value}</span> : value}</td>; })}<td><div className="table-actions"><button className="table-action-button">View</button><button className="more-button" aria-label={`More actions for row ${index + 1}`}><MoreHorizontal size={16} /></button></div></td></tr>)}</tbody></table></div><div className="table-footer"><span>Showing {records.length} records</span><span>Updated just now</span></div></article></section>;
}

function InventoryPage() {
  return <section className="inventory-layout">
    <section className="metrics-grid inventory-metrics"><MetricCard icon={Boxes} label="Open orders" value="24" accent="yellow" /><MetricCard icon={PackageCheck} label="Stock availability" value="86.4%" accent="green" /><MetricCard icon={FileCheck2} label="Pending approvals" value="7" accent="red" /><MetricCard icon={Building2} label="Inventory value" value="₦68.4M" accent="blue" /></section>
    <article className="panel inventory-chart-panel"><PanelHeader kicker="Stock distribution" title="Inventory by location" /><div className="inventory-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={inventoryLocationData} margin={{ top: 12, right: 10, left: -25, bottom: 0 }}><CartesianGrid stroke="#ebe6de" vertical={false} /><XAxis dataKey="location" axisLine={false} tickLine={false} tick={{ fill: "#77716a", fontSize: 10 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#77716a", fontSize: 10 }} /><Tooltip cursor={{ fill: "#f7f4ef" }} /><Bar dataKey="stock" fill="#241c15" radius={[5, 5, 0, 0]} maxBarSize={38} /></BarChart></ResponsiveContainer></div></article>
    <article className="panel procurement-panel"><PanelHeader kicker="Procurement queue" title="Pending procurements" /><div className="inventory-list">{pendingProcurements.map((item) => <div className="inventory-list-row" key={item.item}><div><strong>{item.item}</strong><span>{item.supplier}</span></div><div className="inventory-list-value"><strong>{item.amount}</strong><span>{item.due} · {item.status}</span></div><button className="row-action">Review</button></div>)}</div></article>
    <article className="panel purchase-panel"><PanelHeader kicker="Purchase orders" title="Recent purchase orders" /><div className="purchase-table-wrap"><table><thead><tr><th>PO number</th><th>Supplier</th><th>Items</th><th>Amount</th><th>Status</th></tr></thead><tbody>{purchaseOrders.map((order) => <tr key={order.number}><td><strong>{order.number}</strong></td><td>{order.supplier}</td><td>{order.items}</td><td>{order.amount}</td><td><span className={`status ${order.status === "Received" ? "status-matched" : order.status === "Approved" ? "status-pending" : "status-flagged"}`}><i />{order.status}</span></td></tr>)}</tbody></table></div></article>
  </section>;
}

function AudioTrailPage() {
  return <section className="audio-trail-layout">
    <article className="panel audio-timeline-panel"><PanelHeader kicker="Live activity" title="Recent audit events" /><div className="audio-table-wrap"><table><thead><tr><th>Time</th><th>Action</th><th>User</th><th>Type</th><th>Status</th></tr></thead><tbody>{audioTrail.map((event) => <tr key={`${event.time}-${event.action}`}><td><strong>{event.time}</strong></td><td><span className="audio-action"><i />{event.action}</span><small>{event.detail}</small></td><td>{event.user}</td><td><span className="type-pill">{event.type}</span></td><td><span className="status status-matched"><i />{event.status}</span></td></tr>)}</tbody></table></div></article>
  </section>;
}

function SettingsPage() {
  return <section className="settings-grid"><article className="panel settings-panel"><PanelHeader kicker="Workspace" title="Automations" /><div className="setting-row"><div><strong>Invoice OCR</strong><span>Automatically extract fields from uploaded documents.</span></div><button className="toggle active"><i /></button></div><div className="setting-row"><div><strong>Three-way matching</strong><span>Match invoices with purchase orders and receiving records.</span></div><button className="toggle active"><i /></button></div><div className="setting-row"><div><strong>Bank reconciliation</strong><span>Flag unmatched transactions daily.</span></div><button className="toggle active"><i /></button></div></article><article className="panel settings-panel"><PanelHeader kicker="Access control" title="Users & roles" /><div className="user-list"><UserRow name="Maya Chen" role="Finance Admin" initials="MC" /><UserRow name="Alex Morgan" role="Accounts Officer" initials="AM" /><UserRow name="Priya Shah" role="Bookkeeper" initials="PS" /><UserRow name="Daniel Okafor" role="Viewer" initials="DO" /></div><button className="outline-button"><Plus size={15} /> Invite user</button></article></section>;
}

function DataTable({ rows, updateStatus }: { rows: Invoice[]; updateStatus: (id: string, status: Status) => void }) {
  return <div className="table-scroll"><table><thead><tr><th>Vendor</th><th>Invoice</th><th>Date</th><th>Amount</th><th>Status</th><th>Owner</th></tr></thead><tbody>{rows.map((invoice) => <tr key={invoice.id}><td><div className="vendor-cell"><span>{invoice.vendor.charAt(0)}</span><strong>{invoice.vendor}</strong></div></td><td>{invoice.invoice}</td><td>{invoice.date}</td><td>{invoice.amount}</td><td><span className={`status ${statusClass[invoice.status]}`}><i />{invoice.status}</span></td><td><button className="row-action" onClick={() => updateStatus(invoice.id, invoice.status === "Matched" ? "Pending" : "Matched")}>{invoice.owner}</button></td></tr>)}</tbody></table></div>;
}

function MetricCard({ icon: Icon, label, value, accent }: { icon: ComponentType<{ size?: number }>; label: string; value: string; accent: string }) { return <article className="metric-card"><div className={`metric-icon ${accent}`}><Icon size={20} /></div><div className="metric-content"><p>{label}</p><div className="metric-value"><strong>{value}</strong></div></div></article>; }
function ActivityRow({ icon: Icon, title, detail, time, color }: { icon: ComponentType<{ size?: number }>; title: string; detail: string; time: string; color: string }) { return <div className="activity-row"><span className={`activity-icon ${color}`}><Icon size={17} /></span><div><strong>{title}</strong><p>{detail}</p></div><time>{time}</time></div>; }
function AlertIcon({ size = 18 }: { size?: number }) { return <div style={{ width: size, height: size, display: "grid", placeItems: "center", borderRadius: 50, color: "#a4433c", background: "#fbe5e2", fontSize: 12, fontWeight: 700 }}>!</div>; }
function PanelHeader({ kicker, title }: { kicker: string; title: string }) { return <div className="panel-heading"><div><p className="panel-kicker">{kicker}</p><h2>{title}</h2></div><button className="more-button" aria-label="More options"><MoreHorizontal size={19} /></button></div>; }
function UserRow({ name, role, initials }: { name: string; role: string; initials: string }) { return <div className="user-row"><span>{initials}</span><div><strong>{name}</strong><small>{role}</small></div><button className="more-button"><MoreHorizontal size={17} /></button></div>; }
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; name?: string }>; label?: string }) { if (!active || !payload?.length) return null; return <div className="chart-tooltip"><span>{label}</span>{payload.map((item) => <strong key={item.name}>{item.name}: ₦{item.value}k</strong>)}</div>; }

export default App;
