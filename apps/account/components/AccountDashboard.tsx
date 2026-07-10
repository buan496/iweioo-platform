"use client";

import { useEffect, useState } from "react";
import { isPublicSession, type PublicSession } from "@iweioo/auth-bff/public";
import type { AccountLocale } from "@/lib/i18n";
import { accountCopy } from "@/lib/i18n";

type AccountDashboardProps = {
  locale: AccountLocale;
};

export function AccountDashboard({ locale }: AccountDashboardProps) {
  const copy = accountCopy[locale];
  const [session, setSession] = useState<PublicSession | null>(null);
  const [failed, setFailed] = useState(false);

  async function retrySession() {
    setFailed(false);
    setSession(null);
    try {
      const response = await fetch("/api/auth/session", {
        credentials: "same-origin",
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error("Session endpoint unavailable");
      }
      const value: unknown = await response.json();
      if (!isPublicSession(value)) {
        throw new Error("Invalid session response");
      }
      setSession(value);
    } catch {
      setFailed(true);
    }
  }

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
          throw new Error("Invalid session response");
        }
        return value;
      })
      .then(setSession)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setFailed(true);
        }
      });
    return () => controller.abort();
  }, []);

  if (failed) {
    return (
      <section className="account-state-card" role="alert">
        <p>{copy.unavailable}</p>
        <button
          type="button"
          onClick={() => void retrySession()}
        >
          {copy.retry}
        </button>
      </section>
    );
  }

  if (session === null) {
    return <div className="account-loading">{copy.loading}</div>;
  }

  if (!session.authenticated) {
    const query = `locale=${locale}&return_to=${encodeURIComponent(`/${locale}/`)}`;
    return (
      <section className="account-state-card account-signin-card">
        <div className="account-lock" aria-hidden="true">
          i
        </div>
        <h2>{copy.identity}</h2>
        <p>{copy.identityIntro}</p>
        <div className="account-actions">
          <a className="account-button" href={`/auth/login?${query}`}>
            {copy.login}
          </a>
          <a className="account-button account-button-secondary" href={`/auth/register?${query}`}>
            {copy.register}
          </a>
        </div>
      </section>
    );
  }

  const expiresAt = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(session.expiresAt));

  return (
    <div className="account-dashboard">
      <div className="account-status-line">
        <span className="status-dot" aria-hidden="true" />
        {copy.signedIn}
      </div>

      <section className="account-panel">
        <div className="panel-heading">
          <div>
            <p className="panel-index">01</p>
            <h2>{copy.identity}</h2>
          </div>
          <span className="verified-badge">{copy.verified}</span>
        </div>
        <p className="panel-intro">{copy.identityIntro}</p>
        <dl className="account-details">
          <div>
            <dt>{copy.displayName}</dt>
            <dd>{session.user.displayName}</dd>
          </div>
          <div>
            <dt>{copy.email}</dt>
            <dd>{session.user.email}</dd>
          </div>
          <div className="detail-wide">
            <dt>{copy.userId}</dt>
            <dd className="technical-value">{session.user.platformUserId}</dd>
          </div>
        </dl>
      </section>

      <section className="account-panel">
        <div className="panel-heading">
          <div>
            <p className="panel-index">02</p>
            <h2>{copy.profile}</h2>
          </div>
        </div>
        <p className="panel-intro">{copy.profileIntro}</p>
        <div className="profile-grid">
          <ProfileField label={copy.displayName} value={session.user.displayName} status={copy.fromIdentity} />
          <ProfileField label={copy.locale} value={locale === "zh" ? "简体中文" : "English"} status={copy.pendingStorage} muted />
          <ProfileField label={copy.timezone} value="Asia/Shanghai" status={copy.pendingStorage} muted />
          <ProfileField label={copy.education} value="—" status={copy.pendingStorage} muted />
          <ProfileField label={copy.career} value="—" status={copy.pendingStorage} muted wide />
        </div>
      </section>

      <section className="account-panel">
        <div className="panel-heading">
          <div>
            <p className="panel-index">03</p>
            <h2>{copy.consent}</h2>
          </div>
        </div>
        <p className="panel-intro">{copy.consentIntro}</p>
        <div className="consent-list">
          <ConsentRow title={copy.growthConsent} body={copy.growthConsentBody} status={copy.notGranted} note={copy.availableAfterApi} />
          <ConsentRow title={copy.memoryConsent} body={copy.memoryConsentBody} status={copy.notGranted} note={copy.availableAfterApi} />
        </div>
      </section>

      <section className="account-panel">
        <div className="panel-heading">
          <div>
            <p className="panel-index">04</p>
            <h2>{copy.session}</h2>
          </div>
        </div>
        <p className="panel-intro">{copy.sessionIntro}</p>
        <dl className="session-details">
          <div>
            <dt>{copy.application}</dt>
            <dd>account.iweioo.com</dd>
          </div>
          <div>
            <dt>{copy.expires}</dt>
            <dd>{expiresAt}</dd>
          </div>
          <div>
            <dt>{copy.cookieBoundary}</dt>
            <dd>{copy.hostOnly}</dd>
          </div>
        </dl>
        <form className="logout-form" method="post" action="/auth/logout">
          <input type="hidden" name="csrf_token" value={session.csrfToken} />
          <button type="submit">{copy.logout}</button>
        </form>
      </section>
    </div>
  );
}

function ProfileField({
  label,
  value,
  status,
  muted = false,
  wide = false
}: {
  label: string;
  value: string;
  status: string;
  muted?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`profile-field${muted ? " profile-field-muted" : ""}${wide ? " profile-field-wide" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{status}</small>
    </div>
  );
}

function ConsentRow({ title, body, status, note }: { title: string; body: string; status: string; note: string }) {
  return (
    <article className="consent-row">
      <div>
        <h3>{title}</h3>
        <p>{body}</p>
        <small>{note}</small>
      </div>
      <span className="consent-status">{status}</span>
    </article>
  );
}
