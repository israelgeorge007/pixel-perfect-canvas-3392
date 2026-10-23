import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { serviceDetails } from "@/lib/service-details";
import { services } from "@/lib/services";

const TITLE = "Solutions | IntentRun Systems";
const DESCRIPTION =
  "Explore data analysis, ERP, accounting, and software solutions built to connect people, data, and business operations.";

export const Route = createFileRoute("/solutions")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
    ],
  }),
  component: SolutionsPage,
});

function SolutionsPage() {
  const [activeService, setActiveService] = useState(services[0]?.slug ?? "");
  const [tabsHovered, setTabsHovered] = useState(false);
  const [tabsFocused, setTabsFocused] = useState(false);

  useEffect(() => {
    if (tabsHovered || tabsFocused || services.length < 2) return;

    const timer = window.setInterval(() => {
      setActiveService((current) => {
        const currentIndex = services.findIndex((service) => service.slug === current);
        const nextIndex = (currentIndex + 1) % services.length;
        return services[nextIndex]?.slug ?? current;
      });
    }, 6000);

    return () => window.clearInterval(timer);
  }, [tabsHovered, tabsFocused]);

  return (
    <div id="top" className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="products-hero" data-header-hero>
          <div className="hero-dot-pattern hero-dot-pattern--dark" aria-hidden="true" />
          <div className="products-hero__inner">
            <h1
              className="products-hero__headline"
              aria-label="We build products & systems that scale."
            >
              <span className="products-hero__line">
                We build products <span className="text-accent">+</span>
              </span>
              <span className="products-hero__line products-hero__line--secondary">
                systems that scale.
              </span>
            </h1>
            <a
              href="#solutions"
              className="products-hero__chevron"
              aria-label="Scroll to solutions"
            />
          </div>
        </section>

        <Tabs value={activeService} onValueChange={setActiveService} className="w-full">
          <section id="solutions" className="products-showcase" aria-label="Featured solutions">
            <div className="products-showcase__inner">
              <TabsList
                aria-label="Select a solution"
                className="products-tabs"
                onMouseEnter={() => setTabsHovered(true)}
                onMouseLeave={() => setTabsHovered(false)}
                onFocusCapture={() => setTabsFocused(true)}
                onBlurCapture={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setTabsFocused(false);
                  }
                }}
              >
                {services.map(({ slug, title, icon: Icon }) => (
                  <TabsTrigger key={slug} value={slug} className="products-tab">
                    <Icon aria-hidden="true" size={17} />
                    {title}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="products-showcase__panel-wrap">
                {services.map((service) => {
                  const details = serviceDetails[service.slug];
                  if (!details) return null;
                  return (
                    <TabsContent key={service.slug} value={service.slug} className="m-0">
                      <article className="product-panel">
                        <div className="product-panel__media">
                          <img src={details.image} alt={details.imageAlt} />
                        </div>
                        <div className="product-panel__content">
                          <div className="product-panel__brand">{service.title}</div>
                          <p className="product-panel__heading">
                            {service.heroHeading ?? service.title}
                          </p>
                        </div>
                      </article>
                    </TabsContent>
                  );
                })}
              </div>
            </div>
          </section>
        </Tabs>

        <section className="solution-details" aria-label="Detailed solution information">
          <div className="solution-details__inner">
            {services.map((service, index) => {
              const details = serviceDetails[service.slug];
              if (!details) return null;
              return (
                <section
                  className={`solution-detail-section${index % 2 ? " solution-detail-section--alternate" : ""}`}
                  id={service.slug}
                  key={service.slug}
                  aria-labelledby={`${service.slug}-title`}
                >
                  <div className="solution-detail-section__inner">
                    <div className="solution-detail-section__lead">
                      <header className="solution-detail-section__header">
                        <div className="solution-detail-section__title-lockup">
                          <span
                            className="solution-detail-section__title-marker"
                            aria-hidden="true"
                          />
                          <div>
                            <h2 id={`${service.slug}-title`}>{service.title}</h2>
                            <p className="solution-detail-section__hero">
                              {service.heroHeading ?? service.title}
                            </p>
                          </div>
                        </div>
                        <p className="solution-detail-section__intro">{service.intro}</p>
                      </header>
                      <figure className="solution-detail-section__image">
                        <img src={details.image} alt={details.imageAlt} loading="lazy" />
                      </figure>
                    </div>

                    <div className="solution-detail-section__content">
                      <div className="solution-detail-section__capabilities">
                        <h3>Capabilities</h3>
                        <ul className="solution-detail-section__features">
                          {service.features.map((feature) => (
                            <li key={feature.t}>
                              <span className="solution-detail-marker" aria-hidden="true" />
                              <div>
                                <strong>{feature.t}</strong>
                                <p>{feature.d}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="solution-detail-section__workflows">
                        <h3>{details.workflowHeading}</h3>
                        <div>
                          {details.workflows.map((workflow) => (
                            <article key={workflow.title}>
                              <span className="solution-detail-marker" aria-hidden="true" />
                              <div>
                                <h4>{workflow.title}</h4>
                                <p>{workflow.description}</p>
                              </div>
                            </article>
                          ))}
                        </div>
                        <ul className="solution-detail-section__outcomes">
                          {service.outcomes.map((outcome) => (
                            <li key={outcome}>{outcome}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </section>

        <section className="product-trust" aria-label="Our product approach">
          <div className="product-trust__inner">
            <h2>
              Technology that makes the work <span>easier.</span>
            </h2>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
