import "server-only";

import { randomUUID } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";
import { NextRequest, NextResponse } from "next/server";
import {
  loadAuthConfig,
  sessionCookieOptions,
  transactionCookieOptions,
  type AuthConfig
} from "./config";
import { verifiedUserFromClaims, type AuthIntent, type BffSession } from "./model";
import {
  beginAuthorization,
  buildRemoteLogoutUrl,
  exchangeAuthorizationCode,
  refreshSessionTokens
} from "./oidc";
import { constantTimeEqual, isSameOriginPost, randomHandle, safeReturnPath } from "./security";
import {
  acquireSessionRefreshLock,
  createOidcTransaction,
  createBffSession,
  deleteBffSession,
  getBffSession,
  releaseSessionRefreshLock,
  replaceBffSession,
  takeOidcTransaction
} from "./store";

export type AuthenticatedBffContext = {
  config: AuthConfig;
  session: BffSession;
};

const ACCESS_TOKEN_REFRESH_WINDOW_MS = 30_000;

function safeErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "unknown_error";
}

function problem(type: string, title: string, status: number, reference?: string) {
  return NextResponse.json(
    {
      type: `https://iweioo.com/problems/${type}`,
      title,
      status,
      ...(reference ? { reference } : {})
    },
    {
      status,
      headers: { "Cache-Control": "no-store", "Content-Type": "application/problem+json" }
    }
  );
}

function expireCookie(response: NextResponse, name: string, secure: boolean): void {
  response.cookies.set(name, "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

function localLogoutResponse(origin: string, cookieName: string, secure: boolean, target?: URL) {
  const response = NextResponse.redirect(target ?? new URL("/", origin), 303);
  expireCookie(response, cookieName, secure);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function handleAuthorizationStart(request: NextRequest, intent: AuthIntent) {
  const reference = randomUUID();
  try {
    const config = loadAuthConfig();
    const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "zh";
    const returnTo = safeReturnPath(
      request.nextUrl.searchParams.get("return_to"),
      `/${locale}/`
    );
    const authorization = await beginAuthorization(config, intent, returnTo, locale);
    await createOidcTransaction(
      config,
      authorization.transactionHandle,
      authorization.transaction
    );

    const response = NextResponse.redirect(authorization.authorizationUrl, 302);
    response.cookies.set(
      config.transactionCookieName,
      authorization.transactionHandle,
      transactionCookieOptions(config)
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error(`[auth-start:${reference}] ${safeErrorName(error)}`);
    return problem(
      "authentication-unavailable",
      "Authentication is temporarily unavailable",
      503,
      reference
    );
  }
}

export async function handleAuthorizationCallback(request: NextRequest) {
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
    const session: BffSession = {
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
      await deleteBffSession(config, previousSessionHandle);
    }
    await createBffSession(config, sessionHandle, session, sessionTtlSeconds);

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
    console.error(`[auth-callback:${reference}] ${safeErrorName(error)}`);
    let config: AuthConfig;
    try {
      config = loadAuthConfig();
    } catch {
      return problem(
        "authentication-unavailable",
        "Authentication is temporarily unavailable",
        503,
        reference
      );
    }
    const target = new URL("/auth/error", config.appOrigin);
    target.searchParams.set("reference", reference);
    const response = NextResponse.redirect(target, 303);
    expireCookie(response, transactionCookieName, secureCookies);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}

export async function handleSessionGet(request: NextRequest) {
  const responseHeaders = {
    "Cache-Control": "no-store, max-age=0",
    Vary: "Cookie"
  };

  try {
    const config = loadAuthConfig();
    const handle = request.cookies.get(config.sessionCookieName)?.value;
    if (!handle) {
      return NextResponse.json({ authenticated: false }, { headers: responseHeaders });
    }

    const session = await getBffSession(config, handle);
    if (!session || Date.parse(session.expiresAt) <= Date.now()) {
      const response = NextResponse.json({ authenticated: false }, { headers: responseHeaders });
      expireCookie(response, config.sessionCookieName, config.secureCookies);
      return response;
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: session.user,
        csrfToken: session.csrfToken,
        expiresAt: session.expiresAt
      },
      { headers: responseHeaders }
    );
  } catch {
    return NextResponse.json(
      {
        type: "https://iweioo.com/problems/session-unavailable",
        title: "Session service is temporarily unavailable",
        status: 503
      },
      {
        status: 503,
        headers: { ...responseHeaders, "Content-Type": "application/problem+json" }
      }
    );
  }
}

export async function getAuthenticatedBffContext(
  request: NextRequest
): Promise<AuthenticatedBffContext | null> {
  const config = loadAuthConfig();
  const handle = request.cookies.get(config.sessionCookieName)?.value;
  if (!handle) {
    return null;
  }

  let session = await getBffSession(config, handle);
  if (!session || Date.parse(session.expiresAt) <= Date.now()) {
    return null;
  }
  if (Date.parse(session.accessTokenExpiresAt) > Date.now() + ACCESS_TOKEN_REFRESH_WINDOW_MS) {
    return { config, session };
  }

  const lockOwner = randomHandle();
  if (await acquireSessionRefreshLock(config, handle, lockOwner)) {
    try {
      const latest = await getBffSession(config, handle);
      if (!latest || Date.parse(latest.expiresAt) <= Date.now()) {
        return null;
      }
      session =
        Date.parse(latest.accessTokenExpiresAt) > Date.now() + ACCESS_TOKEN_REFRESH_WINDOW_MS
          ? latest
          : await refreshSessionTokens(config, latest);
      if (!(await replaceBffSession(config, handle, session))) {
        return null;
      }
      return { config, session };
    } finally {
      await releaseSessionRefreshLock(config, handle, lockOwner);
    }
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await wait(80);
    const refreshed = await getBffSession(config, handle);
    if (!refreshed || Date.parse(refreshed.expiresAt) <= Date.now()) {
      return null;
    }
    if (Date.parse(refreshed.accessTokenExpiresAt) > Date.now() + ACCESS_TOKEN_REFRESH_WINDOW_MS) {
      return { config, session: refreshed };
    }
    session = refreshed;
  }

  if (Date.parse(session.accessTokenExpiresAt) > Date.now()) {
    return { config, session };
  }
  throw new Error("Access token refresh did not complete before expiry");
}

export async function handleLogoutPost(request: NextRequest) {
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

  let session: BffSession | null;
  try {
    session = await getBffSession(config, handle);
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
    await deleteBffSession(config, handle);
  } catch {
    return problem("session-unavailable", "Session service is temporarily unavailable", 503);
  }

  let remoteLogoutUrl: URL | undefined;
  try {
    remoteLogoutUrl = await buildRemoteLogoutUrl(config, session.idToken, session.refreshToken);
  } catch (error) {
    console.error(`[auth-logout] identity-provider logout unavailable: ${safeErrorName(error)}`);
  }

  return localLogoutResponse(
    config.appOrigin,
    config.sessionCookieName,
    config.secureCookies,
    remoteLogoutUrl
  );
}
