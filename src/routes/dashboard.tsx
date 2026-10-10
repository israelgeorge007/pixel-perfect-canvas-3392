import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Corelogic — Finance Dashboard" },
      {
        name: "description",
        content: "Corelogic ERP and accounting control centre dashboard preview.",
      },
    ],
  }),
  component: DashboardRedirect,
});

function DashboardRedirect() {
  useEffect(() => {
    window.location.replace("/dashboard/index.html");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <noscript>
        <meta httpEquiv="refresh" content="0; url=/dashboard/index.html" />
      </noscript>
      <p className="text-sm text-muted-foreground">
        Opening the dashboard…{" "}
        <a href="/dashboard/index.html" className="underline">
          Continue
        </a>
      </p>
    </div>
  );
}
