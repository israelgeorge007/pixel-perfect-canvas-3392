import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateBillReference, generateInvoiceNumber } from "./documentNumbers";
import {
  aggregateJournalEntries,
  calculateFinancialStatements,
  calculateWeightedAverage,
  findJournalMatches,
  getUnmatchedCashJournalEntries,
  parseBankStatementCsv,
  validateJournalEntry,
  type AccountingAccount,
  type JournalEntry,
} from "./accounting";
import { createUniquePartyId, fetchDashboardData, getModuleRecords, saveDashboardData, toDateKey } from "./dashboardData";
import { createCustomerInvoice, getSellableInventoryItems } from "./customerInvoices";
import { receiveInventoryAtLocation } from "./inventoryStock";
import { postApprovedProcurement } from "./procurementPosting";
import { decideApprovalRequest, submitApprovalRequest } from "./approvalWorkflow";
import { getApprovalDocumentType } from "./approvalDocuments";
import { mockDashboardData, type DashboardData } from "../data/mockData";

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

const testApprovalDocument = { id: "approval-document-test", name: "support.pdf", type: "application/pdf" as const, size: 1024 };

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

  it("keeps invoice table columns customer-facing instead of vendor-facing", () => {
    const records = getModuleRecords(mockDashboardData, "Invoice", "Receivables");
    expect(records[0]).toMatchObject({
      customer: "Lagos Premium Hotels",
      invoice: "AR-3108",
      owner: "Maya Chen",
      status: "Pending",
    });
    expect(records[0]).not.toHaveProperty("vendor");
    expect(Object.keys(records[0])).toEqual(expect.arrayContaining(["customer", "invoice", "date", "dueDate", "amount", "owner", "status"]));
  });

  it("shows zero outstanding for payroll records already marked paid", () => {
    const records = getModuleRecords({
      ...mockDashboardData,
      payroll: [{ employee: "Maya Chen", role: "Finance Admin", pay: 1_850_000, status: "Paid" }],
    }, "Payroll", "Payables");
    expect(records[0]).toMatchObject({
      employee: "Maya Chen",
      pay: "₦1,850,000.00",
      outstanding: "₦0.00",
      status: "Paid",
    });
  });

  it("shows newly created procurement requests in Payables without an outstanding balance", () => {
    const data = {
      ...mockDashboardData,
      procurements: [{
        reference: "PR-2026-009",
        billReference: "BILL-2026-009",
        item: "Office supplies",
        supplier: "Northstar Labs",
        amount: 125_000,
        due: "11 Nov",
        status: "Awaiting approval",
        dateKey: "2026-10-12",
        billType: "expense" as const,
      }],
    };
    const records = getModuleRecords(data, "Payables", "Payables");
    expect(records.find(({ category }) => category === "Procurement request")).toMatchObject({
      vendor: "Northstar Labs",
      invoice: "BILL-2026-009",
      amount: "₦125,000.00",
      outstanding: "—",
      status: "Awaiting approval",
    });
  });

  it("posts an approved procurement as a payable exactly once", () => {
    const data = {
      ...mockDashboardData,
      vendors: [{ id: "vendor-northstar", name: "Northstar Labs" }],
      accounts: mockDashboardData.ledgerAccountCatalog.map(({ account, code, type }) => ({ id: code, code, name: account, type })),
    };
    const procurement = {
      reference: "PR-2026-009",
      vendorId: "vendor-northstar",
      billReference: "BILL-2026-0009",
      item: "Office supplies",
      supplier: "Northstar Labs",
      amount: 125_000,
      due: "11 Nov",
      status: "Awaiting approval",
      dateKey: "2026-10-12",
      billType: "expense" as const,
    };
    const result = postApprovedProcurement(data, procurement, "2026-10-12");
    expect(result.data?.payables[0]).toMatchObject({
      vendor: "Northstar Labs",
      invoice: "BILL-2026-0009",
      amount: 125_000,
      paymentStatus: "Pending",
      billType: "expense",
    });
    expect(result.data?.journalEntries?.[0].lines.reduce((balance, line) => balance + line.debit - line.credit, 0)).toBe(0);
    expect(result.data?.journalEntries?.[0]).toMatchObject({
      partyId: "vendor-northstar",
      sourceCodes: ["PR-2026-009", "BILL-2026-0009"],
    });
    const payableRows = getModuleRecords({ ...result.data!, procurements: [procurement] }, "Payables", "Payables");
    expect(payableRows.some(({ category, invoice }) => category === "Procurement request" && invoice === "BILL-2026-0009")).toBe(false);
    expect(payableRows).toContainEqual(expect.objectContaining({ category: "Supplier invoice", invoice: "BILL-2026-0009", outstanding: "₦125,000.00" }));
    const repeated = postApprovedProcurement(result.data!, procurement, "2026-10-12");
    expect(repeated.alreadyPosted).toBe(true);
    expect(repeated.data?.payables).toHaveLength(result.data!.payables.length);
    expect(repeated.data?.journalEntries).toHaveLength(result.data!.journalEntries?.length ?? 0);
  });

  it("keeps procurement, purchase orders, and customer invoices pending until admin approval", () => {
    const data = {
      ...structuredClone(mockDashboardData),
      accounts: mockDashboardData.ledgerAccountCatalog.map(({ account, code, type }) => ({ id: code, code, name: account, type })),
      customers: [{ id: "customer-approval-test", name: "Lagos Premium Hotels" }],
      approvalRequests: [],
    };
    const initialPayables = data.payables.length;
    const initialPurchaseOrders = data.purchaseOrders.length;
    const initialInvoices = data.invoices.length;
    const initialReceivables = data.receivables.length;
    const initialJournalEntries = data.journalEntries?.length ?? 0;
    const submissions = [
      {
        type: "procurement" as const,
        payload: { reference: "PR-2026-901", item: "Office supplies", supplier: "Northstar Labs", amount: 125_000, due: "11 Nov", status: "Awaiting approval", dateKey: "2026-10-12", billReference: "BILL-2026-0901", billType: "expense" as const, document: testApprovalDocument },
      },
      {
        type: "purchase-order" as const,
        payload: { number: "PO-2026-185", supplier: "Atlas Systems", item: "Network equipment", items: 1, lines: [{ item: "Network Equipment", sku: "NET-032", quantity: 2, unitPrice: 75_000 }], quantity: 2, amount: 150_000, location: "Lagos", document: testApprovalDocument },
      },
      {
        type: "customer-invoice" as const,
        payload: { customerId: "customer-approval-test", invoice: "AR-APPROVAL-01", amount: 50_000, items: [{ description: "Implementation services", quantity: 1, unitPrice: 50_000 }], invoiceDate: "2026-10-12", dueDate: "2026-11-11" },
      },
    ];
    let queued: DashboardData = data;
    const requestIds: string[] = [];
    for (const submission of submissions) {
      const result = submitApprovalRequest(queued, submission, "Maya Chen", "maya@example.com", "2026-10-12T10:00:00.000Z");
      expect(result.error).toBeUndefined();
      queued = result.data!;
      requestIds.push(queued.approvalRequests[0].id);
    }

    expect(queued.approvalRequests.map(({ status }) => status)).toEqual(["Pending", "Pending", "Pending"]);
    expect(queued.approvalRequests.filter(({ type }) => type !== "customer-invoice").every((request) =>
      "document" in request.payload && request.payload.document?.id === testApprovalDocument.id)).toBe(true);
    expect(queued.payables).toHaveLength(initialPayables);
    expect(queued.purchaseOrders).toHaveLength(initialPurchaseOrders);
    expect(queued.invoices).toHaveLength(initialInvoices);
    expect(queued.receivables).toHaveLength(initialReceivables);
    expect(queued.journalEntries).toHaveLength(initialJournalEntries);

    let approved: DashboardData = queued;
    const resultingReferences: string[] = [];
    for (const requestId of requestIds) {
      const result = decideApprovalRequest(approved, requestId, "Approved", "Maya Chen", "maya@example.com", "2026-10-12T11:00:00.000Z");
      expect(result.error).toBeUndefined();
      approved = result.data!;
      resultingReferences.push(approved.approvalRequests.find(({ id }) => id === requestId)!.resultingReference!);
    }

    expect(approved.payables.some(({ invoice }) => invoice === "BILL-2026-0901")).toBe(true);
    expect(approved.purchaseOrders.some(({ number, status }) => number === resultingReferences[1] && status === "Approved")).toBe(true);
    expect(resultingReferences[1]).toBe("PO-2026-185");
    expect(approved.invoices.some(({ invoice }) => invoice === "AR-APPROVAL-01")).toBe(true);
    expect(approved.receivables.some(({ invoice, status }) => invoice === "AR-APPROVAL-01" && status === "Open")).toBe(true);
    expect(approved.journalEntries).toHaveLength(initialJournalEntries + 2);
    expect(approved.approvalRequests.every(({ status }) => status === "Approved")).toBe(true);
    expect(decideApprovalRequest(approved, requestIds[0], "Approved", "Maya Chen", undefined, "2026-10-12T12:00:00.000Z").error).toContain("already been decided");
  });

  it("retains rejected requests without posting and permits a revised resubmission", () => {
    const data = {
      ...structuredClone(mockDashboardData),
      approvalRequests: [],
    };
    const submission = {
      type: "procurement" as const,
      payload: { reference: "PR-2026-902", item: "Replacement parts", supplier: "Atlas Systems", amount: 8_000, due: "18 Nov", status: "Awaiting approval", billReference: "BILL-2026-0902", billType: "expense" as const, document: testApprovalDocument },
    };
    const queued = submitApprovalRequest(data, submission, "Maya Chen", undefined, "2026-10-12T10:00:00.000Z").data!;
    const requestId = queued.approvalRequests[0].id;
    expect(decideApprovalRequest(queued, requestId, "Rejected", "Maya Chen", undefined, "2026-10-12T11:00:00.000Z").error).toContain("reason");
    const rejected = decideApprovalRequest(queued, requestId, "Rejected", "Maya Chen", undefined, "2026-10-12T11:00:00.000Z", "Please revise the delivery date.").data!;
    expect(rejected.approvalRequests[0]).toMatchObject({ status: "Rejected", rejectionReason: "Please revise the delivery date." });
    expect(rejected.payables).toHaveLength(data.payables.length);
    expect(rejected.journalEntries).toEqual(data.journalEntries);
    const revisedSubmission = { ...submission, payload: { ...submission.payload, amount: 8_500, due: "20 Nov" } };
    const resubmitted = submitApprovalRequest(rejected, revisedSubmission, "Maya Chen", undefined, "2026-10-12T12:00:00.000Z", requestId);
    expect(resubmitted.data?.approvalRequests).toHaveLength(2);
    expect(resubmitted.data?.approvalRequests[0]).toMatchObject({ status: "Pending", revisionOf: requestId, payload: { amount: 8_500, due: "20 Nov" } });
    expect(resubmitted.data?.approvalRequests[1]).toMatchObject({ id: requestId, status: "Rejected" });
  });

  it("requires an attached document on procurement and purchase-order approval submissions", () => {
    const data = { ...structuredClone(mockDashboardData), approvalRequests: [] };
    const procurementResult = submitApprovalRequest(data, {
      type: "procurement",
      payload: { reference: "PR-2026-903", item: "Replacement parts", supplier: "Atlas Systems", amount: 8_000, due: "18 Nov", status: "Awaiting approval", billReference: "BILL-2026-0903", billType: "expense", document: undefined as never },
    }, "Maya Chen", undefined, "2026-10-12T10:00:00.000Z");
    const purchaseOrderResult = submitApprovalRequest(data, {
      type: "purchase-order",
      payload: { number: "PO-2026-185", supplier: "Atlas Systems", item: "Network equipment", items: 1, lines: [{ item: "Network Equipment", sku: "NET-032", quantity: 2, unitPrice: 75_000 }], quantity: 2, amount: 150_000, location: "Lagos", document: undefined as never },
    }, "Maya Chen", undefined, "2026-10-12T10:00:00.000Z");
    expect(procurementResult.error).toContain("Attach a JPEG or PDF document");
    expect(purchaseOrderResult.error).toContain("Attach a JPEG or PDF document");
  });

  it("rejects a purchase order number that is already in use", () => {
    const data = { ...structuredClone(mockDashboardData), approvalRequests: [] };
    const result = submitApprovalRequest(data, {
      type: "purchase-order",
      payload: {
        number: data.purchaseOrders[0].number,
        supplier: "Atlas Systems",
        item: "Network equipment",
        items: 1,
        lines: [{ item: "Network Equipment", sku: "NET-032", quantity: 2, unitPrice: 75_000 }],
        quantity: 2,
        amount: 150_000,
        location: "Lagos",
        document: testApprovalDocument,
      },
    }, "Maya Chen", undefined, "2026-10-12T10:00:00.000Z");
    expect(result.error).toContain("purchase order number is already in use");
  });

  it("accepts matching JPEG and PDF file types only", () => {
    expect(getApprovalDocumentType({ name: "quote.pdf", type: "application/pdf" } as File)).toBe("application/pdf");
    expect(getApprovalDocumentType({ name: "quote.jpg", type: "image/jpeg" } as File)).toBe("image/jpeg");
    expect(getApprovalDocumentType({ name: "quote.png", type: "image/png" } as File)).toBeNull();
    expect(getApprovalDocumentType({ name: "quote.pdf", type: "image/jpeg" } as File)).toBeNull();
  });

  it("rejects duplicate references already pending approval", () => {
    const data = {
      ...structuredClone(mockDashboardData),
      accounts: mockDashboardData.ledgerAccountCatalog.map(({ account, code, type }) => ({ id: code, code, name: account, type })),
      customers: [{ id: "customer-1", name: "Lagos Premium Hotels" }],
      approvalRequests: [],
    };
    const submission = {
      type: "customer-invoice" as const,
      payload: { customerId: "customer-1", invoice: "AR-PENDING-01", amount: 1_000, items: [{ description: "Monthly support", quantity: 1, unitPrice: 1_000 }], invoiceDate: "2026-10-12", dueDate: "2026-11-12" },
    };
    const queued = submitApprovalRequest(data, submission, "Maya Chen", undefined, "2026-10-12T10:00:00.000Z").data!;
    expect(submitApprovalRequest(queued, submission, "Maya Chen", undefined, "2026-10-12T10:01:00.000Z").error).toContain("already in use");
  });

  it("generates a supplier bill reference in the expected format", () => {
    expect(generateBillReference(["BILL-2026-0002", "BILL-2026-0005"])).toBe("BILL-2026-0006");
    expect(generateBillReference()).toMatch(/^BILL-\d{4}-\d{4}$/);
  });

  it("generates a unique invoice number for the current year", () => {
    const year = new Date().getFullYear();
    expect(generateInvoiceNumber([`INV-${year}-0001`, `inv-${year}-0003`, "AR-3108"])).toBe(`INV-${year}-0004`);
    expect(generateInvoiceNumber()).toBe(`INV-${year}-0001`);
  });

  it("parses mapped CSV rows and suggests exact one-to-one matches", () => {
    const [statementLine] = parseBankStatementCsv(
      'Date,Details,Reference,ID,Codes,Amount,Bank\n01/02/2026,"Customer, Inc.",PAY-10,customer-1,PAY-10,100.25,Access Bank',
      {
        date: "Date",
        description: "Details",
        reference: "Reference",
        partyId: "ID",
        codes: "Codes",
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
      partyId: "customer-1",
      sourceType: "payment",
      lines: [
        { accountId: "cash", debit: 100.25, credit: 0 },
        { accountId: "ar", debit: 0, credit: 100.25 },
      ],
    });
    expect(statementLine.dateKey).toBe("2026-02-01");
    expect(statementLine.description).toBe("Customer, Inc.");
    expect(statementLine.partyId).toBe("customer-1");
    expect(statementLine.codes).toEqual(["PAY-10"]);
    expect(statementLine.bank).toBe("Access Bank");
    expect(findJournalMatches(statementLine, [entry], ["cash"])).toEqual([entry]);
  });

  it("requires both the party ID and a document code for identifier-based matching", () => {
    const [statementLine] = parseBankStatementCsv(
      "Date,Details,Reference,ID,Codes,Amount\n01/02/2026,Vendor payment,BANK-1,vendor-1,PO-2026-001,100.25",
      { date: "Date", description: "Details", reference: "Reference", partyId: "ID", codes: "Codes", amount: "Amount" },
      "",
    );
    const matchingEntry = journal({ sourceId: "BILL-1", sourceCodes: ["PO-2026-001"], partyId: "vendor-1", lines: [
      { accountId: "cash", debit: 100.25, credit: 0 },
      { accountId: "ar", debit: 0, credit: 100.25 },
    ] });
    const wrongParty = { ...matchingEntry, id: "wrong-party", partyId: "vendor-2" };
    const wrongCode = { ...matchingEntry, id: "wrong-code", sourceCodes: ["PO-2026-002"] };

    expect(findJournalMatches(statementLine, [matchingEntry, wrongParty, wrongCode], ["cash"])).toEqual([matchingEntry]);
  });

  it("rejects statement rows without an ID or document code", () => {
    expect(() => parseBankStatementCsv(
      "Date,Details,Reference,ID,Codes,Amount\n01/02/2026,Vendor payment,BANK-1,,BILL-1,100.25",
      { date: "Date", description: "Details", reference: "Reference", partyId: "ID", codes: "Codes", amount: "Amount" },
      "",
    )).toThrow(/ID, codes/);
  });

  it("parses Moniepoint timestamps and debit/credit columns", () => {
    const lines = parseBankStatementCsv(
      "Date,Narration,Reference,ID,Codes,Debit,Credit,Balance\n" +
        "06/11/2025 5:36:16,PSST transfer,MON-1,vendor-1,BILL-1,0.00,24525.00,25510.00\n" +
        "06/11/2025 5:36:16,Transfer levy,MON-2,vendor-1,BILL-2,50.00,0.00,25460.00",
      {
        date: "Date",
        description: "Narration",
        reference: "Reference",
        partyId: "ID",
        codes: "Codes",
        debit: "Debit",
        credit: "Credit",
      },
      "Moniepoint",
    );

    expect(lines.map(({ dateKey, amount }) => ({ dateKey, amount }))).toEqual([
      { dateKey: "2025-11-06", amount: 24525 },
      { dateKey: "2025-11-06", amount: -50 },
    ]);
  });

  it("keeps upload identity separate from deterministic transaction IDs", () => {
    const csv = "Date,Details,Reference,ID,Codes,Amount\n01/02/2026,Customer payment,PAY-10,customer-1,PAY-10,100.25";
    const mapping = { date: "Date", description: "Details", reference: "Reference", partyId: "ID", codes: "Codes", amount: "Amount" };
    const firstBatch = parseBankStatementCsv(csv, mapping, "Access Bank", "batch-1")[0];
    const secondBatch = parseBankStatementCsv(csv, mapping, "Access Bank", "batch-2")[0];

    expect(firstBatch.id).toBe(secondBatch.id);
    expect(firstBatch.batchId).toBe("batch-1");
    expect(secondBatch.batchId).toBe("batch-2");
  });

  it("offers only unmatched journal entries that move cash", () => {
    const available = journal({
      id: "available",
      reference: "JE-AVAILABLE",
      lines: [
        { accountId: "cash", debit: 100.25, credit: 0 },
        { accountId: "ar", debit: 0, credit: 100.25 },
      ],
    });
    const alreadyMatched = journal({
      id: "already-matched",
      reference: "JE-MATCHED",
      lines: [
        { accountId: "cash", debit: 50, credit: 0 },
        { accountId: "ar", debit: 0, credit: 50 },
      ],
    });
    const openingBalance = journal({
      id: "opening-balance",
      reference: "OB-2025-0001",
      sourceType: "opening-balance",
      lines: [
        { accountId: "cash", debit: 1_000_000, credit: 0 },
        { accountId: "equity", debit: 0, credit: 1_000_000 },
      ],
    });

    expect(getUnmatchedCashJournalEntries([available, alreadyMatched, openingBalance, journal()], ["cash"], ["already-matched"]))
      .toEqual([{ entry: available, cashMovement: 100.25 }]);
  });

  it("groups imported bank statement lines into one reconciliation record", () => {
    const data = structuredClone(mockDashboardData);
    data.bankStatementLines = [{
      id: "line-1",
      batchId: "batch-1",
      bank: "Access Bank",
      reference: "PAY-10",
      description: "Customer payment",
      amount: 100.25,
      dateKey: "2026-02-01",
      status: "Review",
    }, {
      id: "line-2",
      batchId: "batch-1",
      bank: "Access Bank",
      reference: "PAY-11",
      description: "Second customer payment",
      amount: -25,
      dateKey: "2026-02-02",
      status: "Matched",
    }];

    const records = getModuleRecords(data, "Reconciliation", "Bank");
    const record = records.find(({ __statementBatchId }) => __statementBatchId === "batch-1");

    expect(records.filter(({ __statementBatchId }) => __statementBatchId === "batch-1")).toHaveLength(1);
    expect(record?.reference).toBe("Statement upload");
    expect(record?.description).toBe("2 transactions");
    expect(record?.date).toBe("01 Feb 2026 – 02 Feb 2026");
    expect(record).not.toHaveProperty("amount");
    expect(record?.__statementBatchId).toBe("batch-1");
  });
});

describe("dashboard accounting persistence", () => {
  beforeEach(() => localStorage.clear());

  it("migrates existing balances into a balanced prior-year opening journal", async () => {
    const data = await fetchDashboardData();
    expect(data.journalEntries).toHaveLength(7);
    const openingEntry = data.journalEntries!.find(({ sourceType }) => sourceType === "opening-balance")!;
    expect(openingEntry.sourceType).toBe("opening-balance");
    expect(validateJournalEntry(openingEntry, data.accounts ?? [])).toBeNull();
    expect(openingEntry.dateKey).toBe(`${new Date().getFullYear() - 1}-12-31`);
    expect(data.bankStatementLines).toHaveLength(6);
    expect(data.bankStatementLines?.filter(({ status, matchedJournalId }) => status === "Matched" && matchedJournalId)).toHaveLength(4);
    expect(data.bankStatementLines?.every(({ matchedJournalId }) =>
      !matchedJournalId || data.journalEntries?.some(({ id }) => id === matchedJournalId),
    )).toBe(true);
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
    expect(data.inventoryItems.every(({ stock, locationStock }) =>
      locationStock?.reduce((total, entry) => total + entry.quantity, 0) === stock,
    )).toBe(true);
    expect(data.inventoryLocations.every(({ location, stock }) =>
      data.inventoryItems.reduce((total, item) => total + (item.locationStock?.find((entry) => entry.location === location)?.quantity ?? 0), 0) === stock,
    )).toBe(true);
  });

  it("loads saved transaction state instead of reseeding mock data", async () => {
    const data = await fetchDashboardData();
    data.receivables[0].outstanding = 123.45;
    saveDashboardData(data);
    const loaded = await fetchDashboardData();
    expect(loaded.receivables[0].outstanding).toBe(123.45);
  });

  it("repairs duplicate party IDs and backfills journal party IDs from document references", async () => {
    const data = await fetchDashboardData();
    const customer = data.customers![0];
    const vendor = data.vendors![0];
    const secondCustomer = data.customers![1];
    data.customers![1].id = customer.id;
    data.vendors![1].id = vendor.id;
    const receivable = data.receivables[0];
    const secondReceivable = data.receivables[1];
    const payable = data.payables[0];
    const oldPartyId = customer.id;
    data.bankStatementLines = [...(data.bankStatementLines ?? []), {
      id: "legacy-party-id-row",
      bank: "Test Bank",
      reference: "BANK-LEGACY-1",
      description: "Customer receipt",
      partyId: oldPartyId,
      codes: [secondReceivable.invoice],
      amount: 100,
      dateKey: "2026-10-15",
      status: "Review",
    }];
    data.journalEntries = [
      journal({ id: "legacy-customer-payment", reference: "JE-LEGACY-CUSTOMER", sourceType: "customer-payment", sourceId: receivable.invoice }),
      journal({ id: "legacy-vendor-payment", reference: "JE-LEGACY-VENDOR", sourceType: "vendor-payment", sourceId: payable.invoice }),
      ...(data.journalEntries ?? []),
    ];
    saveDashboardData(data);

    const loaded = await fetchDashboardData();
    const customerIds = loaded.customers!.map(({ id }) => id);
    const vendorIds = loaded.vendors!.map(({ id }) => id);
    expect(new Set(customerIds).size).toBe(customerIds.length);
    expect(new Set(vendorIds).size).toBe(vendorIds.length);
    expect(new Set([...customerIds, ...vendorIds]).size).toBe(customerIds.length + vendorIds.length);
    expect([...customerIds, ...vendorIds].every((id) => /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{7}$/.test(id))).toBe(true);
    expect(loaded.bankStatementLines?.find(({ id }) => id === "legacy-party-id-row")?.partyId)
      .toBe(loaded.customers?.find(({ name }) => name === secondCustomer.name)?.id);
    expect(loaded.journalEntries?.find(({ id }) => id === "legacy-customer-payment")?.partyId)
      .toBe(loaded.receivables.find(({ invoice }) => invoice === receivable.invoice)?.customerId);
    expect(loaded.journalEntries?.find(({ id }) => id === "legacy-vendor-payment")?.partyId)
      .toBe(loaded.payables.find(({ invoice }) => invoice === payable.invoice)?.vendorId);
  });

  it("generates unique seven-character mixed party IDs", () => {
    const existingIds = ["A1ABCDE"];
    const firstId = createUniquePartyId(existingIds);
    const secondId = createUniquePartyId([...existingIds, firstId]);

    expect(firstId).toMatch(/^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{7}$/);
    expect(secondId).toMatch(/^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{7}$/);
    expect(new Set([...existingIds, firstId, secondId]).size).toBe(3);
  });

  it("migrates existing inventory without assuming a selling price", async () => {
    const data = await fetchDashboardData();
    delete data.inventoryItems[0].sellingPrice;
    saveDashboardData(data);

    const loaded = await fetchDashboardData();
    expect(loaded.inventoryItems[0].sellingPrice).toBe(0);
  });

  it("migrates legacy inventory and purchase orders to location-aware stock", async () => {
    const data = await fetchDashboardData();
    data.inventoryItems.forEach((item) => { delete item.locationStock; });
    delete data.purchaseOrders[0].location;
    saveDashboardData(data);

    const loaded = await fetchDashboardData();
    expect(loaded.inventoryItems.every(({ stock, locationStock }) =>
      locationStock?.reduce((total, entry) => total + entry.quantity, 0) === stock,
    )).toBe(true);
    expect(loaded.purchaseOrders[0].location).toBe(loaded.inventoryLocations[0].location);
  });

  it("adds an empty approval queue when loading older saved dashboard data", async () => {
    const data = await fetchDashboardData();
    data.receivables[0].outstanding = 123.45;
    delete (data as Partial<typeof data>).approvalRequests;
    saveDashboardData(data);

    const loaded = await fetchDashboardData();
    expect(loaded.approvalRequests).toEqual([]);
    expect(loaded.receivables[0].outstanding).toBe(123.45);
  });

  it("migrates previously saved sample bank rows into statement batches", async () => {
    const data = await fetchDashboardData();
    const seededLines = data.bankStatementLines ?? [];
    data.bankStatementLines = [];
    data.bankTransactions = seededLines.map(({ bank, reference, amount, status, dateKey }) => ({ bank, reference, amount, status, dateKey }));
    data.journalEntries = (data.journalEntries ?? []).filter(({ sourceType }) => sourceType !== "bank-seed-transaction");
    saveDashboardData(data);

    const migrated = await fetchDashboardData();
    expect(migrated.bankTransactions).toHaveLength(0);
    expect(migrated.bankStatementLines).toHaveLength(6);
    expect(migrated.bankStatementLines?.every(({ batchId }) => batchId?.startsWith("seed-") === true)).toBe(true);
    expect(migrated.journalEntries?.filter(({ sourceType }) => sourceType === "bank-seed-transaction")).toHaveLength(6);
  });

  it("migrates only untouched legacy invoice samples without posting or changing user rows", async () => {
    const data = await fetchDashboardData();
    data.invoices[0] = {
      id: "INV-2048",
      vendor: "Northstar Labs",
      invoice: "INV-2048",
      date: "29 Jul 2026",
      amount: 24_850_000,
      status: "Matched",
      owner: "Maya Chen",
    };
    const userInvoice = {
      id: "USER-1001",
      vendor: "",
      customer: "Custom Customer",
      invoice: "USER-1001",
      date: "12 Oct 2026",
      dateKey: "2026-10-12",
      amount: 99,
      status: "Pending" as const,
      owner: data.profile.name,
    };
    data.invoices.push(userInvoice);
    data.auditEvents = data.auditEvents.map((event) => event.action === "Invoice created"
      ? { ...event, detail: "Northstar Labs · INV-2048", user: "Maya Chen" }
      : event.action === "Receivable created"
        ? { ...event, action: "Three-way match passed", detail: "PO + Goods received + Invoice", type: "Match", status: "Matched" }
        : event);
    data.activity = data.activity.map((item) => item.title === "Invoice created"
      ? { ...item, detail: "Northstar Labs · INV-2048" }
      : item.title === "Receivable created"
        ? { ...item, title: "Three-way match passed", detail: "PO + Goods received + Invoice" }
        : item);
    const journalCount = data.journalEntries?.length ?? 0;
    const ledgerRowCount = data.ledgerAccounts.length;
    const receivableCount = data.receivables.length;
    saveDashboardData(data);

    const migrated = await fetchDashboardData();

    expect(migrated.invoices.find(({ invoice }) => invoice === "AR-3108")).toMatchObject({
      customer: "Lagos Premium Hotels",
      amount: 42_800_000,
      status: "Pending",
      dueDate: "2026-08-31",
    });
    expect(migrated.invoices.find(({ invoice }) => invoice === userInvoice.invoice)).toMatchObject(userInvoice);
    expect(migrated.auditEvents.find(({ action }) => action === "Receivable created")?.detail).toBe("AR-3108 · Lagos Premium Hotels");
    expect(migrated.activity.find(({ title }) => title === "Receivable created")?.detail).toBe("AR-3108 · Lagos Premium Hotels");
    expect(migrated.auditEvents.find(({ action }) => action === "Invoice created")?.detail).toBe("Lagos Premium Hotels · AR-3108");
    expect(migrated.activity.find(({ title }) => title === "Invoice created")?.detail).toBe("Lagos Premium Hotels · AR-3108");
    expect(migrated.journalEntries).toHaveLength(journalCount);
    expect(migrated.ledgerAccounts).toHaveLength(ledgerRowCount);
    expect(migrated.receivables).toHaveLength(receivableCount);
  });
});

describe("customer invoice posting", () => {
  beforeEach(() => localStorage.clear());

  it("receives purchased quantities into the selected location only", async () => {
    const data = await fetchDashboardData();
    const item = data.inventoryItems[0];
    const [destination, otherLocation] = data.inventoryLocations;
    const destinationQuantity = item.locationStock?.find(({ location }) => location === destination.location)?.quantity ?? 0;
    const otherQuantity = item.locationStock?.find(({ location }) => location === otherLocation.location)?.quantity ?? 0;
    const received = receiveInventoryAtLocation(data.inventoryItems, data.inventoryLocations, [{ sku: item.sku, quantity: 2, unitPrice: 1_000 }], destination.location);

    expect(received.error).toBeUndefined();
    const updated = received.inventoryItems!.find(({ sku }) => sku === item.sku)!;
    expect(updated.stock).toBe(item.stock + 2);
    expect(updated.locationStock?.find(({ location }) => location === destination.location)?.quantity).toBe(destinationQuantity + 2);
    expect(updated.locationStock?.find(({ location }) => location === otherLocation.location)?.quantity).toBe(otherQuantity);
    expect(received.inventoryLocations?.find(({ location }) => location === destination.location)?.stock).toBe(destination.stock + 2);
    expect(updated.unitCost).toBeCloseTo((item.value + 2_000) / (item.stock + 2));
  });

  it("rejects a receipt that exceeds the selected location capacity", async () => {
    const data = await fetchDashboardData();
    const destination = data.inventoryLocations[0];
    const result = receiveInventoryAtLocation(data.inventoryItems, [{ ...destination, capacity: destination.stock }], [{ sku: data.inventoryItems[0].sku, quantity: 1, unitPrice: 1_000 }], destination.location);

    expect(result.error).toContain("capacity");
    expect(result.inventoryItems).toBeUndefined();
  });

  it("omits out-of-stock items from the invoice inventory picker", async () => {
    const data = await fetchDashboardData();
    const outOfStockSku = data.inventoryItems[0].sku;
    const inventoryItems = data.inventoryItems.map((item, index) => index === 0 ? { ...item, stock: 0 } : item);

    expect(getSellableInventoryItems(inventoryItems).some(({ sku }) => sku === outOfStockSku)).toBe(false);
    expect(getSellableInventoryItems(inventoryItems).every(({ stock }) => stock >= 1)).toBe(true);
  });

  const createDraft = (data: Awaited<ReturnType<typeof fetchDashboardData>>, overrides: Record<string, unknown> = {}) => {
    const invoiceDate = toDateKey(new Date());
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    return {
      customerId: data.customers?.[0]?.id ?? "",
      invoice: "TEST-INV-9001",
      amount: 125.5,
      items: [{ description: "Monthly accounting support", quantity: 1, unitPrice: 125.5 }],
      invoiceDate,
      dueDate: toDateKey(dueDate),
      ...overrides,
    };
  };

  it("posts a balanced journal and links the invoice and receivable", async () => {
    const data = await fetchDashboardData();
    const draft = createDraft(data);
    const companyDetails = {
      name: "IntentRun Services",
      logoDataUrl: "",
      address: "15 Marina Road, Lagos",
      contactEmail: "accounts@intentrun.example",
      contactPhone: "+2348000000000",
      website: "https://intentrun.example",
      registrationNumber: "RC-120000",
      taxId: "TIN-900000",
      bankAccounts: [{ bankName: "North Bank", accountName: "IntentRun Services", accountNumber: "0012345678", currency: "NGN" }],
    };
    const customerDetails = { name: "Lagos Premium Hotels", email: "billing@lagoshotels.example", phone: "+2348111111111", address: "1 Victoria Island, Lagos" };
    const result = createCustomerInvoice(data, { ...draft, companyDetails, customerDetails });

    expect(result.error).toBeUndefined();
    const updated = result.data!;
    const invoice = updated.invoices.find(({ invoice: reference }) => reference === "TEST-INV-9001")!;
    const receivable = updated.receivables.find(({ invoice: reference }) => reference === invoice.invoice)!;
    const entry = updated.journalEntries?.find(({ id }) => id === invoice.journalEntryId)!;
    expect(invoice.status).toBe("Matched");
    expect(invoice.dueDate).toBe(createDraft(data).dueDate);
    expect(invoice.companyDetails).toEqual(companyDetails);
    expect(invoice.customerDetails).toEqual(customerDetails);
    expect(invoice.items).toEqual(draft.items);
    expect(invoice.amount).toBe(125.5);
    expect(receivable.status).toBe("Open");
    expect(receivable.journalEntryId).toBe(entry.id);
    expect(validateJournalEntry(entry, updated.accounts ?? [])).toBeNull();
    expect(entry.sourceType).toBe("sales-invoice");
    expect(entry.sourceId).toBe(invoice.invoice);
    expect(entry.partyId).toBe(invoice.customerId);
    expect(entry.sourceCodes).toContain(invoice.invoice);
    expect(updated.ledgerAccounts.filter(({ id }) => id?.startsWith(entry.id))).toHaveLength(2);
  });

  it("rejects invoice numbers already used by either invoice collection", async () => {
    const data = await fetchDashboardData();
    const draft = createDraft(data);

    expect(createCustomerInvoice(data, { ...draft, invoice: data.invoices[0].invoice }).error).toContain("already in use");
    expect(createCustomerInvoice(data, { ...draft, invoice: data.receivables[0].invoice }).error).toContain("already in use");
  });

  it("uses inventory item snapshots and service lines to calculate the invoice total", async () => {
    const data = await fetchDashboardData();
    const inventoryItem = data.inventoryItems[0];
    const stockBefore = inventoryItem.stock;
    const draft = createDraft(data, {
      amount: 175.5,
      items: [
        { description: inventoryItem.item, inventorySku: inventoryItem.sku, inventoryLocation: inventoryItem.locationStock?.[0]?.location, quantity: 2, unitPrice: 25 },
        { description: "Implementation support", quantity: 1, unitPrice: 125.5 },
      ],
    });
    const result = createCustomerInvoice(data, draft);

    expect(result.error).toBeUndefined();
    expect(result.data?.invoices[0].items).toEqual(draft.items);
    expect(result.data?.invoices[0].amount).toBe(175.5);
    expect(result.data?.receivables[0].outstanding).toBe(175.5);
    expect(result.data?.inventoryItems.find(({ sku }) => sku === inventoryItem.sku)?.stock).toBe(stockBefore - 2);
    expect(result.data?.journalEntries?.find(({ sourceType }) => sourceType === "sales-invoice")?.lines[0].debit).toBe(175.5);
    expect(result.data?.journalEntries?.some(({ sourceType }) => sourceType === "inventory-sale")).toBe(true);
  });

  it("persists a customer invoice breakdown and validates its calculated total", async () => {
    const data = await fetchDashboardData();
    const totals = { subtotal: 1_000, discountAmount: 100, vatRate: 0.075, vatAmount: 71.25, shippingFee: 50 };
    const draft = createDraft(data, {
      amount: 1_021.25,
      items: [{ description: "Office support", quantity: 1, unitPrice: 1_000 }],
      totals,
    });

    const result = createCustomerInvoice(data, draft);

    expect(result.error).toBeUndefined();
    expect(result.data?.invoices[0].amount).toBe(1_021.25);
    expect(result.data?.invoices[0].totals).toEqual(totals);
    expect(result.data?.receivables[0].amount).toBe(1_021.25);
    const invoiceJournal = result.data?.journalEntries?.find(({ sourceType }) => sourceType === "sales-invoice");
    const vatPayableAccount = result.data?.accounts?.find(({ name }) => name === "VAT Payable");
    expect(invoiceJournal?.lines.find(({ accountId }) => accountId === vatPayableAccount?.id)?.credit).toBe(71.25);
    expect(invoiceJournal?.lines.find(({ accountId }) => accountId === "4000")?.credit).toBe(950);
    expect(createCustomerInvoice(data, { ...draft, totals: { ...totals, vatAmount: 70 } }).error).toContain("discount, VAT, and shipping");
  });

  it("deducts an invoiced SKU only from its selected location", async () => {
    const data = await fetchDashboardData();
    const inventoryItem = data.inventoryItems.find((item) => (item.locationStock?.filter(({ quantity }) => quantity > 0).length ?? 0) > 1)!;
    const [untouchedLocation, sourceLocation] = inventoryItem.locationStock!.filter(({ quantity }) => quantity > 0);
    const warehouseStockBefore = data.inventoryLocations.find(({ location }) => location === sourceLocation.location)!.stock;
    const draft = createDraft(data, {
      amount: 100,
      items: [{ description: inventoryItem.item, inventorySku: inventoryItem.sku, inventoryLocation: sourceLocation.location, quantity: 1, unitPrice: 100 }],
    });

    const result = createCustomerInvoice(data, draft);

    expect(result.error).toBeUndefined();
    const updatedItem = result.data!.inventoryItems.find(({ sku }) => sku === inventoryItem.sku)!;
    expect(updatedItem.locationStock?.find(({ location }) => location === sourceLocation.location)?.quantity).toBe(sourceLocation.quantity - 1);
    expect(updatedItem.locationStock?.find(({ location }) => location === untouchedLocation.location)?.quantity).toBe(untouchedLocation.quantity);
    expect(result.data!.inventoryLocations.find(({ location }) => location === sourceLocation.location)?.stock).toBe(warehouseStockBefore - 1);
  });

  it("decrements inventory only when the customer invoice is approved", async () => {
    const data = await fetchDashboardData();
    const inventoryItem = data.inventoryItems[0];
    const quantity = 3;
    const draft = createDraft(data, {
      invoice: "TEST-INV-STOCK-APPROVAL",
      amount: 300,
      items: [{ description: inventoryItem.item, inventorySku: inventoryItem.sku, inventoryLocation: inventoryItem.locationStock?.[0]?.location, quantity, unitPrice: 100 }],
    });
    const submission = { type: "customer-invoice" as const, payload: draft };
    const submitted = submitApprovalRequest(data, submission, "Maya Chen", undefined, `${draft.invoiceDate}T10:00:00.000Z`);

    expect(submitted.error).toBeUndefined();
    expect(submitted.data?.inventoryItems.find(({ sku }) => sku === inventoryItem.sku)?.stock).toBe(inventoryItem.stock);
    expect(submitted.data?.journalEntries).toHaveLength(data.journalEntries?.length ?? 0);

    const requestId = submitted.data!.approvalRequests[0].id;
    const approved = decideApprovalRequest(submitted.data!, requestId, "Approved", "Finance Admin", undefined, `${draft.invoiceDate}T11:00:00.000Z`);
    const updatedItem = approved.data?.inventoryItems.find(({ sku }) => sku === inventoryItem.sku);

    expect(approved.error).toBeUndefined();
    expect(updatedItem?.stock).toBe(inventoryItem.stock - quantity);
    expect(updatedItem?.value).toBeLessThan(inventoryItem.value);
    expect(approved.data?.journalEntries?.some(({ sourceType }) => sourceType === "inventory-sale")).toBe(true);
    expect(approved.data?.approvalRequests[0].status).toBe("Approved");
  });

  it("keeps an inventory invoice pending when stock is no longer sufficient at approval", async () => {
    const data = await fetchDashboardData();
    const inventoryItem = data.inventoryItems[0];
    const draft = createDraft(data, {
      invoice: "TEST-INV-STOCK-UNAVAILABLE",
      amount: 100,
      items: [{ description: inventoryItem.item, inventorySku: inventoryItem.sku, inventoryLocation: inventoryItem.locationStock?.[0]?.location, quantity: 2, unitPrice: 50 }],
    });
    const submission = { type: "customer-invoice" as const, payload: draft };
    const submitted = submitApprovalRequest(data, submission, "Maya Chen", undefined, `${draft.invoiceDate}T10:00:00.000Z`);
    const queued = structuredClone(submitted.data!);
    queued.inventoryItems[0].stock = 1;

    const result = decideApprovalRequest(queued, queued.approvalRequests[0].id, "Approved", "Finance Admin", undefined, `${draft.invoiceDate}T11:00:00.000Z`);

    expect(result.error).toContain("Not enough");
    expect(result.data).toBeUndefined();
    expect(queued.approvalRequests[0].status).toBe("Pending");
    expect(queued.journalEntries).toHaveLength(data.journalEntries?.length ?? 0);
  });

  it("rejects invalid customers, item totals, and dates", async () => {
    const data = await fetchDashboardData();
    const draft = createDraft(data);

    expect(createCustomerInvoice(data, { ...draft, customerId: "missing" }).error).toContain("customer");
    expect(createCustomerInvoice(data, { ...draft, amount: 0 }).error).toContain("match the total");
    expect(createCustomerInvoice(data, { ...draft, items: [] }).error).toContain("at least one");
    expect(createCustomerInvoice(data, { ...draft, invoiceDate: "2026-02-30" }).error).toContain("invoice date");
    expect(createCustomerInvoice(data, { ...draft, dueDate: "not-a-date" }).error).toContain("due date");
  });
});
