import { describe, expect, it } from "vitest";
import { mockDashboardData, type DashboardData } from "../data/mockData";
import { fetchDashboardData, saveDashboardData } from "./dashboardData";
import {
  approvePayrollEntry,
  calculatePayrollCompensation,
  createMonthlyPayrollEntries,
  createPayrollEmployee,
  deletePayrollPayTier,
  deletePayrollRole,
  ensurePayrollEmployees,
  savePayrollPayTier,
  savePayrollRole,
  setGlobalPayrollPayDate,
  updatePayrollEmployee,
} from "./payroll";

const standardPayTier = {
  id: "pay-tier-standard",
  name: "Standard",
  allowancePercentages: { basic: 50, housing: 20, transport: 10, utilities: 10, foodEntertainment: 10 },
  deductionRates: { employeePension: 5, housingFund: 2.5, incomeTax: 10 },
};

function createPayrollData(): DashboardData {
  const data = structuredClone(mockDashboardData);
  data.payrollEmployees = [{
    id: "employee-maya-chen",
    employee: "Maya Chen",
    role: "Finance Admin",
    grossPay: 1_850_000,
    employeeDeductions: 50_000,
    employerLiabilities: 25_000,
    active: true,
  }];
  data.payroll = [];
  data.journalEntries = [];
  data.accounts = [
    { id: "1000", code: "1000", name: "Cash & Cash Equivalents", type: "Asset" },
    { id: "5100", code: "5100", name: "Payroll Expense", type: "Expense" },
    { id: "2110", code: "2110", name: "Wages Payable", type: "Liability" },
    { id: "5110", code: "5110", name: "Employer Payroll Expense", type: "Expense" },
    { id: "2100", code: "2100", name: "Payroll Deductions Payable", type: "Liability" },
  ];
  return data;
}

describe("monthly payroll generation", () => {
  it("calculates allowance allocations and gross-based deductions to cents", () => {
    const compensation = calculatePayrollCompensation(900_000, standardPayTier);

    expect(compensation.allowances).toEqual({ basic: 450_000, housing: 180_000, transport: 90_000, utilities: 90_000, foodEntertainment: 90_000 });
    expect(compensation.deductions).toEqual({ employeePension: 45_000, housingFund: 22_500, incomeTax: 90_000 });
    expect(compensation.employeeDeductions).toBe(157_500);
    expect(compensation.netPay).toBe(742_500);
    const rounded = calculatePayrollCompensation(0.03, { ...standardPayTier, allowancePercentages: { basic: 20, housing: 20, transport: 20, utilities: 20, foodEntertainment: 20 } });
    expect(Object.values(rounded.allowances).reduce((total, amount) => total + amount, 0)).toBe(0.03);
  });

  it("validates role and tier definitions and prevents deleting assigned entries", () => {
    const data = createPayrollData();
    const roleResult = savePayrollRole(data, "Analyst");
    expect(roleResult.error).toBeUndefined();
    const roleId = roleResult.data!.payrollSettings!.roles![0]!.id;
    expect(savePayrollRole(roleResult.data!, " analyst ").error).toContain("already exists");
    const tierResult = savePayrollPayTier(roleResult.data!, standardPayTier);
    expect(tierResult.error).toBeUndefined();
    const tierId = tierResult.data!.payrollSettings!.payTiers![0]!.id;
    expect(savePayrollPayTier(tierResult.data!, { ...standardPayTier, allowancePercentages: { ...standardPayTier.allowancePercentages, basic: 49 } }, tierId).error).toContain("total exactly 100%");
    expect(savePayrollPayTier(tierResult.data!, { ...standardPayTier, deductionRates: { employeePension: 60, housingFund: 20, incomeTax: 20 } }, tierId).error).toContain("total less than 100%");
    const assigned: DashboardData = {
      ...tierResult.data!,
      payrollEmployees: tierResult.data!.payrollEmployees!.map((employee) => ({ ...employee, roleId, payTierId: tierId })),
    };

    expect(deletePayrollRole(assigned, roleId).error).toContain("assigned to an employee");
    expect(deletePayrollPayTier(assigned, tierId).error).toContain("assigned to an employee");
  });

  it("uses assigned tiers for new payroll and preserves earlier snapshots after tier edits", () => {
    const data = createPayrollData();
    data.payrollSettings = { payDay: 31, roles: [{ id: "role-analyst", name: "Analyst" }], payTiers: [standardPayTier] };
    const added = createPayrollEmployee(data, {
      employee: "Jordan Lee",
      email: "jordan.lee@example.com",
      role: "Analyst",
      roleId: "role-analyst",
      payTierId: standardPayTier.id,
      grossPay: 900_000,
      employeeDeductions: 0,
      employerLiabilities: 0,
    }, new Date(2026, 9, 16));
    const october = added.data!.payroll.find(({ employee }) => employee === "Jordan Lee")!;

    expect(october).toMatchObject({ roleId: "role-analyst", payTierId: standardPayTier.id, pay: 742_500, employeeDeductions: 157_500 });
    expect(october.allowances).toEqual({ basic: 450_000, housing: 180_000, transport: 90_000, utilities: 90_000, foodEntertainment: 90_000 });

    const changedTier = { ...standardPayTier, deductionRates: { ...standardPayTier.deductionRates, incomeTax: 20 } };
    const updated = savePayrollPayTier(added.data!, changedTier, standardPayTier.id).data!;
    const november = createMonthlyPayrollEntries(updated, new Date(2026, 10, 1));

    expect(november.data?.payroll.find(({ id }) => id === october.id)).toMatchObject({ pay: 742_500, employeeDeductions: 157_500 });
    expect(november.data?.payroll.find(({ employee, periodKey }) => employee === "Jordan Lee" && periodKey === "2026-11")).toMatchObject({
      pay: 652_500,
      employeeDeductions: 247_500,
      deductionRates: changedTier.deductionRates,
    });
  });

  it("assigns a saved role and tier when editing an existing employee", () => {
    const data = createPayrollData();
    data.payrollSettings = { payDay: 31, roles: [{ id: "role-analyst", name: "Analyst" }], payTiers: [standardPayTier] };

    const updated = updatePayrollEmployee(data, "employee-maya-chen", {
      role: "Analyst",
      email: "maya.chen@example.com",
      roleId: "role-analyst",
      payTierId: standardPayTier.id,
      grossPay: 1_000_000,
      employeeDeductions: 0,
      employerLiabilities: 25_000,
    });

    expect(updated.error).toBeUndefined();
    expect(updated.data?.payrollEmployees?.[0]).toMatchObject({
      role: "Analyst",
      roleId: "role-analyst",
      payTierId: standardPayTier.id,
      grossPay: 1_000_000,
      employeeDeductions: 175_000,
      allowances: { basic: 500_000, housing: 200_000, transport: 100_000, utilities: 100_000, foodEntertainment: 100_000 },
    });
  });

  it("preserves role and tier catalogs when migrating payroll settings", () => {
    const data = createPayrollData();
    data.payrollEmployees = undefined;
    data.payrollSettings = { payDay: 0, roles: [{ id: "role-analyst", name: "Analyst" }], payTiers: [standardPayTier] };

    const migrated = ensurePayrollEmployees(data);

    expect(migrated.payrollSettings).toMatchObject({ payDay: 31, roles: data.payrollSettings.roles, payTiers: data.payrollSettings.payTiers });
  });

  it("migrates legacy payroll rows into stable employee profiles", () => {
    const data = createPayrollData();
    data.payrollEmployees = undefined;
    data.payroll = [{ employee: "  Maya Chen ", role: "Finance Admin", pay: 1_850_000, status: "Paid" }];
    data.payrollPayments = [{ id: "payment-1", employee: "Maya Chen", amount: 1_850_000, dateKey: "2026-09-30", journalEntryId: "journal-1" }];

    const migrated = ensurePayrollEmployees(data);

    expect(migrated.payrollEmployees).toMatchObject([{
      employee: "Maya Chen",
      role: "Finance Admin",
      grossPay: 1_850_000,
      employeeDeductions: 0,
      employerLiabilities: 0,
    }]);
    expect(migrated.payroll[0]).toMatchObject({ id: expect.any(String), employeeId: migrated.payrollEmployees?.[0]?.id });
    expect(migrated.payrollPayments).toEqual(data.payrollPayments);
  });

  it("persists employee profile migration from version-one local storage", async () => {
    localStorage.clear();
    const legacyData = structuredClone(mockDashboardData);
    legacyData.payrollEmployees = undefined;
    legacyData.payrollSettings = { payDay: 28, roles: [{ id: "role-analyst", name: "Analyst" }], payTiers: [standardPayTier] };
    saveDashboardData(legacyData);

    const loaded = await fetchDashboardData();

    expect(loaded.payrollEmployees).toHaveLength(3);
    expect(loaded.payroll.every(({ id, employeeId }) => Boolean(id && employeeId))).toBe(true);
    expect(loaded.payrollSettings).toMatchObject({ payDay: 28, roles: legacyData.payrollSettings.roles, payTiers: legacyData.payrollSettings.payTiers });
    const stored = JSON.parse(localStorage.getItem("corelogic-dashboard-accounting-v1") ?? "{}") as { data?: DashboardData };
    expect(stored.data?.payrollEmployees).toHaveLength(3);
    expect(stored.data?.payrollSettings?.roles).toEqual(legacyData.payrollSettings.roles);
    expect(stored.data?.payrollSettings?.payTiers).toEqual(legacyData.payrollSettings.payTiers);
  });

  it("creates one pending entry and accrual per employee and month", () => {
    const initial = createPayrollData();
    const firstRun = createMonthlyPayrollEntries(initial, new Date(2026, 9, 16));
    expect(firstRun.error).toBeUndefined();
    expect(firstRun.created).toHaveLength(1);
    expect(firstRun.data?.payroll[0]).toMatchObject({
      periodKey: "2026-10",
      scheduledPayDate: "2026-10-31",
      pay: 1_800_000,
      status: "Pending",
    });
    expect(firstRun.data?.journalEntries).toHaveLength(1);

    const repeatedRun = createMonthlyPayrollEntries(firstRun.data!, new Date(2026, 9, 16));
    expect(repeatedRun.created).toHaveLength(0);
    expect(repeatedRun.data?.payroll).toHaveLength(1);
    expect(repeatedRun.data?.journalEntries).toHaveLength(1);

    const nextMonth = createMonthlyPayrollEntries(repeatedRun.data!, new Date(2026, 10, 1));
    expect(nextMonth.created).toHaveLength(1);
    expect(nextMonth.data?.payroll).toHaveLength(2);
  });

  it("creates a profile and current-month entry when adding an employee", () => {
    const result = createPayrollEmployee(createPayrollData(), {
      employee: "Jordan Lee",
      role: "Analyst",
      email: "jordan.lee@example.com",
      grossPay: 900_000,
      employeeDeductions: 20_000,
      employerLiabilities: 10_000,
    }, new Date(2026, 9, 16));

    expect(result.error).toBeUndefined();
    expect(result.data?.payrollEmployees).toHaveLength(2);
    expect(result.data?.payrollEmployees?.find(({ employee }) => employee === "Jordan Lee")?.email).toBe("jordan.lee@example.com");
    expect(result.data?.payroll.find(({ employee }) => employee === "Jordan Lee")).toMatchObject({
      periodKey: "2026-10",
      status: "Pending",
      pay: 880_000,
    });
  });

  it("requires a valid email address when creating or updating an employee", () => {
    const data = createPayrollData();
    const draft = { employee: "Jordan Lee", email: "", role: "Analyst", grossPay: 900_000, employeeDeductions: 20_000, employerLiabilities: 10_000 };

    expect(createPayrollEmployee(data, draft).error).toContain("valid employee email");
    const added = createPayrollEmployee(data, { ...draft, email: "  JORDAN.LEE@example.com  " }, new Date(2026, 9, 16));
    expect(added.data?.payrollEmployees?.find(({ employee }) => employee === "Jordan Lee")?.email).toBe("jordan.lee@example.com");
    const employeeId = added.data!.payrollEmployees!.find(({ employee }) => employee === "Jordan Lee")!.id;

    expect(updatePayrollEmployee(added.data!, employeeId, {
      email: "not-an-email",
      role: "Analyst",
      grossPay: 900_000,
      employeeDeductions: 20_000,
      employerLiabilities: 10_000,
    }).error).toContain("valid employee email");
  });

  it("keeps historical pay snapshots when an employee profile changes", () => {
    const generated = createMonthlyPayrollEntries(createPayrollData(), new Date(2026, 9, 16));
    const priorEntry = generated.data!.payroll[0]!;
    const editedProfileData = {
      ...generated.data!,
      payrollEmployees: generated.data!.payrollEmployees!.map((employee) => ({ ...employee, role: "Controller", grossPay: 2_000_000 })),
    };

    const nextMonth = createMonthlyPayrollEntries(editedProfileData, new Date(2026, 10, 1));

    expect(nextMonth.data?.payroll.find(({ id }) => id === priorEntry.id)).toMatchObject({ role: "Finance Admin", grossPay: 1_850_000 });
    expect(nextMonth.data?.payroll.find(({ periodKey }) => periodKey === "2026-11")).toMatchObject({ role: "Controller", grossPay: 2_000_000 });
  });

  it("sets one persisted pay date for all pending employees and future entries", async () => {
    localStorage.clear();
    const generated = createMonthlyPayrollEntries(createPayrollData(), new Date(2026, 9, 16));
    generated.data!.payrollEmployees!.push({
      id: "employee-alex-morgan",
      employee: "Alex Morgan",
      role: "Accounts Officer",
      grossPay: 1_650_000,
      employeeDeductions: 0,
      employerLiabilities: 0,
    });
    const secondEmployeeEntry = createMonthlyPayrollEntries(generated.data!, new Date(2026, 9, 16));
    secondEmployeeEntry.data!.payroll = secondEmployeeEntry.data!.payroll.map((entry) => entry.employeeId === "employee-alex-morgan"
      ? { ...entry, status: "Processing" }
      : entry);
    const dateUpdate = setGlobalPayrollPayDate(secondEmployeeEntry.data!, "2026-10-28", new Date(2026, 9, 16));

    expect(dateUpdate.error).toBeUndefined();
    expect(dateUpdate.data?.payrollSettings?.payDay).toBe(28);
    expect(dateUpdate.data?.payroll.filter(({ periodKey }) => periodKey === "2026-10").every(({ scheduledPayDate }) => scheduledPayDate === "2026-10-28")).toBe(true);
    expect(setGlobalPayrollPayDate(dateUpdate.data!, "2026-11-28", new Date(2026, 9, 16)).error).toBeTruthy();
    saveDashboardData(dateUpdate.data!);
    const restored = await fetchDashboardData();
    expect(restored.payrollSettings?.payDay).toBe(28);
    expect(restored.payroll.filter(({ periodKey }) => periodKey === "2026-10").every(({ scheduledPayDate }) => scheduledPayDate === "2026-10-28")).toBe(true);
    const nextMonth = createMonthlyPayrollEntries(restored, new Date(2026, 10, 1));
    expect(nextMonth.data?.payroll.find(({ periodKey }) => periodKey === "2026-11")?.scheduledPayDate).toBe("2026-11-28");
  });

  it("approves and records one linked payment for a pending entry", () => {
    const generated = createMonthlyPayrollEntries(createPayrollData(), new Date(2026, 9, 16));
    const payrollEntry = generated.data!.payroll[0]!;
    const approved = approvePayrollEntry(generated.data!, payrollEntry.id!, "2026-10-28");

    expect(approved.error).toBeUndefined();
    expect(approved.data?.payroll[0]).toMatchObject({ status: "Paid", paidAmount: payrollEntry.pay });
    expect(approved.data?.payrollPayments?.[0]).toMatchObject({
      employee: payrollEntry.employee,
      amount: payrollEntry.pay,
      dateKey: "2026-10-28",
      payrollEntryId: payrollEntry.id,
    });
    const paymentJournal = approved.data?.journalEntries?.find(({ id }) => id === approved.data?.payrollPayments?.[0]?.journalEntryId);
    expect(paymentJournal).toMatchObject({ sourceType: "payroll-payment", sourceId: payrollEntry.id, dateKey: "2026-10-28" });
    expect(paymentJournal?.lines.reduce((total, line) => total + line.debit, 0)).toBe(payrollEntry.pay);
    expect(approvePayrollEntry(approved.data!, payrollEntry.id!, "2026-10-28").error).toBeTruthy();
  });

  it("approves the remaining balance after a partial payment", () => {
    const generated = createMonthlyPayrollEntries(createPayrollData(), new Date(2026, 9, 16));
    const payrollEntry = generated.data!.payroll[0]!;
    const partiallyPaid: DashboardData = {
      ...generated.data!,
      payroll: generated.data!.payroll.map((entry) => entry.id === payrollEntry.id ? { ...entry, paidAmount: 500_000, status: "Processing" } : entry),
      payrollPayments: [{ id: "partial-payment", employee: payrollEntry.employee, amount: 500_000, dateKey: "2026-10-20", journalEntryId: "partial-journal", payrollEntryId: payrollEntry.id }],
    };

    const approved = approvePayrollEntry(partiallyPaid, payrollEntry.id!, "2026-10-28");

    expect(approved.data?.payroll.find(({ id }) => id === payrollEntry.id)).toMatchObject({ status: "Paid", paidAmount: payrollEntry.pay });
    expect(approved.data?.payrollPayments?.find(({ dateKey }) => dateKey === "2026-10-28")?.amount).toBe(payrollEntry.pay - 500_000);
    expect(approved.data?.payrollPayments).toHaveLength(2);
  });
});