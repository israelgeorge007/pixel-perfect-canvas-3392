# Intentun Platform Admin

This is an independent React/Vite app for platform-wide administration. It is separate from the public website and the finance dashboard in `dashboard/`.

## Run locally

```sh
npm install
npm run dev
```

Vite serves the app at `http://localhost:4174`.

## Verify and build

```sh
npm test
npm run build
```

The production output is written to `admin/dist/`. The app can be deployed independently; configure a same-origin `/admin` mapping at the hosting or reverse-proxy layer if needed.

## Current functionality

- Organizations, users, usage metrics, and contact submissions are preloaded.
- Organization onboarding is a four-step flow for organization basics, plan/limits/modules, primary owner details, and review. The owner sets a temporary password; profile details such as logo, registered address, tax IDs, and bank accounts are left for the organization to complete after onboarding.
- Organization module entitlements and staff access controls match the finance dashboard's pages and workspace settings sections.
- A cross-organization dashboard activity view is available for audit review.
- Administrator settings include session-only profile editing and platform role permission configuration. Password changes remain unavailable until administrator authentication is connected.
- The account dropdown shows the current admin identity, opens settings, and ends the in-memory preview session. Restarting or reloading the standalone preview starts a new session; this is not authentication-enforced sign-out.
- Onboarding and updates are held in the current page session and reset when the page reloads.
- Administrator authentication, authorization, persistence, invitations, contact intake, and limit enforcement are not configured.
- Temporary passwords are validated in the onboarding preview but discarded without being applied or stored; real owner account creation and password setup require authentication/backend integration.
- Contact form submissions from the public website are not connected to this inbox.
- The standalone admin does not read or write the finance dashboard's browser storage. Shared backend integration is required before its organization, access, audit, or usage controls can affect live workspaces.
