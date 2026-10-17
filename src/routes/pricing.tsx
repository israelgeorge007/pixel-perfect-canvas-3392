import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, CircleDollarSign, Layers3, ShieldCheck, Sparkles } from "lucide-react";
import accountingIllustration from "@/assets/accounting-firms.svg";
import pricingIllustration from "@/assets/pricing.svg";
import supportIllustration from "@/assets/support.svg";
import accountingDashboard from "@/assets/service-accounting-dashboard.png";
import erpDashboard from "@/assets/service-erp-dashboard.png";
import appsDashboard from "@/assets/service-apps-dashboard.png";
import supportDashboard from "@/assets/service-support-dashboard.png";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const TITLE = "Pricing | Tarrlogic Systems";
const DESC = "Explore flexible ERP, accounting, mobile application and support options from Tarrlogic Systems. Get a tailored proposal for your business.";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PricingPage,
});

const pricingFactors = [
  { title: "Platform scope", text: "The modules, users, entities and workflows you need.", image: erpDashboard },
  { title: "Implementation", text: "Configuration, data preparation, integrations and testing.", image: accountingDashboard },
  { title: "Support", text: "Ongoing monitoring, training, improvements and escalation.", image: supportDashboard },
  { title: "Growth", text: "Future modules, additional users, locations and integrations.", image: appsDashboard },
];

function PricingPage() {
  return ( 
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="relative flex min-h-screen items-center overflow-hidden bg-navy pt-16 text-navy-foreground">
          <div className="absolute inset-0 grid-lines opacity-10" />
          <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-6 py-24 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-32">
            <div>
              <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">A modern ERP without the legacy cost.</h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-navy-muted">Build a flexible solution around your workflows, people and growth plans. Your proposal is shaped by the outcomes you need—not a one-size-fits-all package.</p>
              <div className="mt-10 flex flex-wrap gap-4">
                <a href="/contact" className="inline-flex items-center gap-2 rounded bg-accent px-6 py-3 font-medium text-accent-foreground transition hover:brightness-110">Schedule a call <ArrowRight className="h-4 w-4" /></a>
                <a href="#what-affects-cost" className="inline-flex items-center rounded border border-navy-line px-6 py-3 font-medium transition hover:bg-navy-line/50">What affects cost</a>
              </div>
            </div>
            <img src={pricingIllustration} alt="Illustration of a modular software platform with connected business workflows" className="w-full rounded-2xl border border-navy-line bg-white/5 shadow-2xl" />
          </div>
        </section>

        <section id="what-affects-cost" className="mx-auto w-full max-w-7xl px-6 py-24 sm:px-10">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">Built around your business</p>
            <h2 className="mt-3 text-4xl font-bold">One contract. A structure that fits.</h2>
            <p className="mt-5 leading-relaxed text-muted-foreground">We collaborate with your team to align the platform, implementation and ongoing support with your operating model, users and client needs.</p>
          </div>
          <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-2">
            {pricingFactors.map(({ title, text, image }, index) => (
              <article
                key={title}
                tabIndex={0}
                className={`group relative min-h-[360px] origin-bottom overflow-hidden rounded border bg-card outline-none transition duration-300 hover:z-20 hover:-translate-y-2 hover:rotate-0 hover:scale-[1.03] hover:shadow-xl focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-primary focus:-translate-y-2 focus:rotate-0 focus:scale-[1.03] focus:shadow-xl lg:min-h-[420px] ${index > 0 ? "lg:-ml-4" : ""} ${index === 0 ? "lg:-rotate-2" : index === 1 ? "lg:rotate-1" : index === 2 ? "lg:-rotate-1" : "lg:rotate-2"}`}
              >
                <img
                  src={image}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-[76%] w-full object-cover object-top transition duration-700 group-hover:scale-105 group-focus:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/15 to-background" />
                <span className="absolute left-6 top-6 z-10 font-display text-sm font-bold text-primary">0{index + 1}</span>
                <div className="absolute inset-x-0 bottom-0 z-10 p-6">
                  <h3 className="text-xl font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground opacity-100 transition duration-300 [@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus:translate-y-0 [@media(hover:hover)]:group-focus:opacity-100">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="why" className="mx-auto w-full max-w-7xl px-6 py-24 sm:px-10">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">Why Tarrlogic?</p>
            <h2 className="mt-3 text-4xl font-bold">A platform designed around the way you work.</h2>
            <p className="mt-5 leading-relaxed text-muted-foreground">We bring software engineering, business process design and data analysis together so your system supports the full operation—not only the finance function.</p>
          </div>

          <div className="mt-16 space-y-16">
            {[
              {
                eyebrow: "Connected operations",
                title: "One source of truth for your business.",
                text: "Bring finance, procurement, inventory, payroll and reporting together so your team works from a consistent, accurate view of operations.",
                image: accountingIllustration,
                alt: "Illustration of an accounting firm's consolidated client data and reporting workflow",
                reverse: false,
              },
              {
                eyebrow: "Intelligent automation",
                title: "Let software handle the repetitive work.",
                text: "Automate data standardisation, reconciliation and routine reporting so your team can focus on decisions, control and client service.",
                image: pricingIllustration,
                alt: "Illustration of a modular software platform with connected business workflows",
                reverse: true,
              },
              {
                eyebrow: "Support that scales",
                title: "A dedicated team after launch.",
                text: "Move from your current systems with guided onboarding, then rely on proactive monitoring, training and specialist support as your needs evolve.",
                image: supportIllustration,
                alt: "Illustration of a support specialist helping a business team resolve system issues",
                reverse: false,
              },
            ].map(({ eyebrow, title, text, image, alt, reverse }) => (
              <article key={eyebrow} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
                <div className={reverse ? "lg:order-2" : ""}>
                  <p className="text-sm font-medium uppercase tracking-widest text-primary">{eyebrow}</p>
                  <h3 className="mt-4 text-3xl font-bold sm:text-4xl">{title}</h3>
                  <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">{text}</p>
                  <a href="/contact" className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">Discuss your requirements <ArrowRight className="h-4 w-4" /></a>
                </div>
                <div className={reverse ? "lg:order-1" : ""}>
                  <img src={image} alt={alt} className="w-full rounded-2xl border bg-card shadow-sm" />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y bg-secondary/40">
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-24 sm:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <h2 className="mt-3 text-4xl font-bold">Getting started is straightforward.</h2>
              <p className="mt-5 leading-relaxed text-muted-foreground">Our team supports the transition from your current systems through guided onboarding, then keeps the platform useful as your needs change.</p>
              <a href="/contact" className="mt-8 inline-flex items-center gap-2 rounded bg-primary px-6 py-3 font-medium text-primary-foreground transition hover:brightness-110">Schedule a planning call <ArrowRight className="h-4 w-4" /></a>
            </div>
            <div className="rounded border bg-card p-8 sm:p-10">
              <p className="font-display text-2xl font-bold">What to expect from the first phase</p>
              <ul className="mt-7 space-y-4">
                {[
                  "A review of your current workflows and data",
                  "A clear implementation scope and delivery plan",
                  "Guided setup and team training",
                  "A defined handover and support model",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span className="text-sm leading-relaxed text-muted-foreground">{item}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
