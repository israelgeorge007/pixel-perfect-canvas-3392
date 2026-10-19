import accountingImage from "@/assets/carousel-growth.jpg";
import careImage from "@/assets/homicare-caregiver.jpg";
import fieldImage from "@/assets/service-apps-dashboard.png";
import operationsImage from "@/assets/service-erp-dashboard.png";
import processImage from "@/assets/carousel-process.jpg";

export type Industry = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  headline: string;
  introduction: string;
  valueHeading: string;
  image: string;
  imageAlt: string;
  workflowHeading: string;
  workflowIntroduction: string;
  workflows: { title: string; description: string }[];
  capabilities: { title: string; description: string }[];
  approach: { title: string; description: string }[];
  contactHeading: string;
  contactIntroduction: string;
};

export const industries: Industry[] = [
  {
    slug: "manufacturing-distribution",
    title: "Manufacturing & Distribution",
    category: "Production, procurement & inventory",
    summary:
      "Bring purchasing, stock movement and finance into a clearer operating picture across plants, warehouses and branches.",
    headline: "Keep every handoff in view, from supplier to shipment.",
    introduction:
      "When purchasing, stores and finance work from separate records, small delays become hard to explain. We configure connected ERP workflows around your locations, approval roles and reporting needs, then build the missing links when existing systems need to stay in place.",
    valueHeading: "Bring control and clarity to every stage of the operation.",
    image: operationsImage,
    imageAlt: "Operations dashboard with stock by location, open orders and procurement approvals",
    workflowHeading: "Connect the work behind every order.",
    workflowIntroduction:
      "Start with the transactions that cross teams. Make ownership clear, keep supporting records attached and give managers a consistent view of what needs attention.",
    workflows: [
      {
        title: "Purchase request to goods receipt",
        description:
          "Route requests through budget and approval checks, issue purchase orders, and record receipts against the order so procurement and warehouse teams can follow the same trail.",
      },
      {
        title: "Stock across sites",
        description:
          "Organize item records, transfers, counts and adjustments by location. Use agreed reorder rules and exception views to help teams investigate shortages and discrepancies.",
      },
      {
        title: "Operational costs into finance",
        description:
          "Connect agreed purchasing and inventory records to accounting workflows, with review steps and reporting dimensions that fit your close process.",
      },
    ],
    capabilities: [
      {
        title: "ERP configured around your operation",
        description:
          "Set up entities, sites, permissions and approvals to reflect how work moves between procurement, stores and finance.",
      },
      {
        title: "Useful reporting, not another spreadsheet",
        description:
          "Shape views around open orders, stock exceptions and approval backlogs using the records your teams already maintain.",
      },
      {
        title: "Purpose-built connections",
        description:
          "Where production, warehouse or supplier tools remain in place, scope an integration or small application around the data they can reliably provide.",
      },
    ],
    approach: [
      {
        title: "Map the movement",
        description:
          "Document the route from request to receipt, the people responsible at each step and the records needed for reconciliation.",
      },
      {
        title: "Configure and test",
        description:
          "Set up priority modules, roles and reports, then test representative orders and stock movements with the people who run them.",
      },
      {
        title: "Roll out in stages",
        description:
          "Prepare agreed opening data, train users by workflow and plan further locations or modules after the first phase is steady.",
      },
    ],
    contactHeading: "Build a clearer view from purchase order to shipment.",
    contactIntroduction:
      "Tell us where orders, inventory or finance lose continuity. We’ll help identify a practical first workflow, the records it depends on and a sensible way to prove it before expanding.",
  },
  {
    slug: "retail-wholesale",
    title: "Retail & Wholesale",
    category: "Locations, suppliers & finance",
    summary:
      "Coordinate buying, inventory and financial records across stores, distribution points and sales channels.",
    headline: "Give every location the same dependable view of stock and spend.",
    introduction:
      "Multiple stores and sales channels create plenty of movement, but not always a shared record of what was ordered, received or paid for. We configure the operational and accounting workflows that bring those records together, and scope connections to the commerce tools you choose to keep.",
    valueHeading: "Connect the details behind buying, stock and settlement.",
    image: accountingImage,
    imageAlt: "Business reporting dashboard used to review performance and financial activity",
    workflowHeading: "Make the daily flow easier to reconcile.",
    workflowIntroduction:
      "Build a practical thread between suppliers, locations and finance. Begin with the records that matter most and add channel connections only after their data and ownership are clear.",
    workflows: [
      {
        title: "Buying and supplier approvals",
        description:
          "Set approval responsibilities for purchase requests and orders, keep supplier references together and record what each location expects to receive.",
      },
      {
        title: "Receipts, transfers and counts",
        description:
          "Give teams a consistent way to record deliveries, movements between locations and count adjustments, with exceptions ready for review.",
      },
      {
        title: "Channel records into reporting",
        description:
          "Agree how sales, settlement and inventory information from selected channels should be mapped, checked and brought into management reporting.",
      },
    ],
    capabilities: [
      {
        title: "A shared multi-location structure",
        description:
          "Keep branch and entity records organized while giving authorized teams a consolidated view for review.",
      },
      {
        title: "Finance tied to operations",
        description:
          "Connect agreed supplier, purchasing and accounting workflows so month-end review has traceable source records.",
      },
      {
        title: "Channel integrations scoped to fit",
        description:
          "We assess available data, sync frequency and exception handling before designing a connection to point-of-sale or commerce platforms.",
      },
    ],
    approach: [
      {
        title: "Choose the first view",
        description:
          "Prioritize the locations, suppliers and stock or finance questions that currently take the most effort to answer.",
      },
      {
        title: "Agree the source records",
        description:
          "Define which system owns each record, how identifiers match and who resolves missing or conflicting data.",
      },
      {
        title: "Prove the close",
        description:
          "Test sample purchases, receipts and channel settlements against source records before expanding the rollout.",
      },
    ],
    contactHeading: "Make the next store, order or close easier to manage.",
    contactIntroduction:
      "We’ll learn how buying, receiving and reconciliation work across your locations, then help define a first improvement that fits your current systems and team.",
  },
  {
    slug: "professional-services",
    title: "Professional Services",
    category: "Client work, approvals & accounting",
    summary:
      "Connect client-facing work with the approvals, financial records and reporting that support a growing firm.",
    headline: "Spend less time piecing together how the work is moving.",
    introduction:
      "For a services firm, operational visibility depends on reliable handoffs between client teams and finance. We shape workflows around your engagement structure, approval responsibilities and reporting needs, then build focused applications where a generic process does not fit.",
    valueHeading: "Keep client delivery and business operations in step.",
    image: processImage,
    imageAlt: "Consultant mapping a team workflow on a glass board",
    workflowHeading: "Create a clean line from engagement to finance.",
    workflowIntroduction:
      "Keep client, project and financial information connected without forcing every team into the same working style. Start with the records and review points that affect delivery and billing.",
    workflows: [
      {
        title: "Engagement setup and ownership",
        description:
          "Organize client and engagement records, define who can approve changes, and give teams a consistent place to review status and supporting documents.",
      },
      {
        title: "Expenses and billing preparation",
        description:
          "Structure expense review and the information finance needs to prepare invoices, while preserving your existing billing or practice-management system where required.",
      },
      {
        title: "Management reporting by client or team",
        description:
          "Agree useful reporting dimensions and bring approved operational and accounting data into views leaders can review without manual consolidation.",
      },
    ],
    capabilities: [
      {
        title: "Configurable finance controls",
        description:
          "Set access, review steps and financial reporting structures to match your firm and its entities.",
      },
      {
        title: "Small tools for specific friction",
        description:
          "Design a client portal, intake form or internal workflow application when discovery confirms a clear need and owner.",
      },
      {
        title: "A planned handover",
        description:
          "Document the system, train administrators and agree ongoing support so the team understands how to maintain the workflows.",
      },
    ],
    approach: [
      {
        title: "Follow a client engagement",
        description:
          "Map the steps from setup through delivery and billing, noting systems, documents and approvals used along the way.",
      },
      {
        title: "Set a manageable first scope",
        description:
          "Choose one high-value workflow, define its data and permissions, and keep unrelated tools out of the initial rollout.",
      },
      {
        title: "Validate with the team",
        description:
          "Walk through realistic client scenarios, refine reports and prepare a handover that makes operational ownership clear.",
      },
    ],
    contactHeading: "Make client work easier to follow from setup to close.",
    contactIntroduction:
      "Show us where engagement information, approvals or finance handoffs become hard to track. We’ll help scope a focused workflow that supports your team without disrupting the tools that already work.",
  },
  {
    slug: "healthcare-care",
    title: "Healthcare & Care Providers",
    category: "Service coordination & administration",
    summary:
      "Support the operational side of care with clearer coordination, administrative workflows and management reporting.",
    headline: "Make the administrative handoffs easier to see and manage.",
    introduction:
      "Care teams need dependable coordination without adding unnecessary steps to the work. We help providers map administrative processes, configure finance and approval workflows, and build focused applications around needs such as referrals, scheduling or service documentation.",
    valueHeading: "Improve the work around care without getting in its way.",
    image: careImage,
    imageAlt: "Caregiver assisting an older adult during a mobility exercise at home",
    workflowHeading: "Support the people coordinating care.",
    workflowIntroduction:
      "Start with the operational information teams need to hand work over clearly. Keep clinical systems and professional judgment in their proper place while improving the supporting processes around them.",
    workflows: [
      {
        title: "Referral and service intake",
        description:
          "Design an agreed intake workflow that records the information administrators need, assigns ownership and makes incomplete handoffs visible.",
      },
      {
        title: "Scheduling and team coordination",
        description:
          "Where existing tools leave a gap, scope an application for schedule requests, assignments or status updates around the provider's actual operating model.",
      },
      {
        title: "Administrative and financial review",
        description:
          "Organize approval responsibilities, supplier and expense records, and management reporting across locations or service teams.",
      },
    ],
    capabilities: [
      {
        title: "Workflows designed with staff",
        description:
          "Map handoffs with administrators and care teams so digital steps fit the work rather than interrupt it.",
      },
      {
        title: "Careful data boundaries",
        description:
          "Define what information the new workflow needs, who may access it and which existing system remains authoritative.",
      },
      {
        title: "Operational systems and support",
        description:
          "Configure finance and back-office processes, document the solution and plan maintenance with named owners.",
      },
    ],
    approach: [
      {
        title: "Understand the service context",
        description:
          "Review the administrative journey, roles, existing platforms and privacy requirements before proposing a technical scope.",
      },
      {
        title: "Prototype the handoff",
        description:
          "Use realistic scenarios to review fields, permissions and exception paths with the staff who will use the workflow.",
      },
      {
        title: "Roll out with clear ownership",
        description:
          "Prepare guidance, agree support responsibilities and validate the operational process before wider adoption.",
      },
    ],
    contactHeading: "Give your teams a clearer path through the admin work.",
    contactIntroduction:
      "We’ll learn how referrals, schedules and administrative records move through your organization, then agree a careful first scope with clear data boundaries and ownership.",
  },
  {
    slug: "construction-field-services",
    title: "Construction & Field Services",
    category: "Projects, purchasing & field teams",
    summary:
      "Connect office approvals, purchasing and field updates so project teams can act on a shared operational record.",
    headline: "Bring the office and the job site into the same conversation.",
    introduction:
      "Work moves between estimators, project leads, procurement and people in the field. We configure the records and approval steps that keep those handoffs traceable, and build mobile-friendly tools when teams need a simpler way to submit updates away from the office.",
    valueHeading: "Keep project commitments connected to what happens on site.",
    image: fieldImage,
    imageAlt: "Field operations dashboard with assignments, stock counts and mobile team tasks",
    workflowHeading: "Keep commitments and field updates connected.",
    workflowIntroduction:
      "Give project teams a reliable route for requests and updates, then make the resulting records useful to operations and finance.",
    workflows: [
      {
        title: "Project request to approved purchase",
        description:
          "Route material or service requests to the right reviewer, retain the project reference and follow the order through supplier confirmation and receipt.",
      },
      {
        title: "Field assignments and updates",
        description:
          "Build a mobile-friendly workflow for agreed site updates, evidence or issue escalation, with clear ownership when connectivity or timing affects submission.",
      },
      {
        title: "Project records into management review",
        description:
          "Organize approved commitments, purchasing and operational updates into reporting dimensions leaders can use to review progress and exceptions.",
      },
    ],
    capabilities: [
      {
        title: "Approvals that match responsibility",
        description:
          "Configure access and review paths around project roles, spending authority and the records required for follow-up.",
      },
      {
        title: "Mobile tools for the actual site workflow",
        description:
          "Design focused field applications around device access, submission needs and practical connectivity constraints.",
      },
      {
        title: "Finance and operations in step",
        description:
          "Connect agreed procurement and accounting information while keeping project identifiers consistent across the workflow.",
      },
    ],
    approach: [
      {
        title: "Map the project handoffs",
        description:
          "Identify who raises requests, approves commitments, receives materials and records field changes.",
      },
      {
        title: "Test at the point of work",
        description:
          "Review the mobile or office workflow with representative users, including delayed submissions and incomplete information.",
      },
      {
        title: "Introduce one workflow at a time",
        description:
          "Prepare project and supplier records, train each role and use early feedback to plan the next rollout stage.",
      },
    ],
    contactHeading: "Connect the next field update to the right decision.",
    contactIntroduction:
      "We’ll map how requests, approvals and site updates move today, then help choose a practical first workflow that works for office and field teams alike.",
  },
];

export const getIndustry = (slug: string) => industries.find((industry) => industry.slug === slug);