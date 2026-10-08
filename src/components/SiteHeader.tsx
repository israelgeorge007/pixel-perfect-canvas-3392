import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { services } from "@/lib/services";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const groups = [
    { title: "Business systems", items: services.slice(0, 2) },
    { title: "Applications & support", items: services.slice(2) },
  ];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur ${open ? "border-border bg-background text-foreground" : "border-navy-line/60 bg-navy/85 text-navy-foreground"}`}
      >
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
                className={`hidden items-center gap-8 text-sm md:flex ${open ? "text-foreground" : "text-navy-muted"}`}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-9 gap-1 rounded px-0 font-normal text-inherit hover:bg-transparent hover:text-inherit data-[state=open]:underline data-[state=open]:underline-offset-8"
                  >
                    Services{" "}
                    <ChevronDown
                      aria-hidden="true"
                      className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                    />
                  </Button>
                </PopoverTrigger>
                {[
                  ["For Accountants", "/accounting-firms"],
                  ["Pricing", "/pricing"],
                  ["Use Cases", "/#case-studies"],
                  ["Support", "/support"],
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
        className="h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] w-screen overflow-y-auto rounded border-x-0 border-t-0 bg-background p-0 text-foreground shadow-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-top md:data-[state=open]:slide-in-from-top-2 data-[state=open]:duration-300 data-[state=closed]:duration-200 motion-reduce:animate-none md:h-auto"
      >
        <nav
          aria-label="Services"
          className="mx-auto hidden max-w-7xl gap-10 px-6 py-10 sm:grid-cols-2 md:grid md:gap-24 md:py-14"
        >
          {groups.map((group) => (
            <div key={group.title}>
              <h2 className="mb-5 text-base font-semibold tracking-normal">{group.title}</h2>
              <ul className="space-y-2">
                {group.items.map(({ slug, title }) => (
                  <li key={slug}>
                    <Link
                      to="/services/$slug"
                      params={{ slug }}
                      onClick={() => setOpen(false)}
                      className="block w-fit max-w-full py-3 text-base leading-relaxed decoration-accent decoration-2 underline-offset-8 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-lg"
                    >
                      {title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <a
            href="/#services"
            onClick={() => setOpen(false)}
            className="w-fit text-sm text-muted-foreground underline-offset-4 hover:underline sm:col-span-2"
          >
            View all services
          </a>
        </nav>
        <nav
          aria-label="Mobile navigation"
          className="mx-auto grid max-w-7xl gap-8 px-6 py-8 md:hidden"
        >
          <div className="grid grid-cols-2 gap-3 border-b pb-6 text-sm font-medium">
            {[
              ["Accounting Firms", "/accounting-firms"],
              ["Support", "/support"],
              ["Pricing", "/pricing"],
              ["About", "/#about"],
              ["Use Cases", "/#case-studies"],
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
            href="/#services"
            onClick={() => setOpen(false)}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            View all services
          </a>
        </nav>
      </PopoverContent>
    </Popover>
  );
}
