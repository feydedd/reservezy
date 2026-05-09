import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { resolveHost } from "@/lib/tenancy/host";

const ROOT_DOMAIN_FALLBACK = "localhost:3000";

function applySubdomainRewrite(
  request: NextRequest,
): NextResponse | null {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/tenant/") ||
    pathname.startsWith("/platform-admin") ||
    pathname.startsWith("/api")
  ) {
    return null;
  }

  const hostHeader =
    request.headers.get("host") ??
    request.headers.get("x-forwarded-host") ??
    "";

  const rootDomainRaw =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? ROOT_DOMAIN_FALLBACK;
  const resolved = resolveHost(hostHeader, rootDomainRaw);

  if (resolved.kind === "apex") {
    return null;
  }

  const url = request.nextUrl.clone();

  if (resolved.kind === "admin") {
    url.pathname =
      pathname === "/" ? "/platform-admin" : `/platform-admin${pathname}`;
    return NextResponse.rewrite(url);
  }

  url.pathname =
    pathname === "/"
      ? `/tenant/${resolved.subdomain}`
      : `/tenant/${resolved.subdomain}${pathname}`;

  return NextResponse.rewrite(url);
}

export async function middleware(request: NextRequest) {
  const rewrite = applySubdomainRewrite(request);
  if (rewrite) {
    return rewrite;
  }

  const { pathname } = request.nextUrl;
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret,
  });

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding")) {
    if (!token?.sub || !token.role) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }

    if (token.role === "SUPER_ADMIN") {
      const url = request.nextUrl.clone();
      url.pathname = "/platform-admin";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/onboarding") && token.role === "STAFF") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/platform-admin")) {
    if (token?.role !== "SUPER_ADMIN") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set(
        "callbackUrl",
        `${pathname}${request.nextUrl.search}`,
      );
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)",
  ],
};
