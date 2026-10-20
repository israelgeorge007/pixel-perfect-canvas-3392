import { createFileRoute } from "@tanstack/react-router";
import DashboardAuthFlow, { type AuthScreen } from "../../dashboard/src/DashboardAuthFlow";

type AuthSearch = { email?: string };
const authScreens: AuthScreen[] = ["sign-in", "forgot-password", "verify-otp", "reset-password"];

export const Route = createFileRoute("/dashboard/auth/$screen")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    ...(typeof search.email === "string" && search.email ? { email: search.email } : {}),
  }),
  component: DashboardAuthRoute,
});

function DashboardAuthRoute() {
  const { screen } = Route.useParams();
  const { email } = Route.useSearch();
  const initialScreen = authScreens.includes(screen as AuthScreen)
    ? (screen as AuthScreen)
    : "sign-in";
  return <DashboardAuthFlow initialScreen={initialScreen} initialEmail={email ?? ""} />;
}
