import assert from "node:assert/strict";
import test from "node:test";
import {
  loadAuthConfig,
  sessionCookieOptions,
  transactionCookieOptions
} from "../src/config";
import {
  describeSessionDevice,
  isManagedSessionList,
  isOidcTransaction,
  isBffSession,
  isPublicSession,
  verifiedUserFromClaims
} from "../src/model";
import {
  constantTimeEqual,
  isSameOriginMutation,
  isSameOriginPost,
  safeReturnPath
} from "../src/security";

const localEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: "development",
  AUTH_APP_ID: "portal",
  APP_ORIGIN: "http://localhost:3000",
  OIDC_ISSUER: "http://localhost:8080/realms/iweioo",
  OIDC_CLIENT_ID: "iweioo-portal",
  OIDC_CLIENT_SECRET: "test-fixture-not-a-secret", // gitleaks:allow
  BFF_REDIS_URL: "redis://:test-fixture-not-a-secret@127.0.0.1:6379/0" // gitleaks:allow
};

test("local config derives exact callback and app-scoped cookie names", () => {
  const config = loadAuthConfig(localEnvironment);

  assert.equal(config.appId, "portal");
  assert.equal(config.appOrigin, "http://localhost:3000");
  assert.equal(config.callbackUrl, "http://localhost:3000/auth/callback");
  assert.equal(config.postLogoutRedirectUrl, "http://localhost:3000/");
  assert.equal(config.sessionCookieName, "iweioo_portal_session");
  assert.equal(config.transactionCookieName, "iweioo_portal_oidc_tx");
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
  assert.equal(config.maxSessionsPerUser, 20);
});

test("separate local apps cannot collide while production uses host-only cookie prefixes", () => {
  const portal = loadAuthConfig(localEnvironment);
  const account = loadAuthConfig({
    ...localEnvironment,
    AUTH_APP_ID: "account",
    APP_ORIGIN: "http://localhost:3001",
    OIDC_CLIENT_ID: "iweioo-account"
  });
  const production = loadAuthConfig({
    ...localEnvironment,
    NODE_ENV: "production",
    APP_ORIGIN: "https://account.iweioo.com",
    OIDC_ISSUER: "https://auth.iweioo.com/realms/iweioo",
    BFF_REDIS_URL: "rediss://:production-redis-password@redis.internal:6379/0"
  });

  assert.notEqual(portal.sessionCookieName, account.sessionCookieName);
  assert.notEqual(portal.transactionCookieName, account.transactionCookieName);
  assert.equal(production.sessionCookieName, "__Host-iweioo_session");
  assert.equal(production.transactionCookieName, "__Host-iweioo_oidc_tx");
  assert.equal(production.secureCookies, true);
});

test("config rejects unsafe identifiers, origins, and unprotected Redis", () => {
  assert.throws(
    () => loadAuthConfig({ ...localEnvironment, AUTH_APP_ID: "Portal App" }),
    /AUTH_APP_ID/
  );
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
    () => loadAuthConfig({ ...localEnvironment, AUTH_MAX_SESSIONS_PER_USER: "1" }),
    /AUTH_MAX_SESSIONS_PER_USER/
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

test("return paths cannot escape the application origin", () => {
  assert.equal(safeReturnPath("/zh/?from=login#ready"), "/zh/?from=login#ready");
  assert.equal(safeReturnPath("https://evil.example/path", "/zh/"), "/zh/");
  assert.equal(safeReturnPath("//evil.example/path", "/zh/"), "/zh/");
  assert.equal(safeReturnPath("/\\evil.example", "/zh/"), "/zh/");
  assert.equal(safeReturnPath(null, "/zh/"), "/zh/");
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
  const sameOriginPatch = new Request("http://localhost:3000/api/platform/profile", {
    method: "PATCH",
    headers: { origin: "http://localhost:3000", "sec-fetch-site": "same-origin" }
  });

  assert.equal(isSameOriginPost(sameOrigin, "http://localhost:3000"), true);
  assert.equal(isSameOriginPost(crossOrigin, "http://localhost:3000"), false);
  assert.equal(isSameOriginMutation(sameOriginPatch, "http://localhost:3000"), true);
  assert.equal(isSameOriginMutation(crossOrigin, "http://localhost:3000"), false);
  assert.equal(constantTimeEqual("same-token", "same-token"), true);
  assert.equal(constantTimeEqual("same-token", "other-token"), false);
});

test("only verified OIDC identities become public session users", () => {
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
        sub: "9fe7173c-7644-42c4-a3d6-e912257e910e",
        email: "student@example.com",
        email_verified: false
      }),
    /verified email/
  );
});

test("Redis records and public DTOs require complete bounded models", () => {
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
    isBffSession({
      recordVersion: 2,
      sessionId: "11111111-1111-4111-8111-111111111111",
      appId: "portal",
      user: {
        platformUserId: "9fe7173c-7644-42c4-a3d6-e912257e910e",
        email: "student@example.com",
        displayName: "Student"
      },
      device: { category: "desktop", operatingSystem: "Windows" },
      accessToken: "access",
      refreshToken: "refresh",
      idToken: "id",
      accessTokenExpiresAt: new Date().toISOString(),
      csrfToken: "csrf",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    }),
    true
  );
  assert.equal(isBffSession({ user: {} }), false);
  assert.equal(isPublicSession({ authenticated: false }), true);
  assert.equal(
    isPublicSession({
      authenticated: true,
      user: {
        platformUserId: "9fe7173c-7644-42c4-a3d6-e912257e910e",
        email: "student@example.com",
        displayName: "Student"
      },
      csrfToken: "csrf",
      expiresAt: new Date().toISOString()
    }),
    true
  );
  assert.equal(isPublicSession({ authenticated: true, accessToken: "secret" }), false);
  assert.deepEqual(
    describeSessionDevice(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Mobile"
    ),
    { category: "mobile", operatingSystem: "iOS" }
  );
  assert.equal(
    isManagedSessionList([
      {
        sessionId: "22222222-2222-4222-8222-222222222222",
        appId: "account",
        device: { category: "desktop", operatingSystem: "macOS" },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        current: true
      }
    ]),
    true
  );
  assert.equal(
    isManagedSessionList([{ sessionId: "not-a-session", accessToken: "secret" }]),
    false
  );
});
