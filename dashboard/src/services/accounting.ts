export type AccountType = "Asset" | "Liability" | "Equity" | "Income" | "Expense";
export type CashFlowCategory = "operating" | "investing" | "financing";

export interface AccountingAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  cashFlowCategory?: CashFlowCategory;
}

export interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  reference: string;
  dateKey: string;
  memo: string;
  sourceType: string;
  sourceId?: string;
  lines: JournalLine[];
}

export interface AccountActivity {
  account: AccountingAccount;
  debit: number;
  credit: number;
  balance: number;
}

export interface FinancialStatements {
  incomeStatement: { income: AccountActivity[]; expenses: AccountActivity[]; netIncome: number };
  balanceSheet: {
    assets: AccountActivity[];
    liabilities: AccountActivity[];
    equity: AccountActivity[];
    retainedEarnings: number;
    totalAssets: number;
    totalLiabilitiesAndEquity: number;
  };
  cashFlow: Record<CashFlowCategory, { inflows: number; outflows: number; net: number }>;
}

export interface BankStatementLine {
  id: string;
  bank: string;
  reference: string;
  description: string;
  amount: number;
  dateKey: string;
  status: "Review" | "Matched" | "Flagged";
  matchedJournalId?: string;
}

export interface BankCsvMapping {
  date: string;
  description: string;
  reference: string;
  amount: string;
  bank?: string;
}

const toMinorUnits = (amount: number): number => Math.round(amount * 100);
const fromMinorUnits = (amount: number): number => amount / 100;
const isValidDateKey = (dateKey: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === dateKey;
};

export function validateJournalEntry(
  entry: JournalEntry,
  accounts: AccountingAccount[],
  existingEntries: JournalEntry[] = [],
): string | null {
  if (
    !entry.id.trim() ||
    !entry.reference.trim() ||
    !entry.memo.trim() ||
    !entry.sourceType.trim()
  ) {
    return "A journal needs an ID, reference, description, and source type.";
  }
  if (!isValidDateKey(entry.dateKey)) return "Enter a valid journal date.";
  if (
    existingEntries.some(
      (existing) =>
        existing.id === entry.id ||
        existing.reference.toLowerCase() === entry.reference.toLowerCase(),
    )
  ) {
    return "Journal IDs and references must be unique.";
  }
  if (entry.lines.length < 2) return "A journal entry needs at least two lines.";

  const accountIds = new Set(accounts.map(({ id }) => id));
  let debitTotal = 0;
  let creditTotal = 0;
  for (const line of entry.lines) {
    if (!accountIds.has(line.accountId))
      return "Every journal line must reference a known account.";
    if (
      !Number.isFinite(line.debit) ||
      !Number.isFinite(line.credit) ||
      line.debit < 0 ||
      line.credit < 0 ||
      line.debit > 0 === line.credit > 0
    ) {
      return "Each journal line needs a positive amount on exactly one side.";
    }
    if (
      Math.abs(line.debit * 100 - toMinorUnits(line.debit)) > 1e-7 ||
      Math.abs(line.credit * 100 - toMinorUnits(line.credit)) > 1e-7
    ) {
      return "Journal amounts can have no more than two decimal places.";
    }
    debitTotal += toMinorUnits(line.debit);
    creditTotal += toMinorUnits(line.credit);
  }
  if (debitTotal <= 0 || debitTotal !== creditTotal)
    return "Journal entry debits and credits must be equal and greater than zero.";
  return null;
}

export function aggregateJournalEntries(
  entries: JournalEntry[],
  accounts: AccountingAccount[],
  startDate?: string,
  endDate?: string,
): AccountActivity[] {
  const activity = new Map<string, { debit: number; credit: number }>();
  for (const entry of entries) {
    if ((startDate && entry.dateKey < startDate) || (endDate && entry.dateKey > endDate)) continue;
    for (const line of entry.lines) {
      const totals = activity.get(line.accountId) ?? { debit: 0, credit: 0 };
      totals.debit += toMinorUnits(line.debit);
      totals.credit += toMinorUnits(line.credit);
      activity.set(line.accountId, totals);
    }
  }

  return accounts.map((account) => {
    const totals = activity.get(account.id) ?? { debit: 0, credit: 0 };
    const debit = fromMinorUnits(totals.debit);
    const credit = fromMinorUnits(totals.credit);
    const balanceMinor =
      account.type === "Asset" || account.type === "Expense"
        ? totals.debit - totals.credit
        : totals.credit - totals.debit;
    return { account, debit, credit, balance: fromMinorUnits(balanceMinor) };
  });
}

export function calculateWeightedAverage(
  quantityOnHand: number,
  inventoryValue: number,
  receivedQuantity: number,
  unitCost: number,
): { quantityOnHand: number; inventoryValue: number; averageUnitCost: number } {
  if (
    !Number.isInteger(quantityOnHand) ||
    quantityOnHand < 0 ||
    !Number.isInteger(receivedQuantity) ||
    receivedQuantity <= 0 ||
    !Number.isFinite(inventoryValue) ||
    inventoryValue < 0 ||
    !Number.isFinite(unitCost) ||
    unitCost <= 0
  ) {
    throw new Error("Inventory quantities and costs must be valid positive values.");
  }
  const nextQuantity = quantityOnHand + receivedQuantity;
  const nextValueMinor =
    Math.round(inventoryValue * 100) + Math.round(receivedQuantity * unitCost * 100);
  const nextValue = fromMinorUnits(nextValueMinor);
  return {
    quantityOnHand: nextQuantity,
    inventoryValue: nextValue,
    averageUnitCost: nextValue / nextQuantity,
  };
}

function parseCsvRow(row: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    if (character === '"' && quoted && row[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  if (quoted) throw new Error("A CSV row contains an unclosed quoted field.");
  values.push(value.trim());
  return values;
}

function normalizeBankDate(value: string): string | null {
  if (isValidDateKey(value)) return value;
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const dateKey = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  return isValidDateKey(dateKey) ? dateKey : null;
}

export function parseBankStatementCsv(
  csv: string,
  mapping: BankCsvMapping,
  fallbackBank: string,
): BankStatementLine[] {
  const rows = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((row) => row.trim());
  if (rows.length < 2)
    throw new Error("The CSV must include a header and at least one transaction.");
  const headers = parseCsvRow(rows[0]);
  const indexes = Object.fromEntries(
    Object.entries(mapping).map(([key, header]) => [key, headers.indexOf(header)]),
  );
  if (
    [indexes.date, indexes.description, indexes.reference, indexes.amount].some(
      (index) => index === undefined || index < 0,
    )
  ) {
    throw new Error("Choose valid CSV columns for date, description, reference, and amount.");
  }
  return rows.slice(1).map((row, rowIndex) => {
    const cells = parseCsvRow(row);
    const dateKey = normalizeBankDate(cells[indexes.date]);
    const amountText = cells[indexes.amount].replace(/[₦$\s,]/g, "");
    const amount = Number(amountText);
    const reference = cells[indexes.reference];
    const description = cells[indexes.description];
    if (!dateKey || !Number.isFinite(amount) || amount === 0 || !reference || !description) {
      throw new Error(
        `CSV row ${rowIndex + 2} has a missing or invalid date, reference, description, or non-zero amount.`,
      );
    }
    const bankIndex = indexes.bank;
    const bank =
      bankIndex !== undefined && bankIndex >= 0 ? cells[bankIndex] || fallbackBank : fallbackBank;
    return {
      id: `${dateKey}-${reference}-${Math.round(amount * 100)}`,
      bank,
      reference,
      description,
      amount: Math.round(amount * 100) / 100,
      dateKey,
      status: "Review" as const,
    };
  });
}

export function findJournalMatches(
  statementLine: BankStatementLine,
  entries: JournalEntry[],
  cashAccountIds: string[],
): JournalEntry[] {
  const cashIds = new Set(cashAccountIds);
  return entries.filter((entry) => {
    const cashMovement =
      Math.round(
        entry.lines
          .filter(({ accountId }) => cashIds.has(accountId))
          .reduce((total, line) => total + line.debit - line.credit, 0) * 100,
      ) / 100;
    const dateDistance =
      Math.abs(
        Date.parse(`${entry.dateKey}T00:00:00Z`) - Date.parse(`${statementLine.dateKey}T00:00:00Z`),
      ) / 86_400_000;
    const referenceMatches =
      entry.reference.toLowerCase() === statementLine.reference.toLowerCase() ||
      entry.sourceId?.toLowerCase() === statementLine.reference.toLowerCase();
    return cashMovement === statementLine.amount && (referenceMatches || dateDistance <= 3);
  });
}

export function calculateFinancialStatements(
  entries: JournalEntry[],
  accounts: AccountingAccount[],
  startDate: string,
  endDate: string,
  cashAccountIds: string[],
): FinancialStatements {
  const periodActivity = aggregateJournalEntries(entries, accounts, startDate, endDate);
  const cumulativeActivity = aggregateJournalEntries(entries, accounts, undefined, endDate);
  const byId = new Map(cumulativeActivity.map((activity) => [activity.account.id, activity]));
  const income = periodActivity.filter(({ account }) => account.type === "Income");
  const expenses = periodActivity.filter(({ account }) => account.type === "Expense");
  const incomeTotal = income.reduce((total, row) => total + toMinorUnits(row.balance), 0);
  const expenseTotal = expenses.reduce((total, row) => total + toMinorUnits(row.balance), 0);
  const retainedEarnings = fromMinorUnits(
    cumulativeActivity
      .filter(({ account }) => account.type === "Income" || account.type === "Expense")
      .reduce((total, row) => total + toMinorUnits(row.balance), 0),
  );
  const assets = accounts
    .filter(({ type }) => type === "Asset")
    .map((account) => byId.get(account.id)!)
    .filter(Boolean);
  const liabilities = accounts
    .filter(({ type }) => type === "Liability")
    .map((account) => byId.get(account.id)!)
    .filter(Boolean);
  const equity = accounts
    .filter(({ type }) => type === "Equity")
    .map((account) => byId.get(account.id)!)
    .filter(Boolean);
  const totalAssets = assets.reduce((total, row) => total + toMinorUnits(row.balance), 0);
  const totalLiabilitiesAndEquity =
    liabilities.reduce((total, row) => total + toMinorUnits(row.balance), 0) +
    equity.reduce((total, row) => total + toMinorUnits(row.balance), 0) +
    toMinorUnits(retainedEarnings);
  const cashFlow: FinancialStatements["cashFlow"] = {
    operating: { inflows: 0, outflows: 0, net: 0 },
    investing: { inflows: 0, outflows: 0, net: 0 },
    financing: { inflows: 0, outflows: 0, net: 0 },
  };
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const cashIds = new Set(cashAccountIds);
  for (const entry of entries) {
    if (entry.dateKey < startDate || entry.dateKey > endDate) continue;
    const counterparts = entry.lines.filter(({ accountId }) => !cashIds.has(accountId));
    const category =
      counterparts
        .map(({ accountId }) => accountById.get(accountId)?.cashFlowCategory)
        .find(Boolean) ?? "operating";
    for (const line of entry.lines) {
      if (!cashIds.has(line.accountId)) continue;
      const movement = toMinorUnits(line.debit) - toMinorUnits(line.credit);
      if (movement === 0) continue;
      const flow = cashFlow[category];
      if (movement > 0) flow.inflows += fromMinorUnits(movement);
      else flow.outflows += fromMinorUnits(-movement);
      flow.net += fromMinorUnits(movement);
    }
  }

  return {
    incomeStatement: {
      income,
      expenses,
      netIncome: fromMinorUnits(incomeTotal - expenseTotal),
    },
    balanceSheet: {
      assets,
      liabilities,
      equity,
      retainedEarnings,
      totalAssets: fromMinorUnits(totalAssets),
      totalLiabilitiesAndEquity: fromMinorUnits(totalLiabilitiesAndEquity),
    },
    cashFlow,
  };
}
