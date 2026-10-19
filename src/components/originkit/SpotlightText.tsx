'use client';

/**
 * SpotlightText, Originkit pattern (implemented locally because the
 * Originkit registry CLI requires an authenticated account).
 * Dim a block of text and sweep a soft cursor-following spotlight across
 * it to reveal the bright letters underneath on hover.
 * Degrades gracefully: reduced-motion users and touch devices get fully
 * readable static text, and the effect only tracks the pointer on
 * devices that report hover support.
 */

import { useEffect, useRef } from "react";

export default function SpotlightText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const hostRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover)").matches) return;

    host.setAttribute("data-ok-active", "true");
    const chars = Array.from(host.querySelectorAll<HTMLSpanElement>("[data-ok-char]"));
    const RADIUS = 150;
    const DIM = 0.42;
    let raf = 0;
    let mx = -9999;
    let my = -9999;

    const paint = () => {
      raf = 0;
      for (const el of chars) {
        const r = el.getBoundingClientRect();
        const dx = mx - (r.left + r.width / 2);
        const dy = my - (r.top + r.height / 2);
        const t = Math.max(0, 1 - Math.hypot(dx, dy) / RADIUS);
        el.style.opacity = String(DIM + (1 - DIM) * t);
      }
    };
    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      mx = -9999;
      my = -9999;
      if (!raf) raf = requestAnimationFrame(paint);
    };

    host.addEventListener("mousemove", onMove);
    host.addEventListener("mouseleave", onLeave);
    return () => {
      host.removeEventListener("mousemove", onMove);
      host.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
      host.removeAttribute("data-ok-active");
    };
  }, [text]);

  return (
    <span ref={hostRef} className={`ok-spotlight ${className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
      {text.split("").map((ch, i) => (
        <span key={i} data-ok-char aria-hidden="true" style={{ whiteSpace: ch === " " ? "pre" : undefined }}>
          {ch}
        </span>
      ))}
      </span>
    </span>
  );
}
