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

export type PortalUser = {
  platformUserId: string;
  email: string;
  displayName: string;
};

export type PortalSession = {
  user: PortalUser;
  accessToken: string;
  refreshToken: string;
  idToken: string;
  accessTokenExpiresAt: string;
  csrfToken: string;
  createdAt: string;
  expiresAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasStrings(value: Record<string, unknown>, keys: string[]): boolean {
  return keys.every((key) => typeof value[key] === "string" && value[key].length > 0);
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

export function isPortalSession(value: unknown): value is PortalSession {
  if (!isRecord(value) || !isRecord(value.user)) {
    return false;
  }
  return (
    hasStrings(value.user, ["platformUserId", "email", "displayName"]) &&
    hasStrings(value, [
      "accessToken",
      "refreshToken",
      "idToken",
      "accessTokenExpiresAt",
      "csrfToken",
      "createdAt",
      "expiresAt"
    ])
  );
}

export function verifiedUserFromClaims(claims: Record<string, unknown>): PortalUser {
  if (typeof claims.sub !== "string" || !claims.sub) {
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
