import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, CheckCircle2, CircleDollarSign, Database, FileCheck2, Users } from "lucide-react";
import accountingIllustration from "@/assets/accounting-firms.svg";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const TITLE = "Accounting Firms | Corelogic Systems";
const DESC = "Help your accounting practice unify client data, deliver scalable advisory services, and grow through a connected ERP and accounting platform.";

export const Route = createFileRoute("/accounting-firms")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AccountingFirmsPage,
});

const capabilities = [
  { icon: Database, title: "Unified client data", text: "Connect financial, operational and client data into one reliable source of truth." },
  { icon: BarChart3, title: "Scalable advisory", text: "Create consolidated reporting and workflows that support complex, multi-entity practices." },
  { icon: FileCheck2, title: "Controlled onboarding", text: "Move clients from existing systems with a guided, structured implementation plan." },
  { icon: Users, title: "Client growth", text: "Give clients a clear route from their current processes to more efficient operations." },
];

const checklist = [
  "Multiple entities or locations",
  "Complex, high-volume client workflows",
  "Need for consolidated reporting and controls",
  "A desire to improve monthly close efficiency",
  "A growing advisory practice that needs repeatable delivery",
];

function AccountingFirmsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden bg-navy pt-16 text-navy-foreground">
          <div className="absolute inset-0 grid-lines opacity-10" />
          <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-6 py-24 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-32">
            <div>
              <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">Built for the complexity of modern client operations.</h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-navy-muted">
                Give your practice a connected accounting and ERP foundation for multi-entity clients, faster month-end work and more strategic advisory service.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <a href="/contact" className="inline-flex items-center gap-2 rounded bg-accent px-6 py-3 font-medium text-accent-foreground transition hover:brightness-110">
                  Schedule a call <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#how-we-help" className="inline-flex items-center rounded border border-navy-line px-6 py-3 font-medium transition hover:bg-navy-line/50">Explore the approach</a>
              </div>
            </div>
            <img src={accountingIllustration} alt="Illustration of an accounting firm's consolidated client data and reporting workflow" className="w-full rounded-2xl border border-navy-line bg-white/5 shadow-2xl" />
          </div>
        </section>

        <section id="how-we-help" className="mx-auto w-full max-w-7xl px-6 py-24 sm:px-10">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <h2 className="mt-3 text-4xl font-bold">A stronger platform for your clients—and your practice.</h2>
            </div>
            <p className="text-lg leading-relaxed text-muted-foreground">Your clients need more than separate accounting tools. They need a system that connects their finance, procurement, inventory, payroll and reporting operations while your firm retains control of delivery and support.</p>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded border bg-border sm:grid-cols-2">
            {capabilities.map(({ icon: Icon, title, text }) => (
              <article key={title} className="bg-card p-8 sm:p-10">
                <span className="grid h-12 w-12 place-items-center rounded bg-primary/10 text-primary"><Icon className="h-6 w-6" /></span>
                <h3 className="mt-8 text-xl font-semibold">{title}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y bg-secondary/40">
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-24 sm:px-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-medium uppercase tracking-widest text-primary">Designed for complex clients</p>
              <h2 className="mt-3 text-4xl font-bold">Support the work that matters most.</h2>
              <p className="mt-5 max-w-xl leading-relaxed text-muted-foreground">We help firms identify the right starting point, configure a practical solution, and provide a clear path for scaling each client relationship.</p>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {checklist.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded border bg-card p-7 shadow-sm sm:p-10">
              <CircleDollarSign className="h-9 w-9 text-primary" />
              <p className="mt-8 font-display text-3xl font-bold">A clearer path to advisory value.</p>
              <p className="mt-4 leading-relaxed text-muted-foreground">Move from fragmented tools and manual reporting to a consolidated system that gives your team time back for client advice.</p>
              <div className="mt-8 grid grid-cols-2 gap-4 border-t pt-6 text-center">
                <div><p className="text-2xl font-bold">One</p><p className="mt-1 text-xs text-muted-foreground">Connected platform</p></div>
                <div><p className="text-2xl font-bold">Many</p><p className="mt-1 text-xs text-muted-foreground">Client workflows</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 py-24 sm:px-10">
          <div className="rounded border bg-card p-8 sm:p-12 lg:flex lg:items-center lg:justify-between lg:gap-12">
            <div>
              <h2 className="mt-3 text-3xl font-bold">See where your clients can gain the most.</h2>
              <p className="mt-4 max-w-2xl text-muted-foreground">Share your client profile and current operating model. We’ll help define a practical starting point for your practice.</p>
            </div>
            <Link to="/contact" className="mt-8 inline-flex items-center gap-2 rounded bg-accent px-6 py-3 font-medium text-accent-foreground transition hover:brightness-110 lg:mt-0">Book a consultation <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
