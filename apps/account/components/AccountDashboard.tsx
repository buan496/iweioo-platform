"use client";

import { useEffect, useState, type FormEvent } from "react";
import { isPublicSession, type PublicSession } from "@iweioo/auth-bff/public";
import type { AccountLocale } from "@/lib/i18n";
import { accountCopy } from "@/lib/i18n";
import {
  isConsent,
  isConsentBundle,
  isCurrentUser,
  isUserProfile,
  type Consent,
  type ConsentPurpose,
  type ConsentStatus,
  type CurrentUser,
  type ProfilePatch,
  type UserProfile
} from "@/lib/platform-public";

type AccountDashboardProps = {
  locale: AccountLocale;
};

type ProfileForm = {
  displayName: string;
  locale: "zh-CN" | "en";
  timezone: string;
  school: string;
  major: string;
  graduationYear: string;
  careerGoal: string;
};

type ConsentPolicies = Record<ConsentPurpose, string>;

function formFromProfile(profile: UserProfile): ProfileForm {
  return {
    displayName: profile.display_name,
    locale: profile.locale,
    timezone: profile.timezone,
    school: profile.school ?? "",
    major: profile.major ?? "",
    graduationYear: profile.graduation_year?.toString() ?? "",
    careerGoal: profile.career_goal ?? ""
  };
}

export function AccountDashboard({ locale }: AccountDashboardProps) {
  const copy = accountCopy[locale];
  const [session, setSession] = useState<PublicSession | null>(null);
  const [sessionFailed, setSessionFailed] = useState(false);
  const [platformUser, setPlatformUser] = useState<CurrentUser | null>(null);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [policies, setPolicies] = useState<ConsentPolicies | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm | null>(null);
  const [platformFailed, setPlatformFailed] = useState(false);
  const [profileState, setProfileState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [consentBusy, setConsentBusy] = useState<ConsentPurpose | null>(null);
  const [consentFailed, setConsentFailed] = useState<ConsentPurpose | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void loadSession(controller.signal)
      .then(setSession)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSessionFailed(true);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!session?.authenticated) {
      return;
    }
    const controller = new AbortController();
    void loadPlatformData(controller.signal)
      .then(({ user, consentBundle }) => {
        setPlatformUser(user);
        setProfileForm(formFromProfile(user.profile));
        setConsents(consentBundle.consents);
        setPolicies(consentBundle.policies);
        setPlatformFailed(false);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setPlatformFailed(true);
        }
      });
    return () => controller.abort();
  }, [session]);

  async function retrySession() {
    setSessionFailed(false);
    setSession(null);
    try {
      setSession(await loadSession());
    } catch {
      setSessionFailed(true);
    }
  }

  async function retryPlatform() {
    setPlatformFailed(false);
    try {
      const { user, consentBundle } = await loadPlatformData();
      setPlatformUser(user);
      setProfileForm(formFromProfile(user.profile));
      setConsents(consentBundle.consents);
      setPolicies(consentBundle.policies);
    } catch {
      setPlatformFailed(true);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profileForm || !platformUser) {
      return;
    }
    setProfileState("saving");
    const graduationYear = profileForm.graduationYear
      ? Number(profileForm.graduationYear)
      : null;
    const patch: ProfilePatch = {
      display_name: profileForm.displayName,
      locale: profileForm.locale,
      timezone: profileForm.timezone,
      school: profileForm.school || null,
      major: profileForm.major || null,
      graduation_year: graduationYear,
      career_goal: profileForm.careerGoal || null
    };
    try {
      const response = await fetch("/api/platform/profile", {
        method: "PATCH",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const value: unknown = await response.json();
      if (!response.ok || !isUserProfile(value)) {
        throw new Error("Profile update failed");
      }
      setPlatformUser({ ...platformUser, profile: value });
      setProfileForm(formFromProfile(value));
      setProfileState("saved");
    } catch {
      setProfileState("error");
    }
  }

  async function changeConsent(purpose: ConsentPurpose, status: ConsentStatus) {
    if (!policies) {
      return;
    }
    setConsentBusy(purpose);
    setConsentFailed(null);
    try {
      const response = await fetch(`/api/platform/consents/${purpose}`, {
        method: "PUT",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID()
        },
        body: JSON.stringify({ status, policy_version: policies[purpose] })
      });
      const value: unknown = await response.json();
      if (!response.ok || !isConsent(value)) {
        throw new Error("Consent update failed");
      }
      setConsents((current) => [...current.filter((item) => item.purpose !== purpose), value]);
    } catch {
      setConsentFailed(purpose);
    } finally {
      setConsentBusy(null);
    }
  }

  if (sessionFailed) {
    return (
      <section className="account-state-card" role="alert">
        <p>{copy.unavailable}</p>
        <button type="button" onClick={() => void retrySession()}>
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
        <div className="account-lock" aria-hidden="true">i</div>
        <h2>{copy.identity}</h2>
        <p>{copy.identityIntro}</p>
        <div className="account-actions">
          <a className="account-button" href={`/auth/login?${query}`}>{copy.login}</a>
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
          <div><p className="panel-index">01</p><h2>{copy.identity}</h2></div>
          <span className="verified-badge">{copy.verified}</span>
        </div>
        <p className="panel-intro">{copy.identityIntro}</p>
        <dl className="account-details">
          <div><dt>{copy.displayName}</dt><dd>{platformUser?.profile.display_name ?? session.user.displayName}</dd></div>
          <div><dt>{copy.email}</dt><dd>{platformUser?.email ?? session.user.email}</dd></div>
          <div className="detail-wide">
            <dt>{copy.userId}</dt>
            <dd className="technical-value">{platformUser?.user_id ?? session.user.platformUserId}</dd>
          </div>
        </dl>
      </section>

      {platformFailed ? (
        <section className="account-state-card" role="alert">
          <p>{copy.platformUnavailable}</p>
          <button type="button" onClick={() => void retryPlatform()}>{copy.retry}</button>
        </section>
      ) : !platformUser || !profileForm || !policies ? (
        <div className="account-loading">{copy.loadingProfile}</div>
      ) : (
        <>
          <section className="account-panel">
            <div className="panel-heading">
              <div><p className="panel-index">02</p><h2>{copy.profile}</h2></div>
              <span className="durable-badge">PostgreSQL</span>
            </div>
            <p className="panel-intro">{copy.profileIntro}</p>
            <form className="profile-form" onSubmit={(event) => void saveProfile(event)}>
              <ProfileInput label={copy.displayName} value={profileForm.displayName} required maxLength={80}
                onChange={(value) => setProfileForm({ ...profileForm, displayName: value })} />
              <label className="profile-input">
                <span>{copy.locale}</span>
                <select value={profileForm.locale} onChange={(event) => setProfileForm({ ...profileForm, locale: event.target.value as "zh-CN" | "en" })}>
                  <option value="zh-CN">简体中文</option><option value="en">English</option>
                </select>
              </label>
              <ProfileInput label={copy.timezone} value={profileForm.timezone} required maxLength={64}
                onChange={(value) => setProfileForm({ ...profileForm, timezone: value })} />
              <ProfileInput label={copy.school} value={profileForm.school} maxLength={120}
                onChange={(value) => setProfileForm({ ...profileForm, school: value })} />
              <ProfileInput label={copy.major} value={profileForm.major} maxLength={120}
                onChange={(value) => setProfileForm({ ...profileForm, major: value })} />
              <label className="profile-input">
                <span>{copy.graduationYear}</span>
                <input type="number" min="2000" max="2200" value={profileForm.graduationYear}
                  onChange={(event) => setProfileForm({ ...profileForm, graduationYear: event.target.value })} />
              </label>
              <label className="profile-input profile-input-wide">
                <span>{copy.career}</span>
                <textarea maxLength={200} value={profileForm.careerGoal}
                  onChange={(event) => setProfileForm({ ...profileForm, careerGoal: event.target.value })} />
              </label>
              <div className="profile-form-actions">
                <button type="submit" disabled={profileState === "saving"}>
                  {profileState === "saving" ? copy.saving : copy.saveProfile}
                </button>
                <span aria-live="polite">
                  {profileState === "saved" ? copy.saved : profileState === "error" ? copy.saveFailed : ""}
                </span>
              </div>
            </form>
          </section>

          <section className="account-panel">
            <div className="panel-heading">
              <div><p className="panel-index">03</p><h2>{copy.consent}</h2></div>
            </div>
            <p className="panel-intro">{copy.consentIntro}</p>
            <div className="consent-list">
              <ConsentControl purpose="growth_profile" title={copy.growthConsent} body={copy.growthConsentBody}
                consent={consents.find((item) => item.purpose === "growth_profile")} policy={policies.growth_profile}
                busy={consentBusy === "growth_profile"} failed={consentFailed === "growth_profile"} copy={copy}
                onChange={(status) => void changeConsent("growth_profile", status)} />
              <ConsentControl purpose="agent_memory" title={copy.memoryConsent} body={copy.memoryConsentBody}
                consent={consents.find((item) => item.purpose === "agent_memory")} policy={policies.agent_memory}
                busy={consentBusy === "agent_memory"} failed={consentFailed === "agent_memory"} copy={copy}
                onChange={(status) => void changeConsent("agent_memory", status)} />
            </div>
          </section>
        </>
      )}

      <section className="account-panel">
        <div className="panel-heading"><div><p className="panel-index">04</p><h2>{copy.session}</h2></div></div>
        <p className="panel-intro">{copy.sessionIntro}</p>
        <dl className="session-details">
          <div><dt>{copy.application}</dt><dd>account.iweioo.com</dd></div>
          <div><dt>{copy.expires}</dt><dd>{expiresAt}</dd></div>
          <div><dt>{copy.cookieBoundary}</dt><dd>{copy.hostOnly}</dd></div>
        </dl>
        <form className="logout-form" method="post" action="/auth/logout">
          <input type="hidden" name="csrf_token" value={session.csrfToken} />
          <button type="submit">{copy.logout}</button>
        </form>
      </section>
    </div>
  );
}

async function loadSession(signal?: AbortSignal): Promise<PublicSession> {
  const response = await fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store", signal });
  if (!response.ok) throw new Error("Session endpoint unavailable");
  const value: unknown = await response.json();
  if (!isPublicSession(value)) throw new Error("Invalid session response");
  return value;
}

async function loadPlatformData(signal?: AbortSignal) {
  const [accountResponse, consentResponse] = await Promise.all([
    fetch("/api/platform/account", { credentials: "same-origin", cache: "no-store", signal }),
    fetch("/api/platform/consents", { credentials: "same-origin", cache: "no-store", signal })
  ]);
  const user: unknown = await accountResponse.json();
  const consentBundle: unknown = await consentResponse.json();
  if (!accountResponse.ok || !isCurrentUser(user) || !consentResponse.ok || !isConsentBundle(consentBundle)) {
    throw new Error("Platform account response is invalid");
  }
  return { user, consentBundle };
}

function ProfileInput({ label, value, onChange, required = false, maxLength }: {
  label: string; value: string; onChange: (value: string) => void; required?: boolean; maxLength: number;
}) {
  return <label className="profile-input"><span>{label}</span><input value={value} required={required} maxLength={maxLength}
    onChange={(event) => onChange(event.target.value)} /></label>;
}

function ConsentControl({ title, body, consent, policy, busy, failed, copy, onChange }: {
  purpose: ConsentPurpose; title: string; body: string; consent?: Consent; policy: string; busy: boolean; failed: boolean;
  copy: (typeof accountCopy)[AccountLocale]; onChange: (status: ConsentStatus) => void;
}) {
  const granted = consent?.status === "granted" && consent.policy_version === policy;
  const status = granted ? copy.granted : consent?.status === "revoked" ? copy.revoked : copy.notGranted;
  return <article className="consent-row"><div><h3>{title}</h3><p>{body}</p><small>{copy.policyVersion}: {policy}</small>
    {failed ? <small className="consent-error" role="alert">{copy.consentFailed}</small> : null}</div>
    <div className="consent-control"><span className={`consent-status${granted ? " consent-status-granted" : ""}`}>{status}</span>
      <button type="button" disabled={busy} onClick={() => onChange(granted ? "revoked" : "granted")}>
        {busy ? copy.saving : granted ? copy.revoke : copy.grant}
      </button></div></article>;
}
