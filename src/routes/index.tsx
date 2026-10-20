import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Minus, Pause, Play, Plus } from "lucide-react";
import hero from "@/assets/hero.jpg";
import teamProcess from "@/assets/carousel-process.jpg";
import teamApps from "@/assets/carousel-apps.jpg";
import teamData from "@/assets/carousel-data.jpg";
import teamDelivery from "@/assets/carousel-delivery.jpg";
import teamGrowth from "@/assets/carousel-growth.jpg";
import { services } from "@/lib/services";
import { serviceDetails } from "@/lib/service-details";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const TITLE = "Tarrlogic®: Enterprise-grade systems built to scale.";
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

const teamStories = [
  {
    eyebrow: "01 / Product strategy",
    title: "From process map to reliable system.",
    description:
      "We connect business workflows, data rules and user needs before implementation begins—so the software fits the way your team actually works.",
    name: "Business process design",
    role: "Discovery & solution architecture",
    location: "Tarrlogic",
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
    location: "Tarrlogic",
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
    location: "Tarrlogic",
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
    location: "Tarrlogic",
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
    location: "Tarrlogic",
    tag: "Scale",
    palette: "teal",
    image: teamGrowth,
  },
];

const engagementOptions = [
  {
    title: "Plan",
    points: [
      "Map workflows, users and reporting needs",
      "Prioritize modules and integrations",
      "Agree scope and rollout stages",
    ],
  },
  {
    title: "Build",
    points: [
      "Configure systems around your processes",
      "Prepare and validate your business data",
      "Test complete workflows with your team",
    ],
  },
  {
    title: "Support",
    points: [
      "Train users and guide the handover",
      "Maintain systems and resolve issues",
      "Plan improvements as your needs grow",
    ],
  },
];

function Index() {
  const [expandedSolutions, setExpandedSolutions] = useState<Record<number, string | null>>({});
  const [teamStoryIndex, setTeamStoryIndex] = useState(0);
  const [teamStoryPlaying, setTeamStoryPlaying] = useState(true);
  const activeTeamStory = teamStories[teamStoryIndex] ?? teamStories[0]!;

  useEffect(() => {
    if (!teamStoryPlaying) return;

    const timer = window.setInterval(() => {
      setTeamStoryIndex((current) => (current + 1) % teamStories.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [teamStoryPlaying]);

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
        data-header-hero
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
            Enterprise-grade systems <span className="text-accent">built to scale.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg font-light text-navy-muted">
            We pair software engineering with data analysis to design custom solutions for how your
            business actually runs — then stay on to keep them running seamlessly.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="/solutions"
              className="inline-flex items-center gap-2 rounded border border-navy-line bg-accent text-accent-foreground px-6 py-2 font-medium transition hover:brightness-110"
            >
              Explore our solutions
            </a>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 rounded border border-accent px-6 py-2 font-medium text-accent transition-[transform,background-color,border-color,gap] duration-200 hover:gap-3 hover:bg-accent/10"
            >
              Schedule a call <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Solutions */}
      <section
        id="solutions"
        className="mx-auto flex min-h-screen w-full max-w-7xl scroll-mt-16 flex-col justify-center px-6 py-24"
      >
        <div className="mb-14 flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <h2 className="max-w-xl text-4xl font-bold">
              Solutions that fit your business operations.
            </h2>
          </div>
          <p className="max-w-sm text-muted-foreground">
            Start with one module, add more as you grow. Every piece speaks your data language.
          </p>
        </div>
        <div className="solution-feature-grid">
          {[services.slice(0, 2), services.slice(2)].map((row, rowIndex) => (
            <div
              key={rowIndex}
              className={`solution-feature-row solution-feature-row--${rowIndex === 0 ? "first" : "second"} ${expandedSolutions[rowIndex] ? "has-expanded" : ""}`}
            >
              {row.map(({ slug, title, summary, intro }) => {
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
                    <div id={panelId} className="solution-expanded-content" aria-hidden={!expanded}>
                      <div className="solution-expanded-image">
                        <img src={detail.image} alt={detail.imageAlt} loading="lazy" />
                      </div>
                      <div className="solution-expanded-copy">
                        <h3>{title}</h3>
                        <p>{intro || summary}</p>
                        <a href={`/solutions#${slug}`}>
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

          <div className="team-expertise-carousel">
            <div
              className="team-expertise-stage"
              role="region"
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

      {/* How we work */}
      <section
        id="case-studies"
        aria-labelledby="engagement-heading"
        className="flex min-h-screen scroll-mt-16 items-center border-y bg-secondary/40"
      >
        <div className="mx-auto w-full max-w-7xl px-6 py-24">
          <div className="max-w-3xl">
            <h2 id="engagement-heading" className="mt-3 text-4xl font-bold">
              Flexible ways to work together.
            </h2>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              From the first process review through implementation and ongoing support, we partner
              with your team at every stage.
            </p>
          </div>
          <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
            {engagementOptions.map(({ title, points }, index) => (
              <article key={title} className="border-t border-border pt-7">
                <span className="text-sm font-medium text-muted-foreground">0{index + 1}</span>
                <div className="mt-5 border-l-2 border-accent py-1 pl-5">
                  <h3 className="text-xl font-semibold">{title}</h3>
                </div>
                <ul className="mt-6 space-y-3 pl-5 text-base leading-relaxed text-muted-foreground marker:text-primary">
                  {points.map((point) => (
                    <li key={point} className="list-disc">
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <div className="mt-16 grid gap-12 border-t border-border pt-16 lg:grid-cols-[1.55fr_0.8fr] lg:items-center">
            <div className="grid overflow-hidden rounded-lg bg-background p-5 sm:grid-cols-[minmax(0,0.9fr)_1px_minmax(0,1fr)] sm:gap-6 sm:p-8">
              <a
                href="/resources/connected-operations"
                className="group block bg-card text-card-foreground"
              >
                <div className="relative aspect-[16/16] overflow-hidden">
                  <img
                    src={teamDelivery}
                    alt="Tarrlogic team collaborating on a business system"
                    loading="lazy"
                    className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              </a>
              <div className="hidden bg-border sm:block" aria-hidden="true" />
              <div className="flex flex-col items-start justify-center gap-6 py-7 sm:py-0">
                <p className="text-base leading-relaxed text-muted-foreground">
                  From workflow planning and custom development to connected platforms and ongoing
                  support, we help make everyday work clearer.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-7 lg:pl-4">
              <h3 className="max-w-xl text-3xl font-medium leading-tight sm:text-4xl">
                Let’s make your systems work better together.
              </h3>
              <p className="max-w-lg leading-relaxed text-muted-foreground">
                Talk with our team about the processes you want to connect and the right place to
                begin.
              </p>
              <a
                href="/contact"
                className="inline-flex items-center gap-2 rounded border border-primary px-6 py-3 text-sm font-medium text-primary transition-[transform,background-color,border-color,gap] duration-200 hover:gap-3 hover:bg-primary hover:text-primary-foreground"
              >
                Talk to an expert <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
