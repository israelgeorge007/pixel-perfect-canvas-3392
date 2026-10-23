import type { AccountingAccount, BankStatementLine, JournalEntry } from "../services/accounting";

export type InvoiceStatus = "Matched" | "Pending" | "Flagged";
export type ReconciliationView = "Payables" | "Receivables" | "Bank";
export type DashboardNav =
  | "Overview"
  | "Ledger"
  | "Receivables"
  | "Payables"
  | "Reconciliation"
  | "Invoice"
  | "Inventory"
  | "Payroll"
  | "Reports"
  | "Audit Logs"
  | "Settings";
export type WorkspaceSettingsSection =
  "Organization" | "Approval Rules" | "Team Access" | "Roles & Tiers";
export type LedgerAccountType = "Asset" | "Liability" | "Equity" | "Income" | "Expense";
export type InvoiceCompanyDetails = {
  name: string;
  logoDataUrl: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  registrationNumber: string;
  taxId: string;
  bankAccounts: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    currency: string;
  }[];
};
export type InvoiceCustomerDetails = {
  name: string;
  email: string;
  phone: string;
  address: string;
};
export type InvoiceLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  inventorySku?: string;
  inventoryLocation?: string;
};
export type InvoiceTotals = {
  subtotal: number;
  discountAmount: number;
  vatRate: number;
  vatAmount: number;
  shippingFee: number;
};

export interface DashboardInvoice {
  id: string;
  vendor: string;
  customer?: string;
  customerId?: string;
  invoice: string;
  date: string;
  dateKey?: string;
  amount: number;
  status: InvoiceStatus;
  owner: string;
  dueDate?: string;
  journalEntryId?: string;
  companyDetails?: InvoiceCompanyDetails;
  customerDetails?: InvoiceCustomerDetails;
  totals?: InvoiceTotals;
  items?: InvoiceLine[];
}

export type ApprovalRequestStatus = "Pending" | "Approved" | "Rejected";
export type ApprovalDocument = {
  id: string;
  name: string;
  type: "application/pdf" | "image/jpeg";
  size: number;
};
export type ApprovalRequest = {
  id: string;
  type: "procurement" | "purchase-order" | "customer-invoice";
  status: ApprovalRequestStatus;
  submittedAt: string;
  submittedBy: string;
  submittedByEmail?: string;
  decidedAt?: string;
  decidedBy?: string;
  rejectionReason?: string;
  resultingReference?: string;
  revisionOf?: string;
} & (
  | { type: "procurement"; payload: DashboardData["procurements"][number] }
  | {
      type: "purchase-order";
      payload: Omit<DashboardData["purchaseOrders"][number], "number" | "status" | "dateKey"> & {
        number?: string;
      };
    }
  | {
      type: "customer-invoice";
      payload: {
        customerId: string;
        invoice: string;
        amount: number;
        items: InvoiceLine[];
        invoiceDate: string;
        dueDate: string;
        companyDetails?: InvoiceCompanyDetails;
        customerDetails?: InvoiceCustomerDetails;
        totals?: InvoiceTotals;
      };
    }
);

export type PayrollAllowancePercentages = {
  basic: number;
  housing: number;
  transport: number;
  utilities: number;
  foodEntertainment: number;
};
export type PayrollAllowanceAmounts = PayrollAllowancePercentages;
export type PayrollDeductionRates = {
  employeePension: number;
  housingFund: number;
  incomeTax: number;
};
export type PayrollRole = { id: string; name: string };
export type PayrollPayTier = {
  id: string;
  name: string;
  allowancePercentages: PayrollAllowancePercentages;
  deductionRates: PayrollDeductionRates;
};

export interface DashboardData {
  accounts?: AccountingAccount[];
  journalEntries?: JournalEntry[];
  customers?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    billingAddress?: string;
  }[];
  vendors?: {
    id: string;
    name: string;
    address?: string;
    email?: string;
    phone?: string;
    contact?: string;
  }[];
  customerPayments?: {
    id: string;
    invoice: string;
    amount: number;
    dateKey: string;
    journalEntryId: string;
  }[];
  vendorPayments?: {
    id: string;
    bill: string;
    amount: number;
    dateKey: string;
    journalEntryId: string;
  }[];
  payrollPayments?: {
    id: string;
    employee: string;
    amount: number;
    dateKey: string;
    journalEntryId: string;
    payrollDateKey?: string;
    payrollEntryId?: string;
  }[];
  bankStatementLines?: BankStatementLine[];
  inventoryMovements?: {
    id: string;
    sku: string;
    location: string;
    quantity: number;
    unitCost: number;
    direction: "in" | "out";
    dateKey: string;
    journalEntryId?: string;
  }[];
  invoices: DashboardInvoice[];
  ledgerAccounts: {
    account: string;
    code: string;
    type: LedgerAccountType;
    debit: number;
    credit: number;
    dateKey?: string;
    id?: string;
    memo?: string;
    reference?: string;
  }[];
  ledgerAccountCatalog: { account: string; code: string; type: LedgerAccountType }[];
  receivables: {
    customer: string;
    customerId?: string;
    invoice: string;
    amount: number;
    outstanding: number;
    due: string;
    status: string;
    dateKey?: string;
    journalEntryId?: string;
  }[];
  payables: {
    vendor: string;
    vendorId?: string;
    invoice: string;
    amount: number;
    due: string;
    ledgerStatus: string;
    paymentStatus: string;
    dateKey?: string;
    journalEntryId?: string;
    paidAmount?: number;
    billType?: "expense" | "inventory";
    sku?: string;
    quantity?: number;
    inventoryLines?: { sku: string; quantity: number; unitCost: number }[];
  }[];
  inventoryItems: {
    item: string;
    sku: string;
    stock: number;
    value: number;
    unitCost?: number;
    sellingPrice?: number;
    status: string;
    reorderLevel?: number;
    locationStock?: { location: string; quantity: number }[];
  }[];
  inventoryLocations: { location: string; stock: number; capacity: number }[];
  procurements: {
    reference?: string;
    vendorId?: string;
    item: string;
    supplier: string;
    supplierAddress?: string;
    supplierContact?: string;
    amount: number;
    due: string;
    status: string;
    dateKey?: string;
    billReference?: string;
    billType?: "expense" | "inventory";
    document?: ApprovalDocument;
  }[];
  approvalRequests: ApprovalRequest[];
  purchaseOrders: {
    number: string;
    vendorId?: string;
    supplier: string;
    supplierAddress?: string;
    supplierContact?: string;
    location?: string;
    item?: string;
    items: number;
    quantity?: number;
    lines?: { item: string; sku: string; quantity: number; unitPrice: number }[];
    document?: ApprovalDocument;
    amount: number;
    status: string;
    dateKey?: string;
  }[];
  bankTransactions: {
    bank: string;
    reference: string;
    amount: number;
    status: string;
    dateKey?: string;
  }[];
  cashFlow: { month: string; inflow: number; outflow: number; dateKey?: string }[];
  payrollSettings?: { payDay: number; roles?: PayrollRole[]; payTiers?: PayrollPayTier[] };
  payrollEmployees?: {
    id: string;
    employee: string;
    email?: string;
    role: string;
    roleId?: string;
    payTierId?: string;
    grossPay: number;
    employeeDeductions: number;
    employerLiabilities: number;
    allowances?: PayrollAllowanceAmounts;
    deductionRates?: PayrollDeductionRates;
    active?: boolean;
  }[];
  payroll: {
    id?: string;
    employeeId?: string;
    periodKey?: string;
    scheduledPayDate?: string;
    employee: string;
    role: string;
    roleId?: string;
    payTierId?: string;
    pay: number;
    status: string;
    dateKey?: string;
    grossPay?: number;
    employeeDeductions?: number;
    employerLiabilities?: number;
    allowances?: PayrollAllowanceAmounts;
    deductionRates?: PayrollDeductionRates;
    journalEntryId?: string;
    paidAmount?: number;
  }[];
  reports: {
    report: string;
    period: string;
    periodStart?: string;
    periodEnd?: string;
    owner: string;
    status: string;
    dateKey?: string;
  }[];
  auditEvents: {
    time: string;
    action: string;
    detail: string;
    user: string;
    email?: string;
    type: string;
    status: string;
    dateKey?: string;
  }[];
  activity: { title: string; detail: string; time: string; kind: "invoice" | "match" | "alert" }[];
  automations: { title: string; description: string; enabled: boolean }[];
  users: {
    name: string;
    role: string;
    initials: string;
    email?: string;
    allowedTabs?: (DashboardNav | "Procurement" | "Approvals")[];
    allowedSettingsSections?: WorkspaceSettingsSection[];
  }[];
  profile: {
    name: string;
    email: string;
    phone: string;
    jobTitle: string;
    team: string;
    timezone: string;
    invoiceAlerts: boolean;
    reconciliationAlerts: boolean;
    weeklySummary: boolean;
  };
}

const baseDashboardData: DashboardData = {
  approvalRequests: [],
  invoices: [
    {
      id: "AR-3108",
      vendor: "",
      customer: "Lagos Premium Hotels",
      invoice: "AR-3108",
      date: "29 Jul 2026",
      dateKey: "2026-07-29",
      amount: 42_800_000,
      status: "Pending",
      owner: "Maya Chen",
      dueDate: "2026-08-31",
    },
    {
      id: "AR-3107",
      vendor: "",
      customer: "Sahara Retail Group",
      invoice: "AR-3107",
      date: "28 Jul 2026",
      dateKey: "2026-07-28",
      amount: 31_450_000,
      status: "Pending",
      owner: "Alex Morgan",
      dueDate: "2026-09-05",
    },
    {
      id: "AR-3106",
      vendor: "",
      customer: "Kite Technologies",
      invoice: "AR-3106",
      date: "27 Jul 2026",
      dateKey: "2026-07-27",
      amount: 18_200_000,
      status: "Pending",
      owner: "Priya Shah",
      dueDate: "2026-09-12",
    },
    {
      id: "AR-3105",
      vendor: "",
      customer: "Apex Media Limited",
      invoice: "AR-3105",
      date: "26 Jul 2026",
      dateKey: "2026-07-26",
      amount: 14_750_000,
      status: "Pending",
      owner: "Maya Chen",
      dueDate: "2026-09-19",
    },
    {
      id: "AR-3104",
      vendor: "",
      customer: "Tideway Logistics",
      invoice: "AR-3104",
      date: "25 Jul 2026",
      dateKey: "2026-07-25",
      amount: 9_600_000,
      status: "Pending",
      owner: "Alex Morgan",
      dueDate: "2026-09-24",
    },
    {
      id: "AR-3103",
      vendor: "",
      customer: "Crown Health Group",
      invoice: "AR-3103",
      date: "24 Jul 2026",
      dateKey: "2026-07-24",
      amount: 6_300_000,
      status: "Pending",
      owner: "Priya Shah",
      dueDate: "2026-10-02",
    },
  ],
  ledgerAccounts: [
    {
      account: "Cash & Cash Equivalents",
      code: "1000",
      type: "Asset",
      debit: 1_284_420_000,
      credit: 0,
    },
    { account: "Sales Revenue", code: "4000", type: "Income", debit: 0, credit: 1_420_000_000 },
    { account: "Cost of Goods Sold", code: "5000", type: "Expense", debit: 577_400_000, credit: 0 },
    { account: "Office Supplies", code: "5010", type: "Expense", debit: 8_420_000, credit: 0 },
  ],
  ledgerAccountCatalog: [
    { account: "Cash & Cash Equivalents", code: "1000", type: "Asset" },
    { account: "Accounts Receivable", code: "1100", type: "Asset" },
    { account: "Inventory", code: "1500", type: "Asset" },
    { account: "Accounts Payable", code: "2000", type: "Liability" },
    { account: "Opening Balance Equity", code: "3000", type: "Equity" },
    { account: "Sales Revenue", code: "4000", type: "Income" },
    { account: "Cost of Goods Sold", code: "5000", type: "Expense" },
    { account: "Office Supplies", code: "5010", type: "Expense" },
  ],
  receivables: [
    {
      customer: "Lagos Premium Hotels",
      invoice: "AR-3108",
      amount: 42_800_000,
      outstanding: 42_800_000,
      due: "31 Aug 2026",
      status: "Overdue",
    },
    {
      customer: "Sahara Retail Group",
      invoice: "AR-3107",
      amount: 31_450_000,
      outstanding: 31_450_000,
      due: "05 Sep 2026",
      status: "Open",
    },
    {
      customer: "Kite Technologies",
      invoice: "AR-3106",
      amount: 18_200_000,
      outstanding: 18_200_000,
      due: "12 Sep 2026",
      status: "Open",
    },
    {
      customer: "Apex Media Limited",
      invoice: "AR-3105",
      amount: 14_750_000,
      outstanding: 14_750_000,
      due: "19 Sep 2026",
      status: "Open",
    },
    {
      customer: "Tideway Logistics",
      invoice: "AR-3104",
      amount: 9_600_000,
      outstanding: 3_600_000,
      due: "24 Sep 2026",
      status: "Partial",
    },
    {
      customer: "Crown Health Group",
      invoice: "AR-3103",
      amount: 6_300_000,
      outstanding: 6_300_000,
      due: "02 Oct 2026",
      status: "Open",
    },
  ],
  payables: [
    {
      vendor: "Northstar Labs",
      invoice: "INV-2048",
      amount: 24_850_000,
      due: "02 Aug 2026",
      ledgerStatus: "Matched",
      paymentStatus: "Scheduled",
    },
    {
      vendor: "Atlas Systems",
      invoice: "INV-2047",
      amount: 18_420_000,
      due: "09 Aug 2026",
      ledgerStatus: "Matched",
      paymentStatus: "Review",
    },
    {
      vendor: "Fieldwork Co.",
      invoice: "INV-2046",
      amount: 9_675_000,
      due: "14 Aug 2026",
      ledgerStatus: "Review",
      paymentStatus: "Scheduled",
    },
    {
      vendor: "PrintFlow Ltd.",
      invoice: "INV-2044",
      amount: 3_250_000,
      due: "18 Aug 2026",
      ledgerStatus: "Matched",
      paymentStatus: "Pending",
    },
    {
      vendor: "Oak & Pine Co.",
      invoice: "INV-2043",
      amount: 8_420_000,
      due: "22 Aug 2026",
      ledgerStatus: "Review",
      paymentStatus: "Approval",
    },
    {
      vendor: "SecureNet Systems",
      invoice: "INV-2042",
      amount: 12_800_000,
      due: "27 Aug 2026",
      ledgerStatus: "Matched",
      paymentStatus: "Review",
    },
  ],
  inventoryItems: [
    { item: "ERP Core License", sku: "ERP-024", stock: 42, value: 18_900_000, status: "Healthy" },
    {
      item: "Accounting Workstation",
      sku: "ACC-018",
      stock: 8,
      value: 7_200_000,
      status: "Low stock",
    },
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
    {
      item: "Office furniture",
      supplier: "Oak & Pine Co.",
      amount: 8_420_000,
      due: "04 Aug",
      status: "Awaiting approval",
    },
    {
      item: "Printer accessories",
      supplier: "PrintFlow Ltd.",
      amount: 3_250_000,
      due: "07 Aug",
      status: "Pending PO",
    },
    {
      item: "Security devices",
      supplier: "SecureNet Systems",
      amount: 12_800_000,
      due: "11 Aug",
      status: "Quotation review",
    },
  ],
  purchaseOrders: [
    {
      number: "PO-2026-184",
      supplier: "Northstar Labs",
      item: "ERP Core License",
      items: 1,
      quantity: 12,
      lines: [
        { item: "ERP Core License", sku: "ERP-024", quantity: 12, unitPrice: 24_850_000 / 12 },
      ],
      amount: 24_850_000,
      status: "Received",
    },
    {
      number: "PO-2026-183",
      supplier: "Atlas Systems",
      item: "Accounting Workstation",
      items: 1,
      quantity: 4,
      lines: [
        { item: "Accounting Workstation", sku: "ACC-018", quantity: 4, unitPrice: 18_420_000 / 4 },
      ],
      amount: 18_420_000,
      status: "Approved",
    },
    {
      number: "PO-2026-182",
      supplier: "Fieldwork Co.",
      item: "Network Equipment",
      items: 1,
      quantity: 8,
      lines: [{ item: "Network Equipment", sku: "NET-032", quantity: 8, unitPrice: 9_675_000 / 8 }],
      amount: 9_675_000,
      status: "Pending",
    },
    {
      number: "PO-2026-181",
      supplier: "PrintFlow Ltd.",
      item: "Maintenance Parts",
      items: 1,
      quantity: 3,
      lines: [{ item: "Maintenance Parts", sku: "MNT-007", quantity: 3, unitPrice: 3_250_000 / 3 }],
      amount: 3_250_000,
      status: "Quotation",
    },
    {
      number: "PO-2026-180",
      supplier: "Oak & Pine Co.",
      item: "Accounting Workstation",
      items: 1,
      quantity: 9,
      lines: [
        { item: "Accounting Workstation", sku: "ACC-018", quantity: 9, unitPrice: 8_420_000 / 9 },
      ],
      amount: 8_420_000,
      status: "Approval",
    },
    {
      number: "PO-2026-179",
      supplier: "SecureNet Systems",
      item: "Server Hardware",
      items: 1,
      quantity: 6,
      lines: [{ item: "Server Hardware", sku: "SRV-011", quantity: 6, unitPrice: 12_800_000 / 6 }],
      amount: 12_800_000,
      status: "Pending",
    },
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
  payroll: [
    { employee: "Ademola Oyegun", role: "Finance Admin", pay: 1_850_000, status: "Paid" },
    { employee: "Alex Morgan", role: "Accounts Officer", pay: 1_650_000, status: "Paid" },
    { employee: "Priya Shah", role: "Bookkeeper", pay: 1_420_000, status: "Processing" },
  ],
  reports: [
    { report: "Profit & loss", period: "July 2026", owner: "Ademola Oyegun", status: "Ready" },
    { report: "Cash flow", period: "July 2026", owner: "Alex Morgan", status: "Ready" },
    { report: "Accounts receivable", period: "July 2026", owner: "Priya Shah", status: "Review" },
    { report: "Inventory movement", period: "July 2026", owner: "Ademola Oyegun", status: "Ready" },
    { report: "Tax summary", period: "Q3 2026", owner: "Alex Morgan", status: "Ready" },
    { report: "Budget variance", period: "YTD 2026", owner: "Priya Shah", status: "Draft" },
  ],
  auditEvents: [
    {
      time: "29 Jul, 10:42",
      action: "Invoice created",
      detail: "Lagos Premium Hotels · AR-3108",
      user: "Ademola Oyegun",
      type: "Invoice",
      status: "Created",
    },
    {
      time: "29 Jul, 10:43",
      action: "Invoice details recorded",
      detail: "Customer, amount, invoice date, and due date entered manually",
      user: "Ademola Oyegun",
      type: "Invoice",
      status: "Complete",
    },
    {
      time: "29 Jul, 10:44",
      action: "Receivable created",
      detail: "AR-3108 · Lagos Premium Hotels",
      user: "System",
      type: "Receivables",
      status: "Open",
    },
    {
      time: "29 Jul, 10:46",
      action: "Receivable balance carried forward",
      detail: "AR-3108 · Lagos Premium Hotels",
      user: "System",
      type: "Receivables",
      status: "Open",
    },
    {
      time: "29 Jul, 10:48",
      action: "Audit event signed",
      detail: "Retention policy · 7 years",
      user: "Security",
      type: "Audit",
      status: "Signed",
    },
  ],
  activity: [
    {
      title: "Invoice created",
      detail: "Lagos Premium Hotels · AR-3108",
      time: "4 min ago",
      kind: "invoice",
    },
    {
      title: "Receivable created",
      detail: "AR-3108 · Lagos Premium Hotels",
      time: "12 min ago",
      kind: "match",
    },
    {
      title: "Exception flagged",
      detail: "Tax amount discrepancy",
      time: "28 min ago",
      kind: "alert",
    },
  ],
  automations: [
    {
      title: "Three-way matching",
      description: "Match invoices with purchase orders and receiving records.",
      enabled: true,
    },
    {
      title: "Bank reconciliation",
      description: "Flag unmatched transactions daily.",
      enabled: true,
    },
  ],
  users: [
    {
      name: "Ademola Oyegun",
      role: "Finance Admin",
      initials: "AO",
      email: "ademolaoyegun@intentrun.com",
      allowedTabs: [
        "Overview",
        "Approvals",
        "Ledger",
        "Receivables",
        "Payables",
        "Reconciliation",
        "Invoice",
        "Inventory",
        "Procurement",
        "Payroll",
        "Reports",
        "Audit Logs",
        "Settings",
      ],
      allowedSettingsSections: ["Organization", "Approval Rules", "Team Access", "Roles & Tiers"],
    },
    {
      name: "Alex Morgan",
      role: "Accounts Officer",
      initials: "AM",
      email: "alex.morgan@intentrun.com",
    },
    { name: "Priya Shah", role: "Bookkeeper", initials: "PS", email: "priya.shah@intentrun.com" },
    { name: "Daniel Okafor", role: "Viewer", initials: "DO", email: "daniel.okafor@intentrun.com" },
  ],
  profile: {
    name: "Ademola Oyegun",
    email: "ademolaoyegun@intentrun.com",
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
  if (records.length === 1)
    return records.map((record) => ({ ...record, dateKey: dateKeyForMonth(0) }));
  return records.map((record, index) => {
    const month = Math.round((index * new Date().getMonth()) / (records.length - 1));
    return { ...record, dateKey: dateKeyForMonth(month) };
  });
}

const seededBankDescriptions: Record<string, string> = {
  "TRN-90841": "Customer payment · Northstar Labs",
  "TRN-90840": "Customer payment · Atlas Systems",
  "TRN-90839": "Customer settlement · Oak & Pine Co.",
  "TRN-90838": "Customer payment · PrintFlow Ltd.",
  "TRN-90837": "Customer settlement · SecureNet Systems",
  "TRN-90836": "Customer payment · Fieldwork Co.",
};

const seededBankStatementLines: BankStatementLine[] = spreadDates(
  baseDashboardData.bankTransactions,
).map((transaction) => {
  const dateKey = transaction.dateKey!;
  const journalId = `seed-bank-${transaction.reference}`;
  return {
    id: `seed-${transaction.reference}`,
    batchId: `seed-${transaction.bank.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${dateKey.slice(0, 4)}`,
    bank: transaction.bank,
    reference: transaction.reference,
    description: seededBankDescriptions[transaction.reference] ?? "Customer bank transaction",
    amount: transaction.amount,
    dateKey,
    status: transaction.status === "Matched" ? "Matched" : "Review",
    ...(transaction.status === "Matched" ? { matchedJournalId: journalId } : {}),
  };
});

const seededBankJournalEntries: JournalEntry[] = seededBankStatementLines.map((line) => ({
  id: `seed-bank-${line.reference}`,
  reference: `JE-${line.reference}`,
  dateKey: line.dateKey,
  memo: line.description,
  sourceType: "bank-seed-transaction",
  lines: [
    { accountId: "1000", debit: line.amount, credit: 0 },
    { accountId: "1100", debit: 0, credit: line.amount },
  ],
}));

function distributeMonthly<T extends { debit: number; credit: number; dateKey?: string }>(
  records: T[],
): T[] {
  return records.flatMap((record) =>
    Array.from({ length: new Date().getMonth() + 1 }, (_, month) => {
      const periods = new Date().getMonth() + 1;
      const share = (amount: number) =>
        Math.floor(amount / periods) + (month < amount % periods ? 1 : 0);
      return {
        ...record,
        debit: share(record.debit),
        credit: share(record.credit),
        dateKey: dateKeyForMonth(month),
      };
    }),
  );
}

export const mockDashboardData: DashboardData = {
  ...baseDashboardData,
  invoices: spreadDates(baseDashboardData.invoices).map((invoice) => ({
    ...invoice,
    date: new Date(`${invoice.dateKey}T12:00:00`).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  })),
  ledgerAccounts: distributeMonthly(baseDashboardData.ledgerAccounts),
  journalEntries: seededBankJournalEntries,
  receivables: spreadDates(baseDashboardData.receivables),
  payables: spreadDates(baseDashboardData.payables),
  procurements: spreadDates(baseDashboardData.procurements),
  purchaseOrders: spreadDates(baseDashboardData.purchaseOrders),
  bankTransactions: [],
  bankStatementLines: seededBankStatementLines,
  cashFlow: baseDashboardData.cashFlow.slice(0, new Date().getMonth() + 1).map((period, month) => ({
    ...period,
    dateKey: dateKeyForMonth(month),
  })),
  payroll: spreadDates(baseDashboardData.payroll),
  reports: spreadDates(baseDashboardData.reports),
  auditEvents: spreadDates(baseDashboardData.auditEvents),
};
