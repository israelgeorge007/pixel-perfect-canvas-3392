import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const lastUpdated = "October 7, 2026";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Corelogic Systems" },
      {
        name: "description",
        content:
          "Corelogic Systems privacy policy explaining how personal information is collected, used, and protected.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background pt-16">
      <SiteHeader />
      <main>
        <section className="bg-navy text-navy-foreground">
          <div className="mx-auto w-full max-w-7xl px-6 py-20 sm:px-10 md:py-28">
            <p className="text-sm font-medium uppercase tracking-widest text-accent">
              Legal information
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
              Privacy Policy
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-navy-muted sm:text-lg">
              This policy explains what information Corelogic Systems collects and how it is used.
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-10 md:py-24">
          <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
          <div className="mt-10 space-y-14">
            <section>
              <h2 className="text-2xl font-bold">1. Information we collect</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                We collect information you provide directly, such as your name, work email, company,
                phone number, and project details when you contact us. We also collect limited
                technical information needed to understand website performance, such as browser type
                and approximate location, where permitted by applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">2. How we use information</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                We use your information to respond to enquiries, assess service requirements,
                deliver agreed work, maintain communication, and improve our website. We do not sell
                personal information. We may share information with trusted service providers only
                when they need it to support our operations and are bound by appropriate
                confidentiality obligations.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">3. Data retention</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                We retain personal information for as long as necessary to provide services, meet
                contractual obligations, resolve enquiries, and comply with legal requirements.
                Information that is no longer needed is deleted or anonymized according to
                applicable retention rules.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">4. Security</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                We use reasonable technical and organizational safeguards to protect information. No
                online transmission or storage system is completely secure, so we cannot guarantee
                absolute protection. You should avoid sending sensitive information through
                unencrypted channels.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">5. Your choices</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Depending on your location, you may have rights to access, correct, delete,
                restrict, or object to the processing of your personal information. You can make
                requests by contacting hello@corelogic.example. We will respond according to
                applicable law and may request verification of your identity.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">6. Contact us</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                For questions about this privacy policy or your personal information, email
                hello@corelogic.example. This policy may be updated when our practices or applicable
                law change.
              </p>
            </section>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
