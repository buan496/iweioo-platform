import { NextRequest, NextResponse } from "next/server";
import { loadAuthConfig } from "@/lib/auth/config";
import { getPortalSession } from "@/lib/auth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  Vary: "Cookie"
};

export async function GET(request: NextRequest) {
  try {
    const config = loadAuthConfig();
    const handle = request.cookies.get(config.sessionCookieName)?.value;
    if (!handle) {
      return NextResponse.json({ authenticated: false }, { headers: responseHeaders });
    }

    const session = await getPortalSession(config, handle);
    if (!session || Date.parse(session.expiresAt) <= Date.now()) {
      const response = NextResponse.json({ authenticated: false }, { headers: responseHeaders });
      response.cookies.set(config.sessionCookieName, "", {
        httpOnly: true,
        secure: config.secureCookies,
        sameSite: "lax",
        path: "/",
        maxAge: 0
      });
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
        headers: {
          ...responseHeaders,
          "Content-Type": "application/problem+json"
        }
      }
    );
  }
}
