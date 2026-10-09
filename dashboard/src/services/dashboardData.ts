import type { DashboardData, DashboardNav, ReconciliationView } from "../data/mockData";
import { mockDashboardData } from "../data/mockData";

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
  return Promise.resolve(structuredClone(mockDashboardData));
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
    cashFlow: inRange(data.cashFlow),
    spendCategories: inRange(data.spendCategories),
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
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
}

export function formatCompactNaira(amount: number): string {
  if (amount >= 1_000_000_000) return `₦${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1)}K`;
  return formatNaira(amount);
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

export function getSpendCategories(data: DashboardData) {
  const totalSpend = data.spendCategories.reduce((total, category) => total + category.amount, 0);
  const totals = data.spendCategories.reduce<Record<string, { amount: number; color: string }>>((result, category) => {
    const current = result[category.name] ?? { amount: 0, color: category.color };
    current.amount += category.amount;
    result[category.name] = current;
    return result;
  }, {});
  return {
    totalSpend,
    categories: Object.entries(totals).map(([name, category]) => ({
      name,
      color: category.color,
      value: totalSpend === 0 ? 0 : Math.round((category.amount / totalSpend) * 100),
    })),
  };
}

export function getCashFlowWaterfall(data: DashboardData): CashFlowStep[] {
  let cumulative = 0;
  const monthlySteps = data.cashFlow.map(({ month, inflow, outflow }) => {
    const net = inflow - outflow;
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
      { account: "Accounts Receivable", code: "1100", type: "Asset", debit: receivables, credit: 0 },
      { account: "Accounts Payable", code: "2000", type: "Liability", debit: 0, credit: payables },
      { account: "Inventory", code: "1500", type: "Asset", debit: getInventoryMetrics(data).inventoryValue, credit: 0 },
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
    return data.receivables.map(({ customer, invoice, amount, due, status, dateKey }) => ({
      customer, invoice, date: dateKey ? formatDateKey(dateKey) : "", amount: formatNaira(amount), due, status,
    }));
  }

  if (nav === "Payables") {
    return [
      ...data.payables.map(({ vendor, invoice, amount, paymentStatus, dateKey }) => ({
        vendor, invoice, category: "Supplier invoice", date: dateKey ? formatDateKey(dateKey) : "", amount: formatNaira(amount), status: paymentStatus,
      })),
      ...data.purchaseOrders.map(({ supplier, number, amount, status, dateKey }) => ({
        vendor: supplier, invoice: number, category: "Purchase order", date: dateKey ? formatDateKey(dateKey) : "", amount: formatNaira(amount), status,
      })),
    ];
  }

  if (nav === "Reconciliation") {
    if (reconciliationView === "Bank") {
      return data.bankTransactions.map(({ bank, reference, amount, status, dateKey }) => ({
        bank, reference, date: dateKey ? formatDateKey(dateKey) : "", amount: formatNaira(amount), status,
      }));
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
    return data.invoices.map(({ vendor, invoice, amount, owner, status, date }) => ({
      vendor, invoice, date, amount: formatNaira(amount), owner, status,
    }));
  }

  if (nav === "Payroll") {
    return data.payroll.map(({ employee, role, pay, status, dateKey }) => ({
      employee, role, date: dateKey ? formatDateKey(dateKey) : "", pay: formatNaira(pay), status,
    }));
  }

  if (nav === "Reports") {
    return data.reports.map(({ report, period, owner, status, dateKey }) => ({
      report, period, date: dateKey ? formatDateKey(dateKey) : "", owner, status,
    }));
  }

  return [];
}
