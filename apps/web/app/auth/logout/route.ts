import { NextRequest, NextResponse } from "next/server";
import { loadAuthConfig, type AuthConfig } from "@/lib/auth/config";
import { buildRemoteLogoutUrl } from "@/lib/auth/oidc";
import type { PortalSession } from "@/lib/auth/model";
import { constantTimeEqual, isSameOriginPost } from "@/lib/auth/security";
import { deletePortalSession, getPortalSession } from "@/lib/auth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function problem(type: string, title: string, status: number) {
  return NextResponse.json(
    { type: `https://iweioo.com/problems/${type}`, title, status },
    {
      status,
      headers: { "Cache-Control": "no-store", "Content-Type": "application/problem+json" }
    }
  );
}

function localLogoutResponse(origin: string, cookieName: string, secure: boolean, target?: URL) {
  const response = NextResponse.redirect(target ?? new URL("/", origin), 303);
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest) {
  let config: AuthConfig;
  try {
    config = loadAuthConfig();
  } catch {
    return problem(
      "authentication-unavailable",
      "Authentication is temporarily unavailable",
      503
    );
  }

  if (!isSameOriginPost(request, config.appOrigin)) {
    return problem("csrf-rejected", "The logout request was rejected", 403);
  }

  const handle = request.cookies.get(config.sessionCookieName)?.value;
  if (!handle) {
    return localLogoutResponse(config.appOrigin, config.sessionCookieName, config.secureCookies);
  }

  let session: PortalSession | null;
  try {
    session = await getPortalSession(config, handle);
  } catch {
    return problem("session-unavailable", "Session service is temporarily unavailable", 503);
  }
  if (!session) {
    return localLogoutResponse(config.appOrigin, config.sessionCookieName, config.secureCookies);
  }

  const contentLength = Number(request.headers.get("content-length"));
  const contentType = request.headers.get("content-type") ?? "";
  if (
    !Number.isSafeInteger(contentLength) ||
    contentLength < 1 ||
    contentLength > 4096 ||
    !contentType.startsWith("application/x-www-form-urlencoded")
  ) {
    return problem("invalid-logout-request", "Invalid logout request", 400);
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > 4096) {
    return problem("invalid-logout-request", "Invalid logout request", 400);
  }
  const csrfToken = new URLSearchParams(rawBody).get("csrf_token");
  if (!csrfToken || !constantTimeEqual(csrfToken, session.csrfToken)) {
    return problem("csrf-rejected", "The logout request was rejected", 403);
  }

  try {
    await deletePortalSession(config, handle);
  } catch {
    return problem("session-unavailable", "Session service is temporarily unavailable", 503);
  }

  let remoteLogoutUrl: URL | undefined;
  try {
    remoteLogoutUrl = await buildRemoteLogoutUrl(config, session.idToken, session.refreshToken);
  } catch (error) {
    const name = error instanceof Error ? error.name : "unknown_error";
    console.error(`[auth-logout] identity-provider logout unavailable: ${name}`);
  }

  return localLogoutResponse(
    config.appOrigin,
    config.sessionCookieName,
    config.secureCookies,
    remoteLogoutUrl
  );
}
