import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

const lastUpdated = "October 7, 2026";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Corelogic Systems" },
      {
        name: "description",
        content:
          "Terms and conditions governing the use of Corelogic Systems website and services.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
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
              Terms &amp; Conditions
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-navy-muted sm:text-lg">
              These terms explain how Corelogic Systems provides its services and how visitors use
              this website.
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-10 md:py-24">
          <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
          <div className="mt-10 space-y-14">
            <section>
              <h2 className="text-2xl font-bold">1. Scope of these terms</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                By using this website or engaging Corelogic Systems for services, you agree to these
                terms and conditions. These terms apply to all visitors, customers, and users of the
                website and to every service offered by Corelogic Systems.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">2. Services</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Corelogic Systems provides ERP, accounting, software, mobile application,
                implementation, support, and maintenance services. Service scope, deliverables,
                timelines, and fees are confirmed in writing before work begins. Any request outside
                the agreed scope may require a separate proposal and additional charges.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">3. Fees and payment</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Fees and payment terms are set out in each written proposal. Payment is due
                according to the agreed schedule. Corelogic Systems may suspend work where an
                invoice remains unpaid beyond the agreed due date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">4. Confidentiality and data</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Each party will protect confidential information shared during the engagement and
                use it only to perform the agreed services. Corelogic Systems will handle personal
                data in accordance with applicable law and its privacy policy. Clients remain
                responsible for providing accurate information and obtaining any necessary
                permissions for data processing.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">5. Intellectual property</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Corelogic Systems retains its pre-existing tools, methods, templates, and
                intellectual property. The client owns the agreed project deliverables upon full
                payment, except for third-party software, components, and tools that remain subject
                to their own licenses.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">6. Limitation of liability</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                To the fullest extent permitted by law, Corelogic Systems will not be liable for
                indirect, incidental, special, consequential, or punitive damages arising from use
                of the website or services. Liability for any claim will not exceed the fees paid
                for the relevant engagement, unless a different limit is required by applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold">7. Changes and contact</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Corelogic Systems may update these terms when its services or applicable law change.
                Continued use after an update means you accept the revised terms. Questions about
                these terms can be sent to hello@corelogic.example.
              </p>
            </section>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
