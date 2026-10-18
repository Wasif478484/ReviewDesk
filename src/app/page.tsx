'use client';

/**
 * ReviewDesk, single-route application shell.
 * Views: landing → auth (login/signup/forgot/reset) → onboarding → dashboard.
 * Session state comes from the httpOnly cookie; /api/workspace decides where
 * a visitor lands. Email links land here with ?verify= / ?reset= query
 * params; the OAuth callback returns with ?google=connected|error.
 */

import { useEffect, useState } from "react";
import Landing from "@/components/landing/Landing";
import AuthView from "@/components/auth/AuthView";
import Onboarding from "@/components/onboarding/Onboarding";
import Dashboard from "@/components/dashboard/Dashboard";
import { LogoMark } from "@/components/shared/bits";
import type { WorkspaceData } from "@/types/reviewdesk";

type View = "loading" | "landing" | "auth" | "onboarding" | "dashboard" | "verify-result";

interface UrlIntent {
  resetToken?: string;
  verifyToken?: string;
  googleStatus?: string;
  googleMessage?: string;
}

function readUrlIntent(): UrlIntent {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const intent: UrlIntent = {};
  const reset = params.get("reset");
  const verify = params.get("verify");
  const google = params.get("google");
  const msg = params.get("msg");
  if (reset) intent.resetToken = reset;
  if (verify) intent.verifyToken = verify;
  if (google) intent.googleStatus = google;
  if (msg) intent.googleMessage = msg;
  // Clean the address bar so tokens don't linger in history.
  if (reset || verify || google || msg) {
    window.history.replaceState({}, "", window.location.pathname);
  }
  return intent;
}

export default function Home() {
  const [view, setView] = useState<View>("loading");
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot" | "reset">("signup");
  const [urlIntent, setUrlIntent] = useState<UrlIntent>({});
  const [resetToken, setResetToken] = useState("");
  const [verifyOutcome, setVerifyOutcome] = useState<{ ok: boolean; message: string } | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [userName, setUserName] = useState("");

  async function loadWorkspace(): Promise<{ status: number; data?: WorkspaceData }> {
    try {
      const res = await fetch("/api/workspace");
      if (res.status === 401) return { status: 401 };
      if (res.ok) {
        const data: WorkspaceData = await res.json();
        setWorkspace(data);
        setUserName(data.user.name);
        return { status: 200, data };
      }
      return { status: res.status };
    } catch {
      return { status: 0 };
    }
  }

  useEffect(() => {
    const intent = readUrlIntent();
    setUrlIntent(intent);
    if (intent.resetToken) {
      setResetToken(intent.resetToken);
      setAuthMode("reset");
      setView("auth");
      return;
    }
    if (intent.verifyToken) {
      setView("verify-result");
      (async () => {
        try {
          const res = await fetch("/api/auth/verify-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: intent.verifyToken }),
          });
          const data = await res.json();
          setVerifyOutcome(res.ok
            ? { ok: true, message: data.message ?? "Email verified." }
            : { ok: false, message: data.error ?? "Verification failed." });
        } catch {
          setVerifyOutcome({ ok: false, message: "Network error while verifying. Please try the link again." });
        }
      })();
      return;
    }
    (async () => {
      const { status, data } = await loadWorkspace();
      if (status === 200 && data) {
        setView(data.user.onboarded ? "dashboard" : "onboarding");
      } else {
        setView("landing");
      }
    })();
  }, []);

  if (view === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="rd-kicker mb-3">ReviewDesk</div>
          <p className="rd-mono">Opening the desk…</p>
        </div>
      </div>
    );
  }

  if (view === "verify-result") {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="rd-card w-full max-w-[440px] p-8 text-center">
          <div className="mb-6 flex items-center justify-center gap-2.5">
            <LogoMark size={26} />
            <span className="rd-display text-lg">ReviewDesk</span>
          </div>
          <h1 className="rd-display mb-2 text-2xl">
            {verifyOutcome === null ? "Checking your link…" : verifyOutcome.ok ? "Email verified" : "Link problem"}
          </h1>
          <p className="mb-6 text-sm text-[#6B7280]">
            {verifyOutcome === null ? "One moment." : verifyOutcome.message}
          </p>
          <button
            className="rd-btn-ink px-6 py-2.5 text-sm"
            disabled={verifyOutcome === null}
            onClick={async () => {
              const { status, data } = await loadWorkspace();
              setView(status === 200 && data ? (data.user.onboarded ? "dashboard" : "onboarding") : "landing");
            }}
          >
            Go to my desk
          </button>
        </div>
      </div>
    );
  }

  if (view === "landing") {
    return (
      <Landing
        onSignup={() => { setAuthMode("signup"); setView("auth"); }}
        onLogin={() => { setAuthMode("login"); setView("auth"); }}
        initialGoogleStatus={urlIntent.googleStatus}
        initialGoogleMessage={urlIntent.googleMessage}
      />
    );
  }

  if (view === "auth") {
    return (
      <AuthView
        mode={authMode}
        resetToken={resetToken}
        onSwitch={setAuthMode}
        onBack={() => setView("landing")}
        onDone={async () => {
          const { status, data } = await loadWorkspace();
          if (status === 200 && data) {
            setView(data.user.onboarded ? "dashboard" : "onboarding");
          } else {
            // Not signed in (e.g. after a password reset), stay on auth.
            setView("auth");
          }
        }}
      />
    );
  }

  if (view === "onboarding") {
    return (
      <Onboarding
        userName={userName}
        initialGoogleStatus={urlIntent.googleStatus}
        initialGoogleMessage={urlIntent.googleMessage}
        onDone={async () => {
          await loadWorkspace();
          setView("dashboard");
        }}
      />
    );
  }

  return (
    <Dashboard
      initial={workspace!}
      initialGoogleStatus={urlIntent.googleStatus}
      initialGoogleMessage={urlIntent.googleMessage}
      onSignOut={async () => {
        setWorkspace(null);
        setView("landing");
      }}
    />
  );
}
