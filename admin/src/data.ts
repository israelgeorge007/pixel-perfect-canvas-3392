export const DASHBOARD_MODULES = [
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
] as const;

export const DASHBOARD_TABS = [
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
] as const;

export const WORKSPACE_SETTINGS_SECTIONS = [
  "Organization",
  "Approval Rules",
  "Team Access",
  "Titles & Tiers",
] as const;

export type ModuleName = (typeof DASHBOARD_MODULES)[number];
export type DashboardTab = (typeof DASHBOARD_TABS)[number];
export type WorkspaceSettingsSection = (typeof WORKSPACE_SETTINGS_SECTIONS)[number];
export type OrganizationStatus = "Active" | "Trial" | "Suspended";
export type UserStatus = "Active" | "Invited" | "Suspended";
export type ContactStatus = "New" | "In progress" | "Resolved";

export interface Organization {
  id: string;
  name: string;
  code?: string;
  logoDataUrl?: string;
  address?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  registrationNumber?: string;
  taxId?: string;
  bankAccounts?: OrganizationBankAccount[];
  plan: string;
  status: OrganizationStatus;
  createdAt: string;
  seatsUsed: number;
  seatLimit: number;
  activeUsers: number;
  monthlySignIns: number;
  records: number;
  recordLimit: number;
  storageGb: number;
  storageLimitGb: number;
  modules: ModuleName[];
  accent: string;
}

export interface OrganizationBankAccount {
  bankName: string;
  accountName: string;
  accountNumber: string;
  currency: string;
}

export interface OrganizationUser {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  role: "Owner" | "Admin" | "Member";
  status: UserStatus;
  lastActive: string;
  allowedTabs: DashboardTab[];
  allowedSettingsSections: WorkspaceSettingsSection[];
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  company: string;
  subject: string;
  message: string;
  receivedAt: string;
  status: ContactStatus;
}

export interface PlatformAuditEvent {
  id: string;
  organizationId: string;
  time: string;
  user: string;
  email: string;
  action: string;
  detail: string;
  status: string;
}

const ALL_SETTINGS_SECTIONS: WorkspaceSettingsSection[] = [...WORKSPACE_SETTINGS_SECTIONS];

export const MOCK_ORGANIZATIONS: Organization[] = [
  {
    id: "org-northstar",
    name: "Northstar Goods",
    plan: "Enterprise",
    status: "Active",
    createdAt: "2024-08-12",
    seatsUsed: 42,
    seatLimit: 60,
    activeUsers: 36,
    monthlySignIns: 1284,
    records: 18420,
    recordLimit: 30000,
    storageGb: 18.4,
    storageLimitGb: 30,
    modules: ["Approvals", "Ledger", "Receivables", "Payables", "Reconciliation", "Invoice", "Inventory", "Procurement", "Payroll", "Reports", "Audit Logs"],
    accent: "#ebd9b3",
  },
  {
    id: "org-arc",
    name: "Arc & Alder Studio",
    plan: "Growth",
    status: "Active",
    createdAt: "2025-02-03",
    seatsUsed: 18,
    seatLimit: 25,
    activeUsers: 15,
    monthlySignIns: 692,
    records: 9860,
    recordLimit: 15000,
    storageGb: 8.2,
    storageLimitGb: 15,
    modules: ["Ledger", "Receivables", "Payables", "Invoice", "Payroll", "Reports"],
    accent: "#c9d8ca",
  },
  {
    id: "org-harbor",
    name: "Harborlight Foods",
    plan: "Growth",
    status: "Trial",
    createdAt: "2025-05-19",
    seatsUsed: 9,
    seatLimit: 15,
    activeUsers: 7,
    monthlySignIns: 318,
    records: 3420,
    recordLimit: 8000,
    storageGb: 3.6,
    storageLimitGb: 10,
    modules: ["Ledger", "Receivables", "Payables", "Invoice", "Inventory", "Procurement"],
    accent: "#d7ccef",
  },
  {
    id: "org-meridian",
    name: "Meridian Works",
    plan: "Starter",
    status: "Suspended",
    createdAt: "2023-11-28",
    seatsUsed: 12,
    seatLimit: 20,
    activeUsers: 0,
    monthlySignIns: 0,
    records: 6210,
    recordLimit: 10000,
    storageGb: 6.1,
    storageLimitGb: 10,
    modules: ["Approvals", "Ledger", "Payables", "Reconciliation", "Inventory", "Reports"],
    accent: "#f0ccbd",
  },
];

function getOrganizationTabs(organizationId: string): DashboardTab[] {
  const modules = new Set(
    MOCK_ORGANIZATIONS.find((organization) => organization.id === organizationId)?.modules ?? [],
  );
  return DASHBOARD_TABS.filter(
    (tab) => tab === "Overview" || tab === "Settings" || modules.has(tab as ModuleName),
  );
}

export const MOCK_USERS: OrganizationUser[] = [
  { id: "usr-01", name: "Amara Okafor", email: "amara@northstargoods.com", organizationId: "org-northstar", role: "Owner", status: "Active", lastActive: "Today, 9:42 AM", allowedTabs: getOrganizationTabs("org-northstar"), allowedSettingsSections: [...ALL_SETTINGS_SECTIONS] },
  { id: "usr-02", name: "Tunde Bello", email: "tunde@northstargoods.com", organizationId: "org-northstar", role: "Admin", status: "Active", lastActive: "Today, 8:15 AM", allowedTabs: ["Overview", "Approvals", "Ledger", "Receivables", "Payables", "Reconciliation", "Invoice", "Inventory", "Procurement", "Payroll", "Reports", "Audit Logs"], allowedSettingsSections: ["Approval Rules", "Team Access"] },
  { id: "usr-03", name: "Kemi Adesina", email: "kemi@northstargoods.com", organizationId: "org-northstar", role: "Member", status: "Active", lastActive: "Yesterday", allowedTabs: ["Overview", "Ledger", "Inventory", "Reports"], allowedSettingsSections: [] },
  { id: "usr-04", name: "Nana Mensah", email: "nana@arcandalder.co", organizationId: "org-arc", role: "Owner", status: "Active", lastActive: "Today, 10:06 AM", allowedTabs: getOrganizationTabs("org-arc"), allowedSettingsSections: [...ALL_SETTINGS_SECTIONS] },
  { id: "usr-05", name: "Kojo Asante", email: "kojo@arcandalder.co", organizationId: "org-arc", role: "Admin", status: "Active", lastActive: "Yesterday", allowedTabs: ["Overview", "Ledger", "Payables", "Invoice", "Reports"], allowedSettingsSections: ["Team Access"] },
  { id: "usr-06", name: "Abena Owusu", email: "abena@arcandalder.co", organizationId: "org-arc", role: "Member", status: "Invited", lastActive: "Pending invite", allowedTabs: ["Overview"], allowedSettingsSections: [] },
  { id: "usr-07", name: "Zainab Musa", email: "zainab@harborlight.ng", organizationId: "org-harbor", role: "Owner", status: "Active", lastActive: "Today, 7:32 AM", allowedTabs: getOrganizationTabs("org-harbor"), allowedSettingsSections: [...ALL_SETTINGS_SECTIONS] },
  { id: "usr-08", name: "David Nwosu", email: "david@harborlight.ng", organizationId: "org-harbor", role: "Member", status: "Active", lastActive: "2 days ago", allowedTabs: ["Overview", "Receivables", "Payables", "Invoice"], allowedSettingsSections: [] },
  { id: "usr-09", name: "Eliud Kamau", email: "eliud@meridianworks.africa", organizationId: "org-meridian", role: "Owner", status: "Suspended", lastActive: "Jan 18, 2025", allowedTabs: ["Overview", "Settings"], allowedSettingsSections: ["Organization"] },
];

export const MOCK_AUDIT_EVENTS: PlatformAuditEvent[] = [
  { id: "evt-001", organizationId: "org-northstar", time: "Today, 9:42 AM", user: "Amara Okafor", email: "amara@northstargoods.com", action: "Signed in", detail: "Successful workspace sign-in", status: "Success" },
  { id: "evt-002", organizationId: "org-northstar", time: "Today, 9:18 AM", user: "Tunde Bello", email: "tunde@northstargoods.com", action: "Approval recorded", detail: "Purchase request approval completed", status: "Success" },
  { id: "evt-003", organizationId: "org-arc", time: "Today, 10:06 AM", user: "Nana Mensah", email: "nana@arcandalder.co", action: "Invoice created", detail: "New customer invoice added", status: "Success" },
  { id: "evt-004", organizationId: "org-arc", time: "Yesterday", user: "Kojo Asante", email: "kojo@arcandalder.co", action: "Team access updated", detail: "Dashboard permissions changed", status: "Success" },
  { id: "evt-005", organizationId: "org-harbor", time: "Yesterday", user: "Zainab Musa", email: "zainab@harborlight.ng", action: "Report exported", detail: "Monthly finance report exported", status: "Success" },
  { id: "evt-006", organizationId: "org-meridian", time: "Jan 18, 2025", user: "Eliud Kamau", email: "eliud@meridianworks.africa", action: "Sign-in blocked", detail: "Workspace account suspended", status: "Blocked" },
];

export const MOCK_SUBMISSIONS: ContactSubmission[] = [
  {
    id: "msg-001",
    name: "Chioma Eze",
    email: "chioma@freshfield.ng",
    company: "Freshfield Produce",
    subject: "ERP for a growing distribution team",
    message: "We are looking for a way to bring inventory, purchasing and finance into one place. We have 32 staff across two locations and would like to understand how onboarding works.",
    receivedAt: "Today, 10:24 AM",
    status: "New",
  },
  {
    id: "msg-002",
    name: "Kwame Boateng",
    email: "kwame@wovenhouse.co",
    company: "Woven House",
    subject: "Request for a product walkthrough",
    message: "Our team is evaluating platforms for finance and project operations. Could we arrange a walkthrough next week?",
    receivedAt: "Today, 8:51 AM",
    status: "New",
  },
  {
    id: "msg-003",
    name: "Ifeoma Nwankwo",
    email: "ifeoma@redwood.ng",
    company: "Redwood Logistics",
    subject: "Data analysis consulting",
    message: "We would like to explore a reporting and data analysis engagement to improve visibility across our fleet operations.",
    receivedAt: "Yesterday, 3:16 PM",
    status: "In progress",
  },
  {
    id: "msg-004",
    name: "Miriam Kamau",
    email: "miriam@brightpath.africa",
    company: "Brightpath Learning",
    subject: "Support with an existing account",
    message: "We have a question about adding a new location to our account. Please let us know the best next step.",
    receivedAt: "May 21, 2025",
    status: "Resolved",
  },
];

export const MONTHLY_USAGE = [
  { month: "Jan", signIns: 1840 },
  { month: "Feb", signIns: 2210 },
  { month: "Mar", signIns: 2080 },
  { month: "Apr", signIns: 2640 },
  { month: "May", signIns: 2890 },
  { month: "Jun", signIns: 3380 },
];
