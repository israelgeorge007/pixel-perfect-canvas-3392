import { beforeEach, describe, expect, it } from "vitest";
import {
  aggregateJournalEntries,
  calculateFinancialStatements,
  calculateWeightedAverage,
  findJournalMatches,
  parseBankStatementCsv,
  validateJournalEntry,
  type AccountingAccount,
  type JournalEntry,
} from "./accounting";
import { fetchDashboardData, saveDashboardData } from "./dashboardData";

const accounts: AccountingAccount[] = [
  { id: "cash", code: "1000", name: "Cash", type: "Asset" },
  { id: "ar", code: "1100", name: "Accounts Receivable", type: "Asset" },
  { id: "equity", code: "3000", name: "Opening Balance Equity", type: "Equity" },
  {
    id: "sales",
    code: "4000",
    name: "Sales Revenue",
    type: "Income",
    cashFlowCategory: "operating",
  },
  {
    id: "expense",
    code: "5000",
    name: "Operating Expense",
    type: "Expense",
    cashFlowCategory: "operating",
  },
];

const journal = (overrides: Partial<JournalEntry> = {}): JournalEntry => ({
  id: "j-1",
  reference: "JE-2026-0001",
  dateKey: "2026-01-10",
  memo: "Customer invoice",
  sourceType: "invoice",
  lines: [
    { accountId: "ar", debit: 100.25, credit: 0 },
    { accountId: "sales", debit: 0, credit: 100.25 },
  ],
  ...overrides,
});

describe("journal validation and reporting", () => {
  it("accepts balanced two-decimal entries and rejects unbalanced entries", () => {
    expect(validateJournalEntry(journal(), accounts)).toBeNull();
    expect(
      validateJournalEntry(
        journal({
          lines: [
            { accountId: "ar", debit: 100, credit: 0 },
            { accountId: "sales", debit: 0, credit: 99 },
          ],
        }),
        accounts,
      ),
    ).toContain("must be equal");
  });

  it("rejects unknown accounts, excess precision, and duplicate references", () => {
    expect(
      validateJournalEntry(
        journal({
          lines: [
            { accountId: "missing", debit: 1, credit: 0 },
            { accountId: "sales", debit: 0, credit: 1 },
          ],
        }),
        accounts,
      ),
    ).toContain("known account");
    expect(
      validateJournalEntry(
        journal({
          lines: [
            { accountId: "ar", debit: 1.001, credit: 0 },
            { accountId: "sales", debit: 0, credit: 1.001 },
          ],
        }),
        accounts,
      ),
    ).toContain("two decimal");
    expect(validateJournalEntry(journal(), accounts, [journal()])).toContain("unique");
  });

  it("aggregates by account and computes period income, as-of balances, and direct cash flow", () => {
    const entries = [
      journal(),
      journal({
        id: "j-2",
        reference: "JE-2026-0002",
        dateKey: "2026-02-01",
        memo: "Customer payment",
        sourceType: "payment",
        lines: [
          { accountId: "cash", debit: 100.25, credit: 0 },
          { accountId: "ar", debit: 0, credit: 100.25 },
        ],
      }),
      journal({
        id: "j-3",
        reference: "JE-2026-0003",
        dateKey: "2025-12-31",
        memo: "Prior period balance",
        sourceType: "opening",
        lines: [
          { accountId: "cash", debit: 20, credit: 0 },
          { accountId: "equity", debit: 0, credit: 20 },
        ],
      }),
    ];
    expect(
      aggregateJournalEntries(entries, accounts, "2026-01-01", "2026-01-31").find(
        ({ account }) => account.id === "ar",
      )?.balance,
    ).toBe(100.25);
    const statements = calculateFinancialStatements(entries, accounts, "2026-01-01", "2026-01-31", [
      "cash",
    ]);
    expect(statements.incomeStatement.netIncome).toBe(100.25);
    expect(statements.balanceSheet.totalAssets).toBe(120.25);
    expect(statements.balanceSheet.totalLiabilitiesAndEquity).toBe(120.25);
    expect(statements.cashFlow.operating.net).toBe(0);
  });

  it("calculates weighted-average cost after a receipt", () => {
    expect(calculateWeightedAverage(10, 100, 10, 20)).toEqual({
      quantityOnHand: 20,
      inventoryValue: 300,
      averageUnitCost: 15,
    });
  });

  it("parses mapped CSV rows and suggests exact one-to-one matches", () => {
    const [statementLine] = parseBankStatementCsv(
      'Date,Details,Reference,Amount,Bank\n01/02/2026,"Customer, Inc.",PAY-10,100.25,Access Bank',
      {
        date: "Date",
        description: "Details",
        reference: "Reference",
        amount: "Amount",
        bank: "Bank",
      },
      "",
    );
    const entry = journal({
      id: "payment-1",
      reference: "JE-2026-0010",
      dateKey: "2026-02-02",
      sourceId: "PAY-10",
      sourceType: "payment",
      lines: [
        { accountId: "cash", debit: 100.25, credit: 0 },
        { accountId: "ar", debit: 0, credit: 100.25 },
      ],
    });
    expect(statementLine.dateKey).toBe("2026-02-01");
    expect(statementLine.description).toBe("Customer, Inc.");
    expect(statementLine.bank).toBe("Access Bank");
    expect(findJournalMatches(statementLine, [entry], ["cash"])).toEqual([entry]);
  });
});

describe("dashboard accounting persistence", () => {
  beforeEach(() => localStorage.clear());

  it("migrates existing balances into a balanced prior-year opening journal", async () => {
    const data = await fetchDashboardData();
    expect(data.journalEntries).toHaveLength(1);
    const openingEntry = data.journalEntries![0];
    expect(openingEntry.sourceType).toBe("opening-balance");
    expect(validateJournalEntry(openingEntry, data.accounts ?? [])).toBeNull();
    expect(openingEntry.dateKey).toBe(`${new Date().getFullYear() - 1}-12-31`);
    expect(
      data.receivables.every(({ customerId }) =>
        data.customers?.some(({ id }) => id === customerId),
      ),
    ).toBe(true);
    expect(
      data.payables.every(({ vendorId }) => data.vendors?.some(({ id }) => id === vendorId)),
    ).toBe(true);
    expect(
      data.inventoryItems.every(({ stock, value, unitCost }) => unitCost === value / stock),
    ).toBe(true);
  });

  it("loads saved transaction state instead of reseeding mock data", async () => {
    const data = await fetchDashboardData();
    data.receivables[0].outstanding = 123.45;
    saveDashboardData(data);
    const loaded = await fetchDashboardData();
    expect(loaded.receivables[0].outstanding).toBe(123.45);
  });
});
