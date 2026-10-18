'use client';

/**
 * AuthView.tsx, sign in / create account / forgot password / reset password.
 * Centered card over a masked dot grid. Reset mode receives the one-time
 * token from the email link (?reset=...). No dark panel, no decorative
 * motion, no glow effects.
 */

import { useState } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/shared/bits";

export type AuthMode = "login" | "signup" | "forgot" | "reset";

interface AuthViewProps {
  mode: AuthMode;
  resetToken?: string;
  onSwitch: (mode: AuthMode) => void;
  onBack: () => void;
  onDone: () => void;
}

export default function AuthView({ mode, resetToken, onSwitch, onBack, onDone }: AuthViewProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState<{ message: string; devLink?: string; devNote?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "forgot") {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Something went wrong. Please try again.");
          return;
        }
        setInfo({
          message: data.message ?? "Check your inbox for the reset link.",
          devLink: data.devLink,
          devNote: data.devNote,
        });
        return;
      }
      if (mode === "reset") {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: resetToken, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "The reset link could not be used.");
          return;
        }
        setInfo({ message: data.message ?? "Password updated. You can sign in with the new password now." });
        setTimeout(() => onSwitch("login"), 1600);
        return;
      }
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "signup" ? { name, email, password } : { email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      if (data.devLink) {
        setInfo({
          message: "Account created. One more step: verify your email.",
          devLink: data.devLink,
          devNote: data.devNote,
        });
        // Still continue to the desk; the banner inside reminds to verify.
        setTimeout(onDone, 2500);
        return;
      }
      onDone();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const headings: Record<AuthMode, { title: string; sub: string; cta: string }> = {
    signup: {
      title: "Create your account",
      sub: "One account, one workspace. You will add business details and your Google connection next.",
      cta: "Create account",
    },
    login: {
      title: "Sign in",
      sub: "Sign in to your desk. Your inbox and ledger are waiting.",
      cta: "Sign in",
    },
    forgot: {
      title: "Reset your password",
      sub: "Enter the email on the account and we will send a one-time reset link, valid for 60 minutes.",
      cta: "Send reset link",
    },
    reset: {
      title: "Choose a new password",
      sub: "This link is single-use. Pick a new password of at least 8 characters.",
      cta: "Update password",
    },
  };

  const isSignup = mode === "signup";

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F7F9]">
      <div className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center px-6">
          <button onClick={onBack} className="flex items-center gap-2.5">
            <LogoMark />
            <span className="rd-display text-lg">ReviewDesk</span>
          </button>
        </div>
      </div>

      <main className="relative flex flex-1 items-start justify-center overflow-hidden px-5 py-10 md:items-center">
        <div className="rd-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative w-full max-w-[440px]">
          <div className="rd-card rd-shadow-float p-8">
            <span className="rd-chip-outline mb-5">ReviewDesk account</span>
            <h1 className="rd-display text-2xl">{headings[mode].title}</h1>
            <p className="mb-6 mt-2 text-sm leading-relaxed text-[#6B7280]">{headings[mode].sub}</p>

            <form onSubmit={submit} className="space-y-4">
              {isSignup && (
                <div>
                  <label htmlFor="rd-name" className="rd-kicker mb-1.5 block">Your name</label>
                  <input
                    id="rd-name"
                    className="rd-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Imran"
                    autoComplete="name"
                    required
                  />
                </div>
              )}
              {(mode === "login" || mode === "signup" || mode === "forgot") && (
                <div>
                  <label htmlFor="rd-email" className="rd-kicker mb-1.5 block">Email</label>
                  <input
                    id="rd-email"
                    type="email"
                    className="rd-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@business.com"
                    autoComplete="email"
                    required
                  />
                </div>
              )}
              {(mode === "login" || mode === "signup" || mode === "reset") && (
                <div>
                  <label htmlFor="rd-password" className="rd-kicker mb-1.5 block">
                    {mode === "reset" ? "New password" : "Password"}
                  </label>
                  <input
                    id="rd-password"
                    type="password"
                    className="rd-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "login" ? "Your password" : "At least 8 characters"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    minLength={mode === "login" ? undefined : 8}
                    required
                  />
                </div>
              )}

              {error && (
                <p className="rounded-lg p-3 text-sm" style={{ background: "#FEF2F2", border: "1px solid #DC2626", color: "#B91C1C" }} role="alert">
                  {error}
                </p>
              )}
              {info && (
                <div className="rounded-lg p-3 text-sm" style={{ background: "#ECFDF3", border: "1px solid #15803D", color: "#166534" }} role="status">
                  <p>{info.message}</p>
                  {info.devLink && (
                    <p className="mt-2 break-all text-xs">
                      <a className="underline" href={info.devLink}>{info.devLink}</a>
                    </p>
                  )}
                  {info.devNote && <p className="mt-1 text-xs opacity-80">{info.devNote}</p>}
                </div>
              )}

              <button type="submit" disabled={busy} className="rd-btn-ink w-full px-6 py-3 text-base min-h-[48px] disabled:opacity-60">
                {busy ? "One moment…" : headings[mode].cta}
              </button>
            </form>

            <div className="mt-6 border-t border-[#E5E7EB] pt-4 text-center">
              {mode === "login" && (
                <div className="flex flex-col gap-2 text-sm text-[#374151]">
                  <button onClick={() => { onSwitch("forgot"); setError(""); setInfo(null); }} className="hover:text-[#1D4ED8]">
                    Forgot your password?
                  </button>
                  <button onClick={() => { onSwitch("signup"); setError(""); setInfo(null); }} className="hover:text-[#1D4ED8]">
                    New here? Create your account
                  </button>
                </div>
              )}
              {mode === "signup" && (
                <button onClick={() => { onSwitch("login"); setError(""); setInfo(null); }} className="text-sm text-[#374151] hover:text-[#1D4ED8]">
                  Already have an account? Sign in
                </button>
              )}
              {(mode === "forgot" || mode === "reset") && (
                <button onClick={() => { onSwitch("login"); setError(""); setInfo(null); }} className="text-sm text-[#374151] hover:text-[#1D4ED8]">
                  Back to sign in
                </button>
              )}
            </div>
          </div>

          <p className="rd-mono mt-4 text-center">
            Your workspace starts with a demo inbox of 15 sample reviews.
          </p>
          <p className="mt-2 text-center text-xs text-[#6B7280]">
            By creating an account you agree to the{" "}
            <Link href="/terms" className="text-[#1D4ED8] hover:underline">terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="text-[#1D4ED8] hover:underline">privacy policy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
