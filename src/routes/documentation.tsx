import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, BookOpen, Search } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const TITLE = "Corelogic Documentation | Corelogic Systems";
const DESCRIPTION = "Guides for using the Corelogic finance dashboard, including inventory, payables, reconciliation, reporting and account management.";

export const Route = createFileRoute("/documentation")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
    ],
  }),
  component: DocumentationPage,
});

const documentationSections = [
  { id: "getting-started", label: "Getting started", keywords: "navigation overview date range search" },
  { id: "customers", label: "Customers & receivables", keywords: "invoice payment profile statement debit credit" },
  { id: "suppliers", label: "Suppliers & payables", keywords: "bill vendor payment profile statement unit cost" },
  { id: "inventory", label: "Inventory", keywords: "stock item sku capacity location cost receipt" },
  { id: "procurement", label: "Procurement & purchase orders", keywords: "supplier order status approval" },
  { id: "reconciliation", label: "Reconciliation", keywords: "bank csv upload statement mapping preview match" },
  { id: "other-modules", label: "Other modules", keywords: "ledger payroll reports audit settings" },
  { id: "data-storage", label: "Data storage", keywords: "local storage browser persistence backup" },
] as const;

const quickStartCards = [
  { id: "getting-started", title: "Dashboard overview", description: "Navigate the workspace, dates and search.", image: "/dashboard-overview-placeholder.svg" },
  { id: "customers", title: "Account statements", description: "Review customer and supplier debits, credits and balances.", image: "/account-statement-placeholder.svg" },
  { id: "inventory", title: "Inventory controls", description: "Manage items, stock levels, costs and location capacity.", image: "/inventory-placeholder.svg" },
  { id: "procurement", title: "Purchasing workflow", description: "Create procurement requests and purchase orders.", image: "/purchasing-placeholder.svg" },
  { id: "reconciliation", title: "Bank reconciliation", description: "Import a statement, map columns and match transactions.", image: "/reconciliation-placeholder.svg" },
] as const;

function ScreenshotPlaceholder({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return <figure className="mt-7">
    <img src={src} alt={alt} width="1200" height="675" loading="lazy" decoding="async" className="aspect-video w-full rounded border bg-card object-cover" />
    <figcaption className="mt-2 text-xs text-muted-foreground">Screenshot placeholder · {caption}</figcaption>
  </figure>;
}

function DocumentationPage() {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const searchResults = documentationSections.filter(({ label, keywords }) =>
    `${label} ${keywords}`.toLowerCase().includes(normalizedSearch),
  );
  const quickStartResults = quickStartCards.filter((card) => {
    const section = documentationSections.find(({ id }) => id === card.id);
    return !normalizedSearch || `${card.title} ${card.description} ${section?.keywords ?? ""}`.toLowerCase().includes(normalizedSearch);
  });
  return (
    <div id="top" className="min-h-screen bg-background pt-16">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-6 sm:px-10">
        <div className="flex flex-col gap-5 border-b py-5 md:flex-row md:items-center md:justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><BookOpen className="h-5 w-5 text-primary" /> Documentation</p>
          <div className="relative w-full md:max-w-xl">
            <label className="flex h-11 items-center gap-3 rounded border bg-card px-3 text-muted-foreground focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
              <Search className="h-4 w-4 shrink-0" />
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search documentation" aria-label="Search documentation" autoComplete="off" className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
            </label>
            {normalizedSearch && <nav aria-label="Documentation search results" className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded border bg-card shadow-lg">
              {searchResults.length > 0 ? searchResults.map(({ id, label }) => <a key={id} href={`#${id}`} onClick={() => setSearch("")} className="block border-b px-4 py-3 text-sm last:border-0 hover:bg-secondary">{label}</a>) : <p className="px-4 py-3 text-sm text-muted-foreground">No matching topics found.</p>}
            </nav>}
          </div>
          <a href="/contact" className="hidden text-sm font-medium text-primary hover:underline md:block">Contact</a>
        </div>

        <div className="grid gap-10 py-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14 lg:py-14">
          <aside className="h-fit lg:sticky lg:top-24">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Dashboard guide</p>
            <nav aria-label="Documentation contents" className="mt-4 grid gap-1 border-l pl-4 text-sm">
              {searchResults.map(({ id, label }) => <a key={id} href={`#${id}`} className="py-1.5 text-muted-foreground transition-colors hover:text-foreground">{label}</a>)}
            </nav>
          </aside>

          <div className="min-w-0 space-y-14">
            <header>
              <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">Corelogic documentation</h1>
              <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground">Practical instructions for recording transactions, managing stock, reconciling accounts and reviewing reports in the Corelogic finance dashboard.</p>
            </header>

            <section aria-labelledby="quick-start-title">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div><h2 id="quick-start-title" className="mt-2 text-3xl font-bold">Quick start</h2></div>
                <span className="text-xs text-muted-foreground">{quickStartResults.length} guides</span>
              </div>
              {quickStartResults.length > 0
                ? <div className="grid gap-5 sm:grid-cols-2">
                  {quickStartResults.map((card) => <a key={card.id} href={`#${card.id}`} className="group overflow-hidden rounded border bg-card transition-colors hover:border-primary/40">
                    <img src={card.image} alt={`Screenshot placeholder for ${card.title}`} width="1200" height="675" loading="lazy" decoding="async" className="aspect-video w-full border-b object-cover" />
                    <div className="p-5"><h3 className="font-semibold text-primary group-hover:underline">{card.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.description}</p><span className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-foreground">Read guide <ArrowRight className="h-3.5 w-3.5" /></span></div>
                  </a>)}
                </div>
                : <p className="rounded border bg-card px-5 py-6 text-sm text-muted-foreground">No quick-start guides match this search.</p>}
            </section>

            <div className="space-y-14">
            <section id="getting-started" className="scroll-mt-24">
              <p className="text-sm font-medium uppercase tracking-widest text-primary">Workspace</p>
              <h2 className="mt-3 text-3xl font-bold">Getting started</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">Use the left navigation to open a module. The date-range control filters dated records, and the search field filters the current screen. Select the Inventory or Reconciliation tabs to switch between their views.</p>
              <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                <li>Overview summarizes cash flow, receivables, payables and recent activity.</li>
                <li>Use the date range to narrow dated data; some current-state views, such as inventory on hand, remain current snapshots.</li>
                <li>Use the profile menu for profile settings. The Help button opens this guide.</li>
              </ul>
              <ScreenshotPlaceholder src="/dashboard-overview-placeholder.svg" alt="Placeholder for the finance dashboard overview screenshot" caption="Dashboard overview" />
            </section>

            <section id="customers" className="scroll-mt-24 border-t pt-10">
              <p className="text-sm font-medium uppercase tracking-widest text-primary">Receivables</p>
              <h2 className="mt-3 text-3xl font-bold">Customers & receivables</h2>
              <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
                <li>Open Receivables and choose <strong className="font-semibold text-foreground">Customers</strong> to view saved profiles, or use <strong className="font-semibold text-foreground">New customer</strong> to add one.</li>
                <li>Choose <strong className="font-semibold text-foreground">Invoices</strong>, then create a customer invoice by selecting a saved customer and entering the reference, amount and due date.</li>
                <li>Open a customer with <strong className="font-semibold text-foreground">View</strong> to see its account statement. Debits record invoices; credits record payments received. Use the payment form to post a receipt against an open invoice.</li>
              </ol>
              <ScreenshotPlaceholder src="/customer-profile-placeholder.svg" alt="Placeholder for the customer profile creation screen" caption="Creating a customer profile" />
              <ScreenshotPlaceholder src="/receivables-invoice-placeholder.svg" alt="Placeholder for the customer invoice creation screen" caption="Creating a customer invoice" />
            </section>

            <section id="suppliers" className="scroll-mt-24 border-t pt-10">
              <p className="text-sm font-medium uppercase tracking-widest text-primary">Payables</p>
              <h2 className="mt-3 text-3xl font-bold">Suppliers & payables</h2>
              <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
                <li>Open Payables and choose <strong className="font-semibold text-foreground">Suppliers</strong> to browse profiles. Use <strong className="font-semibold text-foreground">New supplier</strong> to save contact details.</li>
                <li>Choose <strong className="font-semibold text-foreground">Bills & orders</strong>, then use <strong className="font-semibold text-foreground">Add bill</strong> to record a supplier bill.</li>
                <li>For goods received into stock, select the inventory bill category, add one or more inventory lines and choose a stock location. Unit costs come from Inventory and are read-only on the bill. The bill total is calculated from its lines.</li>
                <li>Use <strong className="font-semibold text-foreground">View</strong> on a supplier to see its statement. Credits record bills; debits record payments made. The profile payment form posts a payment against an outstanding bill.</li>
              </ol>
              <ScreenshotPlaceholder src="/supplier-profile-placeholder.svg" alt="Placeholder for the supplier profile creation screen" caption="Creating a supplier profile" />
              <ScreenshotPlaceholder src="/multi-item-bill-placeholder.svg" alt="Placeholder for the multi-item supplier bill form" caption="Recording a goods-received bill with multiple items" />
              <ScreenshotPlaceholder src="/account-statement-placeholder.svg" alt="Placeholder for a customer or supplier account statement screenshot" caption="Customer and supplier account statement" />
            </section>

            <section id="inventory" className="scroll-mt-24 border-t pt-10">
              <p className="text-sm font-medium uppercase tracking-widest text-primary">Stock control</p>
              <h2 className="mt-3 text-3xl font-bold">Inventory</h2>
              <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
                <p><strong className="font-semibold text-foreground">Overview</strong> contains stock metrics, the location chart, location capacity, and the inventory items table.</p>
                <p>Use <strong className="font-semibold text-foreground">Add</strong> to create an item with its opening quantity, unit cost, reorder level and location. Use <strong className="font-semibold text-foreground">Edit cost</strong> on an item to update its saved unit cost. If stock is on hand, the inventory value is recalculated and the adjustment is journaled.</p>
                <p><strong className="font-semibold text-foreground">Adjust stock</strong> records a receipt or issue. Receipts require a unit cost and update the saved weighted-average cost. Location capacity cannot be exceeded. Use <strong className="font-semibold text-foreground">Edit capacity</strong> in Locations to change a warehouse limit; capacity cannot be reduced below stock on hand.</p>
              </div>
              <ScreenshotPlaceholder src="/inventory-placeholder.svg" alt="Placeholder for the inventory overview and stock controls screenshot" caption="Inventory overview and stock controls" />
            </section>

            <section id="procurement" className="scroll-mt-24 border-t pt-10">
              <p className="text-sm font-medium uppercase tracking-widest text-primary">Purchasing</p>
              <h2 className="mt-3 text-3xl font-bold">Procurement & purchase orders</h2>
              <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
                <p>In Inventory, choose the <strong className="font-semibold text-foreground">Procurement</strong> tab to create and review requests. Review a request to generate a reference or update its workflow status.</p>
                <p>Choose <strong className="font-semibold text-foreground">Purchase Order</strong> to create orders with one or more items and review their details. Update a purchase-order status from its review drawer; the table reflects the saved status.</p>
              </div>
              <ScreenshotPlaceholder src="/purchasing-placeholder.svg" alt="Placeholder for procurement and purchase order screenshots" caption="Procurement and purchase orders" />
            </section>

            <section id="reconciliation" className="scroll-mt-24 border-t pt-10">
              <p className="text-sm font-medium uppercase tracking-widest text-primary">Matching</p>
              <h2 className="mt-3 text-3xl font-bold">Reconciliation</h2>
              <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
                <li>Use the pill tabs to switch between Payables, Receivables and Bank reconciliation.</li>
                <li>In Bank, select <strong className="font-semibold text-foreground">Upload statement</strong>, choose a CSV file, confirm the date, description, reference and amount columns, then preview the parsed transactions.</li>
                <li>Import the statement after checking the preview. For unmatched bank lines, use <strong className="font-semibold text-foreground">Match</strong> to find a corresponding posted ledger entry.</li>
              </ol>
              <ScreenshotPlaceholder src="/reconciliation-placeholder.svg" alt="Placeholder for bank reconciliation and statement upload screenshots" caption="Bank reconciliation and CSV import" />
            </section>

            <section id="other-modules" className="scroll-mt-24 border-t pt-10">
              <p className="text-sm font-medium uppercase tracking-widest text-primary">Finance operations</p>
              <h2 className="mt-3 text-3xl font-bold">Other modules</h2>
              <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
                <p><strong className="font-semibold text-foreground">Ledger:</strong> create journal entries with balanced debit and credit lines, add accounts, and open account activity.</p>
                <p><strong className="font-semibold text-foreground">Invoice:</strong> add invoices to the review queue and update their review status.</p>
                <p><strong className="font-semibold text-foreground">Payroll:</strong> create pending payroll accruals and record employee payments.</p>
                <p><strong className="font-semibold text-foreground">Reports:</strong> create a report draft with a start and end date, then open it to review the consolidated figures.</p>
                <p><strong className="font-semibold text-foreground">Audit Logs:</strong> review dated events and the recorded user, action, type and status.</p>
                <p><strong className="font-semibold text-foreground">Settings:</strong> configure workspace preferences and manage available user profiles.</p>
              </div>
            </section>

            <section id="data-storage" className="scroll-mt-24 border-t pt-10">
              <p className="text-sm font-medium uppercase tracking-widest text-primary">Persistence</p>
              <h2 className="mt-3 text-3xl font-bold">Data storage</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">This dashboard build saves its working data in the browser’s local storage. Data is specific to the browser profile and device; clearing site data can remove it. Export or back up important records before clearing browser data or changing devices.</p>
            </section>

            <div className="border-t pt-8">
              <Link to="/contact" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">Need more help? Contact our team <ArrowRight className="h-4 w-4" /></Link>
            </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}