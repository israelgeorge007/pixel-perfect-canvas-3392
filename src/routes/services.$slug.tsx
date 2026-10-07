import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { getService, services } from "@/lib/services";

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
   if (!s) return <ServiceNotFound />;
  const Icon = s.icon;
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
        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2">
          {s.features.map((f) => (
            <div key={f.t} className="bg-card p-8">
              <h3 className="text-xl font-semibold">{f.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-h-screen items-center border-y bg-secondary/40">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-20 md:grid-cols-2">
          <h2 className="text-3xl font-bold">What you can expect.</h2>
          <ul className="space-y-4">
            {s.outcomes.map((o) => (
              <li key={o} className="flex items-center gap-3 text-lg"><CheckCircle2 className="h-5 w-5 text-primary" /> {o}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-6 py-24">
        <h2 className="text-2xl font-bold">Other services</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {others.map((o) => (
            <Link key={o.slug} to="/services/$slug" params={{ slug: o.slug }} className="group rounded-xl border bg-card p-6 transition-colors hover:bg-secondary">
              <o.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-6 font-semibold">{o.title}</h3>
              <span className="mt-3 inline-flex items-center gap-1 text-sm text-primary">Learn more <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </section>

      <footer className="flex min-h-screen items-center bg-navy text-navy-foreground">
        <div className="mx-auto flex w-full max-w-7xl flex-col justify-between gap-6 px-6 py-14 md:flex-row md:items-center">
          <h2 className="text-3xl font-bold">Ready to get started?</h2>
          <a href="/#contact" className="inline-flex items-center gap-2 self-start rounded-md bg-accent px-6 py-3 font-medium text-accent-foreground transition hover:brightness-110">
            Contact us <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </footer>
    </div>
  );
}
