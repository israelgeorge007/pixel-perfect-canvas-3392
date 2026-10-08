import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { Clock3, MessageCircle, Phone, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [contactOpen, setContactOpen] = useState(false);
  const contactTriggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!contactOpen) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setContactOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [contactOpen]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />

      <button
        ref={contactTriggerRef}
        type="button"
        aria-label="Contact us"
        aria-expanded={contactOpen}
        aria-controls="mobile-contact-panel"
        onClick={() => setContactOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex h-20 w-20 flex-col items-center justify-center rounded-full border-0 bg-white text-foreground shadow-[0_6px_24px_rgb(0_0_0_/_20%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:bottom-7 sm:right-7 sm:h-28 sm:w-28"
      >
        <span className="flex items-center justify-center gap-1 sm:gap-1.5">
          <Phone className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
          <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
        </span>
        <span className="mt-1 text-[10px] font-semibold leading-none sm:text-xs">Contact us</span>
      </button>

      {contactOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-0 sm:p-5" onMouseDown={() => setContactOpen(false)}>
          <section
            id="mobile-contact-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-panel-title"
            onMouseDown={(event) => event.stopPropagation()}
            className="contact-panel flex w-full max-w-md flex-col rounded-lg border border-border bg-card p-6 shadow-2xl sm:rounded-lg sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="contact-panel-title" className="mt-2 text-2xl font-bold text-foreground">Questions about Corelogic?</h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close contact panel"
                onClick={() => setContactOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <a
              href="tel:+18009428127"
              className="mt-7 flex items-center gap-4 rounded-xl bg-primary p-4 text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15">
                <Phone className="h-5 w-5" aria-hidden="true" />
              </span> 
              <span>
                <span className="block text-xs text-primary-foreground/70">Call us</span>
                <span className="mt-0.5 block font-semibold">+234-123-456-7890</span>
              </span>
            </a>

            <div className="mt-5 flex items-center gap-4 border-t border-border pt-5 text-sm text-muted-foreground">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                <Clock3 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-medium text-foreground">Monday – Friday</p>
                <p className="mt-0.5">5:00 AM – 6:00 PM PT</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </QueryClientProvider>
  );
}
