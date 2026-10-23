import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getResourceGuide } from "@/lib/resource-guides";

export const Route = createFileRoute("/resources/$slug")({
  loader: ({ params }) => {
    const guide = getResourceGuide(params.slug);
    if (!guide) throw notFound();
    return guide;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData.title} | IntentRun Resources` },
      { name: "description", content: loaderData.description },
      { property: "og:title", content: `${loaderData.title} | IntentRun Resources` },
      { property: "og:description", content: loaderData.description },
      { property: "og:type", content: "article" },
    ],
  }),
  component: ResourceGuidePage,
});

function ResourceGuidePage() {
  const guide = Route.useLoaderData();

  return (
    <div id="top" className="min-h-screen bg-background pt-16">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-6 sm:px-10">
        <div className="flex items-center justify-between border-b py-5">
          <a
            href="/documentation"
            className="inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
          >
            <BookOpen className="h-5 w-5 text-primary" />
            Resources
          </a>
          <a
            href="/documentation"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            All resources <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="grid gap-10 py-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14 lg:py-14">
          <aside className="h-fit lg:sticky lg:top-24">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              In this guide
            </p>
            <nav aria-label="Guide contents" className="mt-4 grid gap-1 border-l pl-4 text-sm">
              {guide.sections.map((section, index) => (
                <a
                  key={section.title}
                  href={`#section-${index + 1}`}
                  className="py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {section.title}
                </a>
              ))}
            </nav>
            <a
              href={`/documentation#${guide.documentationSection}`}
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Full documentation <ArrowRight className="h-4 w-4" />
            </a>
          </aside>

          <div className="min-w-0 space-y-12">
            <header>
              <p className="text-sm font-medium uppercase tracking-widest text-primary">
                IntentRun resource guide
              </p>
              <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">{guide.title}</h1>
              <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground">
                {guide.description}
              </p>
              <img
                src={guide.image}
                alt={guide.imageAlt}
                width="1200"
                height="675"
                className="mt-8 aspect-video w-full rounded border bg-card object-cover"
              />
            </header>

            <article className="min-w-0 max-w-3xl space-y-12">
              {guide.sections.map((section, index) => (
                <section
                  id={`section-${index + 1}`}
                  key={section.title}
                  className="scroll-mt-24 border-t pt-8"
                >
                  <p className="text-sm font-medium uppercase tracking-widest text-primary">
                    {section.eyebrow}
                  </p>
                  <h2 className="mt-3 text-3xl font-bold">{section.title}</h2>
                  <div className="mt-5 space-y-4 leading-relaxed text-muted-foreground">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  {section.steps && (
                    <ol className="mt-6 space-y-3 text-base leading-relaxed text-muted-foreground">
                      {section.steps.map((step) => (
                        <li key={step} className="flex items-start gap-3">
                          <CheckCircle2
                            aria-hidden="true"
                            className="mt-1 h-4 w-4 shrink-0 text-primary"
                          />
                          {step}
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              ))}

              <div className="border-t pt-8">
                <a
                  href="/documentation"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Browse all resources
                </a>
              </div>
            </article>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
