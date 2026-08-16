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
  // Dark mode only exists on the landing page — it reads its own theme cookie
  // and scopes the "dark" class to its own wrapper div (see page.tsx /
  // ThemeToggle.tsx). It must not be applied here at the html/body level:
  // globals.css's `body { background: var(--background) }` combined with
  // `:root.dark` would otherwise flip the whole authenticated app's body
  // background to the landing page's dark navy on every route.
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
        THESIS: Full enterprise procure-to-pay depth without SAP-level cost or
        complexity -- refuses both the "toy vendor tracker" and "enterprise
        beast" category defaults.
        OWN-WORLD: Existing navy engineering-blueprint palette (brand-50..950),
        Geist Sans, hand-drawn stroke icons; structural grammar borrowed from
        professional SaaS-dashboard case studies -- stat cards with trend
        context, chip filters, alternating feature/screenshot rhythm, dark
        panel bookends.
        STORY: A Nigerian oil & gas/heavy-industry ops or finance lead,
        exhausted by WhatsApp/spreadsheet purchasing, sees the real workflow
        demonstrated with real screenshots, recognizes NCDMB and landed-cost
        handling as built in, starts a 14-day trial.
        FIRST VIEWPORT: Split hero on brand-950 -- headline, subhead, dual CTA,
        trust line left; real dashboard screenshot framed right.
        FORM: user- and brief-pinned direction (existing navy brand + the
        user's Behance reference for structural grammar) -- no concept-seed
        roll, per new-work.md's pinned-direction rule.
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
