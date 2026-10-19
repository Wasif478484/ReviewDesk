"use client";

/**
 * Scroll reveal: content fades and lifts in as it enters the viewport.
 *
 * Content renders fully visible on the server. After mount, only blocks that
 * start below the fold are hidden and then revealed, so there is no flash for
 * content already on screen and nothing stays hidden if JavaScript fails.
 * Reduced-motion users see everything immediately.
 *
 * Use <Reveal> for a plain block, or useReveal(ref) on an element that must
 * stay a direct grid or flex child (see GlowCard).
 */
import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";

export function useReveal(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      return;
    }
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    el.dataset.rv = "hidden";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.rv = "shown";
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

export function revealStyle(delay: number): CSSProperties | undefined {
  return delay ? ({ "--rv-delay": `${delay}ms` } as CSSProperties) : undefined;
}

export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  /** Stagger in milliseconds, for siblings revealed together. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref);
  return (
    <div ref={ref} className={`rd-reveal ${className}`} style={revealStyle(delay)}>
      {children}
    </div>
  );
}
