export type ResourceGuideSection = {
  title: string;
  eyebrow: string;
  paragraphs: string[];
  steps?: string[];
};

export type ResourceGuide = {
  slug: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  documentationSection: string;
  sections: ResourceGuideSection[];
};

export const resourceGuides: ResourceGuide[] = [
  {
    slug: "dashboard-overview",
    title: "Dashboard overview",
    description: "Navigate the workspace, dates and search.",
    image: "/dashboard-overview-placeholder.svg",
    imageAlt: "Illustration of the IntentRun dashboard overview",
    documentationSection: "getting-started",
    sections: [
      {
        eyebrow: "Workspace",
        title: "Find your way around the dashboard.",
        paragraphs: [
          "Use the left navigation to open a module. The date-range control filters dated records, while the search field filters the current screen. Select the Inventory or Reconciliation tabs to switch between their views.",
        ],
        steps: [
          "Start at Overview for cash flow, receivables, payables and recent activity.",
          "Choose a date range to narrow dated data. Inventory on hand remains a current snapshot.",
          "Use the profile menu for profile settings and Help to open the full dashboard documentation.",
        ],
      },
      {
        eyebrow: "Working with data",
        title: "Keep reports in context.",
        paragraphs: [
          "Dashboard figures reflect the records available in the workspace. Confirm the relevant date range and module before comparing activity or reviewing a current balance.",
        ],
      },
    ],
  },
  {
    slug: "account-statements",
    title: "Account statements",
    description: "Review customer and supplier debits, credits and balances.",
    image: "/account-statement-placeholder.svg",
    imageAlt: "Illustration of a customer and supplier account statement",
    documentationSection: "customers",
    sections: [
      {
        eyebrow: "Receivables",
        title: "Review a customer account.",
        paragraphs: [
          "Open Receivables and choose Customers to browse saved profiles. Choose Invoices to record an invoice with a customer, reference, amount and due date.",
          "Open a customer with View to see its account statement. Debits record invoices; credits record payments received. Use the payment form to post a receipt against an open invoice.",
        ],
        steps: [
          "Select a customer profile or create one with New customer.",
          "Record an invoice with its reference, amount and due date.",
          "Open the customer statement to review activity and post a receipt against an open invoice.",
        ],
      },
      {
        eyebrow: "Payables",
        title: "Review a supplier account.",
        paragraphs: [
          "Open Payables and choose Suppliers to browse profiles or add a supplier. Record supplier bills in Bills & orders. On a supplier statement, credits record bills and debits record payments made.",
        ],
        steps: [
          "Choose View on a supplier to open its statement.",
          "Use the payment form to post a payment against an outstanding bill.",
          "For inventory bills, add the received items and select the stock location.",
        ],
      },
    ],
  },
  {
    slug: "inventory-controls",
    title: "Inventory controls",
    description: "Manage items, stock levels, costs and location capacity.",
    image: "/inventory-placeholder.svg",
    imageAlt: "Illustration of inventory levels and stock controls",
    documentationSection: "inventory",
    sections: [
      {
        eyebrow: "Stock control",
        title: "Set up items and locations.",
        paragraphs: [
          "The Inventory overview brings together stock metrics, a location chart, location capacity and the inventory items table.",
          "Use Add to create an item with its opening quantity, unit cost, reorder level and location. Edit cost updates the saved unit cost; when stock is on hand, the inventory value is recalculated and the adjustment is journaled.",
        ],
      },
      {
        eyebrow: "Stock movement",
        title: "Record receipts and issues.",
        paragraphs: [
          "Adjust stock records a receipt or issue. Receipts require a unit cost and update the saved weighted-average cost. Location capacity cannot be exceeded.",
        ],
        steps: [
          "Select Adjust stock on an item and record a receipt or issue.",
          "Enter a unit cost for a receipt so the weighted-average cost can be updated.",
          "Use Edit capacity in Locations to update a warehouse limit; capacity cannot be reduced below stock on hand.",
        ],
      },
    ],
  },
  {
    slug: "purchasing-workflow",
    title: "Purchasing workflow",
    description: "Create procurement requests and purchase orders.",
    image: "/purchasing-placeholder.svg",
    imageAlt: "Illustration of a procurement request and purchase order",
    documentationSection: "procurement",
    sections: [
      {
        eyebrow: "Procurement",
        title: "Create and review requests.",
        paragraphs: [
          "In Inventory, choose the Procurement tab to create and review requests. Reviewing a request generates its reference and lets you update its workflow status.",
        ],
        steps: [
          "Open Inventory and select Procurement.",
          "Create a request with the required items and details.",
          "Review the request to generate its reference or update its status.",
        ],
      },
      {
        eyebrow: "Purchase orders",
        title: "Track orders through their lifecycle.",
        paragraphs: [
          "Choose Purchase Order to create an order with one or more items and review its details. Update its status from the review drawer; the table reflects the saved status.",
        ],
      },
    ],
  },
  {
    slug: "bank-reconciliation",
    title: "Bank reconciliation",
    description: "Import a statement, map columns and match transactions.",
    image: "/reconciliation-placeholder.svg",
    imageAlt: "Illustration of bank statement reconciliation",
    documentationSection: "reconciliation",
    sections: [
      {
        eyebrow: "Matching",
        title: "Import a bank statement.",
        paragraphs: [
          "Use the pill tabs to switch between Payables, Receivables and Bank reconciliation. In Bank, upload a CSV statement, map its columns and preview the parsed transactions before importing.",
        ],
        steps: [
          "Open Reconciliation and choose Bank.",
          "Select Upload statement and choose the CSV file.",
          "Confirm the date, description, reference and amount columns, then review the preview.",
          "Import the statement once the parsed transactions look correct.",
        ],
      },
      {
        eyebrow: "Exceptions",
        title: "Match unmatched transactions.",
        paragraphs: [
          "For an unmatched bank line, choose Match to find a corresponding posted ledger entry. Review the selected entry before confirming the match.",
        ],
      },
    ],
  },
];

export const getResourceGuide = (slug: string) =>
  resourceGuides.find((guide) => guide.slug === slug);
