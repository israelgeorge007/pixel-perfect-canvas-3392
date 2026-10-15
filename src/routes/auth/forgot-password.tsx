import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { AuthPageFrame } from "@/components/auth/AuthPageFrame";

export const Route = createFileRoute("/auth/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password | Corelogic" },
      { name: "description", content: "Start password recovery for your Corelogic workspace." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    void navigate({ to: "/auth/verify-otp", search: { email } });
  };

  return (
    <AuthPageFrame>
      <h1 className="mb-7 text-center font-display text-[22px] font-semibold leading-7">Forgot your password?</h1>
      <p className="mb-7 mt-3 text-center text-sm leading-6 text-[#666a70]">
        Enter your work email to continue with a one-time verification code.
      </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="email" className="mb-2 block text-sm text-[#666a70]">Work email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="name@company.com"
          className="h-[46px] w-full rounded-[5px] border border-[#aeb1b5] bg-white px-3.5 text-sm text-[#30343b] outline-none placeholder:text-[#96999e] focus:border-[#241c15] focus:ring-2 focus:ring-[#ffe01b]"
        />
        <button
          type="submit"
          className="mt-6 flex h-[46px] w-full items-center justify-center rounded-[5px] bg-[#ffe01b] px-4 text-sm font-semibold text-[#241c15] transition-colors hover:bg-[#f2d300] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#241c15]"
        >
          Continue
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#73777d]">
        <Link to="/auth/sign-in" className="font-medium text-[#241c15] underline">Back to sign in</Link>
      </p>
    </AuthPageFrame>
  );
}