import type { components } from "@iweioo/sdk";

export type CurrentUser = components["schemas"]["CurrentUser"];
export type UserProfile = components["schemas"]["UserProfile"];
export type ProfilePatch = components["schemas"]["ProfilePatch"];
export type Consent = components["schemas"]["Consent"];
export type ConsentStatus = Consent["status"];
export type ConsentPurpose = "agent_memory" | "growth_profile";

export type ConsentBundle = {
  consents: Consent[];
  policies: Record<ConsentPurpose, string>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isBoundedString(value: unknown, minimum: number, maximum: number): value is string {
  return typeof value === "string" && value.length >= minimum && value.length <= maximum;
}

function isOptionalBoundedString(value: unknown, maximum: number): value is string | null | undefined {
  return value === null || value === undefined || isBoundedString(value, 0, maximum);
}

function isDateTime(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function isUserProfile(value: unknown): value is UserProfile {
  return (
    isRecord(value) &&
    isBoundedString(value.display_name, 1, 80) &&
    (value.locale === "zh-CN" || value.locale === "en") &&
    isBoundedString(value.timezone, 1, 64) &&
    isOptionalBoundedString(value.school, 120) &&
    isOptionalBoundedString(value.major, 120) &&
    (value.graduation_year === null ||
      value.graduation_year === undefined ||
      (Number.isInteger(value.graduation_year) &&
        Number(value.graduation_year) >= 2000 &&
        Number(value.graduation_year) <= 2200)) &&
    isOptionalBoundedString(value.career_goal, 200)
  );
}

export function isCurrentUser(value: unknown): value is CurrentUser {
  return (
    isRecord(value) &&
    typeof value.user_id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.user_id) &&
    ["active", "restricted", "deletion_pending"].includes(String(value.status)) &&
    isBoundedString(value.email, 3, 320) &&
    value.email_verified === true &&
    isDateTime(value.created_at) &&
    isUserProfile(value.profile)
  );
}

export function isConsent(value: unknown): value is Consent {
  return (
    isRecord(value) &&
    isBoundedString(value.purpose, 3, 64) &&
    /^[a-z][a-z0-9_.-]{2,63}$/.test(value.purpose) &&
    (value.status === "granted" || value.status === "revoked") &&
    isBoundedString(value.policy_version, 1, 40) &&
    isDateTime(value.updated_at)
  );
}

export function isConsentBundle(value: unknown): value is ConsentBundle {
  return (
    isRecord(value) &&
    Array.isArray(value.consents) &&
    value.consents.every(isConsent) &&
    isRecord(value.policies) &&
    isBoundedString(value.policies.agent_memory, 1, 40) &&
    isBoundedString(value.policies.growth_profile, 1, 40)
  );
}
