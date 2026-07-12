export type AuthConfig = {
  appId: string;
  appOrigin: string;
  issuer: URL;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  postLogoutRedirectUrl: string;
  redisUrl: string;
  secureCookies: boolean;
  sessionCookieName: string;
  transactionCookieName: string;
  sessionTtlSeconds: number;
  transactionTtlSeconds: number;
  maxSessionsPerUser: number;
};

const DEFAULT_SESSION_TTL_SECONDS = 30 * 60;
const DEFAULT_TRANSACTION_TTL_SECONDS = 10 * 60;

function required(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`Missing required authentication setting: ${name}`);
  }
  return value;
}

function parseAppId(raw: string): string {
  if (!/^[a-z][a-z0-9-]{1,31}$/.test(raw)) {
    throw new Error("AUTH_APP_ID must be a lowercase application identifier");
  }
  return raw;
}

function parseClientId(raw: string): string {
  if (!/^[A-Za-z0-9._-]{2,128}$/.test(raw)) {
    throw new Error("OIDC_CLIENT_ID contains unsupported characters");
  }
  return raw;
}

function parseBoundedSeconds(
  environment: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const raw = environment[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

function isLoopback(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function parseOrigin(raw: string): URL {
  const value = new URL(raw);
  if (value.username || value.password || value.search || value.hash) {
    throw new Error("APP_ORIGIN must be an origin without credentials, query, or fragment");
  }
  if (value.pathname !== "/") {
    throw new Error("APP_ORIGIN must not contain a path");
  }
  if (value.protocol !== "https:" && !(value.protocol === "http:" && isLoopback(value.hostname))) {
    throw new Error("APP_ORIGIN must use HTTPS except on loopback development hosts");
  }
  return value;
}

function parseIssuer(raw: string): URL {
  const value = new URL(raw);
  if (value.username || value.password || value.search || value.hash) {
    throw new Error("OIDC_ISSUER must not contain credentials, query, or fragment");
  }
  if (value.protocol !== "https:" && !(value.protocol === "http:" && isLoopback(value.hostname))) {
    throw new Error("OIDC_ISSUER must use HTTPS except on loopback development hosts");
  }
  return value;
}

function parseRedisUrl(raw: string, production: boolean): string {
  const value = new URL(raw);
  if (value.protocol !== "redis:" && value.protocol !== "rediss:") {
    throw new Error("BFF_REDIS_URL must use redis:// or rediss://");
  }
  if (!value.password) {
    throw new Error("BFF_REDIS_URL must include a password");
  }
  if (production && value.protocol !== "rediss:" && !isLoopback(value.hostname)) {
    throw new Error("Production Redis connections must use TLS unless they are loopback-only");
  }
  return value.toString();
}

export function loadAuthConfig(environment: NodeJS.ProcessEnv = process.env): AuthConfig {
  const appId = parseAppId(required(environment, "AUTH_APP_ID"));
  const app = parseOrigin(required(environment, "APP_ORIGIN"));
  const issuer = parseIssuer(required(environment, "OIDC_ISSUER"));
  const secureCookies = app.protocol === "https:";
  const production = environment.NODE_ENV === "production";

  return {
    appId,
    appOrigin: app.origin,
    issuer,
    clientId: parseClientId(required(environment, "OIDC_CLIENT_ID")),
    clientSecret: required(environment, "OIDC_CLIENT_SECRET"),
    callbackUrl: new URL("/auth/callback", app).toString(),
    postLogoutRedirectUrl: new URL("/", app).toString(),
    redisUrl: parseRedisUrl(required(environment, "BFF_REDIS_URL"), production),
    secureCookies,
    sessionCookieName: secureCookies ? "__Host-iweioo_session" : `iweioo_${appId}_session`,
    transactionCookieName: secureCookies ? "__Host-iweioo_oidc_tx" : `iweioo_${appId}_oidc_tx`,
    sessionTtlSeconds: parseBoundedSeconds(
      environment,
      "AUTH_SESSION_TTL_SECONDS",
      DEFAULT_SESSION_TTL_SECONDS,
      300,
      10 * 60 * 60
    ),
    transactionTtlSeconds: parseBoundedSeconds(
      environment,
      "AUTH_TRANSACTION_TTL_SECONDS",
      DEFAULT_TRANSACTION_TTL_SECONDS,
      60,
      15 * 60
    ),
    maxSessionsPerUser: parseBoundedSeconds(
      environment,
      "AUTH_MAX_SESSIONS_PER_USER",
      20,
      2,
      50
    )
  };
}

export function sessionCookieOptions(config: AuthConfig, maxAge = config.sessionTtlSeconds) {
  return {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    priority: "high" as const
  };
}

export function transactionCookieOptions(config: AuthConfig) {
  return {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: "lax" as const,
    path: "/",
    maxAge: config.transactionTtlSeconds,
    priority: "high" as const
  };
}
