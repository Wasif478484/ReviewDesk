import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "ReviewDesk | Google review triage and reply drafts",
  description:
    "Sort Google Business reviews into lanes, draft replies in the reviewer's language, and approve every reply before it is recorded or posted. Includes a demo inbox with 15 sample reviews.",
  keywords: ["ReviewDesk", "Google reviews", "review replies", "small business"],
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%231D4ED8'/%3E%3Cpath d='M9 17l5 5 9-12' stroke='%23FFFFFF' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = {
  themeColor: "#111827",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="reviewdesk">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Offline-safe: CSS font stacks fall back to Inter/system-ui and
            Cascadia/Consolas when these are unreachable. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router: this root layout serves every route */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
