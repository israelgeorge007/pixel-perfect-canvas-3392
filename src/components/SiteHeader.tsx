import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { services } from "@/lib/services";

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-navy-line/60 bg-navy/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <a href="/#top" className="flex items-center gap-2 font-display text-lg font-bold text-navy-foreground">
          <span className="grid h-7 w-7 place-items-center rounded bg-accent text-accent-foreground text-sm">C</span>
          Corelogic
        </a>
        <nav className="hidden items-center gap-8 text-sm text-navy-muted md:flex">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger className="inline-flex items-center gap-1 outline-none transition-colors hover:text-navy-foreground data-[state=open]:text-navy-foreground">
              Services <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              {services.map(({ slug, title, icon: Icon }) => (
                <DropdownMenuItem key={slug} asChild>
                  <Link to="/services/$slug" params={{ slug }} className="flex cursor-pointer items-center gap-3 py-2">
                    <Icon className="h-4 w-4 text-primary" /> {title}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/#services" className="cursor-pointer text-muted-foreground">View all services</a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {["About", "Case Studies", "Contact"].map((l) => (
            <a key={l} href={`/#${l.toLowerCase().replace(" ", "-")}`} className="transition-colors hover:text-navy-foreground">{l}</a>
          ))}
        </nav>
        <a href="/#contact" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:brightness-110">
          Consultation
        </a>
      </div>
    </header>
  );
}
