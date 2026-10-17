import { useEffect } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Tarrlogic — Finance Dashboard" },
      {
        name: "description",
        content: "Tarrlogic ERP and accounting control centre dashboard preview.",
      },
    ],
  }),
  component: DashboardRedirect,
});

function DashboardRedirect() {
  useEffect(() => {
    if (window.location.pathname.replace(/\/+$/, "") === "/dashboard") {
      const dashboardUrl = new URL(window.location.href);
      dashboardUrl.pathname = "/dashboard/index.html";
      window.location.replace(dashboardUrl.toString());
    }
  }, []);

  return <Outlet />;
}
