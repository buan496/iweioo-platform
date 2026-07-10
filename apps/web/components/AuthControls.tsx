"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/types";

type AuthenticatedSession = {
  authenticated: true;
  user: {
    platformUserId: string;
    email: string;
    displayName: string;
  };
  csrfToken: string;
  expiresAt: string;
};

type AnonymousSession = {
  authenticated: false;
};

type SessionState = AuthenticatedSession | AnonymousSession;

type AuthControlsProps = {
  locale: Locale;
  labels: {
    login: string;
    register: string;
    logout: string;
    loading: string;
  };
};

export function AuthControls({ locale, labels }: AuthControlsProps) {
  const [session, setSession] = useState<SessionState | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/auth/session", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Session endpoint unavailable");
        }
        return (await response.json()) as SessionState;
      })
      .then(setSession)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSession({ authenticated: false });
        }
      });

    return () => controller.abort();
  }, []);

  const returnTo = `/${locale}/`;
  if (session?.authenticated) {
    return (
      <div className="auth-controls auth-controls-signed-in">
        <span className="auth-user" title={session.user.email}>
          {session.user.displayName}
        </span>
        <form method="post" action="/auth/logout">
          <input type="hidden" name="csrf_token" value={session.csrfToken} />
          <button className="auth-action" type="submit">
            {labels.logout}
          </button>
        </form>
      </div>
    );
  }

  if (session === null) {
    return (
      <span className="auth-loading" aria-label={labels.loading}>
        ···
      </span>
    );
  }

  const query = `locale=${locale}&return_to=${encodeURIComponent(returnTo)}`;
  return (
    <div className="auth-controls">
      <Link className="auth-action" href={`/auth/login?${query}`}>
        {labels.login}
      </Link>
      <Link className="auth-register" href={`/auth/register?${query}`}>
        {labels.register}
      </Link>
    </div>
  );
}
