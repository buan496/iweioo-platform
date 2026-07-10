import assert from "node:assert/strict";
import test from "node:test";
import {
  loadAuthConfig,
  sessionCookieOptions,
  transactionCookieOptions
} from "../lib/auth/config";
import {
  isOidcTransaction,
  isPortalSession,
  verifiedUserFromClaims
} from "../lib/auth/model";
import {
  constantTimeEqual,
  isSameOriginPost,
  safeReturnPath
} from "../lib/auth/security";
import { canonicalPublicPath } from "../lib/public-route";

const localEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: "development",
  APP_ORIGIN: "http://localhost:3000",
  OIDC_ISSUER: "http://localhost:8080/realms/iweioo",
  OIDC_CLIENT_ID: "iweioo-portal",
  OIDC_CLIENT_SECRET: "test-fixture-not-a-secret", // gitleaks:allow
  BFF_REDIS_URL: "redis://:test-fixture-not-a-secret@127.0.0.1:6379/0" // gitleaks:allow
};

test("authentication config derives exact local callback and host-only cookie names", () => {
  const config = loadAuthConfig(localEnvironment);

  assert.equal(config.appOrigin, "http://localhost:3000");
  assert.equal(config.callbackUrl, "http://localhost:3000/auth/callback");
  assert.equal(config.postLogoutRedirectUrl, "http://localhost:3000/");
  assert.equal(config.sessionCookieName, "iweioo_session");
  assert.equal(config.transactionCookieName, "iweioo_oidc_tx");
  assert.equal(config.secureCookies, false);
  assert.deepEqual(sessionCookieOptions(config), {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 1800,
    priority: "high"
  });
  assert.equal(transactionCookieOptions(config).maxAge, 600);
});

test("production config uses HTTPS, TLS Redis, and __Host- cookies", () => {
  const config = loadAuthConfig({
    ...localEnvironment,
    NODE_ENV: "production",
    APP_ORIGIN: "https://iweioo.com",
    OIDC_ISSUER: "https://auth.iweioo.com/realms/iweioo",
    BFF_REDIS_URL: "rediss://:production-redis-password@redis.internal:6379/0"
  });

  assert.equal(config.secureCookies, true);
  assert.equal(config.sessionCookieName, "__Host-iweioo_session");
  assert.equal(config.transactionCookieName, "__Host-iweioo_oidc_tx");
});

test("authentication config rejects unsafe origins and unprotected Redis", () => {
  assert.throws(
    () => loadAuthConfig({ ...localEnvironment, APP_ORIGIN: "http://iweioo.com" }),
    /HTTPS/
  );
  assert.throws(
    () => loadAuthConfig({ ...localEnvironment, APP_ORIGIN: "http://localhost:3000/path" }),
    /must not contain a path/
  );
  assert.throws(
    () => loadAuthConfig({ ...localEnvironment, BFF_REDIS_URL: "redis://127.0.0.1:6379" }),
    /include a password/
  );
  assert.throws(
    () =>
      loadAuthConfig({
        ...localEnvironment,
        NODE_ENV: "production",
        APP_ORIGIN: "https://iweioo.com",
        OIDC_ISSUER: "https://auth.iweioo.com/realms/iweioo",
        BFF_REDIS_URL: "redis://:password@redis.internal:6379/0"
      }),
    /must use TLS/
  );
});

test("return paths cannot escape the portal origin", () => {
  assert.equal(safeReturnPath("/zh/?from=login#ready"), "/zh/?from=login#ready");
  assert.equal(safeReturnPath("https://evil.example/path", "/zh/"), "/zh/");
  assert.equal(safeReturnPath("//evil.example/path", "/zh/"), "/zh/");
  assert.equal(safeReturnPath("/\\evil.example", "/zh/"), "/zh/");
  assert.equal(safeReturnPath(null, "/zh/"), "/zh/");
});

test("public pages keep canonical slashes without rewriting exact BFF routes", () => {
  assert.equal(canonicalPublicPath("/zh"), "/zh/");
  assert.equal(canonicalPublicPath("/zh/blog"), "/zh/blog/");
  assert.equal(canonicalPublicPath("/zh/"), null);
  assert.equal(canonicalPublicPath("/auth/callback"), null);
  assert.equal(canonicalPublicPath("/api/auth/session"), null);
  assert.equal(canonicalPublicPath("/robots.txt"), null);
});

test("logout origin and CSRF helpers reject cross-site inputs", () => {
  const sameOrigin = new Request("http://localhost:3000/auth/logout", {
    method: "POST",
    headers: { origin: "http://localhost:3000", "sec-fetch-site": "same-origin" }
  });
  const crossOrigin = new Request("http://localhost:3000/auth/logout", {
    method: "POST",
    headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" }
  });

  assert.equal(isSameOriginPost(sameOrigin, "http://localhost:3000"), true);
  assert.equal(isSameOriginPost(crossOrigin, "http://localhost:3000"), false);
  assert.equal(constantTimeEqual("same-token", "same-token"), true);
  assert.equal(constantTimeEqual("same-token", "other-token"), false);
});

test("only verified OIDC identities become portal users", () => {
  assert.deepEqual(
    verifiedUserFromClaims({
      sub: "9fe7173c-7644-42c4-a3d6-e912257e910e",
      email: "student@example.com",
      email_verified: true,
      name: "Student"
    }),
    {
      platformUserId: "9fe7173c-7644-42c4-a3d6-e912257e910e",
      email: "student@example.com",
      displayName: "Student"
    }
  );
  assert.throws(
    () =>
      verifiedUserFromClaims({
        sub: "subject",
        email: "student@example.com",
        email_verified: false
      }),
    /verified email/
  );
});

test("Redis records require complete bounded authentication models", () => {
  assert.equal(
    isOidcTransaction({
      state: "state",
      nonce: "nonce",
      codeVerifier: "verifier",
      returnTo: "/zh/",
      locale: "zh",
      intent: "login",
      createdAt: new Date().toISOString()
    }),
    true
  );
  assert.equal(isOidcTransaction({ state: "state" }), false);

  assert.equal(
    isPortalSession({
      user: { platformUserId: "subject", email: "student@example.com", displayName: "Student" },
      accessToken: "access",
      refreshToken: "refresh",
      idToken: "id",
      accessTokenExpiresAt: new Date().toISOString(),
      csrfToken: "csrf",
      createdAt: new Date().toISOString(),
      expiresAt: new Date().toISOString()
    }),
    true
  );
  assert.equal(isPortalSession({ user: {} }), false);
});
