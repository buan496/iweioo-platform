import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/" || pathname.endsWith("/") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const target = request.nextUrl.clone();
  target.pathname = `${pathname}/`;
  return NextResponse.redirect(target, 308);
}

export const config = {
  matcher: ["/((?!api|auth|_next|.*\\..*).*)"]
};
