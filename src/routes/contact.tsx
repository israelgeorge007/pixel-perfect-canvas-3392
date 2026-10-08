import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const CONTACT_EMAIL = "hello@corelogic.example";
const inquiryTypes = [
  "ERP and accounting platform",
  "Custom system build",
  "Mobile application",
  "Support and maintenance",
  "Other",
];

const contactSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name.").max(120, "Name is too long."),
  workEmail: z.string().trim().email("Enter a valid email address."),
  company: z.string().trim().max(120, "Company name is too long."),
  phone: z.string().trim().max(40, "Phone number is too long."),
  interest: z.string().min(1, "Choose a service to discuss."),
  message: z.string().trim().min(20, "Add a little more detail (at least 20 characters).").max(3000, "Message must be under 3,000 characters."),
});

type ContactFormValues = z.infer<typeof contactSchema>;

const fieldClassName =
  "mt-2 w-full rounded border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Corelogic Systems" },
      {
        name: "description",
        content: "Talk with Corelogic about ERP and accounting platform onboarding or a custom system built for your business.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      fullName: "",
      workEmail: "",
      company: "",
      phone: "",
      interest: "",
      message: "",
    },
  });

  const submitInquiry = (values: ContactFormValues) => {
    const body = [
      `Name: ${values.fullName}`,
      `Email: ${values.workEmail}`,
      `Company: ${values.company || "Not provided"}`,
      `Phone: ${values.phone || "Not provided"}`,
      `Interested in: ${values.interest}`,
      "",
      values.message,
    ].join("\n");
    const subject = encodeURIComponent(`Website enquiry: ${values.interest}`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="min-h-screen bg-background pt-16">
      <SiteHeader />
      <main>
        <section className="bg-navy text-navy-foreground">
          <div className="mx-auto flex min-h-[24rem] w-full max-w-7xl items-center px-6 py-16 sm:px-10 md:py-20">
            <div className="max-w-3xl">
              <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">Let's talk about your systems.</h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-navy-muted sm:text-lg">
                Tell us what you want to improve. We can help you onboard with our ERP and accounting platform, tailor it to your workflows, or build a custom system for your team.
              </p>
            </div>
          </div>
        </section>

        <section id="contact-form" aria-labelledby="form-heading" className="mx-auto w-full max-w-7xl px-6 py-10 sm:px-10 md:py-10">
          <div className="mx-auto max-w-7xl">
            <form onSubmit={handleSubmit(submitInquiry)} noValidate className="mt-8 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="fullName" className="text-sm font-medium">Full name <span aria-hidden="true">*</span></label>
                  <input id="fullName" autoComplete="name" {...register("fullName")} aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? "fullName-error" : undefined} className={fieldClassName} />
                  {errors.fullName && <p id="fullName-error" role="alert" className="mt-2 text-xs text-destructive">{errors.fullName.message}</p>}
                </div>
                <div>
                  <label htmlFor="workEmail" className="text-sm font-medium">Work email <span aria-hidden="true">*</span></label>
                  <input id="workEmail" type="email" autoComplete="email" {...register("workEmail")} aria-invalid={Boolean(errors.workEmail)} aria-describedby={errors.workEmail ? "workEmail-error" : undefined} className={fieldClassName} />
                  {errors.workEmail && <p id="workEmail-error" role="alert" className="mt-2 text-xs text-destructive">{errors.workEmail.message}</p>}
                </div>
                <div>
                  <label htmlFor="company" className="text-sm font-medium">Company <span className="font-normal text-muted-foreground">(optional)</span></label>
                  <input id="company" autoComplete="organization" {...register("company")} aria-invalid={Boolean(errors.company)} aria-describedby={errors.company ? "company-error" : undefined} className={fieldClassName} />
                  {errors.company && <p id="company-error" role="alert" className="mt-2 text-xs text-destructive">{errors.company.message}</p>}
                </div>
                <div>
                  <label htmlFor="phone" className="text-sm font-medium">Phone <span className="font-normal text-muted-foreground">(optional)</span></label>
                  <input id="phone" type="tel" autoComplete="tel" {...register("phone")} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "phone-error" : undefined} className={fieldClassName} />
                  {errors.phone && <p id="phone-error" role="alert" className="mt-2 text-xs text-destructive">{errors.phone.message}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="interest" className="text-sm font-medium">What would you like to discuss? <span aria-hidden="true">*</span></label>
                <select id="interest" {...register("interest")} aria-invalid={Boolean(errors.interest)} aria-describedby={errors.interest ? "interest-error" : undefined} className={fieldClassName}>
                  <option value="">Select a service</option>
                  {inquiryTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                {errors.interest && <p id="interest-error" role="alert" className="mt-2 text-xs text-destructive">{errors.interest.message}</p>}
              </div>

              <div>
                <label htmlFor="message" className="text-sm font-medium">Tell us about your project <span aria-hidden="true">*</span></label>
                <textarea id="message" rows={5} {...register("message")} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "message-error" : "message-hint"} className={`${fieldClassName} resize-y`} />
                {errors.message ? (
                  <p id="message-error" role="alert" className="mt-2 text-xs text-destructive">{errors.message.message}</p>
                ) : (
                  <p id="message-hint" className="mt-2 text-xs text-muted-foreground">Include the workflows, modules, or system requirements you have in mind.</p>
                )}
              </div>

              <div className="flex flex-col items-start gap-4 border-t pt-5">
                <button type="submit" className="inline-flex items-center gap-2 rounded bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Prepare enquiry email <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </button>
                <p className="max-w-lg text-xs leading-relaxed text-muted-foreground">
                  If you encounter any issues, email us at <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-foreground underline underline-offset-4">{CONTACT_EMAIL}</a>.
                </p>
              </div>
            </form>
          </div>
        </section>
      </main>
      <SiteFooter actionHref="#contact-form" actionLabel="Schedule a call" />
    </div>
  );
}
