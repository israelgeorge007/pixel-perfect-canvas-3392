import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/auth/sign-in")({
  head: () => ({
    meta: [
      { title: "Sign in | Corelogic" },
      {
        name: "description",
        content: "Sign in to your Corelogic workspace.",
      },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#f1f2f4] px-4 text-[#30343b]">
      <div className="flex w-full flex-1 items-center justify-center py-8 sm:px-4">
        <section className="w-full max-w-[476px] rounded-[10px] border border-[#e1e2e5] bg-white px-6 py-8 shadow-[0_2px_8px_rgba(0,0,0,0.12)] sm:px-[26px] sm:py-10">
          <Link to="/" className="mx-auto mb-6 flex w-fit items-center gap-2.5 text-[#241c15] no-underline">
            <span className="grid h-9 w-9 place-items-center rounded-[4px] bg-[#ffe01b] font-display text-lg font-bold text-[#241c15]">
              C
            </span>
            <span className="font-display text-xl font-bold">Corelogic</span>
          </Link>

          <h1 className="mb-7 text-center font-display text-[22px] font-semibold leading-7">
            Let's get you signed in
          </h1>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSubmitMessage("Sign-in is not connected yet. Contact your workspace administrator for access.");
            }}
          >
            <div>
              <label htmlFor="email" className="mb-2 block text-sm text-[#666a70]">
                Work email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="name@company.com"
                className="h-[46px] w-full rounded-[5px] border border-[#aeb1b5] bg-white px-3.5 text-sm text-[#30343b] outline-none placeholder:text-[#96999e] focus:border-[#241c15] focus:ring-2 focus:ring-[#ffe01b]"
              />
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="password" className="text-sm text-[#666a70]">
                  Password
                </label>
                <Link to="/auth/forgot-password" className="text-xs font-medium text-[#241c15] underline hover:text-[#51483f]">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
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
            </div>

            <label className="mt-5 flex w-fit items-center gap-2.5 text-sm text-[#666a70]">
              <input
                type="checkbox"
                name="remember"
                defaultChecked
                className="h-[18px] w-[18px] accent-[#241c15] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#241c15]"
              />
              Remember me
            </label>

            <button
              type="submit"
              className="mt-6 flex h-[46px] w-full items-center justify-center gap-2 rounded-[5px] bg-[#ffe01b] px-4 text-sm font-semibold text-[#241c15] transition-colors hover:bg-[#f2d300] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#241c15]"
            >
              <LockKeyhole className="h-[18px] w-[18px]" aria-hidden="true" />
              Sign in
            </button>

            <p aria-live="polite" className="mt-2 min-h-5 text-center text-xs leading-5 text-[#666a70]">
              {submitMessage}
            </p>

            <p className="mt-3 text-center text-xs leading-[1.6] text-[#73777d]">
              By selecting Sign in, you agree to our <Link to="/terms" className="text-[#241c15] underline">Terms</Link>. Our <Link to="/privacy" className="text-[#241c15] underline">Privacy Policy</Link> applies to your personal data.
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-[#73777d]">
            New to Corelogic? <Link to="/contact" className="font-medium text-[#241c15] underline">Contact us</Link>
          </p>
        </section>
      </div>

      <footer className="w-full pb-5 pt-3 text-center text-[11px] leading-5 text-[#7a7e84]">
        <nav className="mb-3 flex justify-center gap-6" aria-label="Legal">
          <Link to="/terms" className="text-[#241c15] hover:underline">Legal</Link>
          <Link to="/privacy" className="text-[#241c15] hover:underline">Privacy</Link>
          <Link to="/contact" className="text-[#241c15] hover:underline">Support</Link>
        </nav>
        <p>© {new Date().getFullYear()} Corelogic Systems. All rights reserved.</p>
      </footer>
    </main>
  );
}