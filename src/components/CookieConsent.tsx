import { useRouterState } from "@tanstack/react-router";
import { Cookie } from "lucide-react";
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

const cookieName = "intentrun_cookie_consent";
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

  if (!document.getElementById("intentrun-google-analytics")) {
    const script = document.createElement("script");
    script.id = "intentrun-google-analytics";
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
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    const saved = readCookiePreferences();
    setPreferences(saved);
    setAnalyticsDraft(saved?.analytics ?? false);
    setPanelMounted(!saved);
    setPanelOpen(!saved);
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
    setPanelOpen(false);
    if (!next.analytics) {
      window.gtag?.("consent", "update", { analytics_storage: "denied" });
      clearAnalyticsCookies();
    }
  };

  const closePanel = () => {
    setCustomizing(false);
    setPanelOpen(false);
  };

  if (hidden || !ready) return null;

  if (preferences && !customizing && !panelMounted) {
    return (
      <button
        type="button"
        aria-label="Cookie settings"
        title="Cookie settings"
        onClick={() => {
          setAnalyticsDraft(preferences.analytics);
          setCustomizing(false);
          setPanelMounted(true);
          setPanelOpen(true);
        }}
        className="fixed bottom-5 left-5 z-[60] inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground shadow-lg transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Cookie className="h-4 w-4" aria-hidden="true" />
      </button>
    );
  }

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-hidden={!panelOpen}
      inert={!panelOpen}
      data-state={panelOpen ? "open" : "closed"}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget && event.animationName === "cookie-consent-fold") {
          setPanelMounted(false);
        }
      }}
      className="cookie-consent-panel fixed bottom-5 left-4 z-[60] grid w-[calc(100%-2rem)] max-w-[673px] gap-5 bg-white p-4 text-[#1e1405] shadow-[0_0_4px_rgba(0,0,0,0.2)] sm:left-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8 sm:px-6 sm:py-5"
    >
      <div>
        <h2 id="cookie-consent-title" className="text-base font-semibold leading-snug">
          {customizing ? "Cookie Settings" : "Your privacy matters"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed">
          {customizing
            ? "Choose which optional cookies you allow. Essential cookies are always on so your preferences and core site features work."
            : "By clicking “Accept All Cookies”, you agree to the storing of cookies on your device to enhance site navigation and analyze site usage. You can choose which optional cookies to allow in Cookie Settings."}
        </p>
        <a
          href="/privacy"
          className="mt-2 inline-block text-sm font-medium underline underline-offset-4 hover:opacity-70"
        >
          {customizing ? "Privacy policy" : "Cookie Policy"}
        </a>
        {customizing && (
          <div className="mt-4 divide-y divide-[#1e1405]/15 border-y border-[#1e1405]/15">
            <div className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-semibold">Essential cookies</p>
                <p className="mt-1 text-xs leading-relaxed">
                  Required for site functionality and remembering your privacy choices.
                </p>
              </div>
              <input
                type="checkbox"
                checked
                disabled
                aria-label="Essential cookies always on"
                className="h-4 w-4 accent-[#1e1405]"
              />
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
              <span>
                <span className="block text-sm font-semibold">Analytics cookies</span>
                <span className="mt-1 block text-xs leading-relaxed">
                  Help us understand site usage and improve the experience.
                </span>
              </span>
              <input
                type="checkbox"
                checked={analyticsDraft}
                onChange={(event) => setAnalyticsDraft(event.target.checked)}
                aria-label="Allow analytics cookies"
                className="h-4 w-4 accent-[#1e1405]"
              />
            </label>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:min-w-40">
        {customizing ? (
          <>
            <button
              type="button"
              onClick={() => savePreferences({ analytics: false })}
              className="min-h-10 border border-[#1e1405]/50 px-3 text-sm font-semibold transition-colors hover:bg-[#1e1405]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1405]"
            >
              Reject All
            </button>
            <button
              type="button"
              onClick={() => savePreferences({ analytics: analyticsDraft })}
              className="min-h-10 bg-[#1e1405] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#1e1405]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1405]"
            >
              Save My Choices
            </button>
            {preferences && (
              <button
                type="button"
                onClick={closePanel}
                className="min-h-10 px-3 text-sm font-medium underline underline-offset-4 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1405]"
              >
                Close settings
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => savePreferences({ analytics: false })}
              className="min-h-10 border border-[#1e1405]/50 px-3 text-sm font-semibold transition-colors hover:bg-[#1e1405]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1405]"
            >
              Reject All
            </button>
            <button
              type="button"
              onClick={() => {
                setAnalyticsDraft(false);
                setCustomizing(true);
              }}
              className="min-h-10 border border-[#1e1405]/50 px-3 text-sm font-semibold transition-colors hover:bg-[#1e1405]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1405]"
            >
              Cookie Settings
            </button>
            <button
              type="button"
              onClick={() => savePreferences({ analytics: true })}
              className="min-h-10 bg-[#1e1405] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#1e1405]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1405]"
            >
              Accept All Cookies
            </button>
          </>
        )}
      </div>
    </section>
  );
}
