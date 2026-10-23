import type { DashboardData, PayrollAllowanceAmounts, PayrollAllowancePercentages, PayrollDeductionRates, PayrollPayTier } from "../data/mockData";
import { appendJournal, prepareJournal } from "./journalPosting";

type PayrollEmployee = NonNullable<DashboardData["payrollEmployees"]>[number];

function normalizeEmployeeName(employee: string): string {
  return employee.trim().toLocaleLowerCase();
}

function normalizeEmployeeEmail(email: string): string {
  return email.trim().toLocaleLowerCase();
}

function isValidEmployeeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const allowanceKeys = ["basic", "housing", "transport", "utilities", "foodEntertainment"] as const;
const deductionKeys = ["employeePension", "housingFund", "incomeTax"] as const;
const defaultOwnerRole = { id: "role-owner", name: "Owner" } as const;

export function isDefaultOwnerRole(role: { id: string; name: string }): boolean {
  return role.id === defaultOwnerRole.id || normalizeEmployeeName(role.name) === defaultOwnerRole.name.toLocaleLowerCase();
}

export function ensureDefaultOwnerRole(data: DashboardData): DashboardData {
  const settings = data.payrollSettings ?? { payDay: 31 };
  const roles = settings.roles ?? [];
  const existingOwner = roles.find(isDefaultOwnerRole);
  if (!existingOwner) {
    return {
      ...data,
      payrollSettings: { ...settings, roles: [defaultOwnerRole, ...roles] },
    };
  }
  if (existingOwner.name === defaultOwnerRole.name) return data;
  return {
    ...data,
    payrollSettings: {
      ...settings,
      roles: roles.map((role) => role.id === existingOwner.id ? defaultOwnerRole : role),
    },
    ...(data.payrollEmployees ? {
      payrollEmployees: data.payrollEmployees.map((employee) =>
        employee.roleId === existingOwner.id ? { ...employee, role: defaultOwnerRole.name } : employee,
      ),
    } : {}),
  };
}

function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function calculatePayrollCompensation(grossPay: number, tier: PayrollPayTier): {
  allowances: PayrollAllowanceAmounts;
  deductions: { employeePension: number; housingFund: number; incomeTax: number };
  employeeDeductions: number;
  netPay: number;
} {
  let remaining = roundCurrency(grossPay);
  const allowances = {} as PayrollAllowanceAmounts;
  for (const key of allowanceKeys.slice(0, -1)) {
    const amount = Math.min(remaining, roundCurrency(grossPay * tier.allowancePercentages[key] / 100));
    allowances[key] = amount;
    remaining = roundCurrency(remaining - amount);
  }
  allowances.foodEntertainment = remaining;
  const deductions = {
    employeePension: roundCurrency(grossPay * tier.deductionRates.employeePension / 100),
    housingFund: roundCurrency(grossPay * tier.deductionRates.housingFund / 100),
    incomeTax: roundCurrency(grossPay * tier.deductionRates.incomeTax / 100),
  };
  const employeeDeductions = roundCurrency(Object.values(deductions).reduce((total, amount) => total + amount, 0));
  return { allowances, deductions, employeeDeductions, netPay: roundCurrency(grossPay - employeeDeductions) };
}

function uniqueCatalogId(prefix: string, name: string, ids: Set<string>): string {
  const base = `${prefix}-${employeeSlug(name)}`;
  let id = base;
  let suffix = 2;
  while (ids.has(id)) id = `${base}-${suffix++}`;
  return id;
}

export function savePayrollRole(data: DashboardData, nameDraft: string, roleId?: string): { data?: DashboardData; error?: string } {
  const name = nameDraft.trim();
  const normalizedData = ensureDefaultOwnerRole(data);
  const roles = normalizedData.payrollSettings?.roles ?? [];
  const roleToEdit = roleId ? roles.find(({ id }) => id === roleId) : undefined;
  if (roleId && !roleToEdit) return { error: "This job title could not be found." };
  if (roleToEdit && isDefaultOwnerRole(roleToEdit)) return { error: "The default Owner job title cannot be edited." };
  if (!name || name.length > 100) return { error: "Enter a job title with no more than 100 characters." };
  if (roles.some((role) => role.id !== roleId && normalizeEmployeeName(role.name) === normalizeEmployeeName(name))) {
    return { error: "A job title with that name already exists." };
  }
  const id = roleId ?? uniqueCatalogId("role", name, new Set(roles.map(({ id: existingId }) => existingId)));
  const nextRoles = roleId ? roles.map((role) => role.id === roleId ? { id, name } : role) : [...roles, { id, name }];
  return {
    data: {
      ...normalizedData,
      payrollSettings: { ...(normalizedData.payrollSettings ?? { payDay: 31 }), roles: nextRoles },
      ...(roleId && normalizedData.payrollEmployees ? { payrollEmployees: normalizedData.payrollEmployees.map((employee) => employee.roleId === roleId ? { ...employee, role: name } : employee) } : {}),
    },
  };
}

export function deletePayrollRole(data: DashboardData, roleId: string): { data?: DashboardData; error?: string } {
  const normalizedData = ensureDefaultOwnerRole(data);
  const roles = normalizedData.payrollSettings?.roles ?? [];
  const role = roles.find(({ id }) => id === roleId);
  if (!role) return { error: "This job title could not be found." };
  if (isDefaultOwnerRole(role)) return { error: "The default Owner job title cannot be deleted." };
  if ((normalizedData.payrollEmployees ?? []).some((employee) => employee.roleId === roleId || normalizeEmployeeName(employee.role) === normalizeEmployeeName(role.name))) {
    return { error: "This job title is assigned to an employee and cannot be deleted." };
  }
  return { data: { ...normalizedData, payrollSettings: { ...(normalizedData.payrollSettings ?? { payDay: 31 }), roles: roles.filter(({ id }) => id !== roleId) } } };
}

export function savePayrollPayTier(data: DashboardData, draft: Omit<PayrollPayTier, "id">, tierId?: string): { data?: DashboardData; error?: string } {
  const name = draft.name.trim();
  const tiers = data.payrollSettings?.payTiers ?? [];
  if (!name || name.length > 100) return { error: "Enter a pay tier name with no more than 100 characters." };
  if (tiers.some((tier) => tier.id !== tierId && normalizeEmployeeName(tier.name) === normalizeEmployeeName(name))) {
    return { error: "A pay tier with that name already exists." };
  }
  if (tierId && !tiers.some(({ id }) => id === tierId)) return { error: "This pay tier could not be found." };
  if (!allowanceKeys.every((key) => Number.isFinite(draft.allowancePercentages[key]) && draft.allowancePercentages[key] >= 0 && draft.allowancePercentages[key] <= 100) ||
    Math.abs(allowanceKeys.reduce((total, key) => total + draft.allowancePercentages[key], 0) - 100) > 0.000001) {
    return { error: "Allowance percentages must be between 0 and 100 and total exactly 100%." };
  }
  if (!deductionKeys.every((key) => Number.isFinite(draft.deductionRates[key]) && draft.deductionRates[key] >= 0 && draft.deductionRates[key] <= 100) ||
    deductionKeys.reduce((total, key) => total + draft.deductionRates[key], 0) >= 100) {
    return { error: "Deduction percentages must be non-negative and total less than 100%." };
  }
  const id = tierId ?? uniqueCatalogId("pay-tier", name, new Set(tiers.map(({ id: existingId }) => existingId)));
  const tier = { id, name, allowancePercentages: { ...draft.allowancePercentages }, deductionRates: { ...draft.deductionRates } };
  const nextTiers = tierId ? tiers.map((current) => current.id === tierId ? tier : current) : [...tiers, tier];
  return { data: { ...data, payrollSettings: { ...(data.payrollSettings ?? { payDay: 31 }), payTiers: nextTiers } } };
}

export function deletePayrollPayTier(data: DashboardData, tierId: string): { data?: DashboardData; error?: string } {
  const tiers = data.payrollSettings?.payTiers ?? [];
  if (!tiers.some(({ id }) => id === tierId)) return { error: "This pay tier could not be found." };
  if ((data.payrollEmployees ?? []).some(({ payTierId: assignedTierId }) => assignedTierId === tierId)) {
    return { error: "This pay tier is assigned to an employee and cannot be deleted." };
  }
  return { data: { ...data, payrollSettings: { ...(data.payrollSettings ?? { payDay: 31 }), payTiers: tiers.filter(({ id }) => id !== tierId) } } };
}

function employeeSlug(employee: string): string {
  return normalizeEmployeeName(employee).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "employee";
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ensurePayrollEmployees(data: DashboardData): DashboardData {
  const normalizedData = ensureDefaultOwnerRole(data);
  const employees = [...(normalizedData.payrollEmployees ?? [])];
  const usedIds = new Set(employees.map(({ id }) => id));
  const profilesByName = new Map(employees.map((employee) => [normalizeEmployeeName(employee.employee), employee]));
  const payroll = [...normalizedData.payroll].sort((left, right) => (right.dateKey ?? "").localeCompare(left.dateKey ?? ""));
  const storedPayDay = normalizedData.payrollSettings?.payDay;
  const payDay = Number.isInteger(storedPayDay) && storedPayDay! >= 1 && storedPayDay! <= 31 ? storedPayDay! : 31;
  let changed = normalizedData !== data || !Array.isArray(normalizedData.payrollEmployees) || storedPayDay !== payDay;

  for (const record of payroll) {
    const normalizedName = normalizeEmployeeName(record.employee);
    let employee = profilesByName.get(normalizedName);
    if (!employee) {
      const baseId = `employee-${employeeSlug(record.employee)}`;
      let id = baseId;
      let suffix = 2;
      while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
      employee = {
        id,
        employee: record.employee.trim(),
        role: record.role,
        grossPay: record.grossPay ?? record.pay,
        employeeDeductions: record.employeeDeductions ?? 0,
        employerLiabilities: record.employerLiabilities ?? 0,
        active: true,
      };
      employees.push(employee);
      profilesByName.set(normalizedName, employee);
      usedIds.add(id);
      changed = true;
    }
  }

  const linkedPayroll = payroll.map((record, index) => {
    const employee = profilesByName.get(normalizeEmployeeName(record.employee));
    const periodKey = record.periodKey ?? record.dateKey?.slice(0, 7);
    const id = record.id ?? `legacy-${employee?.id ?? employeeSlug(record.employee)}-${periodKey ?? index}`;
    if (record.id === id && record.employeeId === employee?.id && record.periodKey === periodKey) return record;
    changed = true;
    return {
      ...record,
      id,
      employeeId: record.employeeId ?? employee?.id,
      ...(periodKey ? { periodKey } : {}),
      ...(record.scheduledPayDate || !record.dateKey ? {} : { scheduledPayDate: record.dateKey }),
    };
  });

  return changed ? { ...normalizedData, payrollEmployees: employees, payrollSettings: { ...(normalizedData.payrollSettings ?? {}), payDay }, payroll: linkedPayroll } : data;
}

export function createMonthlyPayrollEntries(
  source: DashboardData,
  now = new Date(),
): { data?: DashboardData; created: string[]; error?: string } {
  let data = ensurePayrollEmployees(source);
  const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const dateKey = toLocalDateKey(now);
  const payDay = data.payrollSettings?.payDay ?? 31;
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const scheduledPayDate = toLocalDateKey(new Date(now.getFullYear(), now.getMonth(), Math.min(payDay, monthEnd)));
  const created: string[] = [];

  for (const employee of data.payrollEmployees ?? []) {
    if (employee.active === false) continue;
    const id = `payroll-${employee.id}-${periodKey}`;
    const alreadyExists = data.payroll.some((record) =>
      record.id === id || (record.employeeId === employee.id && record.periodKey === periodKey),
    );
    if (alreadyExists) continue;

    const selectedTier = data.payrollSettings?.payTiers?.find(({ id }) => id === employee.payTierId);
    if (employee.payTierId && !selectedTier) return { created: [], error: `Choose a valid pay tier for ${employee.employee} before generating payroll.` };
    const selectedRole = data.payrollSettings?.roles?.find(({ id }) => id === employee.roleId);
    if (employee.roleId && !selectedRole) return { created: [], error: `Choose a valid job title for ${employee.employee} before generating payroll.` };
    const compensation = selectedTier ? calculatePayrollCompensation(employee.grossPay, selectedTier) : undefined;
    const grossPay = employee.grossPay;
    const employeeDeductions = compensation?.employeeDeductions ?? employee.employeeDeductions;
    const employerLiabilities = employee.employerLiabilities;
    if (!Number.isFinite(grossPay) || grossPay <= 0 || !Number.isFinite(employeeDeductions) ||
      employeeDeductions < 0 || employeeDeductions >= grossPay || !Number.isFinite(employerLiabilities) || employerLiabilities < 0) {
      return { created: [], error: `Update ${employee.employee}'s pay structure before generating payroll.` };
    }
    if ([grossPay, employeeDeductions, employerLiabilities].some((amount) => Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7)) {
      return { created: [], error: `Update ${employee.employee}'s pay structure to use no more than two decimal places.` };
    }

    const netPay = roundCurrency(grossPay - employeeDeductions);
    const lines = [
      { account: "Payroll Expense", debit: grossPay, credit: 0 },
      { account: "Wages Payable", debit: 0, credit: netPay },
    ];
    if (employerLiabilities > 0) {
      lines.push({ account: "Employer Payroll Expense", debit: employerLiabilities, credit: 0 });
      lines.push({ account: "Payroll Deductions Payable", debit: 0, credit: employerLiabilities });
    }
    if (employeeDeductions > 0) lines.push({ account: "Payroll Deductions Payable", debit: 0, credit: employeeDeductions });

    const sourceId = `${employee.id}-${periodKey}`;
    const prepared = prepareJournal(data, {
      dateKey,
      memo: `Payroll accrual for ${employee.employee} · ${periodKey}`,
      sourceType: "payroll-accrual",
      sourceId,
      lines,
    });
    if (!prepared.entry) return { created: [], error: prepared.error ?? "Payroll accrual could not be posted." };
    const posted = appendJournal(data, prepared.entry);
    if (!posted.data) return { created: [], error: posted.error ?? "Payroll accrual could not be posted." };

    const record = {
      id,
      employeeId: employee.id,
      periodKey,
      scheduledPayDate,
      employee: employee.employee,
      role: selectedRole?.name ?? employee.role,
      ...(employee.roleId ? { roleId: employee.roleId } : {}),
      ...(employee.payTierId ? { payTierId: employee.payTierId } : {}),
      pay: netPay,
      grossPay,
      employeeDeductions,
      employerLiabilities,
      ...(compensation ? { allowances: compensation.allowances, deductionRates: selectedTier!.deductionRates } :
        employee.allowances ? { allowances: employee.allowances, ...(employee.deductionRates ? { deductionRates: employee.deductionRates } : {}) } : {}),
      status: "Pending",
      dateKey,
      journalEntryId: prepared.entry.id,
    };
    data = { ...posted.data, payroll: [record, ...posted.data.payroll] };
    created.push(id);
  }

  return { data, created };
}

export function updatePayrollEmployee(
  data: DashboardData,
  employeeId: string,
  changes: { email: string } & Pick<PayrollEmployee, "role" | "grossPay" | "employeeDeductions" | "employerLiabilities"> & Partial<Pick<PayrollEmployee, "roleId" | "payTierId">>,
): { data?: DashboardData; error?: string } {
  const employee = data.payrollEmployees?.find(({ id }) => id === employeeId);
  if (!employee) return { error: "This employee could not be found." };
  const email = normalizeEmployeeEmail(changes.email ?? "");
  if (!isValidEmployeeEmail(email)) return { error: "Enter a valid employee email address." };
  const selectedRole = changes.roleId ? data.payrollSettings?.roles?.find(({ id }) => id === changes.roleId) : undefined;
  const selectedTier = changes.payTierId ? data.payrollSettings?.payTiers?.find(({ id }) => id === changes.payTierId) : undefined;
  if ((changes.roleId && !selectedRole) || (changes.payTierId && !selectedTier) || Boolean(changes.roleId) !== Boolean(changes.payTierId)) {
    return { error: "Choose a valid job title and pay tier." };
  }
  const role = selectedRole?.name ?? changes.role.trim();
  const { grossPay } = changes;
  const compensation = selectedTier ? calculatePayrollCompensation(grossPay, selectedTier) : undefined;
  const employeeDeductions = compensation?.employeeDeductions ?? changes.employeeDeductions;
  const { employerLiabilities } = changes;
  if (!role || !Number.isFinite(grossPay) || grossPay <= 0 || !Number.isFinite(employeeDeductions) ||
    employeeDeductions < 0 || employeeDeductions >= grossPay || !Number.isFinite(employerLiabilities) || employerLiabilities < 0 ||
    [grossPay, employeeDeductions, employerLiabilities].some((amount) => Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7)) {
    return { error: "Enter a role, positive gross pay, deductions below gross pay, and non-negative employer contributions (maximum two decimals)." };
  }
  return {
    data: {
      ...data,
      payrollEmployees: data.payrollEmployees!.map((entry) => entry.id === employeeId
        ? {
          ...entry,
          email,
          role,
          ...(selectedRole ? { roleId: selectedRole.id } : { roleId: undefined }),
          ...(selectedTier && compensation ? { payTierId: selectedTier.id, allowances: compensation.allowances, deductionRates: selectedTier.deductionRates } : { payTierId: undefined, allowances: undefined, deductionRates: undefined }),
          grossPay,
          employeeDeductions,
          employerLiabilities,
        }
        : entry),
    },
  };
}

export function createPayrollEmployee(
  data: DashboardData,
  draft: { employee: string; email: string; role: string; grossPay: number; employeeDeductions: number; employerLiabilities: number; roleId?: string; payTierId?: string },
  now = new Date(),
): { data?: DashboardData; error?: string } {
  const employeeName = draft.employee.trim();
  const email = normalizeEmployeeEmail(draft.email ?? "");
  if (!isValidEmployeeEmail(email)) return { error: "Enter a valid employee email address." };
  const selectedRole = draft.roleId ? data.payrollSettings?.roles?.find(({ id }) => id === draft.roleId) : undefined;
  const selectedTier = draft.payTierId ? data.payrollSettings?.payTiers?.find(({ id }) => id === draft.payTierId) : undefined;
  if ((draft.roleId && !selectedRole) || (draft.payTierId && !selectedTier) || Boolean(draft.roleId) !== Boolean(draft.payTierId)) {
    return { error: "Choose a valid job title and pay tier." };
  }
  const role = selectedRole?.name ?? draft.role.trim();
  const compensation = selectedTier ? calculatePayrollCompensation(draft.grossPay, selectedTier) : undefined;
  const employeeDeductions = compensation?.employeeDeductions ?? draft.employeeDeductions;
  if (!employeeName || !role || !Number.isFinite(draft.grossPay) || draft.grossPay <= 0 ||
    !Number.isFinite(employeeDeductions) || employeeDeductions < 0 || employeeDeductions >= draft.grossPay ||
    !Number.isFinite(draft.employerLiabilities) || draft.employerLiabilities < 0 ||
    [draft.grossPay, employeeDeductions, draft.employerLiabilities].some((amount) => Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7)) {
    return { error: "Enter an employee name, role, positive gross pay, deductions below gross pay, and non-negative employer contributions (maximum two decimals)." };
  }
  const profiles = data.payrollEmployees ?? [];
  if (profiles.some(({ employee }) => normalizeEmployeeName(employee) === normalizeEmployeeName(employeeName))) {
    return { error: "An employee with that name already exists." };
  }
  const baseId = `employee-${employeeSlug(employeeName)}`;
  const usedIds = new Set(profiles.map(({ id }) => id));
  let id = baseId;
  let suffix = 2;
  while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
  const employee: PayrollEmployee = {
    id,
    employee: employeeName,
    email,
    role,
    ...(selectedRole ? { roleId: selectedRole.id } : {}),
    ...(selectedTier && compensation ? { payTierId: selectedTier.id, allowances: compensation.allowances, deductionRates: selectedTier.deductionRates } : {}),
    grossPay: draft.grossPay,
    employeeDeductions,
    employerLiabilities: draft.employerLiabilities,
    active: true,
  };
  return createMonthlyPayrollEntries({
    ...data,
    payrollEmployees: [...profiles, employee],
  }, now);
}

export function setGlobalPayrollPayDay(
  data: DashboardData,
  payDay: number,
  now = new Date(),
): { data?: DashboardData; error?: string } {
  if (!Number.isInteger(payDay) || payDay < 1 || payDay > 31) return { error: "Choose a pay day from 1 to 31." };
  const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return {
    data: {
      ...data,
      payrollSettings: { ...(data.payrollSettings ?? {}), payDay },
      payroll: data.payroll.map((entry) => {
        const entryPeriod = entry.periodKey ?? entry.dateKey?.slice(0, 7);
        if (!entryPeriod || entryPeriod < periodKey || (entry.status !== "Pending" && entry.status !== "Processing")) return entry;
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(entryPeriod)) return entry;
        const [year, month] = entryPeriod.split("-").map(Number);
        const monthEnd = new Date(year, month, 0).getDate();
        const scheduledPayDate = `${entryPeriod}-${String(Math.min(payDay, monthEnd)).padStart(2, "0")}`;
        return { ...entry, scheduledPayDate };
      }),
    },
  };
}

export function setGlobalPayrollPayDate(
  data: DashboardData,
  scheduledPayDate: string,
  now = new Date(),
): { data?: DashboardData; error?: string } {
  const date = new Date(`${scheduledPayDate}T00:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledPayDate) || Number.isNaN(date.valueOf()) || toLocalDateKey(date) !== scheduledPayDate) {
    return { error: "Choose a valid scheduled pay date." };
  }
  const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (scheduledPayDate.slice(0, 7) !== periodKey) return { error: "Choose a scheduled pay date in the current payroll month." };
  return setGlobalPayrollPayDay(data, date.getDate(), now);
}

export function approvePayrollEntry(
  data: DashboardData,
  payrollId: string,
  paymentDate = toLocalDateKey(new Date()),
): { data?: DashboardData; error?: string } {
  const payroll = data.payroll.find(({ id }) => id === payrollId);
  if (!payroll) return { error: "This payroll entry could not be found." };
  if (payroll.status !== "Pending" && payroll.status !== "Processing") return { error: "Only pending payroll entries can be approved and paid." };
  if (!payroll.journalEntryId) return { error: "This payroll entry has no accrual journal and cannot be paid." };
  const date = new Date(`${paymentDate}T00:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate) || Number.isNaN(date.valueOf()) || toLocalDateKey(date) !== paymentDate) {
    return { error: "Choose a valid payment date." };
  }
  const outstanding = Math.round((payroll.pay - (payroll.paidAmount ?? 0) + Number.EPSILON) * 100) / 100;
  if (outstanding <= 0) return { error: "This payroll entry has no outstanding balance." };

  const prepared = prepareJournal(data, {
    dateKey: paymentDate,
    memo: `Payroll settlement for ${payroll.employee}`,
    sourceType: "payroll-payment",
    sourceId: payrollId,
    sourceCodes: [payrollId],
    lines: [
      { account: "Wages Payable", debit: outstanding, credit: 0 },
      { account: "Cash & Cash Equivalents", debit: 0, credit: outstanding },
    ],
  });
  if (!prepared.entry) return { error: prepared.error ?? "Payroll payment could not be posted." };
  const posted = appendJournal(data, prepared.entry);
  if (!posted.data) return { error: posted.error ?? "Payroll payment could not be posted." };

  return {
    data: {
      ...posted.data,
      payrollPayments: [{
        id: prepared.entry.id,
        employee: payroll.employee,
        amount: outstanding,
        dateKey: paymentDate,
        journalEntryId: prepared.entry.id,
        payrollDateKey: payroll.dateKey,
        payrollEntryId: payrollId,
      }, ...(posted.data.payrollPayments ?? [])],
      payroll: posted.data.payroll.map((entry) => entry.id === payrollId
        ? { ...entry, paidAmount: Math.round(((payroll.paidAmount ?? 0) + outstanding + Number.EPSILON) * 100) / 100, status: "Paid" }
        : entry),
      auditEvents: [{
        time: new Date(`${paymentDate}T00:00:00`).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        action: "Payroll approved and paid",
        detail: `${payroll.employee} · ${outstanding.toFixed(2)}`,
        user: data.profile.name,
        email: data.profile.email,
        type: "Payroll",
        status: "Paid",
        dateKey: paymentDate,
      }, ...posted.data.auditEvents],
    },
  };
}