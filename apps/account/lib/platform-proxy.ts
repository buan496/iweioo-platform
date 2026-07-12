import "server-only";

import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isSameOriginMutation } from "@iweioo/auth-bff";
import { getAuthenticatedBffContext } from "@iweioo/auth-bff/next";
import { loadPlatformConfig } from "./platform-config";

const MAX_REQUEST_BYTES = 16 * 1024;
const MAX_RESPONSE_BYTES = 1024 * 1024;

function problem(code: string, title: string, status: number) {
  return NextResponse.json(
    {
      type: `https://iweioo.com/problems/${code}`,
      title,
      status,
      code
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/problem+json"
      }
    }
  );
}

export async function forwardPlatformRequest(
  request: NextRequest,
  path: string,
  method: "GET" | "PATCH" | "PUT"
) {
  try {
    const context = await getAuthenticatedBffContext(request);
    if (!context) {
      return problem("authentication_required", "Sign in is required", 401);
    }
    if (method !== "GET" && !isSameOriginMutation(request, context.config.appOrigin)) {
      return problem("csrf_rejected", "The account update was rejected", 403);
    }

    const headers = new Headers({
      Accept: "application/json",
      Authorization: `Bearer ${context.session.accessToken}`,
      "X-Request-ID": request.headers.get("x-request-id") ?? randomUUID()
    });
    let body: string | undefined;
    if (method !== "GET") {
      const contentType = request.headers.get("content-type") ?? "";
      const rawContentLength = request.headers.get("content-length");
      const contentLength = rawContentLength === null ? null : Number(rawContentLength);
      if (
        !contentType.startsWith("application/json") ||
        (contentLength !== null &&
          (!Number.isSafeInteger(contentLength) ||
            contentLength < 2 ||
            contentLength > MAX_REQUEST_BYTES))
      ) {
        return problem("invalid_request", "The account update body is invalid", 400);
      }
      body = await request.text();
      if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) {
        return problem("invalid_request", "The account update body is too large", 400);
      }
      headers.set("Content-Type", "application/json");
      const idempotencyKey = request.headers.get("idempotency-key");
      if (idempotencyKey) {
        headers.set("Idempotency-Key", idempotencyKey);
      }
    }

    const platform = loadPlatformConfig();
    const upstream = await fetch(new URL(path.replace(/^\//, ""), platform.baseUrl), {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5_000)
    });
    const payload = await upstream.arrayBuffer();
    if (payload.byteLength > MAX_RESPONSE_BYTES) {
      return problem("platform_response_too_large", "The account service returned too much data", 502);
    }
    const contentType = upstream.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (contentType !== "application/json" && contentType !== "application/problem+json") {
      return problem("invalid_platform_response", "The account service returned invalid data", 502);
    }
    const responseHeaders = new Headers({
      "Cache-Control": "no-store",
      "Content-Type": contentType
    });
    const requestId = upstream.headers.get("x-request-id");
    if (requestId) {
      responseHeaders.set("X-Request-ID", requestId);
    }
    return new NextResponse(payload, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    const name = error instanceof Error ? error.name : "unknown_error";
    console.error(`[account-platform-proxy] ${name}`);
    return problem("platform_unavailable", "The account service is temporarily unavailable", 503);
  }
}
