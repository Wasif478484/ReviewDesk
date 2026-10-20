"use client";

/**
 * AuthView.tsx, sign in / create account / forgot password / reset password.
 * Built on daisyUI primitives: card, fieldset, input, button, alert.
 * Centered card over a masked dot grid. Reset mode receives the one-time
 * token from the email link (?reset=...). No dark panel, no decorative
 * motion, no glow effects.
 */

import { useState } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/shared/bits";
import SkewInText from "@/components/originkit/SkewInText";
import LabelSlideButton from "@/components/originkit/LabelSlideButton";

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
  const [info, setInfo] = useState<{ message: string; devLink?: string; devNote?: string } | null>(
    null,
  );
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
        setInfo({
          message: data.message ?? "Password updated. You can sign in with the new password now.",
        });
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
    <div className="flex min-h-screen flex-col bg-base-200">
      <div className="border-b border-base-300 bg-base-100">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center px-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2.5"
            aria-label="Back to landing page"
          >
            <LogoMark />
            <span className="rd-display text-lg">ReviewDesk</span>
          </button>
        </div>
      </div>

      <main className="relative flex flex-1 items-start justify-center overflow-hidden px-5 py-10 md:items-center">
        <div className="rd-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="rd-aurora" aria-hidden="true">
          <i />
        </div>
        <div className="relative w-full max-w-[440px]">
          <div className="card card-border rd-shadow-float bg-base-100 p-8">
            <span className="rd-chip-outline mb-5">ReviewDesk account</span>
            <h1 className="rd-display text-2xl">
              <SkewInText key={mode} text={headings[mode].title} />
            </h1>
            <p className="mb-6 mt-2 text-sm leading-relaxed text-[#6B7280]">{headings[mode].sub}</p>

            <form onSubmit={submit} className="space-y-4">
              {isSignup && (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend rd-kicker">Your name</legend>
                  <input
                    id="rd-name"
                    className="input w-full"
                    aria-label="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Imran"
                    autoComplete="name"
                    required
                  />
                </fieldset>
              )}
              {(mode === "login" || mode === "signup" || mode === "forgot") && (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend rd-kicker">Email</legend>
                  <input
                    id="rd-email"
                    type="email"
                    className="input w-full"
                    aria-label="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@business.com"
                    autoComplete="email"
                    required
                  />
                </fieldset>
              )}
              {(mode === "login" || mode === "signup" || mode === "reset") && (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend rd-kicker">
                    {mode === "reset" ? "New password" : "Password"}
                  </legend>
                  <input
                    id="rd-password"
                    type="password"
                    className="input w-full"
                    aria-label={mode === "reset" ? "New password" : "Password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "login" ? "Your password" : "At least 8 characters"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    minLength={mode === "login" ? undefined : 8}
                    required
                  />
                </fieldset>
              )}

              {error && (
                <div className="alert alert-error" role="alert">
                  <span className="text-sm">{error}</span>
                </div>
              )}
              {info && (
                <div className="alert alert-success" role="status">
                  <div className="min-w-0 text-sm">
                    <p>{info.message}</p>
                    {info.devLink && (
                      <p className="mt-2 break-all text-xs">
                        <a className="link underline" href={info.devLink}>
                          {info.devLink}
                        </a>
                      </p>
                    )}
                    {info.devNote && <p className="mt-1 text-xs opacity-80">{info.devNote}</p>}
                  </div>
                </div>
              )}

              <LabelSlideButton
                type="submit"
                disabled={busy}
                withIcon={!busy}
                className="btn btn-neutral btn-block min-h-[48px] text-base disabled:opacity-60"
                label={
                  busy ? (
                    <>
                      <span className="loading loading-spinner loading-sm" aria-hidden="true" /> One
                      moment
                    </>
                  ) : (
                    headings[mode].cta
                  )
                }
              />
            </form>

            <div className="mt-6 border-t border-base-300 pt-4 text-center">
              {mode === "login" && (
                <div className="flex flex-col gap-2 text-sm text-[#374151]">
                  <button
                    onClick={() => {
                      onSwitch("forgot");
                      setError("");
                      setInfo(null);
                    }}
                    className="link-hover link"
                  >
                    Forgot your password?
                  </button>
                  <button
                    onClick={() => {
                      onSwitch("signup");
                      setError("");
                      setInfo(null);
                    }}
                    className="link-hover link"
                  >
                    New here? Create your account
                  </button>
                </div>
              )}
              {mode === "signup" && (
                <button
                  onClick={() => {
                    onSwitch("login");
                    setError("");
                    setInfo(null);
                  }}
                  className="link-hover link text-sm text-[#374151]"
                >
                  Already have an account? Sign in
                </button>
              )}
              {(mode === "forgot" || mode === "reset") && (
                <button
                  onClick={() => {
                    onSwitch("login");
                    setError("");
                    setInfo(null);
                  }}
                  className="link-hover link text-sm text-[#374151]"
                >
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
            <Link href="/terms" className="link text-primary hover:underline">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="link text-primary hover:underline">
              privacy policy
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
