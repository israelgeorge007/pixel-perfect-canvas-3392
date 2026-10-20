import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getIndustry } from "@/lib/industries";

export const Route = createFileRoute("/industries/$slug")({
  loader: ({ params }) => {
    const industry = getIndustry(params.slug);
    if (!industry) throw notFound();
    return industry;
  },
  head: ({ params }) => {
    const industry = getIndustry(params.slug);
    return {
      meta: [
        {
          title: industry
            ? `${industry.title} | Tarrlogic Systems`
            : "Industries | Tarrlogic Systems",
        },
        {
          name: "description",
          content: industry?.summary ?? "Industry solutions from Tarrlogic Systems.",
        },
      ],
    };
  },
  component: IndustryPage,
});

function IndustryPage() {
  const industry = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="industry-hero">
          <div className="hero-dot-pattern hero-dot-pattern--dark" aria-hidden="true" />
          <div className="industry-hero__inner">
            <div className="industry-hero__copy">
              <h1>{industry.title}</h1>
              <p>{industry.introduction}</p>
              <div className="industry-hero__actions">
                <a className="industry-text-link" href="#workflows">
                  Explore solutions
                </a>
                <a className="industries-primary-link" href="/contact">
                  Talk to our team <ArrowRight aria-hidden="true" />
                </a>                
              </div>
            </div>
          </div>
        </section>

        <section className="industry-capabilities" aria-labelledby="industry-capabilities-title">
          <div className="industry-capabilities__inner">
            <div className="industry-capabilities__feature">
              <div className="industry-section-heading">
                <p className="industries-eyebrow">Why teams choose Tarrlogic</p>
                <h2 id="industry-capabilities-title">{industry.valueHeading}</h2>
                <span className="industry-capabilities__rule" aria-hidden="true" />
              </div>
              <figure className="industry-capabilities__image" aria-hidden="true">
                <img src={industry.image} alt="" />
              </figure>
            </div>
            <div className="industry-capability-list">
              {industry.capabilities.map((capability, index) => (
                <article key={capability.title}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{capability.title}</h3>
                    <p>{capability.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="workflows"
          className="industry-workflows"
          aria-labelledby="industry-workflows-title"
        >
          <div className="industry-section-heading">
            <p className="industries-eyebrow">Key solutions</p>
            <h2 id="industry-workflows-title">{industry.workflowHeading}</h2>
            <p>{industry.workflowIntroduction}</p>
          </div>
          <div className="industry-workflow-grid">
            {industry.workflows.map((workflow, index) => (
              <article key={workflow.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{workflow.title}</h3>
                <p>{workflow.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="industry-approach" aria-labelledby="industry-approach-title">
          <div className="industry-section-heading">
            <h2 id="industry-approach-title">GET AHEAD OF YOUR COMPETITION</h2>
            <span className="industry-approach__rule" aria-hidden="true" />
          </div>
          <ol>
            {industry.approach.map((step, index) => (
              <li key={step.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div className="industry-approach__copy">
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
