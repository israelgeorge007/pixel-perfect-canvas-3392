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

  const Icon = s.icon;
  const others = services.filter((o) => o.slug !== s.slug);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="relative flex min-h-screen items-center overflow-hidden bg-navy pt-16 text-navy-foreground">
        <div className="absolute inset-0 grid-lines opacity-10" />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-6 py-24 md:grid-cols-[1.05fr_0.95fr] md:gap-16 md:py-32">
          <div>
            <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] md:text-7xl">{s.title}</h1>
            <p className="mt-6 max-w-2xl text-lg font-light text-navy-muted">{s.intro}</p>
            <Button asChild size="lg" className="mt-10 bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/contact">Schedule a call <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          <figure className="min-w-0">
            <img
              src={details.image}
              alt={details.imageAlt}
              width={1536}
              height={1152}
              fetchPriority="high"
              className="aspect-[4/3] w-full rounded-lg object-contain"
            />
          </figure>
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

      <SiteFooter />
    </div>
  );
}