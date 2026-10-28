import { NextResponse, type NextRequest } from "next/server";
import { sessionSecret, userIdFromCookieHeader } from "./auth/session";

// Checks the cookie signature only; pages and routes still look the user up (defence in depth).
export async function middleware(req: NextRequest) {
  const userId = await userIdFromCookieHeader(req.headers.get("cookie"), sessionSecret());
  if (userId) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.redirect(new URL("/auth/signin", req.url));
}

export const config = {
  // everything except the sign-in page, the session route and Next's static assets
  matcher: ["/((?!auth/signin|auth/session|_next/|favicon\\.ico).*)"],
};
