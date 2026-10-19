import { useRouterState } from "@tanstack/react-router";
import { Cookie, X } from "lucide-react";
import { useEffect, useState } from "react";

type CookiePreferences = {
  analytics: boolean;
};

type SavedCookiePreferences = CookiePreferences & {
  version: 1;
};

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

const cookieName = "tarrlogic_cookie_consent";
const cookieMaxAge = 60 * 60 * 24 * 180;
const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() ?? "";
const initializedMeasurementIds = new Set<string>();

function readCookiePreferences(): CookiePreferences | null {
  const value = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  if (!value) return null;

  try {
    const saved: unknown = JSON.parse(decodeURIComponent(value));
    if (
      typeof saved === "object" &&
      saved !== null &&
      "version" in saved &&
      saved.version === 1 &&
      "analytics" in saved &&
      typeof saved.analytics === "boolean"
    ) {
      return { analytics: saved.analytics };
    }
  } catch {
    return null;
  }

  return null;
}

function saveCookiePreferences(preferences: CookiePreferences): void {
  const saved: SavedCookiePreferences = { version: 1, ...preferences };
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${cookieName}=${encodeURIComponent(JSON.stringify(saved))}; Path=/; Max-Age=${cookieMaxAge}; SameSite=Lax${secure}`;
}

function clearAnalyticsCookies(): void {
  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.trim().split("=", 1)[0];
    if (name === "_gid" || name === "_gat" || name.startsWith("_ga")) {
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
    }
  });
}

function loadGoogleAnalytics(id: string): void {
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = window.gtag ?? ((...args: unknown[]) => window.dataLayer?.push(args));

  if (!document.getElementById("tarrlogic-google-analytics")) {
    const script = document.createElement("script");
    script.id = "tarrlogic-google-analytics";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(script);
  }

  if (!initializedMeasurementIds.has(id)) {
    window.gtag("js", new Date());
    window.gtag("config", id, { send_page_view: false });
    initializedMeasurementIds.add(id);
  }
}

export function CookieConsent({ hidden = false }: { hidden?: boolean }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);
  const [ready, setReady] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analyticsDraft, setAnalyticsDraft] = useState(false);

  useEffect(() => {
    const saved = readCookiePreferences();
    setPreferences(saved);
    setAnalyticsDraft(saved?.analytics ?? false);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!preferences?.analytics || !measurementId) return;
    loadGoogleAnalytics(measurementId);
    window.gtag?.("event", "page_view", { page_path: pathname });
  }, [pathname, preferences?.analytics]);

  const savePreferences = (next: CookiePreferences) => {
    saveCookiePreferences(next);
    setPreferences(next);
    setCustomizing(false);
    if (!next.analytics) {
      window.gtag?.("consent", "update", { analytics_storage: "denied" });
      clearAnalyticsCookies();
    }
  };

  if (hidden || !ready) return null;

  if (preferences && !customizing) {
    return (
      <button
        type="button"
        aria-label="Cookie settings"
        title="Cookie settings"
        onClick={() => {
          setAnalyticsDraft(preferences.analytics);
          setCustomizing(true);
        }}
        className="fixed bottom-5 left-5 z-[60] inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground shadow-lg transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Cookie className="h-4 w-4" aria-hidden="true" />
        Cookie settings
      </button>
    );
  }

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      className="fixed bottom-28 left-4 z-[60] w-[calc(100%-2rem)] max-w-md rounded-lg border border-border bg-card p-5 text-card-foreground shadow-2xl sm:bottom-5 sm:left-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Privacy choices
          </p>
          <h2 id="cookie-consent-title" className="mt-2 text-lg font-semibold">
            Choose your cookie settings
          </h2>
        </div>
        {preferences && customizing && (
          <button
            type="button"
            aria-label="Close cookie settings"
            onClick={() => setCustomizing(false)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded border border-border text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Essential cookies keep this choice saved. With your permission, analytics cookies help us
        understand how the site is used. Optional tracking stays off until you choose otherwise.
      </p>
      {customizing && (
        <div className="mt-4 divide-y divide-border rounded-md border border-border px-3">
          <div className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium">Essential</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Always on</p>
            </div>
            <input type="checkbox" checked disabled aria-label="Essential cookies always on" />
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
            <span>
              <span className="block text-sm font-medium">Analytics</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Anonymous site usage measurement
              </span>
            </span>
            <input
              type="checkbox"
              checked={analyticsDraft}
              onChange={(event) => setAnalyticsDraft(event.target.checked)}
              aria-label="Allow analytics cookies"
            />
          </label>
        </div>
      )}
      <a
        href="/privacy"
        className="mt-3 inline-block text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Privacy policy
      </a>
      <div className="mt-5 flex flex-wrap gap-2">
        {customizing ? (
          <>
            <button
              type="button"
              onClick={() => savePreferences({ analytics: false })}
              className="min-h-10 rounded-md border border-border px-3 text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Reject optional
            </button>
            <button
              type="button"
              onClick={() => savePreferences({ analytics: analyticsDraft })}
              className="min-h-10 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Save choices
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => savePreferences({ analytics: false })}
              className="min-h-10 rounded-md border border-border px-3 text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Reject optional
            </button>
            <button
              type="button"
              onClick={() => {
                setAnalyticsDraft(false);
                setCustomizing(true);
              }}
              className="min-h-10 rounded-md border border-border px-3 text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Customize
            </button>
            <button
              type="button"
              onClick={() => savePreferences({ analytics: true })}
              className="min-h-10 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Accept all
            </button>
          </>
        )}
      </div>
    </section>
  );
}
