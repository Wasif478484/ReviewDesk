"use client";

/**
 * global-error.tsx, the last-resort boundary.
 *
 * Replaces the whole document when a root-level error escapes the route
 * boundary. It has to render its own html and body.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("global error:", error);
  return (
    <html lang="en" data-theme="reviewdesk">
      <body
        style={{
          margin: 0,
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
          background: "#ffffff",
          color: "#111827",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ maxWidth: 520, padding: 32, textAlign: "center" }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#6b7280",
              marginBottom: 12,
            }}
          >
            ReviewDesk
          </p>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
            The page could not load.
          </h1>
          <p style={{ fontSize: 15, color: "#374151", lineHeight: 1.6, marginBottom: 24 }}>
            Nothing was lost. Reload the page, and if it keeps failing, sign
            out and back in.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#111827",
              color: "#ffffff",
              border: 0,
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
