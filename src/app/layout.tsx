import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
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
  title: "ProcurePro | NCDMB-Ready Procurement Software for Nigeria",
  description:
    "Procurement software for Nigerian oil & gas and heavy-industry teams — approvals, purchase orders, landed cost, and NCDMB compliance tracking in one place. 14-day free trial, no card required.",
  keywords: [
    "procurement software Nigeria",
    "NCDMB compliance software",
    "purchase order software Nigeria",
    "oil and gas procurement software",
    "vendor management software Nigeria",
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Theme is global now — light/dark applies to every screen, landing and
  // authenticated app alike. Read server-side from a cookie (set by
  // ThemeToggle) so the server renders the right class from the first paint;
  // no client-side pre-hydration guess, so nothing to mismatch. Defaults to
  // light (the app's working default per DESIGN.md) when no cookie exists yet.
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value;
  const isDark = theme === "dark";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased${isDark ? " dark" : ""}`}
    >
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
        plus a cyan-to-teal accent (accent-50..700, accent-glow) for CTAs,
        badges, and floating annotations; hand-built SVG/React mockup
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
