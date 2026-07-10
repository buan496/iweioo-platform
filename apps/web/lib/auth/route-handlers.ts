import "server-only";

import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { AuthIntent } from "@/lib/auth/model";
import { loadAuthConfig, transactionCookieOptions } from "@/lib/auth/config";
import { beginAuthorization } from "@/lib/auth/oidc";
import { safeReturnPath } from "@/lib/auth/security";
import { createOidcTransaction } from "@/lib/auth/store";

function safeErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "unknown_error";
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
}
