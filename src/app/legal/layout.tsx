import { cookies } from "next/headers";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { LogoMarkIcon } from "@/components/icons";

const LEGAL_NAV = [
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/refund", label: "Refund Policy" },
];

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const isDark = cookieStore.get("theme")?.value === "dark";

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <LogoMarkIcon className="h-6 w-6 text-brand-600 dark:text-brand-400" />
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">ProcurePro</span>
          </Link>
          <ThemeToggle initialIsDark={isDark} className="text-zinc-400 dark:text-zinc-500" />
        </div>
      </header>

      <nav className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-3xl gap-5 overflow-x-auto px-4 py-3 text-sm sm:px-6">
          {LEGAL_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">{children}</main>

      <footer className="border-t border-zinc-200 px-4 py-8 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500 sm:px-6">
        <Link href="/" className="hover:text-zinc-600 dark:hover:text-zinc-300">
          &larr; Back to ProcurePro
        </Link>
      </footer>
    </div>
  );
}
