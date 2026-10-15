import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { useState } from "react";
import { AuthPageFrame } from "@/components/auth/AuthPageFrame";

type RecoverySearch = { email: string };

export const Route = createFileRoute("/auth/verify-otp")({
  validateSearch: (search: Record<string, unknown>): RecoverySearch => ({
    email: typeof search.email === "string" ? search.email : "",
  }),
  head: () => ({
    meta: [
      { title: "Verify your email | Corelogic" },
      { name: "description", content: "Verify your email with a one-time code to reset your Corelogic password." },
    ],
  }),
  component: VerifyOtpPage,
});

function VerifyOtpPage() {
  const { email } = Route.useSearch();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (code.length !== 6) return;
    void navigate({ to: "/auth/reset-password", search: { email } });
  };

  return (
    <AuthPageFrame>
      <h1 className="mb-7 text-center font-display text-[22px] font-semibold leading-7">Enter your verification code</h1>
      {email ? (
        <>
          <form onSubmit={handleSubmit}>
            <label htmlFor="otp" className="mb-2 block text-sm text-[#666a70]">Verification code</label>
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              required
              value={code}
              onChange={(event) => setCode(event.currentTarget.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              className="h-[50px] w-full rounded-[5px] border border-[#aeb1b5] bg-white px-3.5 text-center font-mono text-lg tracking-[0.3em] text-[#30343b] outline-none placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:text-[#96999e] focus:border-[#241c15] focus:ring-2 focus:ring-[#ffe01b]"
            />
            <button
              type="submit"
              className="mt-6 flex h-[46px] w-full items-center justify-center rounded-[5px] bg-[#ffe01b] px-4 text-sm font-semibold text-[#241c15] transition-colors hover:bg-[#f2d300] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#241c15]"
            >
              Continue
            </button>
            <p aria-live="polite" className="mt-2 min-h-5 text-center text-xs text-[#666a70]">{message}</p>
          </form>
          <button
            type="button"
            onClick={() => setMessage("OTP delivery is not connected; a new code cannot be sent yet.")}
            className="mt-4 w-full text-center text-sm font-medium text-[#241c15] underline"
          >
            Resend code
          </button>
          <p className="mt-6 text-center text-sm text-[#73777d]">
            <Link to="/auth/forgot-password" className="font-medium text-[#241c15] underline">Use a different email</Link>
          </p>
        </>
      ) : (
        <div className="mt-4 text-center">
          <p className="text-sm leading-6 text-[#666a70]">Start with your work email to begin password recovery.</p>
          <Link to="/auth/forgot-password" className="mt-5 inline-block text-sm font-medium text-[#241c15] underline">
            Enter your email
          </Link>
        </div>
      )}
      <p className="mt-6 text-center text-sm text-[#73777d]">
        <Link to="/auth/sign-in" className="font-medium text-[#241c15] underline">Back to sign in</Link>
      </p>
    </AuthPageFrame>
  );
}