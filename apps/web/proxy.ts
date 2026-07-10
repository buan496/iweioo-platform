import { NextRequest, NextResponse } from "next/server";
import { canonicalPublicPath } from "@/lib/public-route";

export function proxy(request: NextRequest) {
  const canonicalPath = canonicalPublicPath(request.nextUrl.pathname);
  if (!canonicalPath) {
    return NextResponse.next();
  }

  const target = request.nextUrl.clone();
  target.pathname = canonicalPath;
  return NextResponse.redirect(target, 308);
}

export const config = {
  matcher: ["/((?!api|auth|_next|.*\\..*).*)"]
};
