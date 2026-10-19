import { useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import "./DashboardAuthFlow.css";

export type AuthScreen = "sign-in" | "forgot-password" | "verify-otp" | "reset-password";
const authScreens: AuthScreen[] = ["sign-in", "forgot-password", "verify-otp", "reset-password"];

function getDashboardBasePath(pathname: string): string {
  const normalizedPath = pathname.replace(/\/+$/, "");
  const dashboardMarker = normalizedPath.lastIndexOf("/dashboard");
  return dashboardMarker >= 0 && /^\/dashboard(?:\/|$)/.test(normalizedPath.slice(dashboardMarker))
    ? normalizedPath.slice(0, dashboardMarker + "/dashboard".length)
    : "";
}

// eslint-disable-next-line react-refresh/only-export-components
export function getDashboardAuthPath(screen: AuthScreen): string {
  return `${getDashboardBasePath(window.location.pathname)}/auth/${screen}`;
}

// eslint-disable-next-line react-refresh/only-export-components
export function isDashboardAuthLocation(): boolean {
  if (typeof window === "undefined") return false;
  const pathnameScreen = window.location.pathname.replace(/\/+$/, "").split("/").pop();
  const queryScreen = new URLSearchParams(window.location.search).get("screen");
  return (
    authScreens.includes(pathnameScreen as AuthScreen) ||
    authScreens.includes(queryScreen as AuthScreen)
  );
}

function readAuthLocation(): { screen: AuthScreen; email: string } {
  if (typeof window === "undefined") return { screen: "sign-in", email: "" };
  const params = new URLSearchParams(window.location.search);
  const pathnameScreen = window.location.pathname.replace(/\/+$/, "").split("/").pop();
  const screen = authScreens.includes(pathnameScreen as AuthScreen)
    ? pathnameScreen
    : params.get("screen");
  return {
    screen: authScreens.includes(screen as AuthScreen) ? (screen as AuthScreen) : "sign-in",
    email: params.get("email") ?? "",
  };
}

export default function DashboardAuthFlow({
  initialScreen,
  initialEmail,
}: { initialScreen?: AuthScreen; initialEmail?: string } = {}) {
  const initialLocation = readAuthLocation();
  const [screen, setScreen] = useState(initialScreen ?? initialLocation.screen);
  const [email, setEmail] = useState(initialEmail ?? initialLocation.email);
  const [codeDigits, setCodeDigits] = useState<string[]>(() => Array.from({ length: 6 }, () => ""));
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [message, setMessage] = useState("");

  const navigate = (nextScreen: AuthScreen, nextEmail = email) => {
    const url = new URL(getDashboardAuthPath(nextScreen), window.location.origin);
    if (nextEmail) url.searchParams.set("email", nextEmail);
    else url.searchParams.delete("email");
    window.history.pushState({}, "", url);
    setScreen(nextScreen);
    setEmail(nextEmail);
    setCodeDigits(Array.from({ length: 6 }, () => ""));
    setMessage("");
  };

  useEffect(() => {
    const restoreLocation = () => {
      const location = readAuthLocation();
      setScreen(location.screen);
      setEmail(location.email);
      setCodeDigits(Array.from({ length: 6 }, () => ""));
      setMessage("");
    };
    window.addEventListener("popstate", restoreLocation);
    return () => window.removeEventListener("popstate", restoreLocation);
  }, []);

  const submitForgotPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextEmail = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    navigate("verify-otp", nextEmail);
  };

  const submitVerification = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (codeDigits.some((digit) => !digit)) return;
    navigate("reset-password");
  };

  const updateCodeDigits = (index: number, value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6 - index);
    if (!digits) {
      setCodeDigits((current) =>
        current.map((digit, currentIndex) => (currentIndex === index ? "" : digit)),
      );
      return;
    }
    setCodeDigits((current) => {
      const next = [...current];
      digits.split("").forEach((digit, offset) => {
        next[index + offset] = digit;
      });
      return next;
    });
    codeInputRefs.current[Math.min(index + digits.length, 5)]?.focus();
  };

  const submitNewPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmPassword") ?? "");
    if (password !== confirmation) {
      setMessage("The passwords do not match.");
      return;
    }
    setMessage(
      "Password reset is not connected yet. Contact your workspace administrator for access.",
    );
  };

  return (
    <main className="dashboard-sign-in-screen">
      <section className="dashboard-sign-in-card" aria-labelledby="dashboard-auth-title">
        <div className="dashboard-sign-in-brand">
          <img className="dashboard-sign-in-logo" src="/tarrlogic black.png" alt="Tarrlogic" />
        </div>
        <h1 id="dashboard-auth-title">
          {screen === "sign-in"
            ? "Let's get you signed in"
            : screen === "forgot-password"
              ? "Forgot your password?"
              : screen === "verify-otp"
                ? "Enter your verification code"
                : "Choose a new password"}
        </h1>
        {screen === "sign-in" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setMessage(
                "Sign-in is not connected yet. Contact your workspace administrator for access.",
              );
            }}
          >
            <label htmlFor="dashboard-sign-in-email">Work email</label>
            <input
              id="dashboard-sign-in-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@company.com"
            />
            <div className="dashboard-sign-in-password-label">
              <div className="dashboard-sign-in-label-row">
                <label htmlFor="dashboard-sign-in-password">Password</label>
                <button
                  type="button"
                  className="dashboard-sign-in-link"
                  onClick={() => navigate("forgot-password")}
                >
                  Forgot password?
                </button>
              </div>
            </div>
            <div className="dashboard-sign-in-password-field">
              <input
                id="dashboard-sign-in-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder="Enter your password"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? (
                  <EyeOff size={17} aria-hidden="true" />
                ) : (
                  <Eye size={17} aria-hidden="true" />
                )}
              </button>
            </div>
            <label className="dashboard-sign-in-remember">
              <input type="checkbox" name="remember" defaultChecked /> Remember me
            </label>
            <button type="submit" className="dashboard-sign-in-submit">
              <LockKeyhole size={17} aria-hidden="true" /> Sign in
            </button>
            <p className="dashboard-sign-in-terms">
              By selecting Sign in for your Tarrlogic account, you agree to our{" "}
              <a href="/terms">Terms</a>. Our <a href="/privacy">Privacy Policy</a> applies to your
              personal data.
            </p>
            <p className="dashboard-sign-in-create-account">
              New to Tarrlogic?{" "}
              <button type="button" onClick={() => setMessage("")}>
                Create an account
              </button>
            </p>
            <p className="dashboard-sign-in-message" aria-live="polite">
              {message}
            </p>
          </form>
        )}
        {screen === "forgot-password" && (
          <>
            <p className="dashboard-auth-description">
              Enter your work email to continue with a one-time verification code.
            </p>
            <form onSubmit={submitForgotPassword}>
              <input
                id="dashboard-recovery-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="name@company.com"
              />
              <button type="submit" className="dashboard-sign-in-submit">
                Continue
              </button>
            </form>
          </>
        )}
        {screen === "verify-otp" &&
          (email ? (
            <>
              <p className="dashboard-auth-description">
                Enter the six-digit verification code sent to your email.
              </p>
              <form onSubmit={submitVerification}>
                <div
                  className="dashboard-auth-code-inputs"
                  role="group"
                  aria-label="Six-digit verification code"
                >
                  {codeDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(input) => {
                        codeInputRefs.current[index] = input;
                      }}
                      id={`dashboard-recovery-code-${index + 1}`}
                      className="dashboard-auth-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      pattern="[0-9]"
                      maxLength={index === 0 ? 6 : 1}
                      required
                      value={digit}
                      aria-label={`Digit ${index + 1} of 6`}
                      onChange={(event) => updateCodeDigits(index, event.currentTarget.value)}
                      onPaste={(event) => {
                        event.preventDefault();
                        updateCodeDigits(index, event.clipboardData.getData("text"));
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Backspace" && !digit && index > 0)
                          codeInputRefs.current[index - 1]?.focus();
                        if (event.key === "ArrowLeft" && index > 0)
                          codeInputRefs.current[index - 1]?.focus();
                        if (event.key === "ArrowRight" && index < 5)
                          codeInputRefs.current[index + 1]?.focus();
                      }}
                    />
                  ))}
                </div>
                <button type="submit" className="dashboard-sign-in-submit">
                  Continue
                </button>
                <p className="dashboard-sign-in-message" aria-live="polite">
                  {message}
                </p>
              </form>
              <button
                type="button"
                className="dashboard-sign-in-link dashboard-auth-secondary"
                onClick={() =>
                  setMessage("OTP delivery is not connected; a new code cannot be sent yet.")
                }
              >
                Resend code
              </button>
              <button
                type="button"
                className="dashboard-sign-in-link dashboard-auth-back"
                onClick={() => navigate("forgot-password")}
              >
                Use a different email
              </button>
            </>
          ) : (
            <div className="dashboard-auth-empty">
              <p>Start with your work email to begin password recovery.</p>
              <button
                type="button"
                className="dashboard-sign-in-link"
                onClick={() => navigate("forgot-password")}
              >
                Enter your email
              </button>
            </div>
          ))}
        {screen === "reset-password" &&
          (email ? (
            <>
              <p className="dashboard-auth-description">Choose a new password for {email}.</p>
              <form onSubmit={submitNewPassword}>
                <label htmlFor="dashboard-new-password">New password</label>
                <div className="dashboard-sign-in-password-field">
                  <input
                    id="dashboard-new-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? (
                      <EyeOff size={17} aria-hidden="true" />
                    ) : (
                      <Eye size={17} aria-hidden="true" />
                    )}
                  </button>
                </div>
                <p className="dashboard-auth-hint">Use at least 8 characters.</p>
                <label htmlFor="dashboard-confirm-password">Confirm new password</label>
                <div className="dashboard-sign-in-password-field">
                  <input
                    id="dashboard-confirm-password"
                    name="confirmPassword"
                    type={showConfirmation ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    placeholder="Re-enter your password"
                  />
                  <button
                    type="button"
                    aria-label={
                      showConfirmation ? "Hide confirmation password" : "Show confirmation password"
                    }
                    onClick={() => setShowConfirmation((current) => !current)}
                  >
                    {showConfirmation ? (
                      <EyeOff size={17} aria-hidden="true" />
                    ) : (
                      <Eye size={17} aria-hidden="true" />
                    )}
                  </button>
                </div>
                <button type="submit" className="dashboard-sign-in-submit">
                  Reset password
                </button>
                <p className="dashboard-sign-in-message" aria-live="polite">
                  {message}
                </p>
              </form>
            </>
          ) : (
            <div className="dashboard-auth-empty">
              <p>Enter your email and verify an OTP before resetting your password.</p>
              <button
                type="button"
                className="dashboard-sign-in-link"
                onClick={() => navigate("forgot-password")}
              >
                Start password recovery
              </button>
            </div>
          ))}
      </section>
      <footer className="dashboard-sign-in-footer">
        © {new Date().getFullYear()} Tarrlogic Systems. All rights reserved.
      </footer>
    </main>
  );
}
