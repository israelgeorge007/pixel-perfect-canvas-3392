import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function AuthPageFrame({ children }: { children: ReactNode }) {
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
          {children}
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