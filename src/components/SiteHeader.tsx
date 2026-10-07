import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
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
    <header className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur ${open ? "border-border bg-background text-foreground" : "border-navy-line/60 bg-navy/85 text-navy-foreground"}`}>
      <PopoverAnchor asChild>
      <div className="w-full">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <a href="/#top" onClick={() => setOpen(false)} className="flex shrink-0 items-center gap-2 font-display text-lg font-bold">
          <span className="grid h-7 w-7 place-items-center rounded bg-accent text-accent-foreground text-sm">C</span>
          Corelogic
        </a>
        <nav aria-label="Main navigation" className={`flex items-center gap-8 text-sm ${open ? "text-foreground" : "text-navy-muted"}`}>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="h-9 gap-1 rounded-none px-0 font-normal text-inherit hover:bg-transparent hover:text-inherit data-[state=open]:underline data-[state=open]:underline-offset-8">
              Services <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
            </Button>
          </PopoverTrigger>
          {["About", "Case Studies", "Contact"].map((l) => (
            <a key={l} href={`/#${l.toLowerCase().replace(" ", "-")}`} onClick={() => setOpen(false)} className="hidden transition-colors hover:text-inherit md:block">{l}</a>
          ))}
        </nav>
        <Button asChild className="bg-accent px-3 text-xs text-accent-foreground hover:bg-accent/90 sm:px-4 sm:text-sm">
        <a href="/#contact" onClick={() => setOpen(false)}>
          Consultation
        </a>
        </Button>
      </div>
      </div>
      </PopoverAnchor>
    </header>
    <PopoverContent aria-label="Services" align="center" sideOffset={0} collisionPadding={0} className="max-h-[calc(100dvh-4rem)] w-screen overflow-y-auto rounded-none border-x-0 border-t-0 bg-background p-0 text-foreground shadow-none data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 motion-reduce:animate-none">
      <nav aria-label="Services" className="mx-auto grid max-w-7xl gap-10 px-6 py-10 sm:grid-cols-2 md:gap-24 md:py-14">
        {groups.map((group) => (
          <div key={group.title}>
            <h2 className="mb-5 text-base font-semibold tracking-normal">{group.title}</h2>
            <ul className="space-y-2">
              {group.items.map(({ slug, title }) => (
                <li key={slug}>
                  <Link to="/services/$slug" params={{ slug }} onClick={() => setOpen(false)} className="block w-fit max-w-full py-3 text-base leading-relaxed decoration-accent decoration-2 underline-offset-8 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-lg">{title}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <a href="/#services" onClick={() => setOpen(false)} className="w-fit text-sm text-muted-foreground underline-offset-4 hover:underline sm:col-span-2">View all services</a>
      </nav>
    </PopoverContent>
    </Popover>
  );
}
