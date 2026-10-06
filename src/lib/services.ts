import { Boxes, Calculator, Smartphone, LifeBuoy, type LucideIcon } from "lucide-react";

export type Service = {
  slug: string;
  code: string;
  icon: LucideIcon;
  title: string;
  summary: string;
  intro: string;
  features: { t: string; d: string }[];
  outcomes: string[];
};

export const services: Service[] = [
  {
    slug: "erp-solutions",
    code: "01",
    icon: Boxes,
    title: "ERP Solutions",
    summary: "Configurable modules tailored to your operational workflows — procurement, payroll and inventory management.",
    intro: "Bring procurement, inventory, payroll and finance into one connected system. Start with the modules you need most and expand as your operation grows.",
    features: [
      { t: "Procurement", d: "Requisitions, approvals and purchase orders with full traceability." },
      { t: "Inventory management", d: "Real-time stock levels across sites, with reorder alerts." },
      { t: "Payroll", d: "Accurate, repeatable payroll runs connected to your ledgers." },
      { t: "Dashboards & reporting", d: "Shared, live data for faster and better decisions." },
    ],
    outcomes: ["One source of truth for operations", "Less duplicate data entry", "Faster approvals and reporting"],
  },
  {
    slug: "financial-accounting-software",
    code: "02",
    icon: Calculator,
    title: "Financial & Accounting Software",
    summary: "Robust, data-driven financial systems designed for accurate corporate bookkeeping and management.",
    intro: "Financial systems designed with our data analysts, so your books stay accurate and your reports are ready when you need them.",
    features: [
      { t: "General ledger", d: "Multi-entity ledgers with clear audit trails." },
      { t: "Automated reconciliation", d: "Match transactions quickly and reduce manual work." },
      { t: "Financial reporting", d: "Statements and management reports built around your needs." },
      { t: "Controls & permissions", d: "Role-based access that keeps sensitive data protected." },
    ],
    outcomes: ["Faster month-end close", "Fewer reconciliation errors", "Clear, audit-ready records"],
  },
  {
    slug: "mobile-app-development",
    code: "03",
    icon: Smartphone,
    title: "Mobile Application Development",
    summary: "Scalable, mobile-first solutions built for modern businesses and distributed teams.",
    intro: "Give your teams and customers mobile tools that connect directly to your business systems — wherever they work.",
    features: [
      { t: "iOS & Android apps", d: "Reliable apps designed for everyday business use." },
      { t: "Field & warehouse tools", d: "Capture stock counts, approvals and data on the go." },
      { t: "System integration", d: "Connected to your ERP and accounting data." },
      { t: "Offline-ready design", d: "Keep working when connectivity is limited." },
    ],
    outcomes: ["Teams connected anywhere", "Data captured at the source", "Apps that grow with you"],
  },
  {
    slug: "support-maintenance",
    code: "04",
    icon: LifeBuoy,
    title: "Support & Maintenance",
    summary: "Dedicated ongoing support ensuring long-term, seamless operation of every system we ship.",
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
