import { NextResponse, type NextRequest } from "next/server";

/**
 * Fast redirect for signed-out visitors on private areas. This only checks that a session cookie
 * exists; the API verifies the token and enforces roles and ownership on every request.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has("dc_session")) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/account/:path*", "/provider/:path*", "/admin/:path*", "/listings/:slug/apply"],
};
