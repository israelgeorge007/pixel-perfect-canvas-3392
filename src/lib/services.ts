import { Boxes, Calculator, Smartphone, LifeBuoy, type LucideIcon } from "lucide-react";

export type Service = {
  slug: string;
  code: string;
  icon: LucideIcon;
  title: string;
  summary: string;
  intro: string;
  features: { t: string; d: string }[];
  implementationOptions?: { t: string; d: string }[];
  outcomes: string[];
};

export const services: Service[] = [
  {
    slug: "erp-solutions",
    code: "01",
    icon: Boxes,
    title: "ERP Solutions",
    summary:
      "Configurable modules tailored to your operational workflows — procurement, payroll and inventory management.",
    intro:
      "Bring finance, procurement, inventory and payroll into one connected system. Configure our ERP platform around your processes, or commission a bespoke system with a planned handover to your team.",
    features: [
      {
        t: "Multi-entity operations",
        d: "Manage branches, locations and business units with a shared operational view.",
      },
      {
        t: "Procurement workflows",
        d: "Coordinate requisitions, approvals and purchase orders with traceable decisions.",
      },
      {
        t: "Inventory across locations",
        d: "Track stock levels and movements across warehouses and sites.",
      },
      {
        t: "Connected finance & payroll",
        d: "Bring financial records and payroll workflows into the wider operating picture.",
      },
      {
        t: "Roles and approvals",
        d: "Set access and approval steps to match responsibilities across your team.",
      },
      {
        t: "Consolidated reporting",
        d: "Review activity across entities, locations and business dimensions.",
      },
    ],
    implementationOptions: [
      {
        t: "Configure & onboard",
        d: "Adopt our ERP platform, select the modules you need, and tailor workflows, roles and reports to your business.",
      },
      {
        t: "Custom build & handover",
        d: "When an off-the-shelf starting point is not the right fit, we can build a system to your requirements and agree a structured handover to your team.",
      },
    ],
    outcomes: [
      "A shared view across entities and locations",
      "Clearer approvals and operational accountability",
      "Room to start with core modules and expand",
    ],
  },
  {
    slug: "financial-accounting-software",
    code: "02",
    icon: Calculator,
    title: "Financial & Accounting",
    summary:
      "Robust, data-driven financial systems designed for accurate corporate bookkeeping and management.",
    intro:
      "Run accounting with clearer controls, reconciliations and reporting across your business. Onboard with our accounting platform and configure it to your needs, or choose a bespoke system built and handed over to your team.",
    features: [
      {
        t: "General ledger",
        d: "Organize financial activity with a chart of accounts suited to your reporting needs.",
      },
      {
        t: "Multi-entity accounting",
        d: "Keep entity records distinct while supporting consolidated views of your group.",
      },
      {
        t: "Reconciliation & close",
        d: "Structure reconciliation and period-end workflows to reduce repetitive manual work.",
      },
      {
        t: "Financial reporting",
        d: "Build management views across entities, locations, periods and other useful dimensions.",
      },
      {
        t: "Controls & audit trails",
        d: "Use role-based access and traceable records to support oversight and accountability.",
      },
      {
        t: "Connected workflows",
        d: "Align finance with relevant operational processes such as purchasing and payroll.",
      },
    ],
    implementationOptions: [
      {
        t: "Configure & onboard",
        d: "Start with our accounting platform and tailor entities, financial workflows, user roles and reports to your organization.",
      },
      {
        t: "Custom build & handover",
        d: "For specialized requirements, commission a purpose-built accounting system with agreed documentation and handover for your team.",
      },
    ],
    outcomes: [
      "A clearer view across entities",
      "More consistent reconciliation and close processes",
      "Controlled access and traceable financial records",
    ],
  },
  {
    slug: "mobile-app-development",
    code: "03",
    icon: Smartphone,
    title: "Application Development",
    summary: "Scalable, mobile-first solutions built for modern businesses and distributed teams.",
    intro:
      "Give your teams and customers mobile tools that connect directly to your business systems — wherever they work.",
    features: [
      { t: "iOS & Android apps", d: "Reliable apps designed for everyday business use." },
      { t: "Field & warehouse tools", d: "Capture stock counts, approvals and data on the go." },
      { t: "System integration", d: "Connected to your ERP and accounting data." },
      { t: "Offline-ready design", d: "Keep working when connectivity is limited." },
    ],
    outcomes: [
      "Teams connected anywhere",
      "Data captured at the source",
      "Apps that grow with you",
    ],
  },
  {
    slug: "support-maintenance",
    code: "04",
    icon: LifeBuoy,
    title: "Support & Maintenance",
    summary:
      "Dedicated ongoing support ensuring long-term, seamless operation of every system we ship.",
    intro: "We stay on after launch to keep your systems secure, up to date and running smoothly.",
    features: [
      { t: "Dedicated support", d: "A team that already knows your systems." },
      { t: "Monitoring & updates", d: "Regular updates and proactive issue detection." },
      { t: "Improvements", d: "Ongoing enhancements as your business changes." },
      { t: "User training", d: "Help your team get the most from every tool." },
    ],
    outcomes: ["Less downtime", "Systems that stay current", "A long-term technology partner"],
  },
];

export const getService = (slug: string) => services.find((s) => s.slug === slug);
