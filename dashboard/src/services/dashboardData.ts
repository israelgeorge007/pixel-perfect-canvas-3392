import type { DashboardData, DashboardNav, ReconciliationView } from "../data/mockData";
import { mockDashboardData } from "../data/mockData";
import type { AccountingAccount, BankStatementLine, JournalEntry, JournalLine } from "./accounting";
import { initializeInventoryLocationStock, syncInventoryLocationTotals } from "./inventoryStock";

const dashboardStorageKey = "corelogic-dashboard-accounting-v1";

function createOpeningBalances(data: DashboardData): { accounts: AccountingAccount[]; journalEntries: JournalEntry[] } {
  const catalog = [...data.ledgerAccountCatalog];
  for (const account of [
    { account: "Accounts Receivable", code: "1100", type: "Asset" as const },
    { account: "Inventory", code: "1500", type: "Asset" as const },
    { account: "Accounts Payable", code: "2000", type: "Liability" as const },
    { account: "Payroll Deductions Payable", code: "2100", type: "Liability" as const },
    { account: "Wages Payable", code: "2110", type: "Liability" as const },
    { account: "Opening Balance Equity", code: "3000", type: "Equity" as const },
    { account: "Payroll Expense", code: "5100", type: "Expense" as const },
    { account: "Employer Payroll Expense", code: "5110", type: "Expense" as const },
    { account: "Cost of Goods Sold", code: "5000", type: "Expense" as const },
  ]) {
    if (!catalog.some(({ code }) => code === account.code)) catalog.push(account);
  }
  const accounts = catalog.map(({ account, code, type }) => ({
    id: code,
    code,
    name: account,
    type,
    ...(code === "1000" ? { cashFlowCategory: "operating" as const } : {}),
  }));
  const totals = new Map<string, { debit: number; credit: number }>();
  const addLine = (accountId: string, debit: number, credit: number) => {
    const balance = totals.get(accountId) ?? { debit: 0, credit: 0 };
    balance.debit += Math.round(debit * 100);
    balance.credit += Math.round(credit * 100);
    totals.set(accountId, balance);
  };
  for (const row of data.ledgerAccounts) addLine(row.code, row.debit, row.credit);
  const accountCode = (name: string) => accounts.find(({ name: accountName }) => accountName === name)?.id;
  const receivables = data.receivables.reduce((total, row) => total + row.outstanding, 0);
  const payables = data.payables.reduce((total, row) => total + row.amount, 0);
  const inventory = data.inventoryItems.reduce((total, row) => total + row.value, 0);
  if (receivables) addLine(accountCode("Accounts Receivable")!, receivables, 0);
  if (payables) addLine(accountCode("Accounts Payable")!, 0, payables);
  if (inventory) addLine(accountCode("Inventory")!, inventory, 0);

  const lines: JournalLine[] = [];
  for (const [accountId, balance] of totals) {
    const net = balance.debit - balance.credit;
    if (net > 0) lines.push({ accountId, debit: net / 100, credit: 0 });
    if (net < 0) lines.push({ accountId, debit: 0, credit: -net / 100 });
  }
  const difference = lines.reduce((total, line) => total + Math.round((line.debit - line.credit) * 100), 0);
  const openingEquityId = accountCode("Opening Balance Equity")!;
  if (difference > 0) lines.push({ accountId: openingEquityId, debit: 0, credit: difference / 100 });
  if (difference < 0) lines.push({ accountId: openingEquityId, debit: -difference / 100, credit: 0 });
  const year = new Date().getFullYear() - 1;
  return {
    accounts,
    journalEntries: lines.length > 0 ? [{
      id: `opening-balance-${year}`,
      reference: `OB-${year}-0001`,
      dateKey: `${year}-12-31`,
      memo: "Migrated mock balances",
      sourceType: "opening-balance",
      lines,
    }] : [],
  };
}

function journalLedgerRows(entry: JournalEntry, accounts: AccountingAccount[]): DashboardData["ledgerAccounts"] {
  return entry.lines.flatMap((line, index) => {
    const account = accounts.find(({ id }) => id === line.accountId);
    return account ? [{
      account: account.name,
      code: account.code,
      type: account.type,
      debit: line.debit,
      credit: line.credit,
      dateKey: entry.dateKey,
      id: `${entry.id}-${index + 1}`,
      memo: entry.memo,
      reference: entry.reference,
    }] : [];
  });
}

function migrateSeedBankTransactions(data: DashboardData): boolean {
  const seedLines = mockDashboardData.bankStatementLines ?? [];
  const existingLines = data.bankStatementLines ?? [];
  const migratedLines: BankStatementLine[] = data.bankTransactions.flatMap((transaction) => {
    const seedLine = seedLines.find(({ bank, reference }) => bank === transaction.bank && reference === transaction.reference);
    if (!seedLine || existingLines.some(({ id }) => id === seedLine.id)) return [];
    const status = transaction.status === "Matched" || transaction.status === "Flagged" ? transaction.status : "Review";
    return [{
      ...seedLine,
      dateKey: transaction.dateKey ?? seedLine.dateKey,
      status,
      ...(status === "Matched" ? { matchedJournalId: seedLine.matchedJournalId } : { matchedJournalId: undefined }),
    }];
  });
  if (migratedLines.length === 0) return false;

  const seedJournalIds = new Set(migratedLines.map(({ matchedJournalId, reference }) => matchedJournalId ?? `seed-bank-${reference}`));
  const seedJournals = (mockDashboardData.journalEntries ?? []).filter(({ id }) => seedJournalIds.has(id));
  const currentJournalIds = new Set((data.journalEntries ?? []).map(({ id }) => id));
  const addedJournals = seedJournals.filter(({ id }) => !currentJournalIds.has(id));
  data.journalEntries = [...(data.journalEntries ?? []), ...addedJournals];
  data.ledgerAccounts = [
    ...addedJournals.flatMap((entry) => journalLedgerRows(entry, data.accounts ?? [])),
    ...data.ledgerAccounts,
  ];
  data.bankStatementLines = [...migratedLines, ...existingLines];
  const migratedReferences = new Set(migratedLines.map(({ bank, reference }) => `${bank}:${reference}`));
  data.bankTransactions = data.bankTransactions.filter(({ bank, reference }) => !migratedReferences.has(`${bank}:${reference}`));
  return true;
}

function migrateLegacyInvoiceSamples(data: DashboardData): boolean {
  const legacySamples = [
    { invoice: "INV-2048", vendor: "Northstar Labs", amount: 24_850_000, date: "29 Jul 2026", status: "Matched", owner: "Maya Chen", replacement: "AR-3108" },
    { invoice: "INV-2047", vendor: "Atlas Systems", amount: 18_420_000, date: "28 Jul 2026", status: "Pending", owner: "Alex Morgan", replacement: "AR-3107" },
    { invoice: "INV-2046", vendor: "Fieldwork Co.", amount: 9_675_000, date: "27 Jul 2026", status: "Flagged", owner: "Priya Shah", replacement: "AR-3106" },
    { invoice: "INV-2045", vendor: "Brightline", amount: 12_300_000, date: "26 Jul 2026", status: "Matched", owner: "Maya Chen", replacement: "AR-3105" },
    { invoice: "INV-2044", vendor: "PrintFlow Ltd.", amount: 3_250_000, date: "25 Jul 2026", status: "Pending", owner: "Alex Morgan", replacement: "AR-3104" },
    { invoice: "INV-2043", vendor: "Oak & Pine Co.", amount: 8_420_000, date: "24 Jul 2026", status: "Matched", owner: "Priya Shah", replacement: "AR-3103" },
  ];
  let changed = false;
  data.invoices = data.invoices.map((invoice) => {
    const legacy = legacySamples.find((sample) =>
      invoice.id === sample.invoice && invoice.invoice === sample.invoice && invoice.vendor === sample.vendor &&
      invoice.amount === sample.amount && invoice.date === sample.date && invoice.status === sample.status && invoice.owner === sample.owner,
    );
    if (!legacy) return invoice;
    const replacement = mockDashboardData.invoices.find(({ invoice: reference }) => reference === legacy.replacement);
    if (!replacement || data.invoices.some(({ invoice: reference, id }) => reference === legacy.replacement && id !== invoice.id)) return invoice;
    changed = true;
    return {
      ...replacement,
      customerId: data.customers?.find(({ name }) => name === replacement.customer)?.id,
    };
  });
  data.auditEvents = data.auditEvents.map((event) => {
    if (event.action === "Invoice created" && event.detail === "Northstar Labs · INV-2048" && event.user === "Maya Chen") {
      changed = true;
      return { ...event, detail: "Lagos Premium Hotels · AR-3108" };
    }
    if (event.action === "Invoice details recorded" && event.detail === "Customer, amount, and invoice date entered manually" && event.user === "Maya Chen") {
      changed = true;
      return { ...event, detail: "Customer, amount, invoice date, and due date entered manually" };
    }
    if (event.action === "Three-way match passed" && event.detail === "PO + Goods received + Invoice" && event.user === "System") {
      changed = true;
      return { ...event, action: "Receivable created", detail: "AR-3108 · Lagos Premium Hotels", type: "Receivables", status: "Open" };
    }
    if (event.action === "Payment allocation recorded" && event.detail === "₦24,850,000 · Bank reference NRG-9012" && event.user === "Alex Morgan") {
      changed = true;
      return { ...event, action: "Receivable balance carried forward", detail: "AR-3108 · Lagos Premium Hotels", user: "System", type: "Receivables", status: "Open" };
    }
    return event;
  });
  data.activity = data.activity.map((item) => {
    if (item.title === "Invoice created" && item.detail === "Northstar Labs · INV-2048") {
      changed = true;
      return { ...item, detail: "Lagos Premium Hotels · AR-3108" };
    }
    if (item.title === "Three-way match passed" && item.detail === "PO + Goods received + Invoice") {
      changed = true;
      return { ...item, title: "Receivable created", detail: "AR-3108 · Lagos Premium Hotels" };
    }
    return item;
  });
  return changed;
}

function hasAccountingShape(value: unknown): value is DashboardData {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Partial<DashboardData>;
  return Array.isArray(data.ledgerAccounts) && Array.isArray(data.ledgerAccountCatalog) &&
    Array.isArray(data.receivables) && Array.isArray(data.payables) && Array.isArray(data.inventoryItems);
}

export function saveDashboardData(data: DashboardData): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(dashboardStorageKey, JSON.stringify({ version: 1, data }));
}

export interface CashFlowStep {
  month: string;
  base: number;
  increase: number;
  decrease: number;
  net: number;
  cumulative: number;
  total?: boolean;
}

export function fetchDashboardData(): Promise<DashboardData> {
  if (typeof localStorage !== "undefined") {
    try {
      const stored = localStorage.getItem(dashboardStorageKey);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (typeof parsed === "object" && parsed !== null && "version" in parsed && parsed.version === 1 && "data" in parsed && hasAccountingShape(parsed.data)) {
          const data = parsed.data;
          const missingReorderLevels = data.inventoryItems.some((item) => item.reorderLevel === undefined);
          const missingUnitCosts = data.inventoryItems.some((item) => item.unitCost === undefined);
          const missingSellingPrices = data.inventoryItems.some((item) => item.sellingPrice === undefined);
          const missingLocationStock = data.inventoryItems.some((item) => !Array.isArray(item.locationStock));
          const missingApprovalRequests = !Array.isArray(data.approvalRequests);
          if (missingApprovalRequests) data.approvalRequests = [];
          const missingPurchaseOrderLocations = data.purchaseOrders.some((order) => !order.location) || data.approvalRequests.some((request) => request.type === "purchase-order" && !request.payload.location);
          let profileLinksChanged = false;
          let legacyInvoiceWorkflowChanged = false;
          if (Array.isArray(data.auditEvents)) {
            data.auditEvents = data.auditEvents.map((event) => {
              if (event.action === "Invoice uploaded" && event.user === "Maya Chen" && event.detail === "Northstar Labs · INV-2048") {
                legacyInvoiceWorkflowChanged = true;
                return { ...event, action: "Invoice created", type: "Invoice", status: "Created" };
              }
              if (event.action === "OCR extraction complete" && event.user === "Automation" && event.detail === "18 fields extracted and validated") {
                legacyInvoiceWorkflowChanged = true;
                return {
                  ...event,
                  action: "Invoice details recorded",
                  detail: "Customer, amount, and invoice date entered manually",
                  user: "Maya Chen",
                  email: data.profile.email,
                  type: "Invoice",
                };
              }
              return event;
            });
          }
          if (Array.isArray(data.activity)) {
            data.activity = data.activity
              .filter((item) => {
                if (item.title === "OCR extraction complete" && item.detail === "18 fields validated" && String(item.kind) === "ocr") {
                  legacyInvoiceWorkflowChanged = true;
                  return false;
                }
                return true;
              })
              .map((item) => {
                if (item.title === "Invoice uploaded" && item.detail === "Northstar Labs · INV-2048") {
                  legacyInvoiceWorkflowChanged = true;
                  return { ...item, title: "Invoice created" };
                }
                return item;
              });
          }
          if (missingReorderLevels) {
            data.inventoryItems = data.inventoryItems.map((item) => ({
              ...item,
              reorderLevel: item.reorderLevel ?? (item.status === "Low stock" ? 10 : 5),
            }));
          }
          if (missingUnitCosts) {
            data.inventoryItems = data.inventoryItems.map((item) => ({
              ...item,
              unitCost: item.unitCost ?? (item.stock > 0 ? item.value / item.stock : 0),
            }));
          }
          if (missingSellingPrices) {
            data.inventoryItems = data.inventoryItems.map((item) => ({ ...item, sellingPrice: item.sellingPrice ?? 0 }));
          }
          if (missingLocationStock) {
            data.inventoryItems = initializeInventoryLocationStock(data.inventoryItems, data.inventoryLocations, data.inventoryMovements ?? []);
            data.inventoryLocations = syncInventoryLocationTotals(data.inventoryItems, data.inventoryLocations);
          }
          if (missingPurchaseOrderLocations && data.inventoryLocations[0]) {
            const defaultLocation = data.inventoryLocations[0].location;
            data.purchaseOrders = data.purchaseOrders.map((order) => ({ ...order, location: order.location ?? defaultLocation }));
            data.approvalRequests = data.approvalRequests.map((request) => request.type === "purchase-order"
              ? { ...request, payload: { ...request.payload, location: request.payload.location ?? defaultLocation } }
              : request);
          }
          data.customers ??= [...new Set(data.receivables.map(({ customer }) => customer))]
            .map((name, index) => ({ id: `customer-${index + 1}`, name }));
          data.vendors ??= [...new Set(data.payables.map(({ vendor }) => vendor))]
            .map((name, index) => ({ id: `vendor-${index + 1}`, name }));
          for (const source of [...data.purchaseOrders, ...data.procurements]) {
            const existing = data.vendors.find(({ name }) => name.toLowerCase() === source.supplier.toLowerCase());
            if (!existing) data.vendors.push({ id: `vendor-${data.vendors.length + 1}-${source.supplier.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, name: source.supplier, address: source.supplierAddress, contact: source.supplierContact });
            else { existing.address ??= source.supplierAddress; existing.contact ??= source.supplierContact; }
          }
          data.receivables = data.receivables.map((item) => {
            const customerId = item.customerId ?? data.customers!.find(({ name }) => name.toLowerCase() === item.customer.toLowerCase())?.id;
            if (item.customerId !== customerId) profileLinksChanged = true;
            return { ...item, customerId };
          });
          const legacyInvoiceSamplesChanged = migrateLegacyInvoiceSamples(data);
          data.payables = data.payables.map((item) => {
            const vendorId = item.vendorId ?? data.vendors!.find(({ name }) => name.toLowerCase() === item.vendor.toLowerCase())?.id;
            if (item.vendorId !== vendorId) profileLinksChanged = true;
            return { ...item, vendorId };
          });
          if (!data.accounts || !data.journalEntries) {
            const opening = createOpeningBalances(data);
            data.accounts = opening.accounts;
            data.journalEntries = opening.journalEntries;
            saveDashboardData(data);
          }
          const seedBankDataChanged = migrateSeedBankTransactions(data);
          if (missingReorderLevels || missingUnitCosts || missingSellingPrices || missingLocationStock || missingPurchaseOrderLocations || missingApprovalRequests || profileLinksChanged || seedBankDataChanged || legacyInvoiceWorkflowChanged || legacyInvoiceSamplesChanged) saveDashboardData(data);
          return Promise.resolve(data);
        }
      }
    } catch (error) {
      console.error("Could not load saved dashboard accounting data.", error);
    }
  }
  const data = structuredClone(mockDashboardData);
  const opening = createOpeningBalances(data);
  data.ledgerAccountCatalog = [...data.ledgerAccountCatalog, ...opening.accounts
    .filter(({ code }) => !data.ledgerAccountCatalog.some((account) => account.code === code))
    .map(({ name, code, type }) => ({ account: name, code, type }))];
  data.accounts = opening.accounts;
  data.journalEntries = [...(data.journalEntries ?? []), ...opening.journalEntries];
  const seededBankJournals = (data.journalEntries ?? []).filter(({ sourceType }) => sourceType === "bank-seed-transaction");
  data.ledgerAccounts = [
    ...seededBankJournals.flatMap((entry) => journalLedgerRows(entry, data.accounts ?? [])),
    ...data.ledgerAccounts,
  ];
  data.customers = [...new Set(data.receivables.map(({ customer }) => customer))].map((name, index) => ({ id: `customer-${index + 1}`, name }));
  data.vendors = [...new Set(data.payables.map(({ vendor }) => vendor))].map((name, index) => ({ id: `vendor-${index + 1}`, name }));
  data.receivables = data.receivables.map((item) => ({ ...item, customerId: data.customers!.find(({ name }) => name.toLowerCase() === item.customer.toLowerCase())?.id }));
  data.payables = data.payables.map((item) => ({ ...item, vendorId: data.vendors!.find(({ name }) => name.toLowerCase() === item.vendor.toLowerCase())?.id }));
  data.bankStatementLines ??= [];
  data.customerPayments = [];
  data.vendorPayments = [];
  data.inventoryMovements = [];
  data.inventoryItems = data.inventoryItems.map((item) => ({
    ...item,
    reorderLevel: item.reorderLevel ?? (item.status === "Low stock" ? 10 : 5),
    unitCost: item.stock > 0 ? item.value / item.stock : 0,
    sellingPrice: item.sellingPrice ?? 0,
  }));
  data.inventoryItems = initializeInventoryLocationStock(data.inventoryItems, data.inventoryLocations, data.inventoryMovements);
  data.inventoryLocations = syncInventoryLocationTotals(data.inventoryItems, data.inventoryLocations);
  data.purchaseOrders = data.purchaseOrders.map((order) => ({ ...order, location: order.location ?? data.inventoryLocations[0]?.location }));
  data.bankTransactions = [];
  saveDashboardData(data);
  return Promise.resolve(data);
}

export function filterDashboardData(data: DashboardData, startDate: string, endDate: string): DashboardData {
  const inRange = <T extends { dateKey?: string }>(records: T[]) =>
    records.filter((record) => record.dateKey && record.dateKey >= startDate && record.dateKey <= endDate);

  return {
    ...data,
    invoices: inRange(data.invoices),
    ledgerAccounts: inRange(data.ledgerAccounts),
    receivables: inRange(data.receivables),
    payables: inRange(data.payables),
    procurements: inRange(data.procurements),
    purchaseOrders: inRange(data.purchaseOrders),
    bankTransactions: inRange(data.bankTransactions),
    bankStatementLines: (data.bankStatementLines ?? []).filter((line) => line.dateKey >= startDate && line.dateKey <= endDate),
    cashFlow: inRange(data.cashFlow),
    payroll: inRange(data.payroll),
    reports: inRange(data.reports),
    auditEvents: inRange(data.auditEvents),
  };
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCompactNaira(amount: number): string {
  if (amount >= 1_000_000_000) return `₦${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1)}K`;
  return formatNaira(amount);
}

export function cashFlowAmountToNaira(amountInMillions: number): number {
  return amountInMillions * 1_000_000;
}

export function getOverviewMetrics(data: DashboardData) {
  const revenue = data.ledgerAccounts.filter(({ account }) => account === "Sales Revenue").reduce((total, entry) => total + entry.credit, 0);
  const costOfGoodsSold = data.ledgerAccounts.filter(({ account }) => account === "Cost of Goods Sold").reduce((total, entry) => total + entry.debit, 0);

  return {
    grossProfit: revenue - costOfGoodsSold,
    pendingPayables: data.payables.reduce((total, payable) => total + payable.amount, 0),
    outstandingReceivables: data.receivables.reduce((total, receivable) => total + receivable.outstanding, 0),
  };
}

export function getInventoryMetrics(data: DashboardData) {
  const totalStock = data.inventoryLocations.reduce((total, location) => total + location.stock, 0);
  const totalCapacity = data.inventoryLocations.reduce((total, location) => total + location.capacity, 0);

  return {
    openOrders: data.purchaseOrders.filter(({ status }) => status !== "Received").length,
    stockAvailability: totalCapacity === 0 ? 0 : Math.round((totalStock / totalCapacity) * 1000) / 10,
    pendingApprovals: data.procurements.filter(({ status }) => status.toLowerCase().includes("approval")).length,
    inventoryValue: data.inventoryItems.reduce((total, item) => total + item.value, 0),
  };
}

export function getCashFlowWaterfall(data: DashboardData): CashFlowStep[] {
  let cumulative = 0;
  const monthlySteps = data.cashFlow.map(({ month, inflow, outflow }) => {
    const net = cashFlowAmountToNaira(inflow - outflow);
    const end = cumulative + net;
    const step = {
      month,
      base: Math.min(cumulative, end),
      increase: Math.max(net, 0),
      decrease: Math.max(-net, 0),
      net,
      cumulative: end,
    };
    cumulative = end;
    return step;
  });

  return [
    ...monthlySteps,
    {
      month: "Total",
      base: Math.min(0, cumulative),
      increase: Math.max(cumulative, 0),
      decrease: Math.max(-cumulative, 0),
      net: cumulative,
      cumulative,
      total: true,
    },
  ];
}

export function getModuleRecords(data: DashboardData, nav: DashboardNav, reconciliationView: ReconciliationView): Record<string, string>[] {
  if (nav === "Ledger") {
    const receivables = data.receivables.reduce((total, item) => total + item.outstanding, 0);
    const payables = data.payables.reduce((total, item) => total + item.amount, 0);
    const groupedAccounts = data.ledgerAccounts.reduce<Record<string, { account: string; code: string; type: string; debit: number; credit: number }>>((result, entry) => {
      const current = result[entry.account] ?? { account: entry.account, code: entry.code, type: entry.type, debit: 0, credit: 0 };
      current.debit += entry.debit;
      current.credit += entry.credit;
      result[entry.account] = current;
      return result;
    }, {});
    const accounts = [
      ...Object.values(groupedAccounts),
      ...(!groupedAccounts["Accounts Receivable"] ? [{ account: "Accounts Receivable", code: "1100", type: "Asset", debit: receivables, credit: 0 }] : []),
      ...(!groupedAccounts["Accounts Payable"] ? [{ account: "Accounts Payable", code: "2000", type: "Liability", debit: 0, credit: payables }] : []),
      ...(!groupedAccounts.Inventory ? [{ account: "Inventory", code: "1500", type: "Asset", debit: getInventoryMetrics(data).inventoryValue, credit: 0 }] : []),
      ...data.ledgerAccountCatalog
        .filter(({ account }) => !groupedAccounts[account] && !["Accounts Receivable", "Accounts Payable", "Inventory"].includes(account))
        .map(({ account, code, type }) => ({ account, code, type, debit: 0, credit: 0 })),
    ];
    return accounts.map(({ account, code, type, debit, credit }) => ({
      account,
      code,
      type,
      debit: debit ? formatNaira(debit) : "—",
      credit: credit ? formatNaira(credit) : "—",
      balance: formatNaira(Math.abs(debit - credit)),
    }));
  }

  if (nav === "Receivables") {
    return data.receivables.map(({ customer, invoice, amount, outstanding, due, status, dateKey }) => ({
      customer, invoice, date: dateKey ? formatDateKey(dateKey) : "", amount: formatNaira(amount), outstanding: formatNaira(outstanding), due, status,
    }));
  }

  if (nav === "Payables") {
    return [
      ...data.payables.map(({ vendor, invoice, amount, paymentStatus, paidAmount, billType, dateKey }) => ({
        vendor, invoice, category: billType === "inventory" ? "Inventory bill" : "Supplier invoice", date: dateKey ? formatDateKey(dateKey) : "", amount: formatNaira(amount), outstanding: formatNaira(Math.max(0, amount - (paidAmount ?? 0))), status: paymentStatus,
      })),
      ...data.procurements.filter(({ reference, billReference }) => {
        const procurementInvoice = billReference?.trim() || reference?.trim();
        return !data.payables.some(({ invoice }) => invoice.toLowerCase() === procurementInvoice?.toLowerCase());
      }).map(({ reference, billReference, supplier, amount, status, dateKey }) => ({
        vendor: supplier, invoice: billReference || reference || "—", category: "Procurement request", date: dateKey ? formatDateKey(dateKey) : "", amount: formatNaira(amount), outstanding: "—", status,
      })),
      ...data.purchaseOrders.map(({ supplier, number, amount, status, dateKey }) => ({
        vendor: supplier, invoice: number, category: "Purchase order", date: dateKey ? formatDateKey(dateKey) : "", amount: formatNaira(amount), status,
      })),
    ];
  }

  if (nav === "Reconciliation") {
    if (reconciliationView === "Bank") {
      const statementGroups = new Map<string, BankStatementLine[]>();
      for (const line of data.bankStatementLines ?? []) {
        const groupKey = line.batchId ? `batch:${line.batchId}` : `line:${line.id}`;
        statementGroups.set(groupKey, [...(statementGroups.get(groupKey) ?? []), line]);
      }
      const statementRecords = [...statementGroups.values()].map((lines) => {
        const sortedLines = [...lines].sort((left, right) => left.dateKey.localeCompare(right.dateKey));
        const first = sortedLines[0];
        const last = sortedLines[sortedLines.length - 1];
        const isBatch = Boolean(first.batchId);
        const status = lines.every(({ status: lineStatus }) => lineStatus === "Matched")
          ? "Matched"
          : lines.some(({ status: lineStatus }) => lineStatus === "Flagged") ? "Flagged" : "Review";
        return {
          bank: first.bank || "Uploaded statement",
          reference: isBatch ? "Statement upload" : first.reference,
          description: isBatch ? `${lines.length} transactions` : first.description,
          date: first.dateKey === last.dateKey
            ? formatDateKey(first.dateKey)
            : `${formatDateKey(first.dateKey)} – ${formatDateKey(last.dateKey)}`,
          status,
          ...(isBatch ? { __statementBatchId: first.batchId! } : { __statementLineId: first.id }),
        };
      });
      return [
        ...data.bankTransactions.map(({ bank, reference, amount, status, dateKey }) => ({
          bank, reference, description: "Bank transaction", date: dateKey ? formatDateKey(dateKey) : "", status,
        })),
        ...statementRecords,
      ];
    }
    if (reconciliationView === "Receivables") {
      return data.receivables.map(({ customer, invoice, amount, status, dateKey }) => ({
        customer,
        invoice,
        date: dateKey ? formatDateKey(dateKey) : "",
        amount: formatNaira(amount),
        ledgerStatus: status === "Open" ? "Matched" : status === "Overdue" ? "Review" : "Matched",
        collectionStatus: status,
      }));
    }
    return data.payables.map(({ vendor, invoice, amount, ledgerStatus, paymentStatus, dateKey }) => ({
      vendor, invoice, date: dateKey ? formatDateKey(dateKey) : "", amount: formatNaira(amount), ledgerStatus, paymentStatus,
    }));
  }

  if (nav === "Invoice") {
    return data.invoices.map(({ customer, invoice, amount, owner, status, date, dateKey, dueDate }) => ({
      customer: customer ?? "",
      invoice,
      date: dateKey ? formatDateKey(dateKey) : date,
      dueDate: dueDate ? formatDateKey(dueDate) : "",
      amount: formatNaira(amount),
      owner,
      status,
    }));
  }

  if (nav === "Payroll") {
    return data.payroll.map(({ employee, role, pay, paidAmount, status, dateKey }) => {
      const paid = paidAmount ?? (status === "Paid" ? pay : 0);
      return {
        employee, role, date: dateKey ? formatDateKey(dateKey) : "", pay: formatNaira(pay), outstanding: formatNaira(Math.max(0, pay - paid)), status,
      };
    });
  }

  if (nav === "Reports") {
    return data.reports.map(({ report, period, owner, status, dateKey }) => ({
      report, period, date: dateKey ? formatDateKey(dateKey) : "", owner, status,
    }));
  }

  return [];
}
