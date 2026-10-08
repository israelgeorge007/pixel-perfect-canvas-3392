import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getService, services } from "@/lib/services";
import { serviceDetails } from "@/lib/service-details";

export const Route = createFileRoute("/services/$slug")({
  loader: ({ params }) => {
    const service = getService(params.slug);
    if (!service) throw notFound();
    return { slug: service.slug };
  },
  head: ({ loaderData }) => {
    const s = loaderData ? getService(loaderData.slug) : undefined;
    if (!s) return { meta: [{ title: "Service not found — Corelogic" }, { name: "robots", content: "noindex" }] };
    const title = `${s.title} — Corelogic Systems`;
    return {
      meta: [
        { title },
        { name: "description", content: s.summary },
        { property: "og:title", content: title },
        { property: "og:description", content: s.summary },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: ServiceNotFound,
  component: ServicePage,
});

function ServiceNotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="text-3xl font-bold">Service not found</h1>
        <a href="/#services" className="mt-4 inline-block text-primary hover:underline">See all services</a>
      </div>
    </div>
  );
}

function ServicePage() {
  const { slug } = Route.useLoaderData();
  const s = getService(slug);
  const details = serviceDetails[slug];
  if (!s || !details) return <ServiceNotFound />;
  const others = services.filter((o) => o.slug !== s.slug);
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="flex min-h-screen items-center bg-navy pt-16 text-navy-foreground">
        <div className="mx-auto w-full max-w-7xl px-6 py-24 md:py-32">
          <p className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-navy-muted">
            <Icon className="h-4 w-4 text-accent" /> Service {s.code}
          </p>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] md:text-6xl">{s.title}</h1>
          <p className="mt-6 max-w-2xl text-lg font-light text-navy-muted">{s.intro}</p>
          <a href={`/#contact`} className="mt-10 inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 font-medium text-accent-foreground transition hover:brightness-110">
            Schedule a Consultation <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-6 py-24">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">What's included</p>
        <h2 className="mt-3 text-4xl font-bold">Built around your workflows.</h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded border bg-border sm:grid-cols-2">
          {s.features.map((f) => (
            <div key={f.t} className="bg-card p-8">
              <h3 className="text-xl font-semibold">{f.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {s.implementationOptions && (
        <section className="flex min-h-screen items-center border-y bg-secondary/40">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-20 md:grid-cols-[0.8fr_1.2fr] md:items-start">
            <div>
              <p className="text-sm font-medium uppercase tracking-widest text-primary">Implementation options</p>
              <h2 className="mt-3 text-3xl font-bold">A delivery model that fits.</h2>
              <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">Choose a configurable platform tailored to your workflows, or a bespoke system built to your requirements.</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {s.implementationOptions.map((option) => (
                <article key={option.t} className="border-t border-border pt-5">
                  <h3 className="text-lg font-semibold">{option.t}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{option.d}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="flex min-h-screen items-center border-y bg-secondary/40">
        <div className="mx-auto w-full max-w-7xl px-6 py-24">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">In practice</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-bold md:text-4xl">{details.workflowHeading}</h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {details.workflows.map((workflow, index) => (
              <article key={workflow.title} className="border-t border-border pt-6">
                <span className="text-sm font-medium text-muted-foreground">0{index + 1}</span>
                <h3 className="mt-5 text-xl font-semibold">{workflow.title}</h3>
                <p className="mt-4 leading-relaxed text-muted-foreground">{workflow.description}</p>
              </article>
            ))}
          </div>
          <ul className="mt-14 grid gap-4 border-t border-border pt-8 md:grid-cols-3">
            {s.outcomes.map((outcome) => (
              <li key={outcome} className="flex items-start gap-3 text-sm font-medium"><CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />{outcome}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex min-h-screen items-center">
        <div className="mx-auto w-full max-w-7xl px-6 py-24">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">How we work</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-bold md:text-4xl">{details.deliveryHeading}</h2>
          <ol className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
            {details.steps.map((step, index) => (
              <li key={step.title} className="border-t border-border pt-6">
                <span className="text-sm font-medium text-muted-foreground">0{index + 1}</span>
                <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="flex min-h-screen items-center bg-navy text-navy-foreground">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-24 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-accent">Getting started</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">A productive first conversation.</h2>
            <p className="mt-6 max-w-lg leading-relaxed text-navy-muted">{details.scopeNote}</p>
            <Button asChild size="lg" className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/contact">Discuss your requirements <ArrowRight /></Link></Button>
          </div>
          <div>
            <h3 className="text-xl font-semibold">What to bring</h3>
            <ul className="mt-6 divide-y divide-navy-line">
              {details.preparation.map((item) => (
                <li key={item} className="flex items-start gap-3 py-5 text-navy-muted"><CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center">
        <div className="mx-auto w-full max-w-7xl px-6 py-24">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">How we work</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-bold md:text-4xl">{details.deliveryHeading}</h2>
          <ol className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
            {details.steps.map((step, index) => (
              <li key={step.title} className="border-t border-border pt-6">
                <span className="text-sm font-medium text-muted-foreground">0{index + 1}</span>
                <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="flex min-h-screen items-center bg-navy text-navy-foreground">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-24 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-accent">Getting started</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">A productive first conversation.</h2>
            <p className="mt-6 max-w-lg leading-relaxed text-navy-muted">{details.scopeNote}</p>
            <Button asChild size="lg" className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/contact">Discuss your requirements <ArrowRight /></Link></Button>
          </div>
          <div>
            <h3 className="text-xl font-semibold">What to bring</h3>
            <ul className="mt-6 divide-y divide-navy-line">
              {details.preparation.map((item) => (
                <li key={item} className="flex items-start gap-3 py-5 text-navy-muted"><CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-24">
        <h2 className="text-2xl font-bold">Other services</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {others.map((o) => (
            <Link key={o.slug} to="/services/$slug" params={{ slug: o.slug }} className="group rounded border bg-card p-6 transition-colors hover:bg-secondary">
              <o.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-6 font-semibold">{o.title}</h3>
              <span className="mt-3 inline-flex items-center gap-1 text-sm text-primary">Learn more <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}