import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Inbox,
  Menu,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings2,
  Save,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  MOCK_ORGANIZATIONS,
  MOCK_AUDIT_EVENTS,
  MOCK_SUBMISSIONS,
  MOCK_USERS,
  DASHBOARD_MODULES,
  DASHBOARD_TABS,
  MONTHLY_USAGE,
  WORKSPACE_SETTINGS_SECTIONS,
  type ContactStatus,
  type ContactSubmission,
  type DashboardTab,
  type ModuleName,
  type Organization,
  type OrganizationBankAccount,
  type OrganizationStatus,
  type OrganizationUser,
  type PlatformAuditEvent,
  type UserStatus,
  type WorkspaceSettingsSection,
} from "./data";

type Page = "Overview" | "Organizations" | "Limits" | "Users" | "Audit Logs" | "Messages" | "Settings";
type AdminProfile = {
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  timezone: string;
};
type AdminPermission = "organizations" | "users" | "usage" | "audit" | "inbox" | "settings" | "accessRoles";
type AdminRole = {
  id: string;
  name: string;
  description: string;
  permissions: AdminPermission[];
};
type PlatformAdminUser = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  status: "Active" | "Invited" | "Suspended";
};
type OrganizationOnboardingDetails = {
  name: string;
  plan: string;
  status: OrganizationStatus;
  seatLimit: number;
  recordLimit: number;
  storageLimitGb: number;
  modules: ModuleName[];
  ownerName: string;
  ownerEmail: string;
  code: string;
  logoDataUrl: string;
  address: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  registrationNumber: string;
  taxId: string;
  bankAccounts: OrganizationBankAccount[];
};

const ADMIN_PERMISSIONS: { id: AdminPermission; label: string }[] = [
  { id: "organizations", label: "Organizations" },
  { id: "users", label: "Users" },
  { id: "usage", label: "Limits" },
  {
    id: "audit",
    label: "Audit Logs",
  },
  { id: "inbox", label: "Messages" },
  { id: "settings", label: "Settings" },
  { id: "accessRoles", label: "Access & roles" },
];

const INITIAL_ADMIN_ROLES: AdminRole[] = [
  { id: "platform-admin", name: "Platform Admin", description: "Full platform administration access", permissions: ADMIN_PERMISSIONS.map(({ id }) => id) },
  { id: "support-admin", name: "Support Admin", description: "Organization, user, and contact support", permissions: ["organizations", "users", "audit", "inbox", "settings"] },
  { id: "usage-analyst", name: "Usage Analyst", description: "Read-only usage and audit visibility", permissions: ["usage", "audit", "settings"] },
];
const DASHBOARD_MODULE_ICONS: Record<ModuleName, string> = {
  Approvals: "/approval.png",
  Ledger: "/ledger.png",
  Receivables: "/receiveables.png",
  Payables: "/payables.png",
  Reconciliation: "/reconciliation.png",
  Invoice: "/invoice.png",
  Inventory: "/inventory.png",
  Procurement: "/procurement.png",
  Payroll: "/payroll.png",
  Reports: "/reports.png",
  "Audit Logs": "/audit.png",
};
const INITIAL_PLATFORM_ADMINS: PlatformAdminUser[] = [
  { id: "admin-operator", name: "Admin Operator", email: "admin@intentrun.com", roleId: "platform-admin", status: "Active" },
];
const INITIAL_ADMIN_PROFILE: AdminProfile = {
  firstName: "Admin",
  lastName: "Operator",
  email: "admin@intentrun.com",
  roleId: "platform-admin",
  timezone: "Africa/Lagos",
};
const SIDEBAR_COLLAPSED_STORAGE_KEY = "intentrun-admin-sidebar-collapsed";

const PAGE_ICONS = {
  Overview: null,
  Organizations: null,
  "Limits": null,
  Users: null,
  "Audit Logs": null,
  "Messages": null,
  Settings: null,
};
const PAGE_IMAGES: Partial<Record<Page, string>> = {
  Overview: "/overview.png",
  Organizations: "/organization.png",
  Limits: "/limits.png",
  Users: "/users.png",
  "Audit Logs": "/audit.png",
  Messages: "/messages.png",
  Settings: "/settings.png",
};

const currency = new Intl.NumberFormat("en", { notation: "compact" });
const number = new Intl.NumberFormat("en");

function AdminClock({ timeZone }: { timeZone: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const formattedTime = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone,
  }).format(now);
  const formattedDate = new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(now);

  return (
    <div className="app-brand-clock">
      <span className="app-brand-date" aria-label={`Current date ${formattedDate} in ${timeZone}`}>
        {formattedDate}
      </span>
      <time dateTime={now.toISOString()} aria-label={`Current time ${formattedTime} in ${timeZone}`}>
        {formattedTime}
      </time>
    </div>
  );
}

function percent(value: number, limit: number) {
  if (!limit) return 0;
  return Math.min(100, Math.round((value / limit) * 100));
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }
  return (words[0]?.slice(0, 2) || "A").toUpperCase();
}

function getOwnerAccess(organization: Organization | undefined) {
  const modules = new Set(organization?.modules ?? []);
  return {
    allowedTabs: DASHBOARD_TABS.filter(
      (tab) => tab === "Overview" || tab === "Settings" || modules.has(tab as ModuleName),
    ),
    allowedSettingsSections: [...WORKSPACE_SETTINGS_SECTIONS],
  };
}

function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase().replaceAll(" ", "-");
  return <span className={`status-badge status-${key}`}>{status}</span>;
}

function UsageBar({
  value,
  limit,
  tone = "gold",
}: {
  value: number;
  limit: number;
  tone?: "gold" | "green" | "ink";
}) {
  return (
    <div
      className={`usage-bar usage-bar-${tone}`}
      role="progressbar"
      aria-valuenow={Math.min(value, limit)}
      aria-valuemin={0}
      aria-valuemax={limit}
    >
      <span style={{ width: `${percent(value, limit)}%` }} />
    </div>
  );
}

function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading">
          <div>
            <h2 id="modal-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatRangeDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitialDateRange() {
  const today = new Date();
  return { start: dateKey(new Date(today.getFullYear(), 0, 1)), end: dateKey(today) };
}

function DateRangePicker({
  start,
  end,
  onApply,
}: {
  start: string;
  end: string;
  onApply: (start: string, end: string) => void;
}) {
  const today = new Date();
  const todayKey = dateKey(today);
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const yearStartKey = dateKey(yearStart);
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(() => parseDateKey(start));
  const [draftEnd, setDraftEnd] = useState(() => parseDateKey(end));
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = parseDateKey(start);
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const pickerRef = useRef<HTMLDivElement>(null);
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const isSameDay = (first: Date, second: Date) =>
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate();

  useEffect(() => {
    if (!open) return;
    function dismissPicker(event: MouseEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        setOpen(false);
      } else if (
        event instanceof MouseEvent &&
        event.target instanceof Node &&
        !pickerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", dismissPicker);
    document.addEventListener("keydown", dismissPicker);
    return () => {
      document.removeEventListener("mousedown", dismissPicker);
      document.removeEventListener("keydown", dismissPicker);
    };
  }, [open]);

  function applyRange(rangeStart: Date, rangeEnd: Date) {
    const normalizedStart = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
    const normalizedEnd = rangeStart <= rangeEnd ? rangeEnd : rangeStart;
    onApply(dateKey(normalizedStart), dateKey(normalizedEnd));
    setDraftStart(normalizedStart);
    setDraftEnd(normalizedEnd);
    setSelectingEnd(false);
    setVisibleMonth(new Date(normalizedStart.getFullYear(), normalizedStart.getMonth(), 1));
    setOpen(false);
  }

  function chooseDate(date: Date) {
    if (!selectingEnd) {
      setDraftStart(date);
      setDraftEnd(date);
      setSelectingEnd(true);
    } else if (date < draftStart) {
      setDraftStart(date);
      setDraftEnd(draftStart);
      setSelectingEnd(false);
    } else {
      setDraftEnd(date);
      setSelectingEnd(false);
    }
  }

  function monthDates(month: Date) {
    const firstDay = (month.getDay() + 6) % 7;
    const gridStart = new Date(month.getFullYear(), month.getMonth(), 1 - firstDay);
    return Array.from(
      { length: 42 },
      (_, index) =>
        new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index),
    );
  }

  function renderMonth(offset: number) {
    const month = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() + offset,
      1,
    );
    return (
      <div className={`range-calendar-month${offset ? " range-calendar-month-next" : ""}`} key={dateKey(month)}>
        <h3>{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h3>
        <div className="range-calendar-weekdays">
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="range-calendar-grid">
          {monthDates(month).map((date) => {
            const key = dateKey(date);
            const inMonth = date.getMonth() === month.getMonth();
            const selected = isSameDay(date, draftStart) || isSameDay(date, draftEnd);
            const between = date > draftStart && date < draftEnd;
            const disabled = !inMonth || key < yearStartKey || key > todayKey;
            return (
              <button
                key={key}
                type="button"
                className={`${inMonth ? "" : "outside-month"}${selected ? " selected" : ""}${between ? " in-range" : ""}`}
                disabled={disabled}
                aria-pressed={selected}
                onClick={() => chooseDate(date)}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function selectPreset(kind: "month" | "30days" | "year") {
    const endDate = new Date();
    let startDate: Date;
    if (kind === "month") {
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    } else if (kind === "30days") {
      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 29);
      if (startDate < yearStart) startDate.setTime(yearStart.getTime());
    } else {
      startDate = yearStart;
    }
    applyRange(startDate, endDate);
  }

  return (
    <div className="date-range-picker" ref={pickerRef}>
      <button
        className="button button-secondary date-range-button"
        type="button"
        aria-label={`Choose date range: ${formatRangeDate(parseDateKey(start))} – ${formatRangeDate(parseDateKey(end))}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setDraftStart(parseDateKey(start));
          setDraftEnd(parseDateKey(end));
          setSelectingEnd(false);
          setVisibleMonth(() => {
            const startDate = parseDateKey(start);
            return new Date(startDate.getFullYear(), startDate.getMonth(), 1);
          });
          setOpen((current) => !current);
        }}
      >
        <CalendarDays size={15} />
        <span>{formatRangeDate(parseDateKey(start))} – {formatRangeDate(parseDateKey(end))}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="date-range-popover" role="dialog" aria-label="Choose date range">
          <div className="date-range-summary">
            <span>Selected range</span>
            <strong>{formatRangeDate(draftStart)} – {formatRangeDate(draftEnd)}</strong>
          </div>
          <div className="date-range-navigation">
            <button
              type="button"
              aria-label="Previous month"
              disabled={visibleMonth <= yearStart}
              onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <span>{selectingEnd ? "Choose an end date" : "Choose a start date"}</span>
            <button
              type="button"
              aria-label="Next month"
              disabled={visibleMonth >= currentMonth}
              onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="date-range-calendars">
            {renderMonth(0)}
            {renderMonth(1)}
          </div>
          <div className="date-range-footer">
            <div className="date-range-presets">
              <button type="button" onClick={() => selectPreset("30days")}>Last 30 days</button>
              <button type="button" onClick={() => selectPreset("month")}>This month</button>
              <button type="button" onClick={() => selectPreset("year")}>Year to date</button>
            </div>
            <button
              className="button button-primary"
              type="button"
              disabled={selectingEnd}
              onClick={() => applyRange(draftStart, draftEnd)}
            >
              Apply range
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PageSkeleton({ title, isOverview }: { title: string; isOverview: boolean }) {
  return (
    <section className={`page-skeleton${isOverview ? " page-skeleton-overview" : ""}`}>
      <span className="sr-only" role="status">Loading {title}…</span>
      <div className="page-skeleton-visuals" aria-hidden="true">
      <div className="skeleton-heading">
        <div className="skeleton-heading-copy">
          <span className="skeleton-block skeleton-title" />
          <span className="skeleton-block skeleton-subtitle" />
        </div>
        <span className="skeleton-block skeleton-action" />
      </div>
      {isOverview ? (
        <>
          <div className="skeleton-stat-grid">
            {[0, 1, 2].map((item) => (
              <div className="skeleton-card skeleton-stat" key={item}>
                <span className="skeleton-block skeleton-stat-icon" />
                <span className="skeleton-block skeleton-stat-label" />
                <span className="skeleton-block skeleton-stat-value" />
                <span className="skeleton-block skeleton-line-short" />
              </div>
            ))}
          </div>
          <div className="skeleton-content-grid">
            <div className="skeleton-card skeleton-chart">
              <span className="skeleton-block skeleton-panel-title" />
              <span className="skeleton-block skeleton-chart-area" />
            </div>
            <div className="skeleton-card skeleton-list">
              <span className="skeleton-block skeleton-panel-title" />
              {[0, 1, 2, 3].map((item) => (
                <span className="skeleton-block skeleton-list-row" key={item} />
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className={`skeleton-card skeleton-table${title === "Messages" ? " skeleton-messages" : ""}`}>
          <div className="skeleton-toolbar">
            <span className="skeleton-block skeleton-search" />
            <span className="skeleton-block skeleton-filter" />
          </div>
          <span className="skeleton-block skeleton-table-heading" />
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <span className="skeleton-block skeleton-table-row" key={item} />
          ))}
        </div>
      )}
      </div>
    </section>
  );
}

function App() {
  const [page, setPage] = useState<Page>("Overview");
  const [pageLoading, setPageLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [organizations, setOrganizations] = useState(MOCK_ORGANIZATIONS);
  const [users, setUsers] = useState(MOCK_USERS);
  const [submissions, setSubmissions] = useState(MOCK_SUBMISSIONS);
  const [adminProfile, setAdminProfile] = useState<AdminProfile>(INITIAL_ADMIN_PROFILE);
  const [adminRoles, setAdminRoles] = useState(INITIAL_ADMIN_ROLES);
  const [platformAdmins, setPlatformAdmins] = useState(INITIAL_PLATFORM_ADMINS);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileNavToggleRef = useRef<HTMLButtonElement>(null);
  const [accessUserId, setAccessUserId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(MOCK_SUBMISSIONS[0].id);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState(getInitialDateRange);
  const [orgFilter, setOrgFilter] = useState("all");
  const [submissionFilter, setSubmissionFilter] = useState("All messages");
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showLimits, setShowLimits] = useState(false);
  const [notice, setNotice] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true",
  );
  const pageViewKey = `${page}:${organizationId ?? ""}`;

  const selectedOrganization =
    organizations.find((organization) => organization.id === organizationId) ?? null;
  const selectedSubmission =
    submissions.find((submission) => submission.id === selectedSubmissionId) ?? submissions[0] ?? null;
  const selectedAccessUser = users.find((user) => user.id === accessUserId) ?? null;
  const totalSeats = organizations.reduce((total, org) => total + org.seatsUsed, 0);
  const totalSeatLimit = organizations.reduce((total, org) => total + org.seatLimit, 0);
  const totalSignIns = organizations.reduce((total, org) => total + org.monthlySignIns, 0);
  const totalRecords = organizations.reduce((total, org) => total + org.records, 0);
  const activeOrganizations = organizations.filter((org) => org.status === "Active").length;
  const activeUsers = users.filter((user) => user.status === "Active").length;
  const newMessages = submissions.filter((submission) => submission.status === "New").length;

  useEffect(() => {
    if (!profileMenuOpen) return;

    function dismissMenu(event: MouseEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        setProfileMenuOpen(false);
      } else if (
        event instanceof MouseEvent &&
        event.target instanceof Node &&
        !profileMenuRef.current?.contains(event.target)
      ) {
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", dismissMenu);
    document.addEventListener("keydown", dismissMenu);
    return () => {
      document.removeEventListener("mousedown", dismissMenu);
      document.removeEventListener("keydown", dismissMenu);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    setPageLoading(true);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const timeout = window.setTimeout(() => setPageLoading(false), reducedMotion ? 0 : 420);
    return () => window.clearTimeout(timeout);
  }, [pageViewKey]);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    let isActive = true;
    const syncDashboardFeedback = async () => {
      try {
        const response = await fetch("/api/feedback");
        if (!response.ok) return;
        const incoming: unknown = await response.json();
        if (!isActive || !Array.isArray(incoming)) return;
        setSubmissions((current) => {
          const existingIds = new Set(current.map((submission) => submission.id));
          const newSubmissions = (incoming as ContactSubmission[]).filter(
            (submission) => !existingIds.has(submission.id),
          );
          return newSubmissions.length ? [...newSubmissions, ...current] : current;
        });
      } catch {
        return;
      }
    };

    void syncDashboardFeedback();
    const intervalId = window.setInterval(() => void syncDashboardFeedback(), 3_000);
    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
        mobileNavToggleRef.current?.focus();
      }
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileNavOpen]);

  const filteredOrganizations = useMemo(() => {
    const term = search.toLowerCase().trim();
    return organizations.filter((organization) => {
      return (
        (!term ||
          organization.name.toLowerCase().includes(term)) &&
        (orgFilter === "all" || organization.status === orgFilter)
      );
    });
  }, [organizations, orgFilter, search]);

  const filteredUsers = useMemo(() => {
    const term = search.toLowerCase().trim();
    return users.filter((user) => {
      const organization = organizations.find((org) => org.id === user.organizationId);
      return (
        (!term ||
          user.name.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          organization?.name.toLowerCase().includes(term)) &&
        (orgFilter === "all" || user.organizationId === orgFilter)
      );
    });
  }, [organizations, orgFilter, search, users]);

  const filteredSubmissions = useMemo(() => {
    const term = search.toLowerCase().trim();
    return submissions.filter((submission) => {
      return (
        (!term ||
          submission.name.toLowerCase().includes(term) ||
          submission.company.toLowerCase().includes(term) ||
          submission.subject.toLowerCase().includes(term)) &&
        (submissionFilter === "All messages" || submission.status === submissionFilter)
      );
    });
  }, [search, submissionFilter, submissions]);

  const filteredAuditEvents = useMemo(() => {
    const term = search.toLowerCase().trim();
    return MOCK_AUDIT_EVENTS.filter((event) => {
      const organization = organizations.find((org) => org.id === event.organizationId);
      return (
        (!term ||
          event.user.toLowerCase().includes(term) ||
          event.email.toLowerCase().includes(term) ||
          event.action.toLowerCase().includes(term) ||
          event.detail.toLowerCase().includes(term) ||
          organization?.name.toLowerCase().includes(term)) &&
        (orgFilter === "all" || event.organizationId === orgFilter)
      );
    });
  }, [organizations, orgFilter, search]);

  function closeMobileNav() {
    setMobileNavOpen(false);
    mobileNavToggleRef.current?.focus();
  }

  function openPage(nextPage: Page) {
    if (mobileNavOpen) closeMobileNav();
    setPage(nextPage);
    setOrganizationId(null);
    setSearch("");
    setOrgFilter("all");
  }

  function updateOrganization(id: string, update: Partial<Organization>) {
    setOrganizations((current) =>
      current.map((organization) =>
        organization.id === id ? { ...organization, ...update } : organization,
      ),
    );
    if (update.modules) {
      const enabledModules = new Set(update.modules);
      setUsers((current) =>
        current.map((user) =>
          user.organizationId === id
            ? {
                ...user,
                allowedTabs: user.role === "Owner"
                  ? DASHBOARD_TABS.filter(
                      (tab) => tab === "Overview" || tab === "Settings" || enabledModules.has(tab as ModuleName),
                    )
                  : user.allowedTabs.filter(
                      (tab) => tab === "Overview" || tab === "Settings" || enabledModules.has(tab as ModuleName),
                    ),
                ...(user.role === "Owner"
                  ? { allowedSettingsSections: [...WORKSPACE_SETTINGS_SECTIONS] }
                  : {}),
              }
            : user,
        ),
      );
    }
  }

  function updateUser(id: string, update: Partial<OrganizationUser>) {
    setUsers((current) =>
      current.map((user) => {
        if (user.id !== id) return user;
        const nextUser = { ...user, ...update };
        if (nextUser.role !== "Owner") return nextUser;
        return { ...nextUser, ...getOwnerAccess(organizations.find((org) => org.id === user.organizationId)) };
      }),
    );
    setNotice("User details updated.");
  }

  function updateSubmission(id: string, update: Partial<ContactSubmission>) {
    setSubmissions((current) =>
      current.map((submission) =>
        submission.id === id ? { ...submission, ...update } : submission,
      ),
    );
    setNotice("Enquiry status updated.");
  }

  function createOrganization(details: OrganizationOnboardingDetails) {
    const id = `org-${Date.now()}`;
    const { ownerName, ownerEmail, ...profile } = details;
    const newOrganization: Organization = {
      id,
      ...profile,
      contactName: profile.contactName || ownerName,
      contactEmail: profile.contactEmail || ownerEmail,
      createdAt: new Date().toISOString().slice(0, 10),
      seatsUsed: 1,
      activeUsers: 1,
      monthlySignIns: 0,
      records: 0,
      storageGb: 0,
      accent: "#d7ccef",
    };
    setOrganizations((current) => [newOrganization, ...current]);
    setUsers((current) => [
      {
        id: `usr-${Date.now()}`,
        name: ownerName,
        email: ownerEmail,
        organizationId: id,
        role: "Owner",
        status: "Invited",
        lastActive: "Pending invite",
        allowedTabs: ["Overview", ...details.modules, "Settings"],
        allowedSettingsSections: [...WORKSPACE_SETTINGS_SECTIONS],
      },
      ...current,
    ]);
    setShowCreateOrg(false);
    setPage("Organizations");
    setNotice("Organization added to the preview. Owner password was not applied because authentication is not connected.");
  }

  function signOut() {
    setProfileMenuOpen(false);
    setOrganizations(MOCK_ORGANIZATIONS);
    setUsers(MOCK_USERS);
    setSubmissions(MOCK_SUBMISSIONS);
    setAdminProfile(INITIAL_ADMIN_PROFILE);
    setAdminRoles(INITIAL_ADMIN_ROLES);
    setPlatformAdmins(INITIAL_PLATFORM_ADMINS);
    setOrganizationId(null);
    setPage("Overview");
    setSearch("");
    setOrgFilter("all");
    setSubmissionFilter("All messages");
    setNotice("");
    setSignedOut(true);
  }

  function restartPreviewSession() {
    setSignedOut(false);
    setPage("Overview");
  }

  if (signedOut) {
    return (
      <main className="signed-out-screen">
        <section className="signed-out-card">
          <span className="signed-out-icon"><LogOut size={20} /></span>
          <h1>You’re signed out</h1>
          <p>Your current in-memory admin preview session has ended. This standalone preview does not have real authentication; restarting begins a new preview session.</p>
          <button className="button button-primary" type="button" onClick={restartPreviewSession}>
            Start preview session
          </button>
        </section>
      </main>
    );
  }

  const pageTitle = organizationId && selectedOrganization ? selectedOrganization.name : page;
  const headingTitle = page === "Overview" && !organizationId
    ? `Hello, ${adminProfile.firstName}`
    : pageTitle;
  const adminFullName = `${adminProfile.firstName} ${adminProfile.lastName}`.trim();
  const signedInAdminRole = adminRoles.find((role) => role.id === adminProfile.roleId);
  const titleDescription =
    organizationId && selectedOrganization
      ? "Organization snapshot and configuration"
      : {
          Overview: "Your platform at a glance",
          Organizations: "Manage organization accounts and onboarding",
          Limits: "Monitor activity and configure plan limits",
          Users: "Browse and manage organization staff",
          Messages: "Review enquiries sent to your team",
          "Audit Logs": "Review workspace activity across organizations",
          Settings: "Manage your administrator profile, security, access, and roles",
        }[page];

  return (
    <div className={`admin-app${sidebarCollapsed ? " sidebar-collapsed" : ""}${mobileNavOpen ? " mobile-nav-open" : ""}`}>
      <header className="app-brand-bar">
        <img className="app-brand-logo" src="/intentrunw.png" alt="IntentRun" />
        <AdminClock timeZone={adminProfile.timezone} />
      </header>
      <aside className="sidebar" id="admin-mobile-navigation">
        <div className="brand-lockup">
          <img
            className="brand-logo"
            src={sidebarCollapsed && !mobileNavOpen ? "/intentrun fav.png" : "/intentrun.png"}
            alt="IntentRun"
          />
          <button className="sidebar-close-button" type="button" aria-label="Close navigation menu" onClick={closeMobileNav}>
            <X size={18} />
          </button>
        </div>
        <nav className="primary-nav" aria-label="Platform administration">
          {(Object.keys(PAGE_ICONS) as Page[]).map((item) => {
            const Icon = PAGE_ICONS[item];
            return (
              <button
                className={`nav-item${page === item && (!organizationId || item === "Organizations" || item === "Users") ? " nav-item-active" : ""}`}
                key={item}
                type="button"
                title={sidebarCollapsed ? item : undefined}
                aria-label={item === "Messages" ? `${item}${newMessages > 0 ? `, ${newMessages} new messages` : ""}` : item}
                onClick={() => openPage(item)}
              >
                {PAGE_IMAGES[item] ? (
                  <img className="nav-item-image" src={PAGE_IMAGES[item]} alt="" aria-hidden="true" />
                ) : (
                  Icon && <Icon size={16} strokeWidth={1.8} />
                )}
                <span>{item}</span>
                {item === "Messages" && newMessages > 0 && (
                  <span className="nav-count" aria-label={`${newMessages} new messages`}>{newMessages}</span>
                )}
              </button>
            );
          })}
        </nav>
        <button
          className="sidebar-toggle"
          type="button"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </aside>
      <button
        className="mobile-nav-backdrop"
        type="button"
        aria-label="Dismiss navigation backdrop"
        tabIndex={mobileNavOpen ? 0 : -1}
        onClick={closeMobileNav}
      />
      <main className="main-area" aria-busy={pageLoading}>
      <header className="topbar">
        <button
          className="mobile-nav-toggle"
          ref={mobileNavToggleRef}
          type="button"
          aria-controls="admin-mobile-navigation"
          aria-expanded={mobileNavOpen}
          aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
          onClick={() => mobileNavOpen ? closeMobileNav() : setMobileNavOpen(true)}
        >
          {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="topbar-actions">
          <div className="profile-menu-wrap" ref={profileMenuRef}>
            <button
              className="profile-menu-button"
              type="button"
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              aria-label={`Signed in as ${adminFullName}. Account menu`}
              onClick={() => setProfileMenuOpen((open) => !open)}
            >
              <span className="profile-menu-avatar" aria-hidden="true">
                {getInitials(adminFullName)}
              </span>
            </button>
            {profileMenuOpen && (
              <div className="profile-dropdown" role="menu" aria-label="Administrator account">
                <div className="profile-dropdown-identity">
                  <span>
                    <strong>{adminFullName}</strong>
                    <small>{adminProfile.email}</small>
                    <small>{signedInAdminRole?.name ?? "Role not assigned"}</small>
                  </span>
                </div>
                <div className="profile-dropdown-divider" />
                <button
                  className="profile-dropdown-item"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    openPage("Settings");
                  }}
                >
                  <Settings size={15} /> Account settings
                </button>
                <button
                  className="profile-dropdown-item profile-dropdown-logout"
                  type="button"
                  role="menuitem"
                  onClick={signOut}
                >
                  <LogOut size={15} /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

        <div className="content-wrap admin-page-content" key={pageViewKey}>
          {pageLoading ? (
            <PageSkeleton title={pageTitle} isOverview={page === "Overview"} />
          ) : (
            <>
          <div className="page-heading">
            <div className="heading-copy">
              {organizationId && selectedOrganization && (
                <button className="back-link" type="button" onClick={() => setOrganizationId(null)}>
                  <ArrowLeft size={14} /> Back to organizations
                </button>
              )}
              <h1>{headingTitle}</h1>
              <p>{page === "Overview" ? "Here’s your platform at a glance." : titleDescription}</p>
            </div>
            <div className="heading-actions">
              {page === "Overview" && (
                <DateRangePicker
                  start={dateRange.start}
                  end={dateRange.end}
                  onApply={(start, end) => setDateRange({ start, end })}
                />
              )}
              {page === "Organizations" && !organizationId && (
                <button className="button button-primary" type="button" onClick={() => setShowCreateOrg(true)}>
                  <Plus size={16} /> Onboard Organization
                </button>
              )}
              {page === "Messages" && (
                <button className="button button-secondary" type="button" onClick={() => setSubmissionFilter("All messages")}>
                  <Mail size={15} /> {submissions.length} enquiries
                </button>
              )}
            </div>
          </div>

          {page === "Overview" && (
            <Overview
              organizations={organizations}
              totalSeats={totalSeats}
              totalSeatLimit={totalSeatLimit}
              totalSignIns={totalSignIns}
              totalRecords={totalRecords}
              activeOrganizations={activeOrganizations}
              activeUsers={activeUsers}
              newMessages={newMessages}
              dateRange={dateRange}
              onPageChange={openPage}
              onSelectOrganization={(id) => {
                setOrganizationId(id);
                setPage("Organizations");
              }}
            />
          )}
          {page === "Settings" && (
            <AdminSettingsPage
              profile={adminProfile}
              roles={adminRoles}
              admins={platformAdmins}
              onSaveProfile={(profile) => {
                setAdminProfile(profile);
                setPlatformAdmins((current) => current.map((admin) => admin.id === "admin-operator"
                  ? { ...admin, name: `${profile.firstName} ${profile.lastName}`.trim(), email: profile.email, roleId: profile.roleId }
                  : admin));
                setNotice("Profile details saved for this session.");
              }}
              onSaveRoles={(roles) => {
                setAdminRoles(roles.map((role) => role.id === "platform-admin"
                  ? { ...role, permissions: ADMIN_PERMISSIONS.map(({ id }) => id) }
                  : role));
                setNotice("Role permissions saved for this session. Access enforcement requires admin authentication.");
              }}
              onSaveAdmins={(admins) => {
                setPlatformAdmins(admins);
                const signedInAdmin = admins.find((admin) => admin.id === "admin-operator");
                if (signedInAdmin) {
                  setAdminProfile((current) => ({ ...current, roleId: signedInAdmin.roleId }));
                }
                setNotice("Administrator access saved for this session. Invitations are not sent until authentication is configured.");
              }}
            />
          )}

          {page === "Organizations" && !organizationId && (
            <OrganizationsPage
              organizations={filteredOrganizations}
              search={search}
              filter={orgFilter}
              onSearch={setSearch}
              onFilter={setOrgFilter}
              onSelect={(id) => setOrganizationId(id)}
            />
          )}

          {page === "Organizations" && selectedOrganization && (
            <OrganizationDetail
              organization={selectedOrganization}
              users={users.filter((user) => user.organizationId === selectedOrganization.id)}
              onEditLimits={() => setShowLimits(true)}
              onStatusChange={(status) => {
                updateOrganization(selectedOrganization.id, { status });
                setNotice(`Organization status changed to ${status}.`);
              }}
              onShowUsers={() => {
                setOrgFilter(selectedOrganization.id);
                setPage("Users");
              }}
            />
          )}

          {page === "Limits" && (
            <UsagePage
              organizations={organizations}
              onEdit={(id) => {
                setOrganizationId(id);
                setPage("Organizations");
                setShowLimits(true);
              }}
            />
          )}

          {page === "Users" && (
            <UsersPage
              users={filteredUsers}
              organizations={organizations}
              search={search}
              orgFilter={orgFilter}
              onSearch={setSearch}
              onOrgFilter={setOrgFilter}
              onUpdateUser={updateUser}
              onManageAccess={(id) => setAccessUserId(id)}
            />
          )}

          {page === "Audit Logs" && (
            <DashboardAuditPage
              events={filteredAuditEvents}
              organizations={organizations}
              search={search}
              orgFilter={orgFilter}
              onSearch={setSearch}
              onOrgFilter={setOrgFilter}
            />
          )}

          {page === "Messages" && (
            <InboxPage
              submissions={filteredSubmissions}
              selectedSubmission={selectedSubmission}
              search={search}
              filter={submissionFilter}
              onSearch={setSearch}
              onFilter={setSubmissionFilter}
              onSelect={(id) => setSelectedSubmissionId(id)}
              onUpdateSubmission={updateSubmission}
            />
          )}
          <footer className="page-footer">
          </footer>
            </>
          )}
        </div>
      </main>

      {showCreateOrg && (
        <Modal
          title="Add an organization"
          description="Set up the organization profile and invite its primary owner."
          onClose={() => setShowCreateOrg(false)}
        >
          <OrganizationOnboardingForm
            onCancel={() => setShowCreateOrg(false)}
            onSubmit={(details) => {
              createOrganization(details);
            }}
          />
        </Modal>
      )}

      {showLimits && selectedOrganization && (
        <LimitsModal
          organization={selectedOrganization}
          onClose={() => setShowLimits(false)}
          onSave={(update) => {
            updateOrganization(selectedOrganization.id, update);
            setShowLimits(false);
            setNotice("Limits updated.");
          }}
        />
      )}

      {selectedAccessUser && (
        <UserAccessModal
          user={selectedAccessUser}
          organization={organizations.find((organization) => organization.id === selectedAccessUser.organizationId)}
          onClose={() => setAccessUserId(null)}
          onSave={(update) => {
            updateUser(selectedAccessUser.id, update);
            setAccessUserId(null);
          }}
        />
      )}

      {notice && (
        <Modal title="Confirmation" description={notice} onClose={() => setNotice("")}>
          <div className="modal-actions">
            <button className="button button-primary" type="button" onClick={() => setNotice("")}>
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function OrganizationOnboardingForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (details: OrganizationOnboardingDetails) => void;
}) {
  const [draft, setDraft] = useState({
    name: "",
    plan: "Growth",
    status: "Active" as OrganizationStatus,
    seatLimit: "10",
    recordLimit: "5000",
    storageLimitGb: "5",
    modules: ["Ledger", "Receivables", "Payables", "Reports"] as ModuleName[],
    ownerName: "",
    ownerEmail: "",
  });
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [step, setStep] = useState(0);
  const steps = ["Organization", "Plan & access", "Primary owner", "Review"];

  function update<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleModule(moduleName: ModuleName) {
    setDraft((current) => ({
      ...current,
      modules: current.modules.includes(moduleName)
        ? current.modules.filter((module) => module !== moduleName)
        : [...current.modules, moduleName],
    }));
  }

  function createOrganization() {
    if (step !== steps.length - 1) return;
    const randomPart = globalThis.crypto?.randomUUID?.().replaceAll("-", "").slice(0, 8) ??
      Math.random().toString(36).slice(2, 10).toUpperCase();
    setPassword("");
    setPasswordConfirmation("");
    onSubmit({
      ...draft,
      name: draft.name.trim(),
      seatLimit: Number(draft.seatLimit),
      recordLimit: Number(draft.recordLimit),
      storageLimitGb: Number(draft.storageLimitGb),
      ownerName: draft.ownerName.trim(),
      ownerEmail: draft.ownerEmail.trim(),
      logoDataUrl: "",
      address: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      website: "",
      registrationNumber: "",
      taxId: "",
      bankAccounts: [],
      code: `ORG-${randomPart}`,
    });
  }

  function continueStep() {
    setPasswordError("");
    if (step === 0 && !draft.name.trim()) {
      setPasswordError("Enter the organization name to continue.");
      return;
    }
    if (step === 1) {
      if (
        !Number.isFinite(Number(draft.seatLimit)) ||
        Number(draft.seatLimit) < 1 ||
        !Number.isFinite(Number(draft.recordLimit)) ||
        Number(draft.recordLimit) < 0 ||
        !Number.isFinite(Number(draft.storageLimitGb)) ||
        Number(draft.storageLimitGb) < 0
      ) {
        setPasswordError("Enter valid non-negative limits and allow at least one staff seat.");
        return;
      }
      if (draft.modules.length === 0) {
        setPasswordError("Enable at least one dashboard module.");
        return;
      }
    }
    if (step === 2) {
      if (!draft.ownerName.trim() || !draft.ownerEmail.trim()) {
        setPasswordError("Enter the primary owner’s name and email to continue.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.ownerEmail.trim())) {
        setPasswordError("Enter a valid owner email address.");
        return;
      }
      if (password.length < 12) {
        setPasswordError("Use at least 12 characters for the temporary password.");
        return;
      }
      if (password !== passwordConfirmation) {
        setPasswordError("The passwords do not match.");
        return;
      }
    }
    setStep((current) => current + 1);
  }

  return (
    <form
      className="form-stack onboarding-form"
      onSubmit={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (
          event.key === "Enter" &&
          step < steps.length - 1 &&
          event.target instanceof HTMLInputElement &&
          event.target.type !== "checkbox"
        ) {
          event.preventDefault();
          continueStep();
        }
      }}
      noValidate
    >
      <ol className="onboarding-stepper" aria-label="Organization onboarding progress">
        {steps.map((label, index) => (
          <li className={index === step ? "onboarding-step-active" : index < step ? "onboarding-step-done" : ""} key={label}>
            <span>{index < step ? <Check size={13} /> : index + 1}</span>
            <strong>{label}</strong>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="onboarding-section" aria-labelledby="onboarding-organization-heading">
          <div className="onboarding-section-heading">
            <h3 id="onboarding-organization-heading">Organization details</h3>
            <p>Start with the organization name. The organization can complete its profile after onboarding.</p>
          </div>
          <div className="form-grid">
            <label className="form-field form-field-wide">
              Organization name
              <input value={draft.name} onChange={(event) => update("name", event.target.value)} maxLength={120} autoComplete="organization" placeholder="e.g. Acme Trading Co." required autoFocus />
            </label>
          </div>
          {passwordError && <p className="onboarding-error" role="alert">{passwordError}</p>}
        </section>
      )}

      {step === 1 && (
        <section className="onboarding-section" aria-labelledby="onboarding-configuration-heading">
          <div className="onboarding-section-heading">
            <h3 id="onboarding-configuration-heading">Plan, limits &amp; modules</h3>
            <p>Set the organization’s access and usage limits before creating its workspace.</p>
          </div>
          <div className="form-grid">
            <label className="form-field">
              Subscription plan
              <select value={draft.plan} onChange={(event) => update("plan", event.target.value)}>
                <option>Starter</option>
                <option>Growth</option>
                <option>Enterprise</option>
              </select>
            </label>
            <label className="form-field">
              Organization status
              <select value={draft.status} onChange={(event) => update("status", event.target.value as OrganizationStatus)}>
                <option>Active</option>
                <option>Suspended</option>
              </select>
            </label>
            <label className="form-field">
              Maximum staff seats
              <input type="number" min="1" step="1" value={draft.seatLimit} onChange={(event) => update("seatLimit", event.target.value)} required />
            </label>
            <label className="form-field">
              Record limit
              <input type="number" min="0" step="1" value={draft.recordLimit} onChange={(event) => update("recordLimit", event.target.value)} required />
            </label>
            <label className="form-field form-field-wide">
              Storage limit (GB)
              <input type="number" min="0" step="0.1" value={draft.storageLimitGb} onChange={(event) => update("storageLimitGb", event.target.value)} required />
            </label>
          </div>
          <fieldset className="module-fieldset">
            <legend>Enabled dashboard modules <small>Select at least one</small></legend>
            <div className="module-checkbox-grid">
              {DASHBOARD_MODULES.map((moduleName) => (
                <label className="module-checkbox" key={moduleName}>
                  <input
                    type="checkbox"
                    aria-label={`Onboarding module ${moduleName}`}
                    checked={draft.modules.includes(moduleName)}
                    onChange={() => toggleModule(moduleName)}
                  />
                  <span>{moduleName}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {passwordError && <p className="onboarding-error" role="alert">{passwordError}</p>}
        </section>
      )}

      {step === 2 && (
        <section className="onboarding-section" aria-labelledby="onboarding-owner-heading">
          <div className="onboarding-section-heading">
            <h3 id="onboarding-owner-heading">Primary owner account</h3>
            <p>Set the first organization owner and a temporary password.</p>
          </div>
          <div className="form-grid">
            <label className="form-field">
              Owner name
              <input value={draft.ownerName} onChange={(event) => update("ownerName", event.target.value)} autoComplete="name" placeholder="Full name" required />
            </label>
            <label className="form-field">
              Owner email
              <input type="email" value={draft.ownerEmail} onChange={(event) => update("ownerEmail", event.target.value)} autoComplete="email" placeholder="name@company.com" required />
            </label>
            <label className="form-field">
              Temporary password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={12} required />
              <small>At least 12 characters. Share it with the owner securely.</small>
            </label>
            <label className="form-field">
              Confirm temporary password
              <input type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} autoComplete="new-password" required />
            </label>
          </div>
          {passwordError && <p className="onboarding-error" role="alert">{passwordError}</p>}
          <div className="settings-integration-notice" role="status">
            <ShieldCheck size={16} />
            <div>
              <strong>Authentication is not connected</strong>
              <p>This preview validates the temporary password but cannot apply it to a real owner account. The password is discarded and is never stored.</p>
            </div>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="onboarding-section" aria-labelledby="onboarding-review-heading">
          <div className="onboarding-section-heading">
            <h3 id="onboarding-review-heading">Review onboarding</h3>
            <p>Check the account basics before creating the organization.</p>
          </div>
          <dl className="onboarding-review">
            <div><dt>Organization</dt><dd>{draft.name}</dd></div>
            <div><dt>Plan &amp; status</dt><dd>{draft.plan} · {draft.status}</dd></div>
            <div><dt>Staff seats</dt><dd>{draft.seatLimit}</dd></div>
            <div><dt>Record limit</dt><dd>{number.format(Number(draft.recordLimit))}</dd></div>
            <div><dt>Storage limit</dt><dd>{draft.storageLimitGb} GB</dd></div>
            <div className="onboarding-review-wide"><dt>Enabled modules</dt><dd>{draft.modules.join(", ")}</dd></div>
            <div><dt>Primary owner</dt><dd>{draft.ownerName}</dd></div>
            <div><dt>Owner email</dt><dd>{draft.ownerEmail}</dd></div>
            <div><dt>Workspace role</dt><dd>Owner</dd></div>
            <div><dt>Temporary password</dt><dd>{password ? "Entered · will not be stored in this preview" : "Not entered"}</dd></div>
          </dl>
          <div className="onboarding-profile-followup">
            <strong>Organization profile to complete after onboarding</strong>
            <p>The owner can add their logo, registered address, contact details, website, registration and tax IDs, and company bank accounts in the workspace profile.</p>
          </div>
          <div className="settings-integration-notice" role="status">
            <ShieldCheck size={16} />
            <div>
              <strong>Preview limitation</strong>
              <p>The organization and owner are added to the local admin preview. Creating a live account and setting its password require connected authentication and backend services.</p>
            </div>
          </div>
        </section>
      )}

      <div className="modal-actions onboarding-actions">
        <button className="button button-secondary" type="button" onClick={step === 0 ? onCancel : () => { setPasswordError(""); setStep((current) => current - 1); }}>
          {step === 0 ? "Cancel" : "Back"}
        </button>
        {step < steps.length - 1 ? (
          <button className="button button-primary" type="button" onClick={continueStep}>
            Continue <ArrowRight size={15} />
          </button>
        ) : (
          <button className="button button-primary" type="button" onClick={createOrganization}>
            <Plus size={15} /> Create organization
          </button>
        )}
      </div>
    </form>
  );
}

function Overview({
  organizations,
  totalSeats,
  totalSeatLimit,
  totalSignIns,
  totalRecords,
  activeOrganizations,
  activeUsers,
  newMessages,
  dateRange,
  onPageChange,
  onSelectOrganization,
}: {
  organizations: Organization[];
  totalSeats: number;
  totalSeatLimit: number;
  totalSignIns: number;
  totalRecords: number;
  activeOrganizations: number;
  activeUsers: number;
  newMessages: number;
  dateRange: { start: string; end: string };
  onPageChange: (page: Page) => void;
  onSelectOrganization: (id: string) => void;
}) {
  const rangeStart = parseDateKey(dateRange.start);
  const rangeEnd = parseDateKey(dateRange.end);
  const monthlyUsage = MONTHLY_USAGE.filter((item) => {
    const monthIndex = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].indexOf(item.month);
    if (monthIndex < 0) return false;
    const year = rangeStart.getFullYear();
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0);
    return monthStart >= rangeStart && monthEnd <= rangeEnd;
  });
  const maxUsage = Math.max(1, ...monthlyUsage.map((item) => item.signIns));
  const metricTrend = (
    value: number,
    factors: readonly number[],
    precision = 0,
  ) => createIllustrativeDailyTrend(value, factors, precision);
  return (
    <div className="page-stack overview-page">
      <section className="metric-grid" aria-label="Platform summary">
        <MetricCard
          icon={<MetricImageIcon src="/organization.png" />}
          label="Organizations"
          value={number.format(organizations.length)}
          detail={`${activeOrganizations} active accounts`}
          trend="All plans"
          tone="gold"
          chart={metricTrend(organizations.length, ILLUSTRATIVE_TREND_FACTORS.organizations)}
        />
        <MetricCard
          icon={<MetricImageIcon src="/users.png" />}
          label="Staff seats in use"
          value={`${number.format(totalSeats)} / ${number.format(totalSeatLimit)}`}
          detail={`${percent(totalSeats, totalSeatLimit)}% of seat capacity`}
          trend={`${percent(totalSeats, totalSeatLimit)}% capacity`}
          tone="green"
          chart={metricTrend(totalSeats, ILLUSTRATIVE_TREND_FACTORS.seats)}
        />
        <MetricCard
          icon={<MetricImageIcon src="/active users.png" />}
          label="Monthly active users"
          value={number.format(activeUsers)}
          detail={`${number.format(totalSignIns)} sign-ins this month`}
          trend="Across organizations"
          tone="blue"
          chart={metricTrend(activeUsers, ILLUSTRATIVE_TREND_FACTORS.activeUsers)}
        />
        <MetricCard
          icon={<MetricImageIcon src="/limits.png" />}
          label="Enabled dashboard modules"
          value={number.format(organizations.reduce((total, org) => total + org.modules.length, 0))}
          detail={`${DASHBOARD_MODULES.length} available modules`}
          trend="Across organizations"
          tone="gold"
          chart={metricTrend(
            organizations.reduce((total, organization) => total + organization.modules.length, 0),
            ILLUSTRATIVE_TREND_FACTORS.modules,
          )}
        />
        <MetricCard
          icon={<MetricImageIcon src="/records.png" />}
          label="Records managed"
          value={currency.format(totalRecords)}
          detail="Across all organizations"
          trend="Usage this period"
          tone="violet"
          chart={metricTrend(totalRecords, ILLUSTRATIVE_TREND_FACTORS.records)}
        />
        <MetricCard
          icon={<MetricImageIcon src="/storage.png" />}
          label="Storage used"
          value={`${organizations.reduce((total, org) => total + org.storageGb, 0).toFixed(1)} GB`}
          detail={`${organizations.reduce((total, org) => total + org.storageLimitGb, 0)} GB combined limit`}
          trend={`${newMessages} new enquiries`}
          tone="green"
          chart={metricTrend(
            organizations.reduce((total, organization) => total + organization.storageGb, 0),
            ILLUSTRATIVE_TREND_FACTORS.storage,
            1,
          )}
        />
      </section>
      <p className="metric-history-note">Previous-day comparisons are illustrative until historical metric data is available.</p>

      <section className="overview-grid">
        <article className="panel usage-overview">
          <div className="panel-heading">
            <div>
              <h2>Platform Activity</h2>
              <p>Full-month sign-ins within the selected date range</p>
            </div>
            <span className="subtle-label"><span className="legend-dot" /> Sign-ins</span>
          </div>
          <div
            className="chart-area"
            role="img"
            aria-label={
              monthlyUsage.length
                ? `Monthly sign-ins from ${monthlyUsage[0].month} to ${monthlyUsage[monthlyUsage.length - 1].month} within the selected date range`
                : "No full-month sign-in data in the selected date range"
            }
          >
            <div className="chart-y-labels"><span>4k</span><span>3k</span><span>2k</span><span>1k</span><span>0</span></div>
            {monthlyUsage.length ? (
              <div className="chart-bars">
                {monthlyUsage.map((item) => (
                <div className="chart-column" key={item.month}>
                  <span className="chart-value">{number.format(item.signIns)}</span>
                  <div className="chart-track"><span style={{ height: `${(item.signIns / maxUsage) * 100}%` }} /></div>
                  <span className="chart-month">{item.month}</span>
                </div>
                ))}
              </div>
            ) : (
              <p className="chart-empty-state">No full-month activity in this date range.</p>
            )}
          </div>
        </article>

        <article className="panel organizations-overview">
          <div className="panel-heading">
            <div>
              <h2>Organizations</h2>
              <p>Seat usage across accounts</p>
            </div>
            <button className="text-button" type="button" onClick={() => onPageChange("Organizations")}>
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="compact-org-list">
            {organizations.slice(0, 4).map((organization) => (
              <button
                className="compact-org-row"
                key={organization.id}
                type="button"
                onClick={() => onSelectOrganization(organization.id)}
              >
                <span className="compact-org-main">
                  <strong>{organization.name}</strong>
                  <small>{number.format(organization.seatsUsed)} / {number.format(organization.seatLimit)} seats</small>
                </span>
                <span className="compact-org-meter"><UsageBar value={organization.seatsUsed} limit={organization.seatLimit} tone="ink" /></span>
                <StatusBadge status={organization.status} />
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="bottom-grid">
        <article className="panel module-panel">
          <div className="panel-heading">
            <div>
              <h2>Dashboard Module Adoption</h2>
              <p>Enabled finance dashboard modules across organizations</p>
            </div>
            <button className="icon-button subtle-icon" type="button" onClick={() => onPageChange("Limits")} aria-label="View usage and limits">
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="module-adoption-list">
            {DASHBOARD_MODULES.map((moduleName) => {
              const adoption = organizations.filter((org) => org.modules.includes(moduleName)).length;
              return (
                <div className="module-adoption-row" key={moduleName}>
                  <span className="module-symbol">
                    <img src={DASHBOARD_MODULE_ICONS[moduleName]} alt="" aria-hidden="true" width="15" height="15" />
                  </span>
                  <strong>{moduleName}</strong>
                  <span className="module-adoption-bar"><UsageBar value={adoption} limit={organizations.length} tone="gold" /></span>
                  <small>{adoption} of {organizations.length}</small>
                </div>
              );
            })}
          </div>
        </article>
        <article className="panel quick-actions">
          <div className="panel-heading">
            <div>
              <h2>Quick Actions</h2>
              <p>Common platform tasks</p>
            </div>
          </div>
          <div className="quick-action-list">
            <button type="button" onClick={() => onPageChange("Organizations")}>
              <span className="quick-icon quick-icon-yellow"><img src="/organization.png" alt="" aria-hidden="true" width="16" height="16" /></span>
              <span><strong>Review organizations</strong><small>{organizations.length} organizations</small></span>
              <ArrowRight size={15} />
            </button>
            <button type="button" onClick={() => onPageChange("Users")}>
              <span className="quick-icon quick-icon-sage"><img src="/users.png" alt="" aria-hidden="true" width="16" height="16" /></span>
              <span><strong>Manage staff users</strong><small>Browse organization seats</small></span>
              <ArrowRight size={15} />
            </button>
            <button type="button" onClick={() => onPageChange("Contact inbox")}>
              <span className="quick-icon quick-icon-lilac"><img src="/messages.png" alt="" aria-hidden="true" width="16" height="16" /></span>
              <span><strong>Open contact inbox</strong><small>{newMessages} enquiries need review</small></span>
              <ArrowRight size={15} />
            </button>
          </div>
        </article>
      </section>
    </div>
  );
}

function MetricImageIcon({ src }: { src: string }) {
  return (
    <span
      aria-hidden="true"
      className="metric-icon-image"
      data-src={src}
      style={{ maskImage: `url("${src}")`, WebkitMaskImage: `url("${src}")` }}
    />
  );
}

const ILLUSTRATIVE_TREND_FACTORS = {
  organizations: [0.55, 0.65, 0.7, 0.75, 0.8, 0.75, 1],
  seats: [0.82, 0.78, 0.88, 0.85, 0.91, 0.9, 1],
  activeUsers: [0.55, 0.65, 0.76, 0.8, 0.84, 0.7, 1],
  modules: [0.72, 0.78, 0.83, 0.86, 0.9, 0.9, 1],
  records: [0.72, 0.79, 0.81, 0.87, 0.91, 0.9, 1],
  storage: [0.78, 0.82, 0.86, 0.84, 0.92, 0.9, 1],
} as const;

function createIllustrativeDailyTrend(
  currentValue: number,
  factors: readonly number[],
  precision = 0,
) {
  const today = new Date();
  return factors.map((factor, index) => {
    const daysAgo = factors.length - index - 1;
    const date = new Date(today);
    date.setDate(today.getDate() - daysAgo);
    return {
      label: daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : date.toLocaleDateString("en", { day: "numeric", month: "short" }),
      dateLabel: date.toLocaleDateString("en", { day: "numeric", month: "short" }),
      value: Number((currentValue * factor).toFixed(precision)),
    };
  });
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  trend,
  tone,
  chart,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  trend: string;
  tone: string;
  chart?: { label: string; dateLabel: string; value: number }[];
}) {
  const chartValues = chart?.map(({ value }) => value) ?? [];
  const latestValue = chartValues[chartValues.length - 1] ?? 0;
  const previousDayValue = chartValues[chartValues.length - 2];
  const changePercent = previousDayValue === undefined || previousDayValue === 0
    ? null
    : Math.round(((latestValue - previousDayValue) / previousDayValue) * 100);
  const trendLabel = previousDayValue === undefined
    ? "No previous-day data"
    : changePercent === null
      ? latestValue === 0 ? "No change vs yesterday" : `New today · 0 yesterday`
      : `${changePercent >= 0 ? "+" : ""}${changePercent}% vs ${number.format(previousDayValue)} yesterday`;
  return (
    <article className="metric-card">
      <div className="metric-topline">
        <span className={`metric-icon metric-icon-${tone}`}>{icon}</span>
        <span className="metric-trend">
          <ArrowUpRight size={12} /> {chart ? trendLabel : trend}
        </span>
      </div>
      <p>{label}</p>
      <strong className="metric-value">{value}</strong>
      <span className="metric-detail">{detail}</span>
    </article>
  );
}

function OrganizationsPage({
  organizations,
  search,
  filter,
  onSearch,
  onFilter,
  onSelect,
}: {
  organizations: Organization[];
  search: string;
  filter: string;
  onSearch: (value: string) => void;
  onFilter: (value: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="page-stack">
      <div className="toolbar">
        <SearchField value={search} onChange={onSearch} placeholder="Search organizations..." />
        <label className="select-wrap">
          <span className="sr-only">Filter organizations by status</span>
          <select value={filter} onChange={(event) => onFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
          </select>
          <ChevronDown size={14} />
        </label>
      </div>
      <div className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Organization</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Staff seats</th>
                <th>Monthly activity</th>
                <th>Joined</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((organization) => (
                <tr key={organization.id}>
                  <td>
                    <div className="org-cell">
                      <span><strong>{organization.name}</strong><small>{organization.plan} plan</small></span>
                    </div>
                  </td>
                  <td><span className="plan-label">{organization.plan}</span></td>
                  <td><StatusBadge status={organization.status} /></td>
                  <td>
                    <div className="seat-cell">
                      <span>{organization.seatsUsed} <small>/ {organization.seatLimit}</small></span>
                      <UsageBar value={organization.seatsUsed} limit={organization.seatLimit} tone="ink" />
                    </div>
                  </td>
                  <td>{number.format(organization.monthlySignIns)} <span className="muted-inline">sign-ins</span></td>
                  <td>{new Date(`${organization.createdAt}T12:00:00`).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td>
                    <button className="icon-button row-action" type="button" aria-label={`View ${organization.name}`} onClick={() => onSelect(organization.id)}>
                      <ChevronRight size={17} />
                    </button>
                  </td>
                </tr>
              ))}
              {organizations.length === 0 && (
                <tr><td colSpan={7}><EmptyState title="No organizations found" description="Try a different search or status filter." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer"><span>Showing {organizations.length} organizations</span><span>Organization directory</span></div>
      </div>
    </div>
  );
}

function OrganizationDetail({
  organization,
  users,
  onEditLimits,
  onStatusChange,
  onShowUsers,
}: {
  organization: Organization;
  users: OrganizationUser[];
  onEditLimits: () => void;
  onStatusChange: (status: OrganizationStatus) => void;
  onShowUsers: () => void;
}) {
  return (
    <div className="page-stack">
      <section className="organization-hero panel">
        <div className="organization-hero-main">
          <div>
            <div className="organization-title-line"><h2>{organization.name}</h2><StatusBadge status={organization.status} /></div>
            <p>{organization.plan} plan</p>
            <small>Customer since {new Date(`${organization.createdAt}T12:00:00`).toLocaleDateString("en", { month: "long", year: "numeric" })}</small>
          </div>
        </div>
        <div className="organization-hero-actions">
          <label className="select-wrap status-control">
            <span className="sr-only">Organization status</span>
            <select value={organization.status} onChange={(event) => onStatusChange(event.target.value as OrganizationStatus)}>
              <option>Active</option><option>Suspended</option>
            </select><ChevronDown size={14} />
          </label>
          <button className="button button-primary" type="button" onClick={onEditLimits}><Settings2 size={15} /> Edit</button>
        </div>
      </section>

      <section className="metric-grid detail-metric-grid">
        <MetricCard icon={<MetricImageIcon src="/users.png" />} label="Staff seats" value={`${organization.seatsUsed} / ${organization.seatLimit}`} detail={`${percent(organization.seatsUsed, organization.seatLimit)}% of limit`} trend="Seat capacity" tone="green" />
        <MetricCard icon={<MetricImageIcon src="/records.png" />} label="Records" value={number.format(organization.records)} detail={`${number.format(organization.recordLimit)} record limit`} trend={`${percent(organization.records, organization.recordLimit)}% used`} tone="violet" />
        <MetricCard icon={<MetricImageIcon src="/storage.png" />} label="Storage" value={`${organization.storageGb} GB`} detail={`${organization.storageLimitGb} GB storage limit`} trend={`${percent(organization.storageGb, organization.storageLimitGb)}% used`} tone="gold" />
      </section>

      <section className="overview-grid detail-overview-grid">
        <article className="panel">
          <div className="panel-heading">
            <div><h2>Dashboard modules</h2><p>Finance workspace areas enabled for this organization</p></div>
            <button className="text-button" type="button" onClick={onEditLimits}>Manage modules <Settings2 size={14} /></button>
          </div>
          <div className="enabled-modules">
            {organization.modules.map((moduleName) => <span className="module-pill" key={moduleName}><Check size={13} /> {moduleName}</span>)}
            {organization.modules.length === 0 && <span className="empty-inline">No modules enabled</span>}
          </div>
          <div className="detail-limits">
            <div><span>Record limit</span><strong>{number.format(organization.recordLimit)} records</strong></div>
            <div><span>Storage limit</span><strong>{organization.storageLimitGb} GB</strong></div>
          </div>
        </article>
        <article className="panel">
          <div className="panel-heading">
            <div><h2>Organization users</h2><p>{users.length} staff accounts</p></div>
            <button className="text-button" type="button" onClick={onShowUsers}>Manage Users <ArrowRight size={14} /></button>
          </div>
          <div className="detail-user-list">
            {users.slice(0, 4).map((user) => (
              <div className="detail-user-row" key={user.id}>
                <span><strong>{user.name}</strong><small>{user.email}</small></span>
                <span className="role-label">{user.role}</span>
              </div>
            ))}
            {users.length === 0 && <EmptyState title="No users" description="No users are associated with this organization." />}
          </div>
        </article>
      </section>
      <section className="panel organization-profile-panel">
        <div className="panel-heading">
          <div>
            <h2>Organization profile</h2>
            <p>Organization identity and registration details</p>
          </div>
          {organization.code && <span className="organization-code">{organization.code}</span>}
        </div>
        <div className="organization-profile-grid">
          <div><span>Contact person</span><strong>{organization.contactName || "Not provided"}</strong></div>
          <div><span>Contact email</span><strong>{organization.contactEmail || "Not provided"}</strong></div>
          <div><span>Contact phone</span><strong>{organization.contactPhone || "Not provided"}</strong></div>
          <div><span>Website</span><strong>{organization.website || "Not provided"}</strong></div>
          <div><span>Registration number</span><strong>{organization.registrationNumber || "Not provided"}</strong></div>
          <div><span>Tax ID</span><strong>{organization.taxId || "Not provided"}</strong></div>
          <div className="organization-profile-wide"><span>Registered address</span><strong>{organization.address || "Not provided"}</strong></div>
          <div className="organization-profile-wide">
            <span>Company bank accounts</span>
            {organization.bankAccounts?.length ? (
              <ul className="organization-bank-list">
                {organization.bankAccounts.map((account, index) => (
                  <li key={`${account.bankName}-${index}`}>
                    {account.bankName} · {account.accountName} · ••••{account.accountNumber.slice(-4)} · {account.currency}
                  </li>
                ))}
              </ul>
            ) : <strong>Not provided</strong>}
          </div>
        </div>
      </section>
    </div>
  );
}

function UsagePage({
  organizations,
  onEdit,
}: {
  organizations: Organization[];
  onEdit: (id: string) => void;
}) {
  return (
    <div className="page-stack">
      <section className="overview-grid usage-detail-grid">
        <article className="panel">
          <div className="panel-heading"><div><h2>Usage by organization</h2><p>Seat, records, and storage consumption</p></div><span className="subtle-label"><span className="legend-dot" /> Used</span></div>
          <div className="usage-org-table">
            <div className="usage-table-heading"><span>Organization</span><span>Seats</span><span>Records</span><span>Storage</span><span /></div>
            {organizations.map((organization) => (
              <div className="usage-org-row" key={organization.id}>
                <span className="usage-org-name"><strong>{organization.name}</strong></span>
                <span className="usage-cell">
                  <strong>{organization.seatsUsed} / {organization.seatLimit}</strong>
                  <UsageBar value={organization.seatsUsed} limit={organization.seatLimit} tone="gold" />
                </span>
                <span className="usage-cell">
                  <strong>{number.format(organization.records)} / {number.format(organization.recordLimit)}</strong>
                  <UsageBar value={organization.records} limit={organization.recordLimit} tone="green" />
                </span>
                <span className="usage-cell">
                  <strong>{organization.storageGb} / {organization.storageLimitGb} GB</strong>
                  <UsageBar value={organization.storageGb} limit={organization.storageLimitGb} tone="ink" />
                </span>
                <button className="icon-button row-action" type="button" onClick={() => onEdit(organization.id)} aria-label={`Edit ${organization.name} limits`}><Settings2 size={15} /></button>
              </div>
            ))}
          </div>
          <div className="table-footer"><span>Organization usage and limits</span><span>Monthly activity</span></div>
        </article>
      </section>
    </div>
  );
}

function UsersPage({
  users,
  organizations,
  search,
  orgFilter,
  onSearch,
  onOrgFilter,
  onUpdateUser,
  onManageAccess,
}: {
  users: OrganizationUser[];
  organizations: Organization[];
  search: string;
  orgFilter: string;
  onSearch: (value: string) => void;
  onOrgFilter: (value: string) => void;
  onUpdateUser: (id: string, update: Partial<OrganizationUser>) => void;
  onManageAccess: (id: string) => void;
}) {
  return (
    <div className="page-stack">
      <div className="toolbar">
        <SearchField value={search} onChange={onSearch} placeholder="Search name, email, or organization..." />
        <label className="select-wrap">
          <span className="sr-only">Filter users by organization</span>
          <select value={orgFilter} onChange={(event) => onOrgFilter(event.target.value)}>
            <option value="all">All organizations</option>
            {organizations.map((organization) => <option value={organization.id} key={organization.id}>{organization.name}</option>)}
          </select><ChevronDown size={14} />
        </label>
      </div>
      <div className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead><tr><th>User</th><th>Organization</th><th>Role</th><th>Status</th><th>Last active</th><th>Workspace access</th><th>Account</th></tr></thead>
            <tbody>
              {users.map((user) => {
                const organization = organizations.find((org) => org.id === user.organizationId);
                return (
                  <tr key={user.id}>
                    <td><div className="org-cell"><span><strong>{user.name}</strong><small>{user.email}</small></span></div></td>
                    <td>{organization?.name ?? "—"}</td>
                    <td>
                      <label><span className="sr-only">Role for {user.name}</span>
                        <select className="table-select" value={user.role} onChange={(event) => onUpdateUser(user.id, { role: event.target.value as OrganizationUser["role"] })}>
                          <option>Owner</option><option>Admin</option><option>Member</option>
                        </select>
                      </label>
                    </td>
                    <td><StatusBadge status={user.status} /></td>
                    <td>{user.lastActive}</td>
                    <td>
                      <button className="text-button" type="button" onClick={() => onManageAccess(user.id)}>
                        Manage access
                      </button>
                    </td>
                    <td>
                      <label><span className="sr-only">Account status for {user.name}</span>
                        <select className="table-select" value={user.status} onChange={(event) => onUpdateUser(user.id, { status: event.target.value as UserStatus })}>
                          <option>Active</option><option>Invited</option><option>Suspended</option>
                        </select>
                      </label>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && <tr><td colSpan={7}><EmptyState title="No users found" description="Try another search or organization." /></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="table-footer"><span>Showing {users.length} users</span><span>User directory</span></div>
      </div>
    </div>
  );
}

function DashboardAuditPage({
  events,
  organizations,
  search,
  orgFilter,
  onSearch,
  onOrgFilter,
}: {
  events: PlatformAuditEvent[];
  organizations: Organization[];
  search: string;
  orgFilter: string;
  onSearch: (value: string) => void;
  onOrgFilter: (value: string) => void;
}) {
  return (
    <div className="page-stack">
      <div className="toolbar">
        <SearchField value={search} onChange={onSearch} placeholder="Search activity, user, or organization..." />
        <label className="select-wrap">
          <span className="sr-only">Filter audit events by organization</span>
          <select value={orgFilter} onChange={(event) => onOrgFilter(event.target.value)}>
            <option value="all">All organizations</option>
            {organizations.map((organization) => (
              <option value={organization.id} key={organization.id}>{organization.name}</option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
      </div>
      <div className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Activity</th><th>User</th><th>Organization</th><th>Time</th><th>Status</th></tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const organization = organizations.find((item) => item.id === event.organizationId);
                return (
                  <tr key={event.id}>
                    <td><strong>{event.action}</strong><small className="audit-detail">{event.detail}</small></td>
                    <td><span>{event.user}</span><small className="audit-detail">{event.email}</small></td>
                    <td>{organization?.name ?? "Unknown organization"}</td>
                    <td>{event.time}</td>
                    <td><StatusBadge status={event.status} /></td>
                  </tr>
                );
              })}
              {events.length === 0 && (
                <tr><td colSpan={5}><EmptyState title="No activity found" description="Try a different search or organization." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer"><span>Workspace activity across organizations</span><span>Audit log</span></div>
      </div>
    </div>
  );
}

function PlatformAdminUsersPanel({
  admins,
  roles,
  onSaveAdmins,
}: {
  admins: PlatformAdminUser[];
  roles: AdminRole[];
  onSaveAdmins: (admins: PlatformAdminUser[]) => void;
}) {
  const [adminsDraft, setAdminsDraft] = useState(admins);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");

  function addAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (adminsDraft.some((admin) => admin.email.toLowerCase() === normalizedEmail)) return;
    setAdminsDraft((current) => [
      ...current,
      {
        id: `platform-admin-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: name.trim(),
        email: normalizedEmail,
        roleId,
        status: "Invited",
      },
    ]);
    setName("");
    setEmail("");
  }

  return (
    <div className="platform-admin-access">
      <form className="admin-invite-form" onSubmit={addAdmin}>
        <div className="admin-access-heading">
          <div><h3>Add administrator</h3><p>Assign platform access with a saved role.</p></div>
        </div>
        <label className="form-field">
          Full name
          <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
        </label>
        <label className="form-field">
          Work email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
        </label>
        <label className="form-field">
          Platform role
          <select value={roleId} onChange={(event) => setRoleId(event.target.value)} required>
            {roles.map((role) => <option value={role.id} key={role.id}>{role.name}</option>)}
          </select>
        </label>
        <button className="button button-primary" type="submit" disabled={roles.length === 0}>
          <Plus size={15} /> Add administrator
        </button>
      </form>

      <div className="platform-admin-table-wrap">
        <table className="platform-admin-table">
          <thead><tr><th>Administrator</th><th>Role</th><th>Status</th></tr></thead>
          <tbody>
            {adminsDraft.map((admin) => {
              const role = roles.find((item) => item.id === admin.roleId);
              return (
                <tr key={admin.id}>
                  <td><strong>{admin.name}</strong><small>{admin.email}</small></td>
                  <td>
                    <label>
                      <span className="sr-only">Role for {admin.name}</span>
                      <select
                        className="table-select"
                        value={role ? admin.roleId : ""}
                        onChange={(event) => setAdminsDraft((current) => current.map((item) => item.id === admin.id ? { ...item, roleId: event.target.value } : item))}
                      >
                        {roles.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                      </select>
                    </label>
                  </td>
                  <td>
                    <label>
                      <span className="sr-only">Status for {admin.name}</span>
                      <select
                        className="table-select"
                        value={admin.status}
                        onChange={(event) => setAdminsDraft((current) => current.map((item) => item.id === admin.id ? { ...item, status: event.target.value as PlatformAdminUser["status"] } : item))}
                      >
                        <option>Active</option><option>Invited</option><option>Suspended</option>
                      </select>
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="settings-form-actions">
        <button className="button button-primary" type="button" onClick={() => onSaveAdmins(adminsDraft)}>
          <Save size={15} /> Save administrator access
        </button>
      </div>
    </div>
  );
}

function AdminSettingsPage({
  profile,
  roles,
  admins,
  onSaveProfile,
  onSaveRoles,
  onSaveAdmins,
}: {
  profile: AdminProfile;
  roles: AdminRole[];
  admins: PlatformAdminUser[];
  onSaveProfile: (profile: AdminProfile) => void;
  onSaveRoles: (roles: AdminRole[]) => void;
  onSaveAdmins: (admins: PlatformAdminUser[]) => void;
}) {
  const [section, setSection] = useState<"Profile" | "Security" | "Access & roles">("Profile");
  const [accessView, setAccessView] = useState<"admins" | "roles">("admins");
  const [profileDraft, setProfileDraft] = useState(profile);
  const [rolesDraft, setRolesDraft] = useState(roles);
  const canManageAccessRoles = roles.some(
    (role) => role.id === profile.roleId && role.permissions.includes("accessRoles"),
  );
  const activeSection = section === "Access & roles" && !canManageAccessRoles ? "Profile" : section;
  const visibleSections = canManageAccessRoles
    ? (["Profile", "Security", "Access & roles"] as const)
    : (["Profile", "Security"] as const);

  function updateProfile(field: keyof AdminProfile, value: string) {
    setProfileDraft((current) => ({ ...current, [field]: value }));
  }

  function togglePermission(roleId: string, permission: AdminPermission) {
    setRolesDraft((current) =>
      current.map((role) =>
        role.id === roleId
          ? {
              ...role,
              permissions: role.permissions.includes(permission)
                ? role.permissions.filter((item) => item !== permission)
                : [...role.permissions, permission],
            }
          : role,
      ),
    );
  }

  return (
    <div className="page-stack settings-page">
      <nav className="settings-tabs" aria-label="Administrator settings sections">
        {visibleSections.map((item) => (
          <button
            className={`settings-tab${activeSection === item ? " settings-tab-active" : ""}`}
            type="button"
            key={item}
            aria-current={activeSection === item ? "page" : undefined}
            onClick={() => setSection(item)}
          >
            {item === "Profile" ? <UserRound size={15} /> : item === "Security" ? <ShieldCheck size={15} /> : <Users size={15} />}
            {item}
          </button>
        ))}
      </nav>

      {activeSection === "Profile" && (
        <section className="panel settings-panel">
          <div className="panel-heading">
            <div>
              <h2>Administrator profile</h2>
              <p>Update the profile details shown in the admin workspace.</p>
            </div>
          </div>
          <form
            className="settings-form"
            onSubmit={(event) => {
              event.preventDefault();
              onSaveProfile(profileDraft);
            }}
          >
            <label className="form-field">
              First name
              <input
                value={profileDraft.firstName}
                onChange={(event) => updateProfile("firstName", event.target.value)}
                autoComplete="given-name"
                required
              />
            </label>
            <label className="form-field">
              Last name
              <input
                value={profileDraft.lastName}
                onChange={(event) => updateProfile("lastName", event.target.value)}
                autoComplete="family-name"
                required
              />
            </label>
            <label className="form-field">
              Work email
              <input
                type="email"
                value={profileDraft.email}
                readOnly
                autoComplete="email"
                required
              />
            </label>
            <label className="form-field">
              User role
              <select value={profileDraft.roleId} disabled required>
                {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
            </label>
            <label className="form-field">
              Time zone
              <select
                value={profileDraft.timezone}
                onChange={(event) => updateProfile("timezone", event.target.value)}
              >
                <option value="Africa/Lagos">West Africa (Lagos, UTC+1)</option>
                <option value="Africa/Nairobi">East Africa (Nairobi, UTC+3)</option>
                <option value="Europe/London">United Kingdom (London)</option>
                <option value="America/New_York">Eastern Time (New York)</option>
                <option value="UTC">UTC</option>
              </select>
            </label>
            <div className="settings-form-actions">
              <button className="button button-primary" type="submit"><Save size={15} /> Save profile</button>
            </div>
          </form>
        </section>
      )}

      {activeSection === "Security" && (
        <section className="panel settings-panel security-settings">
          <div className="panel-heading">
            <div>
              <h2>Password &amp; sign-in security</h2>
              <p>Account security settings for your platform administrator account.</p>
            </div>
          </div>
          <p className="security-status" role="status">Password changes are unavailable until administrator authentication is configured.</p>
          <div className="security-form">
            <label className="form-field">
              Current password
              <input type="password" autoComplete="current-password" disabled placeholder="Unavailable until sign-in is configured" />
            </label>
            <label className="form-field">
              New password
              <input type="password" autoComplete="new-password" disabled placeholder="Unavailable until sign-in is configured" />
            </label>
            <label className="form-field">
              Confirm new password
              <input type="password" autoComplete="new-password" disabled placeholder="Unavailable until sign-in is configured" />
            </label>
            <div className="settings-form-actions">
              <button className="button button-primary" type="button" disabled>Update password</button>
            </div>
          </div>
          <div className="security-summary">
            <div><span>Administrator authentication</span><strong>Not configured</strong></div>
            <div><span>Multi-factor authentication</span><strong>Unavailable</strong></div>
            <div><span>Active session management</span><strong>Unavailable</strong></div>
          </div>
        </section>
      )}

      {activeSection === "Access & roles" && canManageAccessRoles && (
        <section className="panel settings-panel">
          <div className="panel-heading">
            <div>
              <h2>Administrator access</h2>
              <p>Manage platform administrator accounts, roles, and access areas.</p>
            </div>
            <span className="settings-icon"><Users size={18} /></span>
          </div>
          <div className="role-policy-notice">
            <strong>Access policy preview</strong>
            <span>Accounts, roles, and permissions are kept for this session only. Invitations and access enforcement require administrator authentication and server-side authorization.</span>
          </div>
          <div className="access-view-tabs" role="group" aria-label="Administrator access views">
            <button type="button" aria-pressed={accessView === "admins"} className={accessView === "admins" ? "access-view-active" : ""} onClick={() => setAccessView("admins")}>Administrator users</button>
            <button type="button" aria-pressed={accessView === "roles"} className={accessView === "roles" ? "access-view-active" : ""} onClick={() => setAccessView("roles")}>Roles &amp; permissions</button>
          </div>
          {accessView === "admins" ? (
            <PlatformAdminUsersPanel admins={admins} roles={roles} onSaveAdmins={onSaveAdmins} />
          ) : (
            <div className="role-management-view">
              <div className="role-permission-table">
                <div className="role-permission-heading">
                  <span>Platform role</span>
                  {ADMIN_PERMISSIONS.map((permission) => <span key={permission.id}>{permission.label}</span>)}
                </div>
                {rolesDraft.map((role) => (
                  <div className="role-permission-row" key={role.id}>
                    <span className="role-description"><strong>{role.name}</strong><small>{role.description}</small></span>
                    {ADMIN_PERMISSIONS.map((permission) => (
                      <label className="role-permission-cell" key={permission.id}>
                        <span className="sr-only">{role.name}: {permission.label}</span>
                        <input
                          type="checkbox"
                          aria-label={`${role.name}: ${permission.label}`}
                          checked={role.permissions.includes(permission.id)}
                          disabled={role.id === "platform-admin"}
                          onChange={() => togglePermission(role.id, permission.id)}
                        />
                      </label>
                    ))}
                  </div>
                ))}
              </div>
              <div className="settings-form-actions">
                <button className="button button-primary" type="button" onClick={() => onSaveRoles(rolesDraft)}>
                  <Save size={15} /> Save role permissions
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function InboxPage({
  submissions,
  selectedSubmission,
  search,
  filter,
  onSearch,
  onFilter,
  onSelect,
  onUpdateSubmission,
}: {
  submissions: ContactSubmission[];
  selectedSubmission: ContactSubmission | null;
  search: string;
  filter: string;
  onSearch: (value: string) => void;
  onFilter: (value: string) => void;
  onSelect: (id: string) => void;
  onUpdateSubmission: (id: string, update: Partial<ContactSubmission>) => void;
}) {
  const currentSelected = selectedSubmission && submissions.some((submission) => submission.id === selectedSubmission.id)
    ? selectedSubmission
    : submissions[0] ?? null;
  return (
    <div className="page-stack">
      <div className="inbox-toolbar">
        <SearchField value={search} onChange={onSearch} placeholder="Search enquiries..." />
        <label className="select-wrap">
          <span className="sr-only">Filter enquiries by status</span>
          <select value={filter} onChange={(event) => onFilter(event.target.value)}>
            <option>All messages</option><option>New</option><option>In progress</option><option>Resolved</option>
          </select><ChevronDown size={14} />
        </label>
      </div>
      <div className="inbox-layout panel">
        <div className="inbox-list">
          <div className="inbox-list-heading"><strong>Enquiries</strong><span>{submissions.length}</span></div>
          {submissions.map((submission) => (
            <button
              className={`inbox-item${submission.id === currentSelected?.id ? " inbox-item-selected" : ""}`}
              type="button"
              key={submission.id}
              onClick={() => onSelect(submission.id)}
            >
              <span className={`message-unread${submission.status === "New" ? " message-unread-on" : ""}`} />
              <span className="inbox-item-copy">
                <span className="inbox-item-top"><strong>{submission.name}</strong><small>{submission.receivedAt}</small></span>
                <span className="inbox-item-company">{submission.company}</span>
                <span className="inbox-item-subject">{submission.subject}</span>
              </span>
            </button>
          ))}
          {submissions.length === 0 && <EmptyState title="No enquiries found" description="Try a different search or status filter." />}
        </div>
        <div className="inbox-detail">
          {currentSelected ? (
            <>
              <div className="inbox-detail-heading">
                <div>
                  <h2>{currentSelected.subject}</h2>
                  <p>Received {currentSelected.receivedAt}</p>
                </div>
                <label className="select-wrap inbox-status-select">
                  <span className="sr-only">Enquiry status</span>
                  <select value={currentSelected.status} onChange={(event) => onUpdateSubmission(currentSelected.id, { status: event.target.value as ContactStatus })}>
                    <option>New</option><option>In progress</option><option>Resolved</option>
                  </select><ChevronDown size={14} />
                </label>
              </div>
              <div className="sender-card">
                <span><strong>{currentSelected.name}</strong><small>{currentSelected.company}</small></span>
                <a href={`mailto:${currentSelected.email}`}><Mail size={14} /> {currentSelected.email}</a>
              </div>
              <p className="message-body">{currentSelected.message}</p>
            </>
          ) : (
            <EmptyState title="Select an enquiry" description="Choose a message from the list to see its details." />
          )}
        </div>
      </div>
    </div>
  );
}

function LimitsModal({
  organization,
  onClose,
  onSave,
}: {
  organization: Organization;
  onClose: () => void;
  onSave: (update: Pick<Organization, "seatLimit" | "recordLimit" | "storageLimitGb" | "modules">) => void;
}) {
  const [seatLimit, setSeatLimit] = useState(String(organization.seatLimit));
  const [recordLimit, setRecordLimit] = useState(String(organization.recordLimit));
  const [storageLimit, setStorageLimit] = useState(String(organization.storageLimitGb));
  const [modules, setModules] = useState<ModuleName[]>(organization.modules);

  function toggleModule(moduleName: ModuleName) {
    setModules((current) =>
      current.includes(moduleName)
        ? current.filter((item) => item !== moduleName)
        : [...current, moduleName],
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({
      seatLimit: Math.max(organization.seatsUsed, Number(seatLimit)),
      recordLimit: Math.max(organization.records, Number(recordLimit)),
      storageLimitGb: Math.max(organization.storageGb, Number(storageLimit)),
      modules,
    });
  }

  return (
    <Modal
      title="Edit organization limits"
      description={`Adjust seat, module, record, and storage limits for ${organization.name}.`}
      onClose={onClose}
    >
      <form className="form-stack" onSubmit={submit}>
        <div className="form-grid">
          <label className="form-field">
            Maximum staff seats
            <input type="number" min={organization.seatsUsed} value={seatLimit} onChange={(event) => setSeatLimit(event.target.value)} required />
            <small>Currently using {organization.seatsUsed} seats</small>
          </label>
          <label className="form-field">
            Record limit
            <input type="number" min={organization.records} value={recordLimit} onChange={(event) => setRecordLimit(event.target.value)} required />
            <small>{number.format(organization.records)} records currently used</small>
          </label>
          <label className="form-field form-field-wide">
            Storage limit (GB)
            <input type="number" min={organization.storageGb} step="0.1" value={storageLimit} onChange={(event) => setStorageLimit(event.target.value)} required />
            <small>{organization.storageGb} GB currently used</small>
          </label>
          <fieldset className="module-fieldset form-field-wide">
            <legend>Enabled modules</legend>
            <div className="module-checkbox-grid">
              {DASHBOARD_MODULES.map((moduleName) => (
                <label className="module-checkbox" key={moduleName}>
                  <input type="checkbox" checked={modules.includes(moduleName)} onChange={() => toggleModule(moduleName)} />
                  <span>{moduleName}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="modal-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="button button-primary" type="submit"><Check size={15} /> Save limits</button>
        </div>
      </form>
    </Modal>
  );
}

function UserAccessModal({
  user,
  organization,
  onClose,
  onSave,
}: {
  user: OrganizationUser;
  organization: Organization | undefined;
  onClose: () => void;
  onSave: (update: Pick<OrganizationUser, "allowedTabs" | "allowedSettingsSections">) => void;
}) {
  const [allowedTabs, setAllowedTabs] = useState<DashboardTab[]>(user.allowedTabs);
  const [allowedSettingsSections, setAllowedSettingsSections] =
    useState<WorkspaceSettingsSection[]>(user.allowedSettingsSections);
  const availableTabs = DASHBOARD_TABS.filter(
    (tab) =>
      tab === "Overview" ||
      tab === "Settings" ||
      !organization ||
      organization.modules.includes(tab as ModuleName),
  );
  const ownerAccess = user.role === "Owner";
  const selectedTabs = ownerAccess ? availableTabs : allowedTabs;
  const selectedSettingsSections = ownerAccess
    ? WORKSPACE_SETTINGS_SECTIONS
    : allowedSettingsSections;

  function toggleTab(tab: DashboardTab) {
    setAllowedTabs((current) =>
      current.includes(tab) ? current.filter((item) => item !== tab) : [...current, tab],
    );
  }

  function toggleSettingsSection(section: WorkspaceSettingsSection) {
    setAllowedSettingsSections((current) =>
      current.includes(section)
        ? current.filter((item) => item !== section)
        : [...current, section],
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedTabs.length === 0) return;
    onSave({
      allowedTabs: [...selectedTabs],
      allowedSettingsSections: [...selectedSettingsSections],
    });
  }

  return (
    <Modal
      title={`Manage workspace access`}
      description={`Choose dashboard pages and settings sections available to ${user.name}.`}
      onClose={onClose}
    >
      <form className="form-stack" onSubmit={submit}>
        <fieldset className="access-fieldset">
          <legend>Dashboard pages</legend>
          <div className="access-checkbox-grid">
            {DASHBOARD_TABS.map((tab) => (
              <label className="module-checkbox" key={tab}>
                <input
                  type="checkbox"
                  aria-label={`Dashboard page ${tab}`}
                  checked={selectedTabs.includes(tab)}
                  disabled={ownerAccess || !availableTabs.includes(tab)}
                  onChange={() => toggleTab(tab)}
                />
                <span>{tab}</span>
              </label>
            ))}
          </div>
          {allowedTabs.length === 0 && <small className="access-validation">Select at least one dashboard page.</small>}
        </fieldset>
        <fieldset className="access-fieldset">
          <legend>Workspace settings sections</legend>
          <div className="access-checkbox-grid">
            {WORKSPACE_SETTINGS_SECTIONS.map((section) => (
              <label className="module-checkbox" key={section}>
                <input
                  type="checkbox"
                  aria-label={`Settings section ${section}`}
                  checked={selectedSettingsSections.includes(section)}
                  disabled={ownerAccess}
                  onChange={() => toggleSettingsSection(section)}
                />
                <span>{section}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {ownerAccess && (
          <p className="access-validation" role="status">
            Owners automatically have access to every dashboard module enabled for this organization and all workspace settings.
          </p>
        )}
        <div className="modal-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="button button-primary" type="submit" disabled={selectedTabs.length === 0}>
            <Check size={15} /> Save access
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="search-field">
      <Search size={16} />
      <span className="sr-only">{placeholder}</span>
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {value && <button type="button" aria-label="Clear search" onClick={() => onChange("")}><X size={14} /></button>}
    </label>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <span><Search size={18} /></span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export default App;
