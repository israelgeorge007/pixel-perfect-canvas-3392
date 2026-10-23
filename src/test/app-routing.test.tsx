import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { industries } from "@/lib/industries";
import { getServiceOverviewHref, services } from "@/lib/services";
import { serviceDetails } from "@/lib/service-details";
import { resourceGuides, getResourceGuide } from "@/lib/resource-guides";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it.each([
    "/terms",
    "/privacy",
    "/services/support-maintenance",
    "/services/data-analysis",
    "/enterprise",
    "/pricing",
    "/documentation",
    "/solutions",
    ...resourceGuides.map(({ slug }) => `/resources/${slug}`),
    ...industries.map(({ slug }) => `/industries/${slug}`),
  ])("matches the page at %s", (path) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes(path);

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("does not match the removed industries overview", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/industries");

    expect(matches.at(-1)?.routeId).toBe(rootRouteId);
  });

  it("does not include the retired connected operations resource", () => {
    expect(getResourceGuide("connected-operations")).toBeUndefined();
  });

  it("does not match the retired accounting firms route", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/accounting-firms");

    expect(matches.at(-1)?.routeId).toBe(rootRouteId);
  });

  it.each(services.map(({ slug }) => slug))(
    "maps the legacy %s URL to its overview section",
    (slug) => {
      expect(getServiceOverviewHref(slug)).toBe(`/solutions#${slug}`);
    },
  );

  it("includes a detailed data analysis solution", () => {
    expect(getServiceOverviewHref("data-analysis")).toBe("/solutions#data-analysis");
    expect(serviceDetails["data-analysis"]?.workflows).toHaveLength(3);
  });

  it("does not redirect an unknown service slug", () => {
    expect(getServiceOverviewHref("not-a-service")).toBeNull();
  });
});
