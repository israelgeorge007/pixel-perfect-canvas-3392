export type InvoiceStatus = "Matched" | "Pending" | "Flagged";
export type ReconciliationView = "Payables" | "Receivables" | "Bank";
export type DashboardNav = "Overview" | "Ledger" | "Receivables" | "Payables" | "Reconciliation" | "Invoice" | "Inventory" | "Payroll" | "Reports" | "Audit Trail" | "Settings";

export interface DashboardInvoice {
  id: string;
  vendor: string;
  invoice: string;
  date: string;
  dateKey?: string;
  amount: number;
  status: InvoiceStatus;
  owner: string;
}

export interface DashboardData {
  invoices: DashboardInvoice[];
  ledgerAccounts: { account: string; code: string; type: string; debit: number; credit: number; dateKey?: string }[];
  receivables: { customer: string; invoice: string; amount: number; outstanding: number; due: string; status: string; dateKey?: string }[];
  payables: { vendor: string; invoice: string; amount: number; due: string; ledgerStatus: string; paymentStatus: string; dateKey?: string }[];
  inventoryItems: { item: string; sku: string; stock: number; value: number; status: string }[];
  inventoryLocations: { location: string; stock: number; capacity: number }[];
  procurements: { item: string; supplier: string; amount: number; due: string; status: string; dateKey?: string }[];
  purchaseOrders: { number: string; supplier: string; items: number; amount: number; status: string; dateKey?: string }[];
  bankTransactions: { bank: string; reference: string; amount: number; status: string; dateKey?: string }[];
  cashFlow: { month: string; inflow: number; outflow: number; dateKey?: string }[];
  spendCategories: { name: string; amount: number; color: string; dateKey?: string }[];
  payroll: { employee: string; role: string; pay: number; status: string; dateKey?: string }[];
  reports: { report: string; period: string; owner: string; status: string; dateKey?: string }[];
  auditEvents: { time: string; action: string; detail: string; user: string; type: string; status: string; dateKey?: string }[];
  activity: { title: string; detail: string; time: string; kind: "invoice" | "ocr" | "match" | "alert" }[];
  automations: { title: string; description: string; enabled: boolean }[];
  users: { name: string; role: string; initials: string }[];
  profile: { name: string; email: string; phone: string; jobTitle: string; team: string; timezone: string; invoiceAlerts: boolean; reconciliationAlerts: boolean; weeklySummary: boolean };
}

const baseDashboardData: DashboardData = {
  invoices: [
    { id: "INV-2048", vendor: "Northstar Labs", invoice: "INV-2048", date: "29 Jul 2026", amount: 24_850_000, status: "Matched", owner: "Maya Chen" },
    { id: "INV-2047", vendor: "Atlas Systems", invoice: "INV-2047", date: "28 Jul 2026", amount: 18_420_000, status: "Pending", owner: "Alex Morgan" },
    { id: "INV-2046", vendor: "Fieldwork Co.", invoice: "INV-2046", date: "27 Jul 2026", amount: 9_675_000, status: "Flagged", owner: "Priya Shah" },
    { id: "INV-2045", vendor: "Brightline", invoice: "INV-2045", date: "26 Jul 2026", amount: 12_300_000, status: "Matched", owner: "Maya Chen" },
    { id: "INV-2044", vendor: "PrintFlow Ltd.", invoice: "INV-2044", date: "25 Jul 2026", amount: 3_250_000, status: "Pending", owner: "Alex Morgan" },
    { id: "INV-2043", vendor: "Oak & Pine Co.", invoice: "INV-2043", date: "24 Jul 2026", amount: 8_420_000, status: "Matched", owner: "Priya Shah" },
  ],
  ledgerAccounts: [
    { account: "Cash & Cash Equivalents", code: "1000", type: "Asset", debit: 1_284_420_000, credit: 0 },
    { account: "Sales Revenue", code: "4000", type: "Income", debit: 0, credit: 1_420_000_000 },
    { account: "Cost of Goods Sold", code: "5000", type: "Expense", debit: 577_400_000, credit: 0 },
    { account: "Office Supplies", code: "5010", type: "Expense", debit: 8_420_000, credit: 0 },
  ],
  receivables: [
    { customer: "Lagos Premium Hotels", invoice: "AR-3108", amount: 42_800_000, outstanding: 42_800_000, due: "31 Aug 2026", status: "Overdue" },
    { customer: "Sahara Retail Group", invoice: "AR-3107", amount: 31_450_000, outstanding: 31_450_000, due: "05 Sep 2026", status: "Open" },
    { customer: "Kite Technologies", invoice: "AR-3106", amount: 18_200_000, outstanding: 18_200_000, due: "12 Sep 2026", status: "Open" },
    { customer: "Apex Media Limited", invoice: "AR-3105", amount: 14_750_000, outstanding: 14_750_000, due: "19 Sep 2026", status: "Open" },
    { customer: "Tideway Logistics", invoice: "AR-3104", amount: 9_600_000, outstanding: 3_600_000, due: "24 Sep 2026", status: "Partial" },
    { customer: "Crown Health Group", invoice: "AR-3103", amount: 6_300_000, outstanding: 6_300_000, due: "02 Oct 2026", status: "Open" },
  ],
  payables: [
    { vendor: "Northstar Labs", invoice: "INV-2048", amount: 24_850_000, due: "02 Aug 2026", ledgerStatus: "Matched", paymentStatus: "Scheduled" },
    { vendor: "Atlas Systems", invoice: "INV-2047", amount: 18_420_000, due: "09 Aug 2026", ledgerStatus: "Matched", paymentStatus: "Review" },
    { vendor: "Fieldwork Co.", invoice: "INV-2046", amount: 9_675_000, due: "14 Aug 2026", ledgerStatus: "Review", paymentStatus: "Scheduled" },
    { vendor: "PrintFlow Ltd.", invoice: "INV-2044", amount: 3_250_000, due: "18 Aug 2026", ledgerStatus: "Matched", paymentStatus: "Pending" },
    { vendor: "Oak & Pine Co.", invoice: "INV-2043", amount: 8_420_000, due: "22 Aug 2026", ledgerStatus: "Review", paymentStatus: "Approval" },
    { vendor: "SecureNet Systems", invoice: "INV-2042", amount: 12_800_000, due: "27 Aug 2026", ledgerStatus: "Matched", paymentStatus: "Review" },
  ],
  inventoryItems: [
    { item: "ERP Core License", sku: "ERP-024", stock: 42, value: 18_900_000, status: "Healthy" },
    { item: "Accounting Workstation", sku: "ACC-018", stock: 8, value: 7_200_000, status: "Low stock" },
    { item: "Network Equipment", sku: "NET-032", stock: 15, value: 15_400_000, status: "Healthy" },
    { item: "Server Hardware", sku: "SRV-011", stock: 12, value: 12_300_000, status: "Healthy" },
    { item: "Maintenance Parts", sku: "MNT-007", stock: 24, value: 14_600_000, status: "Healthy" },
  ],
  inventoryLocations: [
    { location: "Lagos", stock: 78, capacity: 90 },
    { location: "Abuja", stock: 54, capacity: 65 },
    { location: "Port Harcourt", stock: 42, capacity: 50 },
    { location: "Ibadan", stock: 31, capacity: 35 },
    { location: "Kano", stock: 19, capacity: 20 },
  ],
  procurements: [
    { item: "Office furniture", supplier: "Oak & Pine Co.", amount: 8_420_000, due: "04 Aug", status: "Awaiting approval" },
    { item: "Printer accessories", supplier: "PrintFlow Ltd.", amount: 3_250_000, due: "07 Aug", status: "Pending PO" },
    { item: "Security devices", supplier: "SecureNet Systems", amount: 12_800_000, due: "11 Aug", status: "Quotation review" },
  ],
  purchaseOrders: [
    { number: "PO-2026-184", supplier: "Northstar Labs", items: 12, amount: 24_850_000, status: "Received" },
    { number: "PO-2026-183", supplier: "Atlas Systems", items: 4, amount: 18_420_000, status: "Approved" },
    { number: "PO-2026-182", supplier: "Fieldwork Co.", items: 8, amount: 9_675_000, status: "Pending" },
    { number: "PO-2026-181", supplier: "PrintFlow Ltd.", items: 3, amount: 3_250_000, status: "Quotation" },
    { number: "PO-2026-180", supplier: "Oak & Pine Co.", items: 9, amount: 8_420_000, status: "Approval" },
    { number: "PO-2026-179", supplier: "SecureNet Systems", items: 6, amount: 12_800_000, status: "Pending" },
  ],
  bankTransactions: [
    { bank: "Access Bank", reference: "TRN-90841", amount: 24_850_000, status: "Matched" },
    { bank: "First Bank", reference: "TRN-90840", amount: 18_420_000, status: "Matched" },
    { bank: "Guaranty Bank", reference: "TRN-90839", amount: 8_420_000, status: "Review" },
    { bank: "Access Bank", reference: "TRN-90838", amount: 3_250_000, status: "Matched" },
    { bank: "First Bank", reference: "TRN-90837", amount: 12_800_000, status: "Review" },
    { bank: "Guaranty Bank", reference: "TRN-90836", amount: 2_100_000, status: "Matched" },
  ],
  cashFlow: [
    { month: "Jan", inflow: 42, outflow: 24 },
    { month: "Feb", inflow: 48, outflow: 28 },
    { month: "Mar", inflow: 45, outflow: 25 },
    { month: "Apr", inflow: 58, outflow: 31 },
    { month: "May", inflow: 66, outflow: 35 },
    { month: "Jun", inflow: 72, outflow: 38 },
    { month: "Jul", inflow: 79, outflow: 39 },
    { month: "Aug", inflow: 74, outflow: 41 },
    { month: "Sep", inflow: 83, outflow: 44 },
    { month: "Oct", inflow: 29, outflow: 16 },
  ],
  spendCategories: [
    { name: "Software", amount: 17_976_000, color: "#ffe01b" },
    { name: "Operations", amount: 11_984_000, color: "#241c15" },
    { name: "Marketing", amount: 7_704_000, color: "#d7cfc3" },
    { name: "Other", amount: 5_136_000, color: "#eee9e1" },
  ],
  payroll: [
    { employee: "Maya Chen", role: "Finance Admin", pay: 1_850_000, status: "Paid" },
    { employee: "Alex Morgan", role: "Accounts Officer", pay: 1_650_000, status: "Paid" },
    { employee: "Priya Shah", role: "Bookkeeper", pay: 1_420_000, status: "Processing" },
  ],
  reports: [
    { report: "Profit & loss", period: "July 2026", owner: "Maya Chen", status: "Ready" },
    { report: "Cash flow", period: "July 2026", owner: "Alex Morgan", status: "Ready" },
    { report: "Accounts receivable", period: "July 2026", owner: "Priya Shah", status: "Review" },
    { report: "Inventory movement", period: "July 2026", owner: "Maya Chen", status: "Ready" },
    { report: "Tax summary", period: "Q3 2026", owner: "Alex Morgan", status: "Ready" },
    { report: "Budget variance", period: "YTD 2026", owner: "Priya Shah", status: "Draft" },
  ],
  auditEvents: [
    { time: "29 Jul, 10:42", action: "Invoice uploaded", detail: "Northstar Labs · INV-2048", user: "Maya Chen", type: "Upload", status: "Verified" },
    { time: "29 Jul, 10:43", action: "OCR extraction complete", detail: "18 fields extracted and validated", user: "Automation", type: "OCR", status: "Complete" },
    { time: "29 Jul, 10:44", action: "Three-way match passed", detail: "PO + Goods received + Invoice", user: "System", type: "Match", status: "Matched" },
    { time: "29 Jul, 10:46", action: "Payment allocation recorded", detail: "₦24,850,000 · Bank reference NRG-9012", user: "Alex Morgan", type: "Payment", status: "Recorded" },
    { time: "29 Jul, 10:48", action: "Audit event signed", detail: "Retention policy · 7 years", user: "Security", type: "Audit", status: "Signed" },
  ],
  activity: [
    { title: "Invoice uploaded", detail: "Northstar Labs · INV-2048", time: "4 min ago", kind: "invoice" },
    { title: "OCR extraction complete", detail: "18 fields validated", time: "8 min ago", kind: "ocr" },
    { title: "Three-way match passed", detail: "PO + Goods received + Invoice", time: "12 min ago", kind: "match" },
    { title: "Exception flagged", detail: "Tax amount discrepancy", time: "28 min ago", kind: "alert" },
  ],
  automations: [
    { title: "Invoice OCR", description: "Automatically extract fields from uploaded documents.", enabled: true },
    { title: "Three-way matching", description: "Match invoices with purchase orders and receiving records.", enabled: true },
    { title: "Bank reconciliation", description: "Flag unmatched transactions daily.", enabled: true },
  ],
  users: [
    { name: "Maya Chen", role: "Finance Admin", initials: "MC" },
    { name: "Alex Morgan", role: "Accounts Officer", initials: "AM" },
    { name: "Priya Shah", role: "Bookkeeper", initials: "PS" },
    { name: "Daniel Okafor", role: "Viewer", initials: "DO" },
  ],
  profile: {
    name: "Maya Chen",
    email: "maya.chen@corelogic.example",
    phone: "",
    jobTitle: "Finance Admin",
    team: "Finance & Operations",
    timezone: "Africa/Lagos",
    invoiceAlerts: true,
    reconciliationAlerts: true,
    weeklySummary: false,
  },
};

function dateKeyForMonth(monthIndex: number): string {
  const year = new Date().getFullYear();
  const month = Math.min(monthIndex, new Date().getMonth());
  const day = month === new Date().getMonth() ? Math.max(1, new Date().getDate()) : 15;
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function spreadDates<T extends { dateKey?: string }>(records: T[]): T[] {
  if (records.length === 1) return records.map((record) => ({ ...record, dateKey: dateKeyForMonth(0) }));
  return records.map((record, index) => {
    const month = Math.round(index * new Date().getMonth() / (records.length - 1));
    return { ...record, dateKey: dateKeyForMonth(month) };
  });
}

function distributeMonthly<T extends { debit: number; credit: number; dateKey?: string }>(records: T[]): T[] {
  return records.flatMap((record) => Array.from({ length: new Date().getMonth() + 1 }, (_, month) => {
    const periods = new Date().getMonth() + 1;
    const share = (amount: number) => Math.floor(amount / periods) + (month < amount % periods ? 1 : 0);
    return {
      ...record,
      debit: share(record.debit),
      credit: share(record.credit),
      dateKey: dateKeyForMonth(month),
    };
  }));
}

const spendByMonth = baseDashboardData.spendCategories.flatMap((category) => Array.from({ length: new Date().getMonth() + 1 }, (_, month) => {
  const periods = new Date().getMonth() + 1;
  return {
    ...category,
    amount: Math.floor(category.amount / periods) + (month < category.amount % periods ? 1 : 0),
    dateKey: dateKeyForMonth(month),
  };
}));

export const mockDashboardData: DashboardData = {
  ...baseDashboardData,
  invoices: spreadDates(baseDashboardData.invoices).map((invoice) => ({
    ...invoice,
    date: new Date(`${invoice.dateKey}T12:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
  })),
  ledgerAccounts: distributeMonthly(baseDashboardData.ledgerAccounts),
  receivables: spreadDates(baseDashboardData.receivables),
  payables: spreadDates(baseDashboardData.payables),
  procurements: spreadDates(baseDashboardData.procurements),
  purchaseOrders: spreadDates(baseDashboardData.purchaseOrders),
  bankTransactions: spreadDates(baseDashboardData.bankTransactions),
  cashFlow: baseDashboardData.cashFlow.slice(0, new Date().getMonth() + 1).map((period, month) => ({
    ...period,
    dateKey: dateKeyForMonth(month),
  })),
  spendCategories: spendByMonth,
  payroll: spreadDates(baseDashboardData.payroll),
  reports: spreadDates(baseDashboardData.reports),
  auditEvents: spreadDates(baseDashboardData.auditEvents),
};
