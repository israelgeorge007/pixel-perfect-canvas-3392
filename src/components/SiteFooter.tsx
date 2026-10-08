import { useMemo, useState } from "react";
import { ArrowRight, Mail, MapPin, Phone, Search } from "lucide-react";

type SiteFooterProps = {
  actionHref?: string;
  actionLabel?: string;
};

const CONTACT_EMAIL = "hello@corelogic.example";

const SITE_SEARCH_ITEMS = [
  {
    label: "Accounting Firms",
    href: "/accounting-firms",
    description: "Accounting and financial operations",
  },
  { label: "Pricing", href: "/pricing", description: "Plans, onboarding and ROI" },
  { label: "Support", href: "/support", description: "Maintenance and technical support" },
  { label: "Contact", href: "/contact", description: "Talk with Corelogic" },
  {
    label: "ERP Solutions",
    href: "/services/erp-solutions",
    description: "Business process and ERP systems",
  },
  {
    label: "Financial Accounting",
    href: "/services/financial-accounting-software",
    description: "Accounting and financial operations",
  },
  {
    label: "Mobile Applications",
    href: "/services/mobile-app-development",
    description: "Web, mobile and backend software",
  },
  {
    label: "Support & Maintenance",
    href: "/services/support-maintenance",
    description: "Ongoing technical support",
  },
  { label: "Terms", href: "/terms", description: "Terms of use" },
  { label: "Privacy", href: "/privacy", description: "Privacy policy" },
];

export function SiteFooter({
  actionHref = "/contact",
  actionLabel = "Schedule a call",
}: SiteFooterProps) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return SITE_SEARCH_ITEMS.filter((item) =>
      `${item.label} ${item.description}`.toLowerCase().includes(normalizedQuery),
    ).slice(0, 5);
  }, [query]);

  return (
    <footer id="contact" className="scroll-mt-16 bg-navy text-navy-foreground">
      <div className="mx-auto w-full max-w-7xl px-6 py-20 sm:px-10">
        <div className="flex flex-col justify-between gap-8 border-b border-navy-line pb-14 md:flex-row md:items-end">
          <div className="w-full max-w-2xl">
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-navy-muted" />
              <input
                id="site-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search services, pricing or support..."
                autoComplete="off"
                className="h-14 w-full rounded border border-navy-line bg-navy-foreground/5 pl-12 pr-4 text-base text-navy-foreground outline-none transition placeholder:text-navy-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              {query && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded border border-navy-line bg-navy shadow-xl">
                  {results.length > 0 ? (
                    <nav aria-label="Site search results" className="grid">
                      {results.map((item) => (
                        <a
                          key={item.href}
                          href={item.href}
                          className="flex items-center justify-between gap-4 border-b border-navy-line px-4 py-3 transition-colors last:border-0 hover:bg-navy-foreground/10"
                        >
                          <span>
                            <span className="block text-sm font-medium text-navy-foreground">
                              {item.label}
                            </span>
                            <span className="block text-xs text-navy-muted">
                              {item.description}
                            </span>
                          </span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-accent" />
                        </a>
                      ))}
                    </nav>
                  ) : (
                    <p className="px-4 py-5 text-sm text-navy-muted">No matching pages found.</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <a
            href={actionHref}
            className="inline-flex items-center gap-2 self-start rounded bg-accent px-6 py-3 font-medium text-accent-foreground transition hover:brightness-110 md:self-auto"
          >
            {actionLabel} <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="grid gap-12 py-14 md:grid-cols-[1fr_1.25fr] md:gap-20">
          <div>
            <a
              href="/#top"
              className="inline-flex items-center gap-2 font-display text-xl font-bold text-navy-foreground"
            >
              <span className="grid h-9 w-9 place-items-center rounded bg-accent text-sm font-bold text-accent-foreground">
                C
              </span>
              Corelogic
            </a>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-navy-muted">
              Connecting business systems, people and workflows through practical ERP and
              application support.
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-navy-muted">
                Contact
              </p>
              <address className="mt-5 space-y-4 text-sm not-italic text-navy-muted">
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="flex items-center gap-3 transition-colors hover:text-navy-foreground"
                >
                  <Mail className="h-4 w-4 text-accent" /> {CONTACT_EMAIL}
                </a>
                <p className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-accent" /> +234 000 000 0000
                </p>
                <p className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-accent" /> Lagos, Nigeria
                </p>
              </address>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-navy-muted">
                Explore
              </p>
              <nav
                aria-label="Footer navigation"
                className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-navy-muted"
              >
                <a
                  href="/accounting-firms"
                  className="transition-colors hover:text-navy-foreground"
                >
                  Accounting Firms
                </a>
                <a href="/pricing" className="transition-colors hover:text-navy-foreground">
                  Pricing
                </a>
                <a href="/support" className="transition-colors hover:text-navy-foreground">
                  Support
                </a>
                <a href="/contact" className="transition-colors hover:text-navy-foreground">
                  Contact
                </a>
                <a href="/terms" className="transition-colors hover:text-navy-foreground">
                  Terms
                </a>
                <a href="/privacy" className="transition-colors hover:text-navy-foreground">
                  Privacy
                </a>
              </nav>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-navy-line pt-7 text-xs text-navy-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Corelogic Systems. All rights reserved.</p>
          <p>Built for connected operations.</p>
        </div>
      </div>
    </footer>
  );
}
