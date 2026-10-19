/**
 * LegalShell.tsx: shared layout for the /privacy and /terms static pages.
 * Plain document styling: white card on a light background, readable measure.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/shared/bits";

export default function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-base-200">
      <div className="border-b border-base-300 bg-base-100">
        <div className="mx-auto flex h-16 max-w-[800px] items-center px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark />
            <span className="rd-display text-lg">ReviewDesk</span>
          </Link>
        </div>
      </div>

      <main className="flex-1 px-5 py-10">
        <div className="card card-border rd-shadow-float bg-base-100 mx-auto max-w-[800px] p-6 md:p-10">
          <p className="rd-eyebrow-num mb-3">Legal</p>
          <h1 className="rd-display text-2xl">{title}</h1>
          <p className="rd-mono mt-1.5">Last updated: {updated}</p>
          <div className="mt-8 space-y-8">{children}</div>
          <div className="mt-10 border-t border-base-300 pt-5">
            <Link href="/" className="link text-sm font-semibold text-primary hover:underline">
              Back to ReviewDesk
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-base-300 bg-base-100 py-6">
        <div className="mx-auto max-w-[800px] px-5">
          <p className="rd-mono">
            Questions about this document? Contact the administrator who operates this ReviewDesk deployment.
          </p>
        </div>
      </footer>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="rd-display mb-2 text-base">{heading}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-[#374151]">{children}</div>
    </section>
  );
}

export function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#9CA3AF]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
