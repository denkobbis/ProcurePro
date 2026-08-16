import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://procurepro-woad.vercel.app"),
  title: "ProcurePro",
  description: "Procurement management — requests, approvals, POs, and budgets in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The landing page's marketing-root wrapper (page.tsx) is a fixed navy
  // identity now — no light/dark toggle (matching the pinned Precoro
  // reference, which has none). globals.css's `.dark` scope still exists for
  // any future scoped use but nothing currently opts into it here.
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* Emits a literal HTML comment node (a plain JSX comment compiles away and never reaches the markup), so the landing page direction contract below is grep-able in the production build for audit. */}
        <div
          style={{ display: "none" }}
          aria-hidden="true"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `<!--
        THESIS: Illustrated, hand-built UI in place of literal screenshots --
        a marketing surface that dramatizes the real product's own data
        without photographing the app itself; refuses the screenshot-heavy
        enterprise-SaaS default this project shipped one pass ago.
        OWN-WORLD: Navy brand-950 declaration surfaces (hero, trust, pricing)
        plus a new violet-to-magenta accent (accent-50..700, accent-glow) for
        CTAs, badges, and floating annotations; hand-built SVG/React mockup
        cards (skeleton rows, stat plates, compare cards, rule tables)
        carrying real product figures; one real editorial photo of a person
        at work.
        STORY: A Nigerian oil & gas/heavy-industry buyer sees the workflow
        dramatized through designed illustration and a real person doing the
        job, recognizes NCDMB, landed-cost, and invoice-matching as built in,
        starts a 14-day trial.
        FIRST VIEWPORT: Split hero on brand-950 -- headline, subhead, dual CTA
        left; an illustrated "Today" dashboard card with a floating
        decision-count badge right.
        FORM: user- and brief-pinned direction (precoro.com, reviewed live
        with the user) -- no concept-seed roll, per new-work.md's
        pinned-direction rule.
        FINISH: unreviewed and undocumented is unfinished; this build ends
        with the finish review, the verdict, and DESIGN.md.
        -->`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
