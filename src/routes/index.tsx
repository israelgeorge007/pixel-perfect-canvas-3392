import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Minus,
  Pause,
  Play,
  Plus,
} from "lucide-react";
import hero from "@/assets/hero.jpg";
import teamProcess from "@/assets/carousel-process.jpg";
import teamApps from "@/assets/carousel-apps.jpg";
import teamData from "@/assets/carousel-data.jpg";
import teamDelivery from "@/assets/carousel-delivery.jpg";
import teamGrowth from "@/assets/carousel-growth.jpg";
import { services } from "@/lib/services";
import { serviceDetails } from "@/lib/service-details";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const TITLE = "Corelogic Systems — Modular ERP, Accounting & Custom Software";
const DESC =
  "Modular, data-driven ERP and accounting systems built to scale with your business, plus mobile apps and dedicated support.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const EMAIL = "hello@corelogic.example";

const faqs = [
  {
    question: "What is ERP software?",
    answer:
      "Enterprise Resource Planning (ERP) software brings core business processes into one connected system. Instead of managing procurement, inventory, payroll and finance in separate spreadsheets or tools, teams can work from shared data and follow consistent workflows.",
  },
  {
    question: "How is an ERP different from accounting software?",
    answer:
      "Accounting software focuses on financial records, bookkeeping and reporting. An ERP has a broader operational scope, connecting financial information with activities such as purchasing, stock management and payroll. The right starting point depends on which processes your business needs to bring together.",
  },
  {
    question: "When should a business consider an ERP system?",
    answer:
      "Common signs include entering the same information into several tools, difficulty tracking stock, slow approvals and time-consuming reporting. If disconnected systems make it harder to understand your operations, it may be time to assess a more unified approach.",
  },
  {
    question: "Can we start with one module and expand later?",
    answer:
      "Yes. Our modular approach lets you start with the workflows that matter most, such as procurement, inventory or payroll, and add modules as your needs grow. The scope is shaped around your operation rather than a one-size-fits-all package.",
  },
  {
    question: "What should we consider before moving from our existing tools?",
    answer:
      "Start by identifying the data you need to keep, the systems your team relies on and the workflows you want to improve. Existing integrations, data quality and reporting requirements should be reviewed during discovery so migration and connection needs can be included in the project scope.",
  },
  {
    question: "What determines the cost and implementation timeline?",
    answer:
      "The modules you need, workflow complexity, existing data and any required connections all affect the scope. A consultation is the starting point for discussing your requirements and defining an appropriate project estimate and delivery plan.",
  },
  {
    question: "Is support available after implementation?",
    answer:
      "Yes. Support and maintenance are part of our service offering, helping keep your systems running over time. The specific support arrangements and maintenance needs can be discussed as part of your project.",
  },
];

const teamStories = [
  {
    eyebrow: "01 / Product strategy",
    title: "From process map to reliable system.",
    description:
      "We connect business workflows, data rules and user needs before implementation begins—so the software fits the way your team actually works.",
    name: "Business process design",
    role: "Discovery & solution architecture",
    location: "Corelogic",
    tag: "ERP",
    palette: "yellow",
    image: teamProcess,
  },
  {
    eyebrow: "02 / Software engineering",
    title: "Custom applications built to scale.",
    description:
      "Web, mobile and backend systems are developed with clear architecture, practical integrations and dependable performance from day one.",
    name: "Application engineering",
    role: "Web, mobile & backend systems",
    location: "Corelogic",
    tag: "Apps",
    palette: "green",
    image: teamApps,
  },
  {
    eyebrow: "03 / Data & insight",
    title: "Reports that turn data into action.",
    description:
      "Financial modelling, operational reporting and dashboarding give teams a clearer view of performance, risk and the next best step.",
    name: "Data analysis",
    role: "Reporting & financial insight",
    location: "Corelogic",
    tag: "Data",
    palette: "blue",
    image: teamData,
  },
  {
    eyebrow: "04 / Delivery",
    title: "One team from discovery to support.",
    description:
      "Analysts, engineers and support stay connected throughout the project, keeping decisions, data and implementation aligned over time.",
    name: "Implementation partnership",
    role: "Delivery & long-term support",
    location: "Corelogic",
    tag: "Support",
    palette: "violet",
    image: teamDelivery,
  },
  {
    eyebrow: "05 / Growth",
    title: "Modular systems that grow with you.",
    description:
      "Start with the workflows that matter most, then add modules and integrations as your operation expands without rebuilding the foundation.",
    name: "Modular growth",
    role: "ERP modules & integrations",
    location: "Corelogic",
    tag: "Scale",
    palette: "teal",
    image: teamGrowth,
  },
];

const cases = [
  {
    id: "distribution",
    tabLabel: "Distribution ERP",
    visual: "inventory",
    name: "Regional Distributor ERP Rollout",
    sector: "Wholesale & Logistics",
    challenge:
      "Inventory tracked across spreadsheets in four warehouses, causing stock-outs and slow procurement.",
    solution:
      "A unified ERP with inventory, procurement and payroll modules plus real-time warehouse dashboards.",
    metrics: [
      ["38%", "less stock-outs"],
      ["2.5×", "faster purchase approvals"],
      ["4", "sites unified"],
    ],
  },
  {
    id: "finance",
    tabLabel: "Finance hub",
    visual: "finance",
    name: "Finance Hub for a Services Group",
    sector: "Professional Services",
    challenge:
      "Month-end close took weeks, with reconciliation done manually across multiple entities.",
    solution:
      "Custom accounting platform with automated reconciliation, multi-entity ledgers and audit trails.",
    metrics: [
      ["60%", "faster month-end close"],
      ["99.8%", "reconciliation accuracy"],
      ["12", "entities consolidated"],
    ],
  },
];

function CaseStudyVisual({ kind }: { kind: "inventory" | "finance" }) {
  const isFinance = kind === "finance";
  const bars = isFinance ? [34, 52, 44, 70, 59, 82, 66, 94] : [46, 68, 53, 85, 65, 74, 92, 78];

  return (
    <div
      aria-hidden="true"
      className="relative flex min-h-[21rem] items-center overflow-hidden bg-card px-5 py-8 text-card-foreground md:min-h-[34rem] md:px-8"
    >
      <div className="absolute inset-0 grid-lines opacity-10" />
      <div className="relative mx-auto w-full max-w-lg overflow-hidden rounded border border-border bg-background text-foreground shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded bg-accent font-display text-xs font-bold text-accent-foreground">
              C
            </span>
            <span className="text-xs font-semibold">
              Corelogic{" "}
              <span className="font-normal text-muted-foreground">
                / {isFinance ? "Accounting suite" : "Business suite"}
              </span>
            </span>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-primary">
                {isFinance ? "Financial overview" : "Operations overview"}
              </p>
              <h4 className="mt-1 text-lg font-semibold">
                {isFinance ? "Group performance" : "Inventory by location"}
              </h4>
            </div>
            <span className="shrink-0 rounded border px-2 py-1 text-[10px] text-muted-foreground">
              This month
            </span>
          </div>
          <div className="mt-5 grid grid-cols-3 divide-x border-y">
            {(isFinance
              ? [
                  ["12", "Entities"],
                  ["99.8%", "Reconciled"],
                  ["On track", "Period close"],
                ]
              : [
                  ["4", "Locations"],
                  ["Live", "Stock view"],
                  ["Ready", "Approvals"],
                ]
            ).map(([value, label]) => (
              <div key={label} className="min-w-0 px-2 py-3 first:pl-0 last:pr-0 sm:px-3">
                <p className="truncate font-display text-base font-bold sm:text-lg">{value}</p>
                <p className="mt-1 truncate text-[10px] text-muted-foreground sm:text-xs">
                  {label}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-end justify-between gap-2 border-b pb-4">
            {bars.map((height, index) => (
              <div key={index} className="flex h-20 flex-1 items-end rounded-t-sm bg-secondary">
                <div
                  className={`w-full rounded-t-sm ${index % 3 === 0 ? "bg-primary" : index % 3 === 1 ? "bg-emerald-600" : "bg-accent"}`}
                  style={{ height: `${height}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {(isFinance
              ? [
                  ["Group ledger", "Consolidated"],
                  ["Service operations", "Reviewed"],
                  ["Regional entity", "Reconciled"],
                ]
              : [
                  ["North warehouse", "Healthy"],
                  ["Central warehouse", "Reorder soon"],
                  ["South warehouse", "Healthy"],
                ]
            ).map(([name, status], index) => (
              <div
                key={name}
                className="flex items-center justify-between gap-3 border-b pb-2 text-[11px] last:border-0"
              >
                <span className="truncate">{name}</span>
                <span
                  className={`shrink-0 ${index === 1 && !isFinance ? "text-amber-700" : "text-emerald-700"}`}
                >
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Index() {
  const [activeCaseId, setActiveCaseId] = useState("distribution");
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const [expandedSolutions, setExpandedSolutions] = useState<Record<number, string | null>>({});
  const [teamStoryIndex, setTeamStoryIndex] = useState(0);
  const [teamStoryPlaying, setTeamStoryPlaying] = useState(true);
  const activeCaseIndex = cases.findIndex((cs) => cs.id === activeCaseId);
  const activeCase = cases[activeCaseIndex];
  const activeTeamStory = teamStories[teamStoryIndex] ?? teamStories[0]!;

  useEffect(() => {
    if (!teamStoryPlaying) return;

    const timer = window.setInterval(() => {
      setTeamStoryIndex((current) => (current + 1) % teamStories.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [teamStoryPlaying]);

  const handleCaseChange = (caseId: string) => {
    const nextCaseIndex = cases.findIndex((cs) => cs.id === caseId);
    if (nextCaseIndex === activeCaseIndex) return;
    setSlideDirection(nextCaseIndex > activeCaseIndex ? "right" : "left");
    setActiveCaseId(caseId);
  };

  const moveTeamStory = (direction: number) => {
    setTeamStoryIndex((current) => (current + direction + teamStories.length) % teamStories.length);
  };

  const toggleSolution = (rowIndex: number, slug: string) => {
    setExpandedSolutions((current) => ({
      ...current,
      [rowIndex]: current[rowIndex] === slug ? null : slug,
    }));
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section
        id="top"
        className="relative flex min-h-screen items-center overflow-hidden bg-navy pt-16 text-navy-foreground"
      >
        <img
          src={hero}
          alt=""
          width={1600}
          height={1104}
          className="absolute inset-0 h-full w-full object-cover object-right opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/80 to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl px-6 py-28">
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] md:text-7xl">
            Modular ERP & accounting systems, <span className="text-accent">built to scale.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg font-light text-navy-muted">
            We pair software engineering with data analysis to design custom solutions for how your
            business actually runs — then stay on to keep them running seamlessly.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="/contact"
              className="inline-flex items-center gap-2 rounded bg-accent px-6 py-3 font-medium text-accent-foreground transition hover:brightness-110"
            >
              Schedule a call <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#solutions"
              className="inline-flex items-center rounded border border-navy-line px-6 py-3 font-medium transition hover:bg-navy-line/50"
            >
              Explore solutions
            </a>
            <a
              href={import.meta.env["VITE_DASHBOARD_URL"] ?? "http://localhost:5173"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded border border-navy-line px-6 py-3 font-medium transition hover:bg-navy-line/50"
            >
              View demo dashboard <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Solutions */}
      <section
        id="solutions"
        className="mx-auto flex min-h-screen w-full max-w-7xl scroll-mt-16 flex-col justify-center px-6 py-24"
      >
        <div className="mb-14 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="mt-3 max-w-xl text-4xl font-bold">
              Modular offerings that fit your operation.
            </h2>
          </div>
          <p className="max-w-sm text-muted-foreground">
            Start with one module, add more as you grow. Every piece speaks the same data language.
          </p>
        </div>
        <div className="solution-feature-grid">
          {[services.slice(0, 2), services.slice(2)].map((row, rowIndex) => (
            <div
              key={rowIndex}
              className={`solution-feature-row solution-feature-row--${rowIndex === 0 ? "first" : "second"} ${expandedSolutions[rowIndex] ? "has-expanded" : ""}`}
            >
              {row.map(({ code, slug, title, summary, intro }) => {
                const detail = serviceDetails[slug];
                if (!detail) return null;
                const expanded = expandedSolutions[rowIndex] === slug;
                const panelId = `solution-details-${slug}`;

                return (
                  <article
                    key={slug}
                    className={`solution-feature-card ${expanded ? "is-expanded" : ""}`}
                  >
                    <button
                      type="button"
                      className={`solution-preview-toggle ${expanded ? "is-expanded-toggle" : ""}`}
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      aria-label={`${expanded ? "Collapse" : "Explore"} ${title}`}
                      onClick={() => toggleSolution(rowIndex, slug)}
                    >
                      {expanded ? (
                        <Minus aria-hidden="true" />
                      ) : (
                        <>
                          <img src={detail.image} alt="" aria-hidden="true" loading="lazy" />
                          <span className="solution-preview-copy">
                            <span className="solution-feature-meta">{title}</span>
                            <span className="solution-feature-title">{title}</span>
                          </span>
                          <span className="solution-expand-mark" aria-hidden="true">
                            <Plus />
                          </span>
                        </>
                      )}
                    </button>
                    <div
                      id={panelId}
                      className="solution-expanded-content"
                      aria-hidden={!expanded}
                    >
                      <div className="solution-expanded-image">
                        <img src={detail.image} alt={detail.imageAlt} loading="lazy" />
                      </div>
                      <div className="solution-expanded-copy">
                        <div className="solution-expanded-meta">
                          <span>{code} / {title}</span>
                        </div>
                        <h3>{title}</h3>
                        <p>{intro || summary}</p>
                        <a href={`/services/${slug}`}>
                          Find out more <ArrowRight aria-hidden="true" />
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section
        id="about"
        aria-label="Team and expertise"
        className="team-expertise-section flex min-h-screen scroll-mt-16 items-center overflow-hidden bg-navy text-navy-foreground"
      >
        <div className="team-expertise-shell mx-auto grid w-full max-w-7xl items-center gap-10 px-6 py-24 lg:grid-cols-[0.8fr_1.15fr_0.85fr] lg:gap-14">
          <div className="team-expertise-intro max-w-md">
            <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.08] tracking-[-0.035em] sm:text-5xl">
              Systems built around your business data.
            </h2>
            <p className="mt-6 text-base leading-7 text-navy-muted">
              Our engineers and analysts work as one team—turning operational information into
              reliable systems, clearer decisions and software that keeps improving.
            </p>
          </div>

          <div className="team-expertise-carousel" aria-label="Corelogic team capabilities">
            <div
              className="team-expertise-stage"
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") moveTeamStory(-1);
                if (event.key === "ArrowRight") moveTeamStory(1);
              }}
              tabIndex={0}
              aria-roledescription="carousel"
              aria-label="Capability stories. Use left and right arrow keys to navigate."
            >
              <div className="team-expertise-stack" aria-live="polite">
                {teamStories.map((story, index) => {
                  const cardOffset =
                    (index - teamStoryIndex + teamStories.length) % teamStories.length;
                  const cardClass =
                    cardOffset === 0
                      ? "is-active"
                      : cardOffset === 1
                        ? "is-next"
                        : cardOffset === teamStories.length - 1
                          ? "is-prev"
                          : "is-hidden";

                  return (
                    <article
                      key={story.title}
                      className={`team-story-card team-story-card--${story.palette} ${cardClass}`}
                      aria-hidden={cardOffset !== 0}
                    >
                      <div className="team-story-portrait" aria-hidden="true">
                        <img
                          src={story.image}
                          alt=""
                          loading="lazy"
                          width={768}
                          height={1152}
                          className="team-story-image"
                          draggable="false"
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="team-story-controls">
              <button
                type="button"
                aria-label={
                  teamStoryPlaying ? "Pause capability carousel" : "Play capability carousel"
                }
                aria-pressed={!teamStoryPlaying}
                onClick={() => setTeamStoryPlaying((playing) => !playing)}
              >
                {teamStoryPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              </button>
              <div
                className="team-story-progress"
                aria-label={`Slide ${teamStoryIndex + 1} of ${teamStories.length}`}
              >
                {teamStories.map((story, index) => (
                  <span key={story.title} className={index === teamStoryIndex ? "is-active" : ""} />
                ))}
              </div>
            </div>
          </div>

          <aside className="team-expertise-details" aria-live="polite">
            <article key={activeTeamStory.title} className="team-story-detail is-story-entering">
              <h3>{activeTeamStory.title}</h3>
              <p>{activeTeamStory.description}</p>
            </article>
          </aside>
        </div>
      </section>

      {/* Case studies */}
      <section
        id="case-studies"
        className="mx-auto flex min-h-screen w-full max-w-7xl scroll-mt-16 flex-col justify-center px-6 py-24"
      >
      <h2 className="mt-3 text-4xl max-w-3xl font-bold">All your processes. <br/> One simplified system.</h2>
        <Tabs value={activeCaseId} onValueChange={handleCaseChange} className="mt-8 w-full">
          <div className="-mx-6 overflow-x-auto px-6 pb-4 md:mx-0 md:px-0">
            <TabsList
              aria-label="Case studies"
              className="flex h-auto w-max min-w-full justify-start rounded-none border-b bg-transparent p-0 text-muted-foreground"
            >
              {cases.map((cs) => (
                <TabsTrigger
                  key={cs.id}
                  value={cs.id}
                  className="min-w-40 flex-1 justify-start rounded-none border-b-2 border-transparent px-4 py-4 text-left text-sm data-[state=active]:border-accent data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none"
                >
                  {cs.tabLabel}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {activeCase && (
            <div
              key={activeCase.id}
              role="tabpanel"
              aria-label={activeCase.tabLabel}
              className={`mt-0 overflow-hidden border bg-card case-study-slide-${slideDirection}`}
            >
              <div className="grid md:grid-cols-2">
                <CaseStudyVisual kind={activeCase.visual as "inventory" | "finance"} />
                <article className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                  <p className="text-xs font-medium uppercase tracking-widest text-primary">
                    {activeCase.sector}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold sm:text-3xl">{activeCase.name}</h3>
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold">The challenge</h4>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {activeCase.challenge}
                    </p>
                  </div>
                  <div className="mt-5">
                    <h4 className="text-sm font-semibold">Our solution</h4>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {activeCase.solution}
                    </p>
                  </div>
                  <div className="mt-7 grid grid-cols-3 divide-x border-t pt-5">
                    {activeCase.metrics.map(([value, label]) => (
                      <div key={label} className="min-w-0 px-3 first:pl-0 last:pr-0">
                        <p className="font-display text-xl font-bold text-primary sm:text-2xl">
                          {value}
                        </p>
                        <p className="mt-1 text-xs leading-snug text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            </div>
          )}
        </Tabs>
      </section>

      {/* Frequently asked questions */}
      <section
        id="faq"
        aria-labelledby="faq-heading"
        className="flex min-h-screen scroll-mt-16 items-center border-t bg-secondary/40"
      >
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-24 lg:grid-cols-3 lg:gap-16">
          <div>
            <h2 id="faq-heading" className="mt-3 text-4xl font-bold">
              Frequently asked questions.
            </h2>
            <p className="mt-5 text-muted-foreground">
              ERP, accounting and the next step for your business.
            </p>
            <a
              href="/contact"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Talk to our team <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <Accordion type="single" collapsible className="min-w-0 border-t lg:col-span-2">
            {faqs.map(({ question, answer }, i) => (
              <AccordionItem key={question} value={`faq-${i}`}>
                <AccordionTrigger className="gap-5 py-6 text-base font-semibold hover:no-underline hover:text-primary motion-reduce:transition-none">
                  {question}
                </AccordionTrigger>
                <AccordionContent className="max-w-2xl pr-8 pb-6 text-base leading-relaxed text-muted-foreground">
                  {answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}