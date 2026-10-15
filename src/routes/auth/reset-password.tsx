import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { AuthPageFrame } from "@/components/auth/AuthPageFrame";

type RecoverySearch = { email: string };

export const Route = createFileRoute("/auth/reset-password")({
  validateSearch: (search: Record<string, unknown>): RecoverySearch => ({
    email: typeof search.email === "string" ? search.email : "",
  }),
  head: () => ({
    meta: [
      { title: "Choose a new password | Corelogic" },
      { name: "description", content: "Choose a new password for your Corelogic workspace." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { email } = Route.useSearch();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmPassword") ?? "");
    if (password !== confirmation) {
      setMessage("The passwords do not match.");
      return;
    }
    setMessage("");
  };

  return (
    <AuthPageFrame>
      <h1 className="mb-7 text-center font-display text-[22px] font-semibold leading-7">Choose a new password</h1>
      {email ? (
        <>
          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm text-[#666a70]">New password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  placeholder="At least 8 characters"
                  className="h-[46px] w-full rounded-[5px] border border-[#aeb1b5] bg-white px-3.5 pr-12 text-sm text-[#30343b] outline-none placeholder:text-[#96999e] focus:border-[#241c15] focus:ring-2 focus:ring-[#ffe01b]"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-0 top-0 grid h-[46px] w-11 place-items-center rounded-r-[5px] text-[#70747a] hover:text-[#30343b] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#241c15]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              <p className="mt-2 text-xs text-[#77716a]">Use at least 8 characters.</p>
            </div>

            <div className="mt-4">
              <label htmlFor="confirmPassword" className="mb-2 block text-sm text-[#666a70]">Confirm new password</label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmation ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  placeholder="Re-enter your password"
                  className="h-[46px] w-full rounded-[5px] border border-[#aeb1b5] bg-white px-3.5 pr-12 text-sm text-[#30343b] outline-none placeholder:text-[#96999e] focus:border-[#241c15] focus:ring-2 focus:ring-[#ffe01b]"
                />
                <button
                  type="button"
                  aria-label={showConfirmation ? "Hide confirmation password" : "Show confirmation password"}
                  onClick={() => setShowConfirmation((current) => !current)}
                  className="absolute right-0 top-0 grid h-[46px] w-11 place-items-center rounded-r-[5px] text-[#70747a] hover:text-[#30343b] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#241c15]"
                >
                  {showConfirmation ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="mt-6 flex h-[46px] w-full items-center justify-center rounded-[5px] bg-[#ffe01b] px-4 text-sm font-semibold text-[#241c15] transition-colors hover:bg-[#f2d300] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#241c15]"
            >
              Reset password
            </button>
            <p aria-live="polite" className="mt-3 min-h-5 text-center text-xs leading-5 text-[#666a70]">{message}</p>
          </form>
        </>
      ) : (
        <div className="mt-4 text-center">
          <p className="text-sm leading-6 text-[#666a70]">Enter your email and verify an OTP before resetting your password.</p>
          <Link to="/auth/forgot-password" className="mt-5 inline-block text-sm font-medium text-[#241c15] underline">
            Start password recovery
          </Link>
        </div>
      )}
      <p className="mt-6 text-center text-sm text-[#73777d]">
        <Link to="/auth/sign-in" className="font-medium text-[#241c15] underline">Back to sign in</Link>
      </p>
    </AuthPageFrame>
  );
}