import accountingDashboard from "@/assets/service-accounting-dashboard.png";
import appsDashboard from "@/assets/service-apps-dashboard.png";
import supportDashboard from "@/assets/service-support-dashboard.png";

type Detail = { title: string; description: string };
type ServiceDetails = {
  image: string;
  imageAlt: string;
  workflowHeading: string;
  workflows: Detail[];
  deliveryHeading: string;
  steps: Detail[];
  preparation: string[];
  scopeNote: string;
};

export const serviceDetails: Record<string, ServiceDetails> = {
  "erp-solutions": { 
    image: "/dashboard/erp%20dashboard.png",
    imageAlt: "Tarrlogic ERP and finance dashboard showing gross profit, payables, receivables and cash flow",
    workflowHeading: "From separate tasks to connected operations.",
    workflows: [
      { title: "Purchase request to stock receipt", description: "Connect requisitions, budget checks, approvals, purchase orders and goods receipt so purchasing and warehouse teams can follow the same transaction." },
      { title: "Stock movement across locations", description: "Bring item records, warehouse balances, transfers and stock counts into a shared view. Define who records movements and how discrepancies are reviewed." },
      { title: "Operational reporting for leadership", description: "Organize reporting around branches, departments and business units. Review open orders, stock exceptions and approval backlogs without assembling separate spreadsheets." },
    ],
    deliveryHeading: "A planned path from discovery to rollout.",
    steps: [
      { title: "Map processes & priorities", description: "Review existing tools, process owners, reporting needs and operational bottlenecks. Agree the first modules and what a successful rollout should achieve." },
      { title: "Configure or build", description: "Translate agreed workflows into modules, permissions, approval rules and reports. Review the setup with the people who will use it." },
      { title: "Prepare & validate data", description: "Plan how vendor, item and employee records will be cleaned, mapped and imported. Check balances and sample transactions before the switch." },
      { title: "Train & roll out", description: "Test complete workflows with your team, prepare user guidance and agree a phased launch, handover and post-launch support plan." },
    ],
    preparation: ["Your branches, warehouses and business units", "Current purchasing, inventory and payroll workflows", "Approval responsibilities and user access needs", "Sample reports and records from your existing tools"],
    scopeNote: "Module coverage, migration depth and connections to other systems are agreed during discovery. You can begin with priority workflows and plan additional modules later.",
  },
  "financial-accounting-software": {
    image: accountingDashboard,
    imageAlt: "Illustrative accounting dashboard with receivables, payables, income and expenses, and a month-end close checklist",
    workflowHeading: "A clearer picture behind every balance.",
    workflows: [
      { title: "Receivables & payables", description: "Organize customer invoices, supplier bills, due dates and payment records. Give finance teams a clearer view of outstanding amounts and the items that need attention." },
      { title: "Reconciliation & period-end close", description: "Match records, investigate differences and track close tasks through review and sign-off. Keep supporting information connected to the financial record." },
      { title: "Entity & management reporting", description: "Keep each entity's books distinct and define how group reporting should work. Structure profit and loss, balance sheet and cash-flow views around your reporting requirements." },
    ],
    deliveryHeading: "Start with the structure. Validate the numbers.",
    steps: [
      { title: "Define the accounting structure", description: "Review your chart of accounts, entities, reporting periods and departments. Confirm the reports and controls the finance team needs." },
      { title: "Set up workflows & access", description: "Configure transaction review, approval responsibilities, document references and permissions around the way your team works." },
      { title: "Verify opening records", description: "Plan migration of agreed balances and outstanding items. Reconcile imported records against the source and test representative transactions." },
      { title: "Prepare the finance team", description: "Walk through daily entries, reconciliation and period-end reporting. Agree documentation, handover and support before moving into everyday use." },
    ],
    preparation: ["Your current chart of accounts and entity structure", "Trial balances and outstanding customer or supplier items", "Sample financial and management reports", "Close procedures, approval roles and reporting requirements"],
    scopeNote: "Local tax treatment, statutory reporting and connections to banks or other platforms require a requirements review; they are not assumed to be included in every implementation.",
  },
  "mobile-app-development": {
    image: appsDashboard,
    imageAlt: "Illustrative software product dashboard and mobile workspace",
    workflowHeading: "From business need to software that scales.",
    workflows: [
      { title: "Discover the product", description: "Clarify business goals, users, existing systems, and constraints. Turn the highest-value needs into a focused product roadmap." },
      { title: "Design and build", description: "Shape clear user journeys and a maintainable architecture, then develop and validate the product in useful increments." },
      { title: "Connect and grow", description: "Integrate the product with relevant business systems, prepare for launch, and use feedback to guide future improvements." },
    ],
    deliveryHeading: "Build with a clear path from idea to impact.",
    steps: [
      { title: "Align on outcomes", description: "Agree the target users, business goals, constraints, and measures of success." },
      { title: "Plan the product", description: "Prioritize features, map integrations, and define the architecture for a reliable first release." },
      { title: "Build and validate", description: "Develop in increments, test with representative users, and review performance and security." },
      { title: "Launch and evolve", description: "Release with clear ownership, then use product data and feedback to prioritize improvements." },
    ],
    preparation: ["The business goals and users the product should support", "Current workflows, systems, and integration needs", "Technical, security, and compliance constraints", "Stakeholders who can review priorities and product decisions"],
    scopeNote: "Product scope, supported platforms, hosting, integrations, and ongoing ownership are agreed during discovery based on your requirements.",
  },
  "support-maintenance": {
    image: supportDashboard,
    imageAlt: "Illustrative support dashboard showing active tickets, system health and planned maintenance tasks",
    workflowHeading: "A structured approach to keeping systems dependable.",
    workflows: [
      { title: "Issue intake & resolution", description: "Record the affected workflow, business impact and reproduction details. Triage issues, assign ownership and keep a traceable record of investigation and resolution." },
      { title: "Planned system maintenance", description: "Review updates, dependencies and system health. Agree maintenance windows and validation steps so changes are coordinated with business operations." },
      { title: "User guidance & improvements", description: "Help teams resolve everyday questions and identify recurring friction. Separate fixes from enhancement requests so priorities and changes remain clear." },
    ],
    deliveryHeading: "Clear ownership from the first support request.",
    steps: [
      { title: "Review the system", description: "Document supported applications, dependencies, known issues and current access arrangements. Confirm which systems and environments are covered." },
      { title: "Agree the support plan", description: "Define request channels, severity categories, escalation contacts and coverage. Set expectations for response and maintenance in the service agreement." },
      { title: "Maintain & verify", description: "Schedule agreed updates, health checks and backup reviews. Test changes before release and verify critical workflows afterwards." },
      { title: "Review & improve", description: "Review recurring issues, outstanding requests and upcoming changes with your team. Agree which improvements belong in the next maintenance or development cycle." },
    ],
    preparation: ["A list of applications and environments requiring support", "Known issues, customizations and existing documentation", "Business-critical workflows and escalation contacts", "Current hosting, backup and maintenance arrangements"],
    scopeNote: "Support hours, response targets, monitoring, recovery arrangements and enhancement work depend on the agreed plan. Round-the-clock coverage and guaranteed uptime are not implied.",
  },
};
