"use client";

/**
 * CountUp: animates a whole number (optionally with a % sign) from its previous
 * value to the new one when it scrolls into view. Anything else renders as is.
 * The final value is in the server HTML, so the number is correct without JS.
 */
import { useEffect, useRef } from "react";

const PATTERN = /^(\d+)(%?)$/;

export default function CountUp({
  value,
  duration = 1100,
  className = "",
}: {
  value: string | number;
  duration?: number;
  className?: string;
}) {
  const text = String(value);
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);

  useEffect(() => {
    const el = ref.current;
    const match = PATTERN.exec(text);
    if (!el || !match) return;
    const target = Number(match[1]);
    const suffix = match[2];

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      shown.current = target;
      return;
    }

    let frame = 0;
    const run = () => {
      const from = shown.current;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const current = Math.round(from + (target - from) * eased);
        shown.current = current;
        el.textContent = `${current}${suffix}`;
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    if (shown.current !== 0) {
      run();
      return () => cancelAnimationFrame(frame);
    }
    el.textContent = `0${suffix}`;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [text, duration]);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
