import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // /api is excluded — every API route (webhooks included) enforces its own
    // auth (getCurrentProfile()/requireRole() or a signature check), and
    // webhook POSTs from Paystack/Flutterwave carry no session cookie, so
    // routing them through this session-based redirect would 302 them to
    // /login instead of ever reaching the handler.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
