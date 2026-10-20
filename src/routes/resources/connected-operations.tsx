import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const TITLE = "How Tarrlogic Builds Systems That Help Your Business | Tarrlogic Systems";
const DESCRIPTION =
  "See how Tarrlogic helps teams plan, build, connect and support business systems around their workflows.";

export const Route = createFileRoute("/resources/connected-operations")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
    ],
  }),
  component: ConnectedOperationsResource,
});

const contents = [
  { id: "understand-work", label: "Understand the work" },
  { id: "build-the-system", label: "Build the right system" },
  { id: "connect-information", label: "Connect information" },
  { id: "lasting-support", label: "Support what comes next" },
];

function ConnectedOperationsResource() {
  return (
    <div id="top" className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="relative isolate flex min-h-screen items-center overflow-hidden bg-navy pt-16 text-navy-foreground">
          <div className="hero-dot-pattern hero-dot-pattern--dark" aria-hidden="true" />
          <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-28">
            <div className="max-w-4xl">
                <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] md:text-7xl">
                  Systems built around the way your business works.
                </h1>
                <p className="mt-6 max-w-xl text-lg font-light text-navy-muted">
                  We help teams understand their workflows, choose the right technology, and build
                  systems that make everyday work clearer and more connected.
                </p>
                <div className="mt-9 flex flex-wrap gap-3 sm:gap-4">
                  <a
                    href="#understand-work"
                    className="inline-flex items-center gap-2 rounded border border-navy-line px-6 py-2 font-medium transition-colors hover:bg-navy-line/50"
                  >
                    Explore the approach
                  </a>
                  <a
                    href="/contact"
                    className="inline-flex items-center gap-2 rounded bg-accent px-6 py-2 font-medium text-accent-foreground transition-[transform,background-color,gap] duration-200 hover:gap-3 hover:brightness-110"
                  >
                    Talk to our team <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </a>                  
                </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-16 sm:px-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-20 lg:py-24">
          <aside className="h-fit lg:sticky lg:top-24">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              In this guide
            </p>
            <nav aria-label="Article contents" className="mt-5 grid gap-3 border-l pl-4 text-sm">
              {contents.map(({ id, label }) => (
                <a key={id} href={`#${id}`} className="text-muted-foreground hover:text-foreground">
                  {label}
                </a>
              ))}
            </nav>
          </aside>

          <article className="min-w-0 max-w-3xl">
            <p className="text-xl leading-relaxed text-foreground sm:text-2xl">
              The right system should do more than digitize an existing task. It should fit the way
              people work, connect important information, and give teams a reliable foundation to
              adapt as the business changes.
            </p>

            <section id="understand-work" className="scroll-mt-24 mt-14 border-t pt-8">
              <p className="text-sm font-medium uppercase tracking-widest text-primary">
                01 / Discovery
              </p>
              <h2 className="mt-3 text-3xl font-bold">Start with the way work happens.</h2>
              <p className="mt-5 leading-relaxed text-muted-foreground">
                We learn how information moves between people, teams and tools before recommending a
                system. That includes the everyday tasks, important handoffs, reporting needs and
                points where work slows down or data gets repeated.
              </p>
              <ul className="mt-6 space-y-3 text-base leading-relaxed text-muted-foreground">
                {[
                  "Map workflows, roles and the information each team relies on.",
                  "Identify where disconnected tools create duplicate effort or blind spots.",
                  "Agree priorities and a practical scope before implementation begins.",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {point}
                  </li>
                ))}
              </ul>
            </section>

            <section id="build-the-system" className="scroll-mt-24 mt-14 border-t pt-8">
              <p className="text-sm font-medium uppercase tracking-widest text-primary">
                02 / Engineering
              </p>
              <h2 className="mt-3 text-3xl font-bold">Build the system that fits.</h2>
              <p className="mt-5 leading-relaxed text-muted-foreground">
                Some teams need a configurable platform for finance, inventory, procurement or
                payroll. Others need a custom web or mobile application for a specific workflow. We
                shape the solution around the requirements, then plan the integrations, access and
                data handling it needs.
              </p>
            </section>

            <section id="connect-information" className="scroll-mt-24 mt-14 border-t pt-8">
              <p className="text-sm font-medium uppercase tracking-widest text-primary">
                03 / Operations
              </p>
              <h2 className="mt-3 text-3xl font-bold">
                Make information useful across the business.
              </h2>
              <p className="mt-5 leading-relaxed text-muted-foreground">
                Connected systems help reduce repeated entry and make handoffs easier to follow.
                Shared records, clear approvals and useful reporting give teams better context for
                decisions without forcing every role into the same view.
              </p>
            </section>

            <section id="lasting-support" className="scroll-mt-24 mt-14 border-t pt-8">
              <p className="text-sm font-medium uppercase tracking-widest text-primary">
                04 / Partnership
              </p>
              <h2 className="mt-3 text-3xl font-bold">Keep improving after launch.</h2>
              <p className="mt-5 leading-relaxed text-muted-foreground">
                Teams need more than a handover. We help prepare and validate data, test real
                workflows, train users and provide ongoing support. As priorities change, the system
                can be maintained and extended in a planned way.
              </p>
              <ol className="mt-7 grid gap-6 border-t pt-6 sm:grid-cols-2">
                {[
                  ["Prepare", "Agree scope, responsibilities, data and rollout priorities."],
                  ["Build", "Configure or develop the system and its agreed connections."],
                  ["Launch", "Validate complete workflows and help users get started."],
                  ["Support", "Maintain the system and plan useful improvements over time."],
                ].map(([title, description], index) => (
                  <li key={title} className="border-t border-border pt-4">
                    <span className="font-display text-sm font-bold text-primary">
                      0{index + 1}
                    </span>
                    <h3 className="mt-2 text-xl font-semibold">{title}</h3>
                    <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          </article>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
