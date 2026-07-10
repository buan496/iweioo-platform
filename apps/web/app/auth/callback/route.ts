import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { loadAuthConfig, sessionCookieOptions } from "@/lib/auth/config";
import { verifiedUserFromClaims, type PortalSession } from "@/lib/auth/model";
import { exchangeAuthorizationCode } from "@/lib/auth/oidc";
import { randomHandle, safeReturnPath } from "@/lib/auth/security";
import {
  createPortalSession,
  deletePortalSession,
  takeOidcTransaction
} from "@/lib/auth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function expireCookie(response: NextResponse, name: string, secure: boolean): void {
  response.cookies.set(name, "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

function errorRedirect(appOrigin: string, reference: string): NextResponse {
  const target = new URL("/auth/error", appOrigin);
  target.searchParams.set("reference", reference);
  return NextResponse.redirect(target, 303);
}

export async function GET(request: NextRequest) {
  const reference = randomUUID();
  let transactionCookieName = "iweioo_oidc_tx";
  let secureCookies = false;

  try {
    const config = loadAuthConfig();
    transactionCookieName = config.transactionCookieName;
    secureCookies = config.secureCookies;
    const transactionHandle = request.cookies.get(config.transactionCookieName)?.value;
    if (!transactionHandle) {
      throw new Error("Missing OIDC transaction cookie");
    }

    const transaction = await takeOidcTransaction(config, transactionHandle);
    if (!transaction) {
      throw new Error("OIDC transaction is missing, expired, or already used");
    }

    const tokens = await exchangeAuthorizationCode(config, request.nextUrl, transaction);
    const claims = tokens.claims();
    if (!claims) {
      throw new Error("OIDC response did not contain ID token claims");
    }
    if (!tokens.refresh_token || !tokens.id_token) {
      throw new Error("OIDC response did not contain refresh and ID tokens");
    }

    const now = Date.now();
    const expiresIn = tokens.expiresIn() ?? 300;
    const refreshExpiresIn = tokens.refresh_expires_in;
    if (
      refreshExpiresIn !== undefined &&
      (typeof refreshExpiresIn !== "number" ||
        !Number.isSafeInteger(refreshExpiresIn) ||
        refreshExpiresIn < 60)
    ) {
      throw new Error("OIDC refresh token lifetime is invalid or already expired");
    }
    const sessionTtlSeconds =
      typeof refreshExpiresIn === "number"
        ? Math.min(config.sessionTtlSeconds, refreshExpiresIn)
        : config.sessionTtlSeconds;
    const session: PortalSession = {
      user: verifiedUserFromClaims(claims as Record<string, unknown>),
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
      accessTokenExpiresAt: new Date(now + expiresIn * 1000).toISOString(),
      csrfToken: randomHandle(),
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + sessionTtlSeconds * 1000).toISOString()
    };
    const sessionHandle = randomHandle();

    const previousSessionHandle = request.cookies.get(config.sessionCookieName)?.value;
    if (previousSessionHandle) {
      await deletePortalSession(config, previousSessionHandle);
    }
    await createPortalSession(config, sessionHandle, session, sessionTtlSeconds);

    const response = NextResponse.redirect(
      new URL(safeReturnPath(transaction.returnTo), config.appOrigin),
      303
    );
    expireCookie(response, config.transactionCookieName, config.secureCookies);
    response.cookies.set(
      config.sessionCookieName,
      sessionHandle,
      sessionCookieOptions(config, sessionTtlSeconds)
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    const name = error instanceof Error ? error.name : "unknown_error";
    console.error(`[auth-callback:${reference}] ${name}`);
    let appOrigin: string;
    try {
      appOrigin = loadAuthConfig().appOrigin;
    } catch {
      return NextResponse.json(
        {
          type: "https://iweioo.com/problems/authentication-unavailable",
          title: "Authentication is temporarily unavailable",
          status: 503,
          reference
        },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store",
            "Content-Type": "application/problem+json"
          }
        }
      );
    }
    const response = errorRedirect(appOrigin, reference);
    expireCookie(response, transactionCookieName, secureCookies);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
