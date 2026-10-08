import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Headphones, LifeBuoy, RefreshCw, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import supportIllustration from "@/assets/support.svg";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const TITLE = "Support & Maintenance | Corelogic Systems";
const DESC = "Get proactive support, implementation guidance, updates, training and issue resolution for your Corelogic systems.";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
    ],
  }),
  component: SupportPage,
});

const supportServices = [
  { icon: Headphones, title: "Dedicated support", text: "A named point of contact who understands your setup, goals and team." },
  { icon: RefreshCw, title: "Migration support", text: "Structured guidance for moving data and workflows from your previous solution." },
  { icon: Sparkles, title: "Proactive insights", text: "Regular reviews that identify opportunities to improve processes and usage." },
  { icon: Wrench, title: "System care", text: "Monitoring, updates, troubleshooting and escalation support after launch." },
];

function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden bg-navy pt-16 text-navy-foreground">
          <div className="absolute inset-0 grid-lines opacity-10" />
          <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-6 py-24 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-32">
            <div>
              <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">Support that stays with you after launch.</h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-navy-muted">Keep your systems current, your users confident, and your operations moving with a dedicated team that knows your business.</p>
              <div className="mt-10 flex flex-wrap gap-4">
                <a href="/contact" className="inline-flex items-center gap-2 rounded bg-accent px-6 py-3 font-medium text-accent-foreground transition hover:brightness-110">Talk to a specialist <ArrowRight className="h-4 w-4" /></a>
                <a href="#support-coverage" className="inline-flex items-center rounded border border-navy-line px-6 py-3 font-medium transition hover:bg-navy-line/50">See support coverage</a>
              </div>
            </div>
            <img src={supportIllustration} alt="Illustration of a support specialist helping a business team resolve system issues" className="w-full rounded-2xl border border-navy-line bg-white/5 shadow-2xl" />
          </div>
        </section>

        <section id="support-coverage" className="mx-auto w-full max-w-7xl px-6 py-24 sm:px-10">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">A long-term partnership</p>
            <h2 className="mt-3 text-4xl font-bold">More than a help desk.</h2>
            <p className="mt-5 leading-relaxed text-muted-foreground">Your support relationship begins during implementation and continues as your workflows, users and needs evolve.</p>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {supportServices.map(({ icon: Icon, title, text }) => (
              <article key={title} className="bg-card p-8">
                <span className="grid h-12 w-12 place-items-center rounded bg-primary/10 text-primary"><Icon className="h-6 w-6" /></span>
                <h3 className="mt-8 text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y bg-secondary/40">
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-24 sm:px-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-sm font-medium uppercase tracking-widest text-primary">How we work</p>
              <h2 className="mt-3 text-4xl font-bold">Clear support, from first setup to ongoing growth.</h2>
              <p className="mt-5 leading-relaxed text-muted-foreground">We keep the relationship practical: define the right outcome, prepare your team, test the process and stay available when the business changes.</p>
            </div>
            <div className="grid gap-4">
              {[
                ["01", "Understand", "We map your workflows, users, data and operating priorities before delivery."],
                ["02", "Prepare", "We configure the platform, test the core journeys and train your team."],
                ["03", "Support", "We monitor performance, resolve issues and guide improvements over time."],
              ].map(([number, title, text]) => (
                <article key={number} className="flex gap-5 rounded border bg-card p-6">
                  <span className="font-display text-sm font-bold text-primary">{number}</span>
                  <div><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-24 sm:px-10 md:grid-cols-2">
          <div className="rounded border bg-card p-8 sm:p-10">
            <LifeBuoy className="h-8 w-8 text-primary" />
            <h2 className="mt-6 text-3xl font-bold">Need help with an existing system?</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">Tell us what is happening and what outcome you need. We’ll help identify the right support and escalation path.</p>
            <Link to="/contact" className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">Contact support <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="rounded bg-navy p-8 text-navy-foreground sm:p-10">
            <ShieldCheck className="h-8 w-8 text-accent" />
            <h2 className="mt-6 text-3xl font-bold">A safer path to continuity.</h2>
            <p className="mt-4 leading-relaxed text-navy-muted">Clear ownership, documented workflows, and attentive follow-up help your team stay productive while the system evolves.</p>
            <div className="mt-7 flex items-center gap-3 text-sm text-navy-muted"><CheckCircle2 className="h-5 w-5 text-accent" /> Support plans tailored to your operation</div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
