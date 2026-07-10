"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isPublicSession, type PublicSession } from "@iweioo/auth-bff/public";
import type { Locale } from "@/lib/types";

type AuthControlsProps = {
  locale: Locale;
  labels: {
    login: string;
    register: string;
    logout: string;
    loading: string;
  };
};

const DEFAULT_ACCOUNT_CENTER_URL = "https://account.iweioo.com";

function accountCenterUrl(): string {
  const configured = process.env.NEXT_PUBLIC_ACCOUNT_URL ?? DEFAULT_ACCOUNT_CENTER_URL;
  try {
    const url = new URL(configured);
    const isLocalHttp =
      process.env.NODE_ENV !== "production" &&
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    return url.protocol === "https:" || isLocalHttp ? url.origin : DEFAULT_ACCOUNT_CENTER_URL;
  } catch {
    return DEFAULT_ACCOUNT_CENTER_URL;
  }
}

export function AuthControls({ locale, labels }: AuthControlsProps) {
  const [session, setSession] = useState<PublicSession | null>(null);

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
        const value: unknown = await response.json();
        if (!isPublicSession(value)) {
          throw new Error("Session endpoint returned an invalid payload");
        }
        return value;
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
    const accountLabel = locale === "zh" ? "打开账户中心" : "Open account center";
    return (
      <div className="auth-controls auth-controls-signed-in">
        <a
          className="auth-user"
          href={accountCenterUrl()}
          title={`${accountLabel}: ${session.user.email}`}
          aria-label={`${accountLabel}: ${session.user.displayName}`}
        >
          {session.user.displayName}
        </a>
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
