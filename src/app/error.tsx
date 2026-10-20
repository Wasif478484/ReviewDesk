"use client";

/**
 * error.tsx, the route-level error boundary.
 *
 * A failure in one panel must not blank the whole desk. The message stays
 * plain on purpose: no stack trace, no internals, just what happened and
 * what to do next.
 */

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The detail goes to the console for the owner, never to the screen.
    console.error("panel error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-[560px] px-6 py-20 text-center">
      <p className="rd-kicker mb-3">Something did not load</p>
      <h2 className="rd-display mb-3 text-xl">This panel hit an error.</h2>
      <p className="mb-6 text-sm leading-relaxed text-[#374151]">
        The rest of the desk still works. Try this panel again, and if it keeps
        failing, reload the page. Nothing was lost.
      </p>
      <button className="btn btn-neutral" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
