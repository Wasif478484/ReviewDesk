"use client";

/**
 * GlowCard: a card with a soft light that follows the pointer, and a scroll
 * reveal. It renders an <article> so it stays a direct child of a grid.
 * The glow is CSS (.rd-glow in globals.css); this only reports the pointer
 * position. Touch devices and keyboard users get the plain card.
 */
import { useRef, type PointerEvent, type ReactNode } from "react";
import { revealStyle, useReveal } from "./Reveal";

export default function GlowCard({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);

  function onMove(e: PointerEvent<HTMLElement>) {
    if (e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <article ref={ref} className={`rd-glow rd-reveal ${className}`} style={revealStyle(delay)} onPointerMove={onMove}>
      {children}
    </article>
  );
}
