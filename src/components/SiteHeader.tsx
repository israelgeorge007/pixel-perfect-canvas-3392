import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { services } from "@/lib/services";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const navOpen = open || solutionsOpen || productsOpen;
  const groups = [
    { title: "Business systems", items: services.slice(0, 2) },
    { title: "Applications & support", items: services.slice(2) },
  ];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div aria-hidden="true" className="h-8" />
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur ${navOpen ? "border-border bg-background text-foreground" : "border-navy-line/60 bg-navy/85 text-navy-foreground"}`}
      >
        <nav
          aria-label="Brand navigation"
          className="border-b border-border bg-background text-xs font-medium text-foreground"
        >
          <div className="mx-auto flex h-8 w-full max-w-7xl items-center justify-start gap-6 px-4 sm:px-6">
            <a href="/#top" className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-75">
              <span className="grid h-5 w-5 place-items-center rounded-sm bg-navy text-[10px] font-bold text-navy-foreground">
                C
              </span>
              Corelogic
            </a>
            <a
              href="https://www.homicareplus.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-75"
            >
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[#1d8b57] text-[10px] font-bold text-white">
                H
              </span>
              HomiCareApp
            </a>
          </div>
        </nav>
        <PopoverAnchor asChild>
          <div className="w-full">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
              <a
                href="/#top"
                onClick={() => setOpen(false)}
                className="flex shrink-0 items-center gap-2 font-display text-lg font-bold"
              >
                <span className="grid h-7 w-7 place-items-center rounded bg-accent text-accent-foreground text-sm">
                  C
                </span>
                Corelogic
              </a>
              <nav
                aria-label="Main navigation"
                className={`hidden items-center gap-8 text-sm md:flex ${navOpen ? "text-foreground" : "text-navy-muted"}`}
              >
                <Popover open={productsOpen} onOpenChange={setProductsOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-9 gap-1 rounded px-0 font-normal text-inherit hover:bg-transparent hover:text-inherit data-[state=open]:underline data-[state=open]:underline-offset-8"
                    >
                      Products <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 transition-transform data-[state=open]:rotate-180" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    sideOffset={8}
                    collisionPadding={16}
                    className="w-64 rounded border-0 bg-background p-2 text-foreground shadow-none"
                  >
                    <nav aria-label="Products" className="grid gap-1">
                      {[
                        ["Overview", "/products", false],
                        ["CoreLogic", "/dashboard", true],
                        ["HomiCareApp", "/services/mobile-app-development", true],
                      ].map(([label, href, showArrow]) => (
                        <a
                          key={label}
                          href={href}
                          onClick={() => {
                            setOpen(false);
                            setProductsOpen(false);
                          }}
                          className="relative flex w-full items-center justify-between gap-4 rounded px-3 py-2.5 text-sm font-medium transition-colors after:absolute after:bottom-1 after:left-3 after:h-px after:w-[calc(100%-1.5rem)] after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-300 after:content-[''] hover:after:scale-x-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:after:scale-x-100 motion-reduce:after:transition-none"
                        >
                          <span>{label}</span>
                          {showArrow && <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" />}
                        </a>
                      ))}
                    </nav>
                  </PopoverContent>
                </Popover>
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
                      {services.map(({ slug, title }) => (
                        <Link
                          key={slug}
                          to="/services/$slug"
                          params={{ slug }}
                          onClick={() => setSolutionsOpen(false)}
                          className="relative block w-full rounded px-3 py-2.5 text-sm font-medium transition-colors after:absolute after:bottom-1 after:left-3 after:h-px after:w-[calc(100%-1.5rem)] after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-300 after:content-[''] hover:after:scale-x-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:after:scale-x-100 motion-reduce:after:transition-none"
                        >
                          {title}
                        </Link>
                      ))}
                    </nav>
                  </PopoverContent>
                </Popover>
                {[
                  ["Resources", "/resources/connected-operations"],
                  ["Contact", "/contact"],
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
          className="mx-auto grid max-w-7xl gap-8 px-6 py-8 md:hidden"
        >
          <div className="grid grid-cols-2 gap-3 border-b pb-6 text-sm font-medium">
            {[
              ["Accounting Firms", "/accounting-firms"],
              ["Pricing", "/pricing"],
              ["About", "/#about"],
              ["Resources", "/resources/connected-operations"],
              ["Contact", "/contact"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="py-2 underline-offset-4 hover:underline"
              >
                {label}
              </a>
            ))}
          </div>
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Products
            </h2>
            <ul className="divide-y">
              {[
                ["Overview", "/products"],
                ["CoreLogic", "/dashboard"],
                ["HomiCareApp", "/services/mobile-app-development"],
              ].map(([label, href]) => (
                <li key={label}>
                  <a href={href} onClick={() => setOpen(false)} className="inline-flex items-center gap-2 py-3 text-base font-medium">
                    <span>{label}</span>
                    {label !== "Overview" && <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" />}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {groups.map((group) => (
            <div key={group.title}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {group.title}
              </h2>
              <ul className="divide-y">
                {group.items.map(({ slug, title }) => (
                  <li key={slug}>
                    <Link
                      to="/services/$slug"
                      params={{ slug }}
                      onClick={() => setOpen(false)}
                      className="block py-3 text-base font-medium"
                    >
                      {title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <a
            href="/#solutions"
            onClick={() => setOpen(false)}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            View all solutions
          </a>
        </nav>
      </PopoverContent>
    </Popover>
  );
}
