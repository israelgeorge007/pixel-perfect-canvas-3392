import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import teamApps from "@/assets/carousel-apps.jpg";
import teamData from "@/assets/carousel-data.jpg";
import teamDelivery from "@/assets/carousel-delivery.jpg";
import teamProcess from "@/assets/carousel-process.jpg";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const TITLE = "Enterprise Software & Systems | IntentRun Systems";
const DESCRIPTION =
  "IntentRun builds enterprise software, connected business systems, and digital products that make work easier for teams and their customers.";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
    ],
  }),
  component: EnterprisePage,
});

const enterpriseSupportPillars = [
  {
    title: "Guided implementation",
    text: "Plan a practical rollout around your current systems, priorities, and the people who will use the software.",
  },
  {
    title: "Workflow and integration planning",
    text: "Map how information moves today and decide which tools and teams need to work together.",
  },
  {
    title: "Hands-on technical support",
    text: "Get clear ownership and practical help through onboarding, launch, and day-to-day use.",
  },
  {
    title: "Continued improvement",
    text: "Use feedback and changing business needs to plan the next useful updates to your systems.",
  },
];

const disconnectedSteps = [
  { number: "01", title: "A request arrives", note: "Details start in different places" },
  { number: "02", title: "Information is copied", note: "Another manual handoff" },
  { number: "03", title: "Approval waits", note: "Status lives in a message thread" },
  { number: "04", title: "Records are updated again", note: "The same work gets entered twice" },
  { number: "05", title: "Someone follows up", note: "Progress is hard to see" },
];

const connectedSteps = [
  { number: "01", title: "Capture the request", note: "Start from a shared record" },
  { number: "02", title: "Route to the right owner", note: "Responsibilities stay clear" },
  { number: "03", title: "Keep progress visible", note: "Teams know what needs attention" },
  { number: "04", title: "Update connected records", note: "The work stays together" },
];

const enterpriseCapabilities = [
  {
    category: "CONNECTED OPERATIONS",
    title: "Bring the moving parts of your business together.",
    description:
      "Connect finance, purchasing, inventory, payroll, and approvals in systems shaped around how your teams already work.",
    image: teamData,
    imageAlt: "A business analyst reviewing operational charts on a laptop and phone",
    features: [
      {
        title: "Connected operational workflows",
        text: "Link requests, approvals, purchasing, stock movements, and finance so teams can follow work from start to finish.",
      },
      {
        title: "Clear roles and decisions",
        text: "Shape user access and approval steps around the responsibilities people hold across your organization.",
      },
      {
        title: "Reporting with useful context",
        text: "Bring activity across business units and locations into views that help teams understand what needs attention.",
      },
    ],
  },
  {
    category: "PRODUCT ENGINEERING",
    title: "Build software around the people who use it.",
    description:
      "From an internal tool to a customer-facing product, we turn complex requirements into clear, dependable digital experiences.",
    image: teamApps,
    imageAlt: "A field operator reviewing a mobile and desktop application",
    features: [
      {
        title: "Product direction and scope",
        text: "Clarify user needs, business outcomes, and the right first release before committing to a build.",
      },
      {
        title: "Web and mobile applications",
        text: "Design and develop useful interfaces for customers, operators, and the teams supporting them.",
      },
      {
        title: "Integrations that fit",
        text: "Connect the product to the data and services your business already relies on, with a plan for what comes next.",
      },
    ],
  },
  {
    category: "ONGOING PARTNERSHIP",
    title: "Keep essential systems useful after launch.",
    description:
      "A launch is a beginning, not a handoff. We help your people get started, keep systems maintained, and make improvements as needs change.",
    image: teamProcess,
    imageAlt: "A business professional mapping a workflow on a glass board",
    features: [
      {
        title: "Onboarding and practical guidance",
        text: "Prepare data, test real workflows, and help users understand how the new system supports their work.",
      },
      {
        title: "Maintenance and issue support",
        text: "Keep dependencies current, review system health, and give support requests clear ownership.",
      },
      {
        title: "Improvements with a plan",
        text: "Use feedback and recurring friction to prioritize useful changes without losing sight of stable operations.",
      },
    ],
  },
];

export function EnterprisePage() {
  const workflowSectionRef = useRef<HTMLElement>(null);
  const [workflowInView, setWorkflowInView] = useState(false);

  useEffect(() => {
    const section = workflowSectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setWorkflowInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="relative isolate flex min-h-screen items-center overflow-hidden bg-navy pt-16 text-navy-foreground">
          <div className="hero-dot-pattern hero-dot-pattern--dark" aria-hidden="true" />
          <div className="relative mx-auto w-full max-w-7xl px-6 py-28">
            <div className="max-w-4xl">
              <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] md:text-7xl">
                Software that makes work easier.
              </h1>
              <p className="mt-6 max-w-xl text-lg font-light text-navy-muted">
                We build enterprise systems, digital products, and connected tools that help
                businesses simplify operations, serve people better, and grow with clarity.
              </p>
              <div className="mt-9 flex flex-wrap gap-3 sm:gap-4">
                <a
                  href="#enterprise-capabilities"
                  className="inline-flex items-center gap-2 rounded border border-navy-line px-6 py-2 font-medium transition-colors hover:bg-navy-line/50"
                >
                  Explore capabilities
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

        <section
          ref={workflowSectionRef}
          aria-labelledby="enterprise-workflow-heading"
          data-in-view={workflowInView}
          className="enterprise-workflow-section border-y bg-background"
        >
          <div className="mx-auto w-full max-w-7xl px-6 py-16 sm:px-10 md:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <h2 id="enterprise-workflow-heading" className="mt-3 text-4xl font-bold">
                Less chasing. A clearer path from request to done.
              </h2>
              <p className="mt-5 leading-relaxed text-muted-foreground">
                When tools and teams are disconnected, simple work can turn into a chain of
                handoffs. A connected workflow gives people a clearer way to move it forward.
              </p>
            </div>

            <div className="enterprise-workflow-comparison mt-10">
              <article className="enterprise-workflow-lane enterprise-workflow-lane--fragmented">
                <header className="enterprise-workflow-lane__header">
                  <p>Without a connected process</p>
                  <h3>Work gets passed around</h3>
                </header>
                <ol aria-label="Fragmented work process" className="enterprise-workflow-list">
                  {disconnectedSteps.map(({ number, title, note }) => (
                    <li key={number} className="enterprise-workflow-step">
                      <span className="enterprise-workflow-step__number">{number}</span>
                      <span className="enterprise-workflow-step__copy">
                        <span>{title}</span>
                        <small className="sr-only">{note}</small>
                      </span>
                    </li>
                  ))}
                </ol>
              </article>

              <article className="enterprise-workflow-lane enterprise-workflow-lane--connected">
                <header className="enterprise-workflow-lane__header">
                  <p>A connected IntentRun system</p>
                  <h3>Work moves with context</h3>
                </header>
                <ol aria-label="Connected work process" className="enterprise-workflow-list">
                  {connectedSteps.map(({ number, title, note }) => (
                    <li key={number} className="enterprise-workflow-step">
                      <span className="enterprise-workflow-step__number">{number}</span>
                      <span className="enterprise-workflow-step__copy">
                        <span>{title}</span>
                        <small className="sr-only">{note}</small>
                      </span>
                    </li>
                  ))}
                </ol>
              </article>
            </div>
          </div>
        </section>

        {enterpriseCapabilities.map((capability) => (
          <section
            id={
              capability.category === "CONNECTED OPERATIONS" ? "enterprise-capabilities" : undefined
            }
            key={capability.category}
            className="border-t border-border py-12 sm:py-16 md:py-20"
          >
            <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 sm:px-10 lg:grid-cols-[1fr_2.25fr] lg:items-start lg:gap-x-16 lg:gap-y-8">
              <div className="max-w-xl lg:col-start-1 lg:row-start-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {capability.category}
                </p>
                <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{capability.title}</h2>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  {capability.description}
                </p>
              </div>

              <figure className="overflow-hidden rounded bg-secondary/30 lg:col-start-2 lg:row-span-2 lg:row-start-1">
                <img
                  src={capability.image}
                  alt={capability.imageAlt}
                  loading="lazy"
                  className="aspect-[16/10] w-full object-cover"
                />
              </figure>

              <div className="min-w-0 lg:col-start-1 lg:row-start-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Capabilities
                </p>
                {capability.features.map((feature) => (
                  <details key={feature.title} className="group border-t border-border py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium marker:content-none">
                      {feature.title}
                      <Plus
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                      />
                    </summary>
                    <p className="max-w-xl pt-3 pr-8 text-sm leading-relaxed text-muted-foreground">
                      {feature.text}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        ))}

        <section aria-labelledby="enterprise-success-heading" className="bg-background">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-16 sm:px-10 md:grid-cols-2 md:items-center md:gap-16 md:py-20">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <span className="h-1 w-8 bg-accent" aria-hidden="true" />
                Enterprise success
              </p>
              <h2
                id="enterprise-success-heading"
                className="mt-5 text-3xl font-semibold sm:text-4xl"
              >
                From implementation to ongoing improvement, we stay with your team.
              </h2>
              <div className="mt-9 grid gap-x-8 gap-y-7 sm:grid-cols-2">
                {enterpriseSupportPillars.map(({ title, text }) => (
                  <article key={title} className="border-t border-border pt-4">
                    <h3 className="text-sm font-semibold">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                  </article>
                ))}
              </div>
            </div>

            <figure className="aspect-square w-full overflow-hidden rounded">
              <img
                src={teamDelivery}
                alt="A team working together around a laptop"
                loading="lazy"
                className="h-full w-full object-cover object-center"
              />
            </figure>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
