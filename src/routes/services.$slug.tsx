import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { getServiceOverviewHref } from "@/lib/services";

export const Route = createFileRoute("/services/$slug")({
  loader: ({ params }) => {
    const href = getServiceOverviewHref(params.slug);
    if (!href) throw notFound();
    throw redirect({ href });
  },
  notFoundComponent: ServiceNotFound,
  component: () => null,
});

function ServiceNotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="text-3xl font-bold">Page not found</h1>
        <a href="/solutions#solutions" className="mt-4 inline-block text-primary hover:underline">See all solutions</a>
      </div>
    </div>
  );
}
