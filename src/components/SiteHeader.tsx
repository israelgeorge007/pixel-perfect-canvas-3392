import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, LogIn, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { industries } from "@/lib/industries";
import { services } from "@/lib/services";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [industriesOpen, setIndustriesOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [brandBarVisible, setBrandBarVisible] = useState(true);
  const navOpen = open || solutionsOpen || industriesOpen || supportOpen;
  const showBrandBar = brandBarVisible || navOpen;
  useEffect(() => {
    let previousScrollY = window.scrollY;
    const isInHeroArea = (scrollY: number) => {
      const hero = document.querySelector<HTMLElement>("[data-header-hero]");
      if (!hero) return scrollY === 0;
      const heroBottom = hero.getBoundingClientRect().bottom + window.scrollY;
      return scrollY <= heroBottom;
    };

    setBrandBarVisible(isInHeroArea(previousScrollY));

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < previousScrollY) {
        setBrandBarVisible(isInHeroArea(currentScrollY));
      } else if (currentScrollY > previousScrollY) {
        setBrandBarVisible(false);
      }
      previousScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div aria-hidden="true" className="h-8" />
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur ${navOpen ? "border-border bg-background text-foreground" : "border-navy-line/60 bg-navy/85 text-navy-foreground"}`}
      >
        <nav
          aria-label="Brand navigation"
          className={`bg-background text-xs font-medium text-foreground transition-[max-height,opacity] duration-300 motion-reduce:transition-none ${
            showBrandBar
              ? "max-h-8 border-b border-border opacity-100"
              : "pointer-events-none max-h-0 overflow-hidden opacity-0"
          }`}
        >
          <div className="mx-auto flex h-8 w-full max-w-7xl items-center justify-start gap-6 px-4 sm:px-6">
            <a
              href="/#top"
              className="inline-flex items-center transition-opacity hover:opacity-75"
              aria-label="Tarrlogic"
            >
              <img
                src="/tarrlogic es.png"
                alt="Tarrlogic"
                className="h-8 w-auto object-contain"
              />
            </a>
            <div className="ml-auto">
              <a
                href="#"
                className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-75"
              >
                <LogIn aria-hidden="true" className="h-3.5 w-3.5" />
                Login
              </a>
            </div>
          </div>
        </nav>
        <PopoverAnchor asChild>
          <div className="w-full">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
              <a
                href="/#top"
                onClick={() => setOpen(false)}
                className="flex shrink-0 items-center"
                aria-label="Tarrlogic home"
              >
                <img
                  src={navOpen ? "/tarrlogic black.png" : "/tarrlogic logo.png"}
                  alt="Tarrlogic"
                  className="h-8 w-auto object-contain sm:h-10"
                />
              </a>
              <nav
                aria-label="Main navigation"
                className={`hidden items-center gap-8 text-sm md:flex ${navOpen ? "text-foreground" : "text-navy-muted"}`}
              >
                <Popover open={solutionsOpen} onOpenChange={setSolutionsOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-9 gap-1 rounded px-0 font-normal text-inherit hover:bg-transparent hover:text-inherit data-[state=open]:underline data-[state=open]:underline-offset-8"
                    >
                      Solutions{" "}
                      <ChevronDown
                        aria-hidden="true"
                        className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${solutionsOpen ? "rotate-180" : ""}`}
                      />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    sideOffset={8}
                    collisionPadding={16}
                    className="w-64 rounded border-0 bg-background p-2 text-foreground shadow-none"
                  >
                    <nav aria-label="Solutions" className="grid gap-1">
                      <a
                        href="/solutions"
                        onClick={() => setSolutionsOpen(false)}
                        className="relative block w-full rounded px-3 py-2.5 text-sm font-medium transition-colors after:absolute after:bottom-1 after:left-3 after:h-px after:w-[calc(100%-1.5rem)] after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-300 after:content-[''] hover:after:scale-x-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:after:scale-x-100 motion-reduce:after:transition-none"
                      >
                        Overview
                      </a>
                      {services.map(({ slug, title }) => (
                        <a
                          key={slug}
                          href={`/solutions#${slug}`}
                          onClick={() => setSolutionsOpen(false)}
                          className="relative block w-full rounded px-3 py-2.5 text-sm font-medium transition-colors after:absolute after:bottom-1 after:left-3 after:h-px after:w-[calc(100%-1.5rem)] after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-300 after:content-[''] hover:after:scale-x-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:after:scale-x-100 motion-reduce:after:transition-none"
                        >
                          {title}
                        </a>
                      ))}
                    </nav>
                  </PopoverContent>
                </Popover>
                <Popover open={industriesOpen} onOpenChange={setIndustriesOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-9 gap-1 rounded px-0 font-normal text-inherit hover:bg-transparent hover:text-inherit data-[state=open]:underline data-[state=open]:underline-offset-8"
                    >
                      Industries{" "}
                      <ChevronDown
                        aria-hidden="true"
                        className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${industriesOpen ? "rotate-180" : ""}`}
                      />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    sideOffset={8}
                    collisionPadding={16}
                    className="w-80 max-w-[calc(100vw-2rem)] rounded border-0 bg-background p-2 text-foreground shadow-none"
                  >
                    <nav aria-label="Industries" className="grid gap-1">
                      {industries.map((industry) => (
                        <a
                          key={industry.slug}
                          href={`/industries/${industry.slug}`}
                          onClick={() => setIndustriesOpen(false)}
                          className="relative block w-full rounded px-3 py-2.5 text-sm font-medium transition-colors after:absolute after:bottom-1 after:left-3 after:h-px after:w-[calc(100%-1.5rem)] after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-300 after:content-[''] hover:after:scale-x-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:after:scale-x-100 motion-reduce:after:transition-none"
                        >
                          <span className="block text-sm font-medium">{industry.title}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {industry.category}
                          </span>
                        </a>
                      ))}
                    </nav>
                  </PopoverContent>
                </Popover>
                {[
                  ["Pricing", "/pricing"],
                  ["Resources", "/resources/connected-operations"],
                ].map(([label, href]) => (
                  <a
                    key={label}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="hidden transition-colors hover:text-inherit md:block"
                  >
                    {label}
                  </a>
                ))}
                <Popover open={supportOpen} onOpenChange={setSupportOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-9 gap-1 rounded px-0 font-normal text-inherit hover:bg-transparent hover:text-inherit data-[state=open]:underline data-[state=open]:underline-offset-8"
                    >
                      Support{" "}
                      <ChevronDown
                        aria-hidden="true"
                        className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${supportOpen ? "rotate-180" : ""}`}
                      />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    sideOffset={8}
                    collisionPadding={16}
                    className="w-48 rounded border-0 bg-background p-2 text-foreground shadow-none"
                  >
                    <nav aria-label="Support" className="grid gap-1">
                      {[
                        ["Documentation", "/documentation"],
                        ["Contact", "/contact"],
                      ].map(([label, href]) => (
                        <a
                          key={label}
                          href={href}
                          onClick={() => setSupportOpen(false)}
                          className="relative block w-full rounded px-3 py-2.5 text-sm font-medium transition-colors after:absolute after:bottom-1 after:left-3 after:h-px after:w-[calc(100%-1.5rem)] after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-300 after:content-[''] hover:after:scale-x-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:after:scale-x-100 motion-reduce:after:transition-none"
                        >
                          {label}
                        </a>
                      ))}
                    </nav>
                  </PopoverContent>
                </Popover>
              </nav>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  asChild
                  className="bg-accent px-3 text-xs text-accent-foreground hover:bg-accent/90 sm:px-4 sm:text-sm"
                >
                  <a href="/contact" onClick={() => setOpen(false)}>
                    Schedule a call
                  </a>
                </Button>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={open ? "Close navigation menu" : "Open navigation menu"}
                    className="h-10 w-10 border-navy-line bg-transparent text-inherit hover:bg-navy-line/40 hover:text-inherit md:hidden"
                  >
                    {open ? (
                      <X aria-hidden="true" className="h-5 w-5" />
                    ) : (
                      <Menu aria-hidden="true" className="h-5 w-5" />
                    )}
                  </Button>
                </PopoverTrigger>
              </div>
            </div>
          </div>
        </PopoverAnchor>
      </header>
      <PopoverContent
        aria-label="Services navigation"
        align="center"
        sideOffset={0}
        collisionPadding={0}
        className="h-[calc(100dvh-6rem)] max-h-[calc(100dvh-6rem)] w-screen overflow-y-auto rounded border-x-0 border-t-0 bg-background p-0 text-foreground shadow-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-top md:data-[state=open]:slide-in-from-top-2 data-[state=open]:duration-300 data-[state=closed]:duration-200 motion-reduce:animate-none md:h-auto md:max-h-none md:w-64 md:max-w-[calc(100vw-2rem)] md:overflow-visible md:rounded md:border md:p-2 md:shadow-lg"
      >
        <nav
          aria-label="Mobile navigation"
          className="mx-auto grid max-w-7xl gap-0 px-5 py-4 md:hidden"
        >
          <div className="grid grid-cols-2 gap-x-6 border-b border-border pb-2 text-sm font-medium">
            {[
              ["Pricing", "/pricing"],
              ["Resources", "/resources/connected-operations"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center justify-between py-2 underline-offset-4 hover:underline"
              >
                {label}
                <ChevronRight aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
              </a>
            ))}
          </div>
          <details className="group border-b border-border text-sm font-medium">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between py-3">
              Support
              <ChevronDown
                aria-hidden="true"
                className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <div className="grid divide-y divide-border/70 pb-2 pl-3">
              <a
                href="/documentation"
                onClick={() => setOpen(false)}
                className="py-3 text-sm text-muted-foreground hover:text-foreground"
              >
                Documentation
              </a>
              <a
                href="/contact"
                onClick={() => setOpen(false)}
                className="py-3 text-sm text-muted-foreground hover:text-foreground"
              >
                Contact
              </a>
            </div>
          </details>
          <details className="group border-b border-border text-sm font-medium">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between py-3">
              Solutions
              <ChevronDown
                aria-hidden="true"
                className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <div className="grid divide-y divide-border/70 pb-2 pl-3">
              <a
                href="/solutions"
                onClick={() => setOpen(false)}
                className="py-3 text-sm text-muted-foreground hover:text-foreground"
              >
                Overview
              </a>
              {services.map(({ slug, title }) => (
                <a
                  key={slug}
                  href={`/solutions#${slug}`}
                  onClick={() => setOpen(false)}
                  className="py-3 text-sm text-muted-foreground hover:text-foreground"
                >
                  {title}
                </a>
              ))}
            </div>
          </details>
          <details className="group border-b border-border text-sm font-medium">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between py-3">
              Industries
              <ChevronDown
                aria-hidden="true"
                className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <div className="grid divide-y divide-border/70 pb-2 pl-3">
              {industries.map((industry) => (
                <a
                  key={industry.slug}
                  href={`/industries/${industry.slug}`}
                  onClick={() => setOpen(false)}
                  className="py-3 text-sm text-muted-foreground hover:text-foreground"
                >
                  {industry.title}
                </a>
              ))}
            </div>
          </details>
        </nav>
      </PopoverContent>
    </Popover>
  );
}
