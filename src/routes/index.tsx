import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Boxes, Calculator, Smartphone, LifeBuoy, Database, Code2, Mail, Phone, MapPin } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const TITLE = "Corelogic Systems — Modular ERP, Accounting & Custom Software";
const DESC =
  "Modular, data-driven ERP and accounting systems built to scale with your business, plus mobile apps and dedicated support.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const EMAIL = "hello@corelogic.example";

const faqs = [
  {
    question: "What is ERP software?",
    answer: "Enterprise Resource Planning (ERP) software brings core business processes into one connected system. Instead of managing procurement, inventory, payroll and finance in separate spreadsheets or tools, teams can work from shared data and follow consistent workflows.",
  },
  {
    question: "How is an ERP different from accounting software?",
    answer: "Accounting software focuses on financial records, bookkeeping and reporting. An ERP has a broader operational scope, connecting financial information with activities such as purchasing, stock management and payroll. The right starting point depends on which processes your business needs to bring together.",
  },
  {
    question: "When should a business consider an ERP system?",
    answer: "Common signs include entering the same information into several tools, difficulty tracking stock, slow approvals and time-consuming reporting. If disconnected systems make it harder to understand your operations, it may be time to assess a more unified approach.",
  },
  {
    question: "Can we start with one module and expand later?",
    answer: "Yes. Our modular approach lets you start with the workflows that matter most, such as procurement, inventory or payroll, and add modules as your needs grow. The scope is shaped around your operation rather than a one-size-fits-all package.",
  },
  {
    question: "What should we consider before moving from our existing tools?",
    answer: "Start by identifying the data you need to keep, the systems your team relies on and the workflows you want to improve. Existing integrations, data quality and reporting requirements should be reviewed during discovery so migration and connection needs can be included in the project scope.",
  },
  {
    question: "What determines the cost and implementation timeline?",
    answer: "The modules you need, workflow complexity, existing data and any required connections all affect the scope. A consultation is the starting point for discussing your requirements and defining an appropriate project estimate and delivery plan.",
  },
  {
    question: "Is support available after implementation?",
    answer: "Yes. Support and maintenance are part of our service offering, helping keep your systems running over time. The specific support arrangements and maintenance needs can be discussed as part of your project.",
  },
];

const services = [
  { icon: Boxes, code: "01", title: "ERP Solutions", text: "Configurable modules tailored to your operational workflows — procurement, payroll and inventory management." },
  { icon: Calculator, code: "02", title: "Financial & Accounting Software", text: "Robust, data-driven financial systems designed for accurate corporate bookkeeping and management." },
  { icon: Smartphone, code: "03", title: "Mobile Application Development", text: "Scalable, mobile-first solutions built for modern businesses and distributed teams." },
  { icon: LifeBuoy, code: "04", title: "Support & Maintenance", text: "Dedicated ongoing support ensuring long-term, seamless operation of every system we ship." },
];

const cases = [
  {
    name: "Regional Distributor ERP Rollout",
    sector: "Wholesale & Logistics",
    challenge: "Inventory tracked across spreadsheets in four warehouses, causing stock-outs and slow procurement.",
    solution: "A unified ERP with inventory, procurement and payroll modules plus real-time warehouse dashboards.",
    metrics: [["38%", "less stock-outs"], ["2.5×", "faster purchase approvals"], ["4", "sites unified"]],
  },
  {
    name: "Finance Hub for a Services Group",
    sector: "Professional Services",
    challenge: "Month-end close took weeks, with reconciliation done manually across multiple entities.",
    solution: "Custom accounting platform with automated reconciliation, multi-entity ledgers and audit trails.",
    metrics: [["60%", "faster month-end close"], ["99.8%", "reconciliation accuracy"], ["12", "entities consolidated"]],
  },
];

function Index() {
  const [active, setActive] = useState(0);
  const c = cases[active] ?? cases[0];
  if (!c) return null;
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-navy-line/60 bg-navy/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <a href="#top" className="flex items-center gap-2 font-display text-lg font-bold text-navy-foreground">
            <span className="grid h-7 w-7 place-items-center rounded bg-accent text-accent-foreground text-sm">C</span>
            Corelogic
          </a>
          <nav className="hidden gap-8 text-sm text-navy-muted md:flex">
            {["Services", "About", "Case Studies", "Contact"].map((l) => (
              <a key={l} href={`#${l.toLowerCase().replace(" ", "-")}`} className="transition-colors hover:text-navy-foreground">{l}</a>
            ))}
          </nav>
          <a href="#contact" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:brightness-110">
            Consultation
          </a>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="relative overflow-hidden bg-navy pt-16 text-navy-foreground">
        <img src={hero} alt="" width={1600} height={1104} className="absolute inset-0 h-full w-full object-cover object-right opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/80 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 py-28 md:py-40">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-navy-line px-3 py-1 text-xs uppercase tracking-widest text-navy-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Enterprise software engineering
          </p>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] md:text-7xl">
            Modular ERP & accounting systems, <span className="text-accent">built to scale.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg font-light text-navy-muted">
            We pair software engineering with data analysis to design custom solutions for how your business actually runs — then stay on to keep them running seamlessly.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a href="#contact" className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 font-medium text-accent-foreground transition hover:brightness-110">
              Schedule a Consultation <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#services" className="inline-flex items-center rounded-md border border-navy-line px-6 py-3 font-medium transition hover:bg-navy-line/50">
              Explore services
            </a>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-7xl scroll-mt-16 px-6 py-24">
        <div className="mb-14 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-primary">Services</p>
            <h2 className="mt-3 max-w-xl text-4xl font-bold">Modular offerings that fit your operation.</h2>
          </div>
          <p className="max-w-sm text-muted-foreground">Start with one module, add more as you grow. Every piece speaks the same data language.</p>
        </div>
        <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {services.map(({ icon: Icon, code, title, text }) => (
            <article key={title} className="group bg-card p-8 transition-colors hover:bg-secondary">
              <div className="flex items-center justify-between">
                <Icon className="h-7 w-7 text-primary" />
                <span className="font-display text-sm text-muted-foreground">{code}</span>
              </div>
              <h3 className="mt-10 text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="scroll-mt-16 bg-navy text-navy-foreground">
        <div className="mx-auto grid max-w-7xl gap-16 px-6 py-24 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-accent">Team & Expertise</p>
            <h2 className="mt-3 text-4xl font-bold">Where engineering meets data analysis.</h2>
            <p className="mt-6 text-navy-muted">
              Our engineers and analysts work as one team. Analysts map your numbers and workflows; engineers turn them into systems that report accurately from day one. You get software shaped by evidence, not assumptions.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Code2, t: "Software Engineering", d: "Web, mobile and backend systems built for reliability." },
              { icon: Database, t: "Data Analysis", d: "Financial modelling, reporting and operational insight." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-xl border border-navy-line p-6">
                <Icon className="h-6 w-6 text-accent" />
                <h3 className="mt-6 text-lg font-semibold">{t}</h3>
                <p className="mt-2 text-sm text-navy-muted">{d}</p>
              </div>
            ))}
            <div className="rounded-xl bg-accent p-6 text-accent-foreground sm:col-span-2">
              <p className="font-display text-lg font-semibold">One collaborative team — from discovery to long-term support.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Case studies */}
      <section id="case-studies" className="mx-auto max-w-7xl scroll-mt-16 px-6 py-24">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">Case Studies</p>
        <h2 className="mt-3 text-4xl font-bold">Measurable results.</h2>
        <div className="mt-10 flex flex-wrap gap-2">
          {cases.map((cs, i) => (
            <button
              key={cs.name}
              onClick={() => setActive(i)}
              className={`rounded-full border px-4 py-2 text-sm transition ${i === active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
            >
              {cs.name}
            </button>
          ))}
        </div>
        <article key={c.name} className="mt-8 grid gap-10 rounded-xl border bg-card p-8 animate-in fade-in md:grid-cols-5 md:p-12">
          <div className="space-y-6 md:col-span-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{c.sector}</p>
            <h3 className="text-2xl font-semibold">{c.name}</h3>
            <div>
              <h4 className="text-sm font-semibold text-primary">Challenge</h4>
              <p className="mt-1 text-muted-foreground">{c.challenge}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-primary">Solution</h4>
              <p className="mt-1 text-muted-foreground">{c.solution}</p>
            </div>
          </div>
          <div className="grid gap-4 md:col-span-2">
            {c.metrics.map(([v, l]) => (
              <div key={l} className="rounded-lg bg-secondary p-5">
                <p className="font-display text-4xl font-bold text-primary">{v}</p>
                <p className="mt-1 text-sm text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* Frequently asked questions */}
      <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-16 border-t bg-secondary/40">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-24 lg:grid-cols-3 lg:gap-16">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-primary">FAQs</p>
            <h2 id="faq-heading" className="mt-3 text-4xl font-bold">Frequently asked questions.</h2>
            <p className="mt-5 text-muted-foreground">ERP, accounting and the next step for your business.</p>
            <a href="#contact" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              Talk to our team <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <Accordion type="single" collapsible className="min-w-0 border-t lg:col-span-2">
            {faqs.map(({ question, answer }, i) => (
              <AccordionItem key={question} value={`faq-${i}`}>
                <AccordionTrigger className="gap-5 py-6 text-base font-semibold hover:no-underline hover:text-primary motion-reduce:transition-none">{question}</AccordionTrigger>
                <AccordionContent className="max-w-2xl pr-8 pb-6 text-base leading-relaxed text-muted-foreground">{answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer / Contact */}
      <footer id="contact" className="scroll-mt-16 bg-navy text-navy-foreground">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="flex flex-col justify-between gap-8 border-b border-navy-line pb-14 md:flex-row md:items-end">
            <h2 className="max-w-xl text-4xl font-bold">Ready to streamline your operations?</h2>
            <a href={`mailto:${EMAIL}?subject=Consultation request`} className="inline-flex items-center gap-2 self-start rounded-md bg-accent px-6 py-3 font-medium text-accent-foreground transition hover:brightness-110">
              Schedule a Consultation <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="grid gap-8 pt-10 text-sm text-navy-muted md:grid-cols-4">
            <div className="font-display text-lg font-bold text-navy-foreground">Corelogic</div>
            <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> {EMAIL}</p>
            <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> +234 000 000 0000</p>
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Lagos, Nigeria</p>
          </div>
          <p className="mt-10 text-xs text-navy-muted">© {new Date().getFullYear()} Corelogic Systems. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
