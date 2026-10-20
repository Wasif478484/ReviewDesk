"use client";

/**
 * SkewInText, Originkit pattern (implemented locally because the
 * Originkit registry CLI requires an authenticated account).
 * The text slides and untwists into place with a small skew, offset and
 * fade, one word after another. It plays once on mount; it is never
 * scroll-triggered and it collapses to plain text under
 * prefers-reduced-motion.
 */

import type { CSSProperties } from "react";

export default function SkewInText({
  text,
  className = "",
  startDelay = 0,
}: {
  text: string;
  className?: string;
  startDelay?: number;
}) {
  const words = text.split(" ");
  return (
    <span className={`ok-skewin ${className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <span key={i}>
            <span
              className="ok-skewin-word"
              style={{ animationDelay: `${startDelay + i * 70}ms` } as CSSProperties}
              aria-hidden="true"
            >
              {w}
            </span>
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </span>
    </span>
  );
}
