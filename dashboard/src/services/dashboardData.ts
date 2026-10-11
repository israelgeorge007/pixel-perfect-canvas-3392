import type { DashboardData, DashboardNav, ReconciliationView } from "../data/mockData";
import { mockDashboardData } from "../data/mockData";
import type { AccountingAccount, BankStatementLine, JournalEntry, JournalLine } from "./accounting";

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
          let profileLinksChanged = false;
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
          if (missingReorderLevels || missingUnitCosts || profileLinksChanged || seedBankDataChanged) saveDashboardData(data);
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
  }));
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
      ...data.purchaseOrders.map(({ supplier, number, amount, status, dateKey }) => ({
        vendor: supplier, invoice: number, category: "Purchase order", date: dateKey ? formatDateKey(dateKey) : "", amount: formatNaira(amount), status,
      })),
    ];
  }

  if (nav === "Reconciliation") {
    if (reconciliationView === "Bank") {
      return [
        ...data.bankTransactions.map(({ bank, reference, amount, status, dateKey }) => ({
          bank, reference, date: dateKey ? formatDateKey(dateKey) : "", amount: formatNaira(amount), status,
        })),
        ...(data.bankStatementLines ?? []).map(({ id, batchId, bank, reference, description, amount, status, dateKey }) => ({
          bank, reference, description, date: formatDateKey(dateKey), amount: formatNaira(amount), status,
          __statementLineId: id, __statementBatchId: batchId ?? "",
        })),
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
    return data.invoices.map(({ vendor, customer, invoice, amount, owner, status, date }) => ({
      customer: customer ?? "",
      vendor,
      invoice,
      date,
      amount: formatNaira(amount),
      owner,
      status,
    }));
  }

  if (nav === "Payroll") {
    return data.payroll.map(({ employee, role, pay, paidAmount, status, dateKey }) => ({
      employee, role, date: dateKey ? formatDateKey(dateKey) : "", pay: formatNaira(pay), outstanding: formatNaira(Math.max(0, pay - (paidAmount ?? 0))), status,
    }));
  }

  if (nav === "Reports") {
    return data.reports.map(({ report, period, owner, status, dateKey }) => ({
      report, period, date: dateKey ? formatDateKey(dateKey) : "", owner, status,
    }));
  }

  return [];
}
