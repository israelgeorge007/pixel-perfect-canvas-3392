import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, HeartPulse, Workflow } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import homicareCaregiver from "@/assets/homicare-caregiver.jpg";
import erpDashboard from "@/assets/service-erp-dashboard.png";
import accountingDashboard from "@/assets/service-accounting-dashboard.png";
import appsDashboard from "@/assets/service-apps-dashboard.png";
import supportDashboard from "@/assets/service-support-dashboard.png";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const TITLE = "Products | Tarrlogic Systems";
const DESCRIPTION =
  "Explore Tarrlogic, an ERP and accounting system in development, and HomiCareApp, a launched home healthcare service.";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ProductsPage,
});

const productJourneys = [
  {
    value: "operations",
    label: "run your day-to-day operations",
    description:
      "Explore how Tarrlogic is being shaped around the everyday work behind a business.",
    cards: [
      {
        layout: "tall-left",
        eyebrow: "TARRLOGIC · IN DEVELOPMENT",
        title: "Bring operations into one view.",
        description: "Connect procurement, inventory, approvals and reporting in a shared operating picture.",
        image: erpDashboard,
        imageAlt: "Tarrlogic ERP dashboard showing inventory, procurement and approvals",
        action: "Explore ERP solutions",
        href: "/services/erp-solutions",
      },
      {
        layout: "wide-top",
        eyebrow: "FINANCIAL ACCOUNTING",
        title: "Keep the numbers in context.",
        description: "Bring reconciliations, reporting and financial controls into a clearer workflow.",
        image: accountingDashboard,
        imageAlt: "Tarrlogic financial accounting dashboard",
        action: "Explore accounting",
        href: "/services/financial-accounting-software",
      },
      {
        layout: "small-middle",
        eyebrow: "APPLICATIONS",
        title: "Give teams tools that fit the work.",
        description: "Connect the people doing the work with the systems that support it.",
        image: appsDashboard,
        imageAlt: "Tarrlogic team application dashboard",
        action: "Explore app development",
        href: "/services/mobile-app-development",
      },
      {
        layout: "small-right",
        eyebrow: "ROLES & APPROVALS",
        title: "Make decisions easier to follow.",
        description: "Give each step a clear owner and a traceable record.",
        icon: Workflow,
      },
      {
        layout: "small-bottom-left",
        eyebrow: "CONFIGURABLE WORKFLOWS",
        title: "Start with what matters most.",
        description: "Shape modules and roles around the way your team works.",
        icon: CheckCircle2,
      },
      {
        layout: "wide-bottom",
        eyebrow: "SYSTEM SUPPORT",
        title: "Keep an eye on what needs attention.",
        description: "Bring operational status, active work and service health into clearer view.",
        image: supportDashboard,
        imageAlt: "Tarrlogic support dashboard with service health and active tickets",
        action: "Explore support and maintenance",
        href: "/services/support-maintenance",
      },
    ],
  },
  {
    value: "care",
    label: "find care at home",
    description:
      "HomiCarePlus connects people with home healthcare and supports different care needs.",
    cards: [
      {
        layout: "tall-left",
        eyebrow: "HOMICAREPLUS · AVAILABLE NOW",
        title: "Professional care, closer to home.",
        description: "Find home healthcare services shaped around the person receiving care.",
        image: homicareCaregiver,
        imageAlt: "Caregiver supporting an older adult at home",
        action: "Visit HomiCarePlus",
        href: "https://www.homicareplus.com",
        external: true,
      },
      {
        layout: "wide-top",
        eyebrow: "CARE OPTIONS",
        title: "Support for changing needs.",
        description: "Explore elderly care, recovery support, skilled nursing and physical therapy.",
        icon: HeartPulse,
      },
      {
        layout: "small-middle",
        eyebrow: "WEB & MOBILE",
        title: "Stay connected to care.",
        description: "Choose the HomiCarePlus website or continue to its launched app experience.",
        icon: CheckCircle2,
        action: "Open HomiCarePlus",
        href: "https://www.homicareplus.com",
        external: true,
      },
      {
        layout: "small-right",
        eyebrow: "SKILLED NURSING",
        title: "Professional support at home.",
        description: "Explore nursing care as part of the HomiCarePlus service range.",
        icon: HeartPulse,
      },
      {
        layout: "small-bottom-left",
        eyebrow: "RECOVERY SUPPORT",
        title: "Care through recovery.",
        description: "Find support for post-surgery recovery and ongoing care needs.",
        icon: CheckCircle2,
      },
      {
        layout: "wide-bottom",
        eyebrow: "HOMICAREPLUS",
        title: "Explore care options for your family.",
        description: "Visit HomiCarePlus to learn more about available home healthcare services.",
        icon: HeartPulse,
        action: "Visit HomiCarePlus",
        href: "https://www.homicareplus.com",
        external: true,
      },
    ],
  },
];

const productTabs = ["tarrlogic", "homicare", "accounting"];

function ProductsPage() {
  const [activeTab, setActiveTab] = useState("tarrlogic");
  const [activeJourney, setActiveJourney] = useState(productJourneys[0].value);
  const selectedJourney = productJourneys.find(({ value }) => value === activeJourney) ?? productJourneys[0];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveTab((current) => {
        const currentIndex = productTabs.indexOf(current);
        const nextIndex = (currentIndex + 1) % productTabs.length;
        return productTabs[nextIndex];
      });
    }, 4200);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div id="top" className="min-h-screen bg-background pt-16">
      <SiteHeader />
      <main>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <section className="products-hero">
            <div className="products-hero__inner">
              <h1 className="products-hero__headline" aria-label="We build products & systems that scale.">
                <span className="products-hero__line">
                  We build products <span className="text-accent">+</span>
                </span>
                <span className="products-hero__line products-hero__line--secondary">
                  systems that scale.
                </span>
              </h1>
              <a href="#products" className="products-hero__chevron" aria-label="Scroll to products" />
            </div>
          </section>

          <section id="products" className="products-showcase" aria-label="Our products">
            <div className="products-showcase__inner">
              <TabsList aria-label="Our products" className="products-tabs">
                <TabsTrigger value="tarrlogic" className="products-tab">
                  <span className="products-tab__icon" aria-hidden="true">C</span>
                  Tarrlogic
                </TabsTrigger>
                <TabsTrigger value="homicare" className="products-tab">
                  <span className="products-tab__icon" aria-hidden="true">H</span>
                  HomiCareApp
                </TabsTrigger>
                <TabsTrigger value="accounting" className="products-tab">
                  <span className="products-tab__icon" aria-hidden="true">A</span>
                  Accounting
                </TabsTrigger>
              </TabsList>

              <div className="products-showcase__panel-wrap">
                <TabsContent value="tarrlogic" className="m-0">
                  <article className="product-panel product-panel--tarrlogic">
                    <div className="product-panel__media">
                      <img
                        src={erpDashboard}
                        alt="Tarrlogic ERP dashboard for inventory, procurement and approvals"
                      />
                    </div>
                    <div className="product-panel__content">
                      <div className="product-panel__brand">tarrlogic</div>
                      <p className="product-panel__heading">
                        One connected system for finance, operations, and the work behind the numbers.
                      </p>
                      <a href="/services/erp-solutions" className="product-panel__cta">
                        Go to Tarrlogic
                      </a>
                    </div>
                  </article>
                </TabsContent>

                <TabsContent value="homicare" className="m-0">
                  <article className="product-panel product-panel--homicare">
                    <div className="product-panel__media">
                      <img
                        src={homicareCaregiver}
                        alt="HomiCarePlus caregiver helping a patient at home"
                      />
                    </div>
                    <div className="product-panel__content">
                      <div className="product-panel__brand">homicare</div>
                      <p className="product-panel__heading">
                        Professional care at home, built around the people who need it most.
                      </p>
                      <a href="https://www.homicareplus.com" target="_blank" rel="noreferrer" className="product-panel__cta">
                        Go to HomiCareApp
                      </a>
                    </div>
                  </article>
                </TabsContent>

                <TabsContent value="accounting" className="m-0">
                  <article className="product-panel product-panel--accounting">
                    <div className="product-panel__media">
                      <img
                        src={erpDashboard}
                        alt="Accounting dashboard overview"
                      />
                    </div>
                    <div className="product-panel__content">
                      <div className="product-panel__brand">accounting</div>
                      <p className="product-panel__heading">
                        A clearer way to manage accounting, approvals, and financial operations.
                      </p>
                      <a href="/services/financial-accounting-software" className="product-panel__cta">
                        Go to Accounting
                      </a>
                    </div>
                  </article>
                </TabsContent>
              </div>
            </div>
          </section>
        </Tabs>

        <section className="product-discovery" aria-label="Explore product features">
          <div className="product-discovery__inner">
            <p className="product-discovery__eyebrow">A closer look at our products</p>
            <div className="product-discovery__title-row">
              <h2>Everything you need to</h2>
              <div className="product-discovery__journeys" role="group" aria-label="Choose a product need">
                {productJourneys.map(({ value, label }) => (
                  <button
                    aria-pressed={activeJourney === value}
                    className="product-discovery__journey"
                    key={value}
                    onClick={() => setActiveJourney(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p className="product-discovery__description">{selectedJourney.description}</p>

            <div className="product-discovery__cards" key={selectedJourney.value}>
              {selectedJourney.cards.map((card) => {
                const CardIcon = card.icon;

                return (
                  <article
                    className={`product-discovery__card product-discovery__card--${card.layout}${card.image ? " product-discovery__card--photo" : ""}`}
                    key={card.title}
                  >
                    {card.image ? (
                      <img className="product-discovery__image" src={card.image} alt={card.imageAlt} />
                    ) : (
                      <div className="product-discovery__art" aria-hidden="true">
                        <CardIcon className="product-discovery__art-icon" strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="product-discovery__card-body">
                      <p className="product-discovery__card-eyebrow">{card.eyebrow}</p>
                      <h3>{card.title}</h3>
                      <p className="product-discovery__card-description">{card.description}</p>
                      {card.href && (
                        <a
                          className="product-discovery__link"
                          href={card.href}
                          target={card.external ? "_blank" : undefined}
                          rel={card.external ? "noreferrer" : undefined}
                        >
                          {card.action}
                          <ArrowRight aria-hidden="true" size={17} />
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="product-trust" aria-label="Our product approach">
          <div className="product-trust__inner">
            <h2>
              Technology that makes the work feel <span>clearer.</span>
            </h2>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
