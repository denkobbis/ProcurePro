import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Nothing behind auth is worth a crawl budget, and it would 307 to
        // /login anyway (see src/lib/supabase/middleware.ts).
        disallow: ["/dashboard", "/requests", "/approvals", "/purchase-orders", "/vendors", "/reports", "/budgets", "/rfqs", "/equipment", "/billing", "/users", "/approval-rules", "/notifications"],
      },
    ],
    sitemap: "https://procurepro-woad.vercel.app/sitemap.xml",
  };
}
