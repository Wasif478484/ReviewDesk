'use client';

/**
 * LabelSlideButton + RollLabel, Originkit pattern (implemented locally
 * because the Originkit registry CLI requires an authenticated account).
 * The label rolls out to a stacked duplicate while the trailing icon
 * slides in. Composes with daisyUI button classes; the roll is pure CSS
 * on :hover and collapses to a static label under reduced motion.
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowRight } from "lucide-react";

export function RollLabel({ label, hoverLabel }: { label: ReactNode; hoverLabel?: ReactNode }) {
  return (
    <span className="ok-roll">
      <span className="ok-roll-stack" aria-hidden="true">
        <span className="ok-roll-line">{label}</span>
        <span className="ok-roll-line">{hoverLabel ?? label}</span>
      </span>
    </span>
  );
}

interface LabelSlideButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: ReactNode;
  hoverLabel?: ReactNode;
  withIcon?: boolean;
}

export default function LabelSlideButton({
  label,
  hoverLabel,
  withIcon = true,
  className = "",
  children,
  ...rest
}: LabelSlideButtonProps) {
  return (
    <button type="button" className={`ok-roll-host group ${className}`} {...rest}>
      <RollLabel label={label} hoverLabel={hoverLabel} />
      {withIcon && (
        <ArrowRight
          size={18}
          aria-hidden="true"
          className="-translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
        />
      )}
      {children}
    </button>
  );
}
