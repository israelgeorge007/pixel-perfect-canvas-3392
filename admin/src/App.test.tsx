import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";

function navigationButton(name: string | RegExp) {
  return within(screen.getByRole("navigation", { name: "Platform administration" })).getByRole(
    "button",
    { name },
  );
}

describe("platform admin", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("collapses the sidebar to an accessible icon rail", async () => {
    const user = userEvent.setup();
    const firstRender = render(<App />);

    expect(within(screen.getByRole("complementary")).getByRole("img", { name: "IntentRun" })).toHaveAttribute(
      "src",
      "/intentrun.png",
    );
    expect(navigationButton("Overview").querySelector("img")).toHaveAttribute(
      "src",
      "/overview.png",
    );
    expect(navigationButton(/^Messages/).querySelector("img")).toHaveAttribute(
      "src",
      "/messages.png",
    );
    for (const [page, image] of [
      ["Organizations", "/organization.png"],
      ["Limits", "/limits.png"],
      ["Users", "/users.png"],
      ["Audit Logs", "/audit.png"],
      ["Settings", "/settings.png"],
    ]) {
      expect(navigationButton(page).querySelector("img")).toHaveAttribute("src", image);
    }
    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(document.querySelector(".admin-app")).toHaveClass("sidebar-collapsed");
    expect(within(screen.getByRole("complementary")).getByRole("img", { name: "IntentRun" })).toHaveAttribute(
      "src",
      "/intentrun fav.png",
    );
    expect(screen.getByRole("button", { name: "Organizations" })).toHaveAttribute(
      "title",
      "Organizations",
    );
    expect(screen.queryByText(/demo|prototype/i)).not.toBeInTheDocument();

    firstRender.unmount();
    render(<App />);
    expect(document.querySelector(".admin-app")).toHaveClass("sidebar-collapsed");
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(document.querySelector(".admin-app")).not.toHaveClass("sidebar-collapsed");
  });

  it("opens the mobile navigation drawer and closes it after navigation", async () => {
    const user = userEvent.setup();
    render(<App />);

    const menuButton = screen.getByRole("button", { name: "Open navigation" });
    await user.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(document.querySelector(".admin-app")).toHaveClass("mobile-nav-open");
    await user.click(navigationButton("Settings"));
    expect(document.querySelector(".admin-app")).not.toHaveClass("mobile-nav-open");
  });

  it("shows the organization overview without demo or prototype notices", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: "Hello, Admin" });

    expect(screen.getByLabelText(/^Current date .* in Africa\/Lagos$/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Current time .* in Africa\/Lagos$/)).toBeInTheDocument();
    expect(within(screen.getByRole("complementary")).getByRole("img", { name: "IntentRun" })).toHaveAttribute(
      "src",
      "/intentrun.png",
    );
    expect(screen.getByRole("heading", { name: "Hello, Admin" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reset data" })).not.toBeInTheDocument();
    expect(screen.getByText("Northstar Goods")).toBeInTheDocument();
    expect(screen.getByText("Monthly active users")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Additional platform totals" })).not.toBeInTheDocument();
    expect(screen.queryByText("Total sign-ins this month")).not.toBeInTheDocument();
    expect(screen.queryByText("New contact submissions")).not.toBeInTheDocument();
    expect(screen.queryByText("Active organizations")).not.toBeInTheDocument();
    const organizationMetric = within(
      screen.getByRole("region", { name: "Platform summary" }),
    ).getByText("Organizations");
    expect(organizationMetric.closest("article")?.querySelector(".metric-icon-image")).toHaveAttribute(
      "data-src",
      "/organization.png",
    );
    const staffSeatsMetric = within(
      screen.getByRole("region", { name: "Platform summary" }),
    ).getByText("Staff seats in use");
    expect(staffSeatsMetric.closest("article")?.querySelector(".metric-icon-image")).toHaveAttribute(
      "data-src",
      "/users.png",
    );
    const activeUsersMetric = within(
      screen.getByRole("region", { name: "Platform summary" }),
    ).getByText("Monthly active users");
    expect(activeUsersMetric.closest("article")?.querySelector(".metric-icon-image")).toHaveAttribute(
      "data-src",
      "/active users.png",
    );
    const modulesMetric = within(
      screen.getByRole("region", { name: "Platform summary" }),
    ).getByText("Enabled dashboard modules");
    expect(modulesMetric.closest("article")?.querySelector(".metric-icon-image")).toHaveAttribute(
      "data-src",
      "/limits.png",
    );
    const recordsMetric = within(
      screen.getByRole("region", { name: "Platform summary" }),
    ).getByText("Records managed");
    expect(recordsMetric.closest("article")?.querySelector(".metric-icon-image")).toHaveAttribute(
      "data-src",
      "/records.png",
    );
    const storageMetric = within(
      screen.getByRole("region", { name: "Platform summary" }),
    ).getByText("Storage used");
    expect(storageMetric.closest("article")?.querySelector(".metric-icon-image")).toHaveAttribute(
      "data-src",
      "/storage.png",
    );
    expect(
      screen.getByRole("region", { name: "Platform summary" }).querySelectorAll(".metric-chart"),
    ).toHaveLength(0);
    expect(
      within(organizationMetric.closest("article") as HTMLElement).getByText("+33% vs 3 yesterday"),
    ).toBeInTheDocument();
    expect(screen.getByText("Previous-day comparisons are illustrative until historical metric data is available.")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Platform administration" })).toBeInTheDocument();
    expect(screen.queryByText(/demo|prototype|sample data/i)).not.toBeInTheDocument();
  });

  it("shows an accessible loading state while an admin page enters", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(navigationButton("Organizations"));

    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Loading Organizations");
    expect(document.querySelector(".page-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Organizations" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "false"));
    expect(screen.getByRole("heading", { name: "Organizations" })).toBeInTheDocument();
  });

  it("omits the monthly active users card from organization details", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(navigationButton("Organizations"));
    await user.click(await screen.findByRole("button", { name: "View Northstar Goods" }));

    await screen.findByText("Staff seats");
    const metrics = document.querySelector(".detail-metric-grid");
    expect(metrics).not.toBeNull();
    expect(within(metrics as HTMLElement).getAllByRole("article")).toHaveLength(3);
    expect(within(metrics as HTMLElement).queryByText("Monthly active users")).not.toBeInTheDocument();
    expect(within(metrics as HTMLElement).getByText("Staff seats")).toBeInTheDocument();
    expect(within(metrics as HTMLElement).getByText("Records")).toBeInTheDocument();
    expect(within(metrics as HTMLElement).getByText("Storage")).toBeInTheDocument();
  });

  it("applies a date range to the Overview activity chart", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Choose date range:/ }));
    const picker = screen.getByRole("dialog", { name: "Choose date range" });
    expect(within(picker).getByText("Selected range")).toBeInTheDocument();
    expect(within(picker).getByRole("button", { name: "Apply range" })).toBeEnabled();

    await user.click(within(picker).getByRole("button", { name: "Year to date" }));

    expect(screen.queryByRole("dialog", { name: "Choose date range" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Monthly sign-ins from Jan to/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Choose date range: 1 Jan/ })).toBeInTheDocument();
  });

  it("hides toolbar result counts from organization and user lists", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(navigationButton("Organizations"));
    expect(screen.queryByText(/^\d+ organizations$/)).not.toBeInTheDocument();
    await user.click(navigationButton("Users"));
    expect(screen.queryByText(/^\d+ staff users$/)).not.toBeInTheDocument();
  });

  it("shows organization usage details without the summary metric cards", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(navigationButton("Limits"));

    expect(screen.queryByText("Staff seats in use")).not.toBeInTheDocument();
    expect(screen.queryByText("Monthly sign-ins")).not.toBeInTheDocument();
    expect(screen.queryByText("Records stored")).not.toBeInTheDocument();
    expect(screen.queryByText("Storage used")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Usage by organization" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Module Adoption" })).toBeInTheDocument();
  });

  it("adds an organization and owner", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(navigationButton("Organizations"));
    await user.click(screen.getByRole("button", { name: /add organization/i }));
    await user.type(screen.getByLabelText("Organization name"), "Cedar & Coast");
    expect(screen.queryByLabelText("Industry")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Registration number")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByRole("heading", { name: "Plan, limits & modules" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Subscription plan"), "Enterprise");
    expect(screen.getByLabelText("Organization status")).toHaveValue("Active");
    expect(
      within(screen.getByLabelText("Organization status")).queryByRole("option", { name: "Trial" }),
    ).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText("Maximum staff seats"));
    await user.type(screen.getByLabelText("Maximum staff seats"), "25");
    await user.clear(screen.getByLabelText("Record limit"));
    await user.type(screen.getByLabelText("Record limit"), "12000");
    await user.clear(screen.getByLabelText("Storage limit (GB)"));
    await user.type(screen.getByLabelText("Storage limit (GB)"), "8.5");
    await user.click(screen.getByLabelText("Onboarding module Inventory"));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByRole("heading", { name: "Primary owner account" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Owner name"), "Nia Cole");
    await user.type(screen.getByLabelText("Owner email"), "nia@cedar.example");
    await user.type(screen.getByLabelText(/Temporary password/), "SecureTempPassword123!");
    await user.type(screen.getByLabelText("Confirm temporary password"), "SecureTempPassword123!");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByRole("heading", { name: "Review onboarding" })).toBeInTheDocument();
    expect(screen.getByText("Enterprise · Active")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("8.5 GB")).toBeInTheDocument();
    expect(screen.getByText(/Inventory/)).toBeInTheDocument();
    expect(screen.getByText("Owner", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText(/Entered · will not be stored in this preview/)).toBeInTheDocument();
    expect(screen.getByText(/complete after onboarding/)).toBeInTheDocument();
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /create organization/i }),
    );

    expect(screen.getByText("Cedar & Coast")).toBeInTheDocument();
    expect(screen.getByText(/Owner password was not applied because authentication is not connected/)).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Confirmation" })).toBeInTheDocument();
    await user.click(within(screen.getByRole("dialog", { name: "Confirmation" })).getByRole("button", { name: "Close" }));
    await user.click(navigationButton("Users"));
    expect(screen.getByLabelText("Role for Nia Cole")).toHaveValue("Owner");
    await user.click(navigationButton("Organizations"));
    await user.click(screen.getByRole("button", { name: "View Cedar & Coast" }));
    expect(screen.getByText("ORG-", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/Enterprise/)).toBeInTheDocument();
    expect(screen.getByText("1 / 25")).toBeInTheDocument();
    expect(screen.getByText("Inventory")).toBeInTheDocument();
    expect(screen.getByText(/12,000 records/)).toBeInTheDocument();
  }, 15_000);

  it("requires matching temporary passwords before showing the review step", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(navigationButton("Organizations"));
    await user.click(screen.getByRole("button", { name: /add organization/i }));
    await user.type(screen.getByLabelText("Organization name"), "Cedar & Coast");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByRole("heading", { name: "Plan, limits & modules" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.type(screen.getByLabelText("Owner name"), "Nia Cole");
    await user.type(screen.getByLabelText("Owner email"), "nia@cedar.example");
    await user.type(screen.getByLabelText(/Temporary password/), "SecureTempPassword123!");
    await user.type(screen.getByLabelText("Confirm temporary password"), "DifferentPassword123!");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByRole("alert")).toHaveTextContent("The passwords do not match.");
    expect(screen.queryByRole("heading", { name: "Review onboarding" })).not.toBeInTheDocument();
  }, 10_000);

  it("advances to review on Enter and never creates the organization before the final step", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(navigationButton("Organizations"));
    await user.click(screen.getByRole("button", { name: /add organization/i }));
    await user.type(screen.getByLabelText("Organization name"), "Enter Test Co");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: "Plan, limits & modules" })).toBeInTheDocument();
    expect(screen.queryByText("Enter Test Co")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Maximum staff seats"));
    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: "Primary owner account" })).toBeInTheDocument();
    expect(screen.queryByText("Enter Test Co")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Owner name"), "Taylor Owner");
    await user.type(screen.getByLabelText("Owner email"), "owner@enter.example");
    await user.type(screen.getByLabelText(/Temporary password/), "SecureTempPassword123!");
    await user.type(screen.getByLabelText("Confirm temporary password"), "SecureTempPassword123!");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: "Review onboarding" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Create organization" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Organization added to the preview")).not.toBeInTheDocument();
  });

  it("updates organization limits", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(navigationButton("Organizations"));
    await user.click(screen.getByRole("button", { name: "View Northstar Goods" }));
    await user.click(screen.getByRole("button", { name: /edit limits/i }));
    await user.clear(screen.getByLabelText(/Maximum staff seats/));
    await user.type(screen.getByLabelText(/Maximum staff seats/), "70");
    await user.clear(screen.getByLabelText(/Record limit/));
    await user.type(screen.getByLabelText(/Record limit/), "40000");
    await user.clear(screen.getByLabelText(/Storage limit \(GB\)/));
    await user.type(screen.getByLabelText(/Storage limit \(GB\)/), "40");
    await user.click(screen.getByLabelText("Payroll"));
    await user.click(screen.getByRole("button", { name: /save limits/i }));

    expect(screen.getByText("42 / 70")).toBeInTheDocument();
    expect(screen.queryByText("Payroll")).not.toBeInTheDocument();

    await user.click(navigationButton("Users"));
    const kemiRow = screen.getByRole("row", { name: /Kemi Adesina/ });
    await user.click(within(kemiRow).getByRole("button", { name: "Manage access" }));
    expect(screen.getByLabelText("Dashboard page Payroll")).toBeDisabled();
    expect(screen.getByLabelText("Dashboard page Payroll")).not.toBeChecked();
  }, 10_000);

  it("allows mock staff roles and statuses to change", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(navigationButton("Users"));
    await user.selectOptions(screen.getByLabelText("Role for Amara Okafor"), "Admin");
    await user.click(within(screen.getByRole("dialog", { name: "Confirmation" })).getByRole("button", { name: "Close" }));
    await user.selectOptions(screen.getByLabelText("Account status for Amara Okafor"), "Suspended");

    expect(screen.getByText("User details updated.")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Confirmation" })).toBeInTheDocument();
    expect(screen.getByLabelText("Role for Amara Okafor")).toHaveValue("Admin");
    expect(screen.getByLabelText("Account status for Amara Okafor")).toHaveValue("Suspended");
  });

  it("grants Owners every enabled organization tab and settings section without editable access", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(navigationButton("Users"));
    const tundeRow = screen.getByRole("row", { name: /Tunde Bello/ });
    await user.selectOptions(screen.getByLabelText("Role for Tunde Bello"), "Owner");
    await user.click(within(screen.getByRole("dialog", { name: "Confirmation" })).getByRole("button", { name: "Close" }));
    await user.click(within(tundeRow).getByRole("button", { name: "Manage access" }));

    for (const tab of ["Overview", "Approvals", "Ledger", "Receivables", "Payables", "Reconciliation", "Invoice", "Inventory", "Procurement", "Payroll", "Reports", "Audit Logs", "Settings"]) {
      expect(screen.getByLabelText(`Dashboard page ${tab}`)).toBeChecked();
      expect(screen.getByLabelText(`Dashboard page ${tab}`)).toBeDisabled();
    }
    for (const section of ["Organization", "Approval Rules", "Team Access", "Titles & Tiers"]) {
      expect(screen.getByLabelText(`Settings section ${section}`)).toBeChecked();
      expect(screen.getByLabelText(`Settings section ${section}`)).toBeDisabled();
    }
    expect(
      screen.getByText(/Owners automatically have access to every dashboard module enabled/),
    ).toBeInTheDocument();
  });

  it("updates staff dashboard and settings permissions", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(navigationButton("Users"));
    const kemiRow = screen.getByRole("row", { name: /Kemi Adesina/ });
    await user.click(within(kemiRow).getByRole("button", { name: "Manage access" }));
    await user.click(screen.getByLabelText("Dashboard page Payables"));
    await user.click(screen.getByLabelText("Settings section Team Access"));
    await user.click(screen.getByRole("button", { name: "Save access" }));

    expect(screen.getByText("User details updated.")).toBeInTheDocument();
    await user.click(within(screen.getByRole("dialog", { name: "Confirmation" })).getByRole("button", { name: "Close" }));
    await user.click(within(kemiRow).getByRole("button", { name: "Manage access" }));
    expect(screen.getByLabelText("Dashboard page Payables")).toBeChecked();
    expect(screen.getByLabelText("Settings section Team Access")).toBeChecked();
  });

  it("shows and filters cross-organization dashboard audit activity", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(navigationButton("Dashboard audit"));
    expect(screen.getByText("Approval recorded")).toBeInTheDocument();
    await user.selectOptions(
      screen.getByLabelText("Filter audit events by organization"),
      "org-arc",
    );

    expect(screen.getByText("Invoice created")).toBeInTheDocument();
    expect(screen.queryByText("Approval recorded")).not.toBeInTheDocument();
  });

  it("updates the administrator profile in the current session", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(navigationButton("Settings"));
    await screen.findByRole("heading", { name: "Administrator profile" });
    await user.clear(screen.getByLabelText("First name"));
    await user.type(screen.getByLabelText("First name"), "Jordan");
    await user.clear(screen.getByLabelText("Last name"));
    await user.type(screen.getByLabelText("Last name"), "Admin");
    expect(screen.getByLabelText("Work email")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("User role")).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(screen.getByText("Profile details saved for this session.")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Confirmation" })).toBeInTheDocument();
    const accountButton = screen.getByRole("button", { name: /Signed in as Jordan Admin/ });
    expect(accountButton).toBeInTheDocument();
    expect(within(accountButton).getByText("JA")).toBeInTheDocument();
    await user.click(
      within(screen.getByRole("dialog", { name: "Confirmation" })).getByRole("button", {
        name: "Close",
      }),
    );
    await user.click(accountButton);
    expect(within(screen.getByRole("menu", { name: "Administrator account" })).getByText("Platform Admin")).toBeInTheDocument();
    await user.click(accountButton);
    await user.click(navigationButton("Overview"));
    await screen.findByRole("heading", { name: "Hello, Jordan" });
  });

  it("assigns administrators to the built-in roles and their permissions", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(navigationButton("Settings"));
    await screen.findByRole("heading", { name: "Administrator profile" });
    await user.click(screen.getByRole("button", { name: "Access & roles" }));
    await user.click(screen.getByRole("button", { name: "Roles & permissions" }));
    expect(screen.getByRole("checkbox", { name: "Usage Analyst: Limits" })).toBeChecked();
    expect(screen.queryByRole("button", { name: "Create role" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save role permissions" }));
    await user.click(within(screen.getByRole("dialog", { name: "Confirmation" })).getByRole("button", { name: "Close" }));

    await user.click(screen.getByRole("button", { name: "Administrator users" }));
    await user.type(screen.getByLabelText("Full name"), "Avery Brooks");
    await user.type(screen.getByLabelText("Work email"), "avery@intentrun.example");
    await user.click(screen.getByRole("button", { name: "Add administrator" }));
    await user.selectOptions(screen.getByLabelText("Role for Avery Brooks"), "Usage Analyst");
    await user.click(screen.getByRole("button", { name: "Save administrator access" }));
    expect(screen.getByText(/Administrator access saved for this session/)).toBeInTheDocument();
    await user.click(within(screen.getByRole("dialog", { name: "Confirmation" })).getByRole("button", { name: "Close" }));

    await user.click(navigationButton("Overview"));
    await screen.findByRole("heading", { name: "Hello, Admin" });
    await user.click(navigationButton("Settings"));
    await screen.findByRole("heading", { name: "Administrator profile" });
    await user.click(screen.getByRole("button", { name: "Access & roles" }));
    const administratorRow = screen.getByRole("row", { name: /Avery Brooks/ });
    expect(within(administratorRow).getByLabelText("Role for Avery Brooks")).toHaveDisplayValue("Usage Analyst");
  }, 15000);

  it("keeps password changes unavailable and manages platform role permissions", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(navigationButton("Settings"));
    await screen.findByRole("heading", { name: "Administrator profile" });
    await user.click(screen.getByRole("button", { name: "Security" }));
    expect(
      screen.getByText("Password changes are unavailable until administrator authentication is configured."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update password" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Access & roles" }));
    await user.click(screen.getByRole("button", { name: "Roles & permissions" }));
    for (const permission of ["Organizations", "Users", "Limits", "Audit Logs", "Messages", "Settings", "Access & roles"]) {
      const platformAdminPermission = screen.getByRole("checkbox", { name: `Platform Admin: ${permission}` });
      expect(platformAdminPermission).toBeChecked();
      expect(platformAdminPermission).toBeDisabled();
    }
    expect(screen.getByRole("checkbox", { name: "Platform Admin: Settings" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Support Admin: Settings" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Usage Analyst: Settings" })).toBeChecked();
    const supportAccessRolesPermission = screen.getByRole("checkbox", {
      name: "Support Admin: Access & roles",
    });
    expect(supportAccessRolesPermission).not.toBeChecked();
    await user.click(supportAccessRolesPermission);
    await user.click(screen.getByRole("button", { name: "Save role permissions" }));
    expect(
      screen.getByText(/Role permissions saved for this session/),
    ).toBeInTheDocument();

    await user.click(within(screen.getByRole("dialog", { name: "Confirmation" })).getByRole("button", { name: "Close" }));
    await user.click(navigationButton("Overview"));
    await screen.findByRole("heading", { name: "Hello, Admin" });
    await user.click(navigationButton("Settings"));
    await screen.findByRole("heading", { name: "Administrator profile" });
    await user.click(screen.getByRole("button", { name: "Access & roles" }));
    await user.click(screen.getByRole("button", { name: "Roles & permissions" }));
    expect(
      screen.getByRole("checkbox", { name: "Support Admin: Access & roles" }),
    ).toBeChecked();
  });

  it("keeps profile and security available while hiding Access & roles from restricted admins", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(navigationButton("Settings"));
    await screen.findByRole("heading", { name: "Administrator profile" });
    await user.click(screen.getByRole("button", { name: "Access & roles" }));
    await user.click(screen.getByRole("button", { name: "Administrator users" }));
    await user.selectOptions(screen.getByLabelText("Role for Admin Operator"), "Support Admin");
    await user.click(screen.getByRole("button", { name: "Save administrator access" }));
    await user.click(within(screen.getByRole("dialog", { name: "Confirmation" })).getByRole("button", { name: "Close" }));

    expect(screen.getByRole("heading", { name: "Administrator profile" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Access & roles" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Security" }));
    expect(screen.getByText("Password changes are unavailable until administrator authentication is configured.")).toBeInTheDocument();
  }, 15000);

  it("shows the signed-in account dropdown and ends the local preview session", async () => {
    const user = userEvent.setup();
    render(<App />);

    const accountButton = screen.getByRole("button", { name: /Signed in as Admin Operator/ });
    expect(within(accountButton).getByText("AO")).toBeInTheDocument();
    await user.click(accountButton);
    const menu = screen.getByRole("menu", { name: "Administrator account" });
    expect(within(menu).getByText("Admin Operator")).toBeInTheDocument();
    expect(within(menu).getByText("admin@intentrun.com")).toBeInTheDocument();
    expect(within(menu).getByText("Platform administrator")).toBeInTheDocument();

    await user.click(within(menu).getByRole("menuitem", { name: "Log out" }));
    expect(screen.getByRole("heading", { name: "You’re signed out" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Platform administration" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Start preview session" }));
    expect(screen.getByRole("navigation", { name: "Platform administration" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Signed in as Admin Operator/ })).toBeInTheDocument();
  });

  it("allows mock contact statuses to change", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(navigationButton(/Messages/));
    await user.selectOptions(screen.getByLabelText("Enquiry status"), "In progress");

    expect(screen.getByText("Enquiry status updated.")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Confirmation" })).toBeInTheDocument();
    expect(screen.getByLabelText("Enquiry status")).toHaveValue("In progress");
  });
});
