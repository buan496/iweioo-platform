export type AuthIntent = "login" | "register";

export type OidcTransaction = {
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
  locale: "zh" | "en";
  intent: AuthIntent;
  createdAt: string;
};

export type AuthenticatedUser = {
  platformUserId: string;
  email: string;
  displayName: string;
};

export type SessionDevice = {
  category: "desktop" | "mobile" | "tablet" | "unknown";
  operatingSystem: "Windows" | "macOS" | "Linux" | "Android" | "iOS" | "Unknown";
};

export type BffSession = {
  recordVersion: 2;
  sessionId: string;
  appId: string;
  user: AuthenticatedUser;
  device: SessionDevice;
  accessToken: string;
  refreshToken: string;
  idToken: string;
  accessTokenExpiresAt: string;
  csrfToken: string;
  createdAt: string;
  expiresAt: string;
};

export type ManagedSession = {
  sessionId: string;
  appId: string;
  device: SessionDevice;
  createdAt: string;
  expiresAt: string;
  current: boolean;
};

export type PublicSession =
  | { authenticated: false }
  | {
      authenticated: true;
      user: AuthenticatedUser;
      csrfToken: string;
      expiresAt: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasStrings(value: Record<string, unknown>, keys: string[]): boolean {
  return keys.every((key) => typeof value[key] === "string" && value[key].length > 0);
}

function isDateTime(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function isSessionId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function isPlatformUserId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

export function isSessionDevice(value: unknown): value is SessionDevice {
  return (
    isRecord(value) &&
    ["desktop", "mobile", "tablet", "unknown"].includes(String(value.category)) &&
    ["Windows", "macOS", "Linux", "Android", "iOS", "Unknown"].includes(
      String(value.operatingSystem)
    )
  );
}

export function isOidcTransaction(value: unknown): value is OidcTransaction {
  if (!isRecord(value)) {
    return false;
  }
  return (
    hasStrings(value, ["state", "nonce", "codeVerifier", "returnTo", "createdAt"]) &&
    (value.locale === "zh" || value.locale === "en") &&
    (value.intent === "login" || value.intent === "register")
  );
}

export function isBffSession(value: unknown): value is BffSession {
  if (!isRecord(value) || !isRecord(value.user)) {
    return false;
  }
  return (
    value.recordVersion === 2 &&
    isSessionId(value.sessionId) &&
    typeof value.appId === "string" &&
    /^[a-z][a-z0-9-]{1,31}$/.test(value.appId) &&
    hasStrings(value.user, ["platformUserId", "email", "displayName"]) &&
    isPlatformUserId(value.user.platformUserId) &&
    isSessionDevice(value.device) &&
    hasStrings(value, [
      "accessToken",
      "refreshToken",
      "idToken",
      "accessTokenExpiresAt",
      "csrfToken",
      "createdAt",
      "expiresAt"
    ]) &&
    isDateTime(value.accessTokenExpiresAt) &&
    isDateTime(value.createdAt) &&
    isDateTime(value.expiresAt) &&
    Date.parse(value.expiresAt as string) > Date.parse(value.createdAt as string)
  );
}

export function describeSessionDevice(userAgent: string | null): SessionDevice {
  const normalized = (userAgent ?? "").slice(0, 512).toLowerCase();
  const operatingSystem: SessionDevice["operatingSystem"] =
    /iphone|ipad|ipod/.test(normalized)
      ? "iOS"
      : /android/.test(normalized)
        ? "Android"
        : /windows/.test(normalized)
          ? "Windows"
          : /macintosh|mac os x/.test(normalized)
            ? "macOS"
            : /linux/.test(normalized)
              ? "Linux"
              : "Unknown";
  const category: SessionDevice["category"] = /ipad|tablet/.test(normalized)
    ? "tablet"
    : /mobile|iphone|ipod|android/.test(normalized)
      ? "mobile"
      : normalized
        ? "desktop"
        : "unknown";
  return { category, operatingSystem };
}

export function verifiedUserFromClaims(claims: Record<string, unknown>): AuthenticatedUser {
  if (!isPlatformUserId(claims.sub)) {
    throw new Error("OIDC ID token is missing a subject");
  }
  if (claims.email_verified !== true) {
    throw new Error("OIDC identity does not have a verified email");
  }
  if (typeof claims.email !== "string" || !claims.email) {
    throw new Error("OIDC ID token is missing an email");
  }

  const displayName =
    (typeof claims.name === "string" && claims.name.trim()) ||
    (typeof claims.preferred_username === "string" && claims.preferred_username.trim()) ||
    claims.email;

  return {
    platformUserId: claims.sub,
    email: claims.email,
    displayName
  };
}

export function isPublicSession(value: unknown): value is PublicSession {
  if (!isRecord(value) || typeof value.authenticated !== "boolean") {
    return false;
  }
  if (!value.authenticated) {
    return true;
  }
  return (
    isRecord(value.user) &&
    hasStrings(value.user, ["platformUserId", "email", "displayName"]) &&
    isPlatformUserId(value.user.platformUserId) &&
    hasStrings(value, ["csrfToken", "expiresAt"]) &&
    isDateTime(value.expiresAt)
  );
}

export function isManagedSession(value: unknown): value is ManagedSession {
  return (
    isRecord(value) &&
    isSessionId(value.sessionId) &&
    typeof value.appId === "string" &&
    /^[a-z][a-z0-9-]{1,31}$/.test(value.appId) &&
    isSessionDevice(value.device) &&
    isDateTime(value.createdAt) &&
    isDateTime(value.expiresAt) &&
    Date.parse(value.expiresAt) > Date.parse(value.createdAt) &&
    typeof value.current === "boolean"
  );
}

export function isManagedSessionList(value: unknown): value is ManagedSession[] {
  return Array.isArray(value) && value.every(isManagedSession);
}
