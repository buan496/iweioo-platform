import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadAuthConfig, type AuthConfig } from "../src/config";
import { createClient } from "redis";
import type { BffSession } from "../src/model";
import { randomHandle } from "../src/security";
import {
  closeAuthStoreConnections,
  createBffSession,
  listUserSessions,
  revokeAllUserSessions,
  revokeUserSession
} from "../src/store-core";

const redisUrl = process.env.SESSION_SMOKE_REDIS_URL;
if (!redisUrl) {
  throw new Error("SESSION_SMOKE_REDIS_URL is required");
}

function config(appId: "account" | "portal", maxSessionsPerUser: number): AuthConfig {
  const port = appId === "account" ? 3001 : 3000;
  return loadAuthConfig({
    NODE_ENV: "development",
    AUTH_APP_ID: appId,
    APP_ORIGIN: `http://localhost:${port}`,
    OIDC_ISSUER: "http://localhost:8080/realms/iweioo",
    OIDC_CLIENT_ID: `iweioo-${appId}`,
    OIDC_CLIENT_SECRET: "session-store-smoke-not-a-secret", // gitleaks:allow
    BFF_REDIS_URL: redisUrl,
    AUTH_MAX_SESSIONS_PER_USER: String(maxSessionsPerUser)
  });
}

function session(
  appId: "account" | "portal",
  platformUserId: string,
  createdAtMs: number
): BffSession {
  return {
    recordVersion: 2,
    sessionId: randomUUID(),
    appId,
    user: {
      platformUserId,
      email: "session-smoke@example.com",
      displayName: "Session Smoke"
    },
    device: {
      category: appId === "account" ? "mobile" : "desktop",
      operatingSystem: appId === "account" ? "Android" : "Linux"
    },
    accessToken: `access-${randomUUID()}`,
    refreshToken: `refresh-${randomUUID()}`,
    idToken: `id-${randomUUID()}`,
    accessTokenExpiresAt: new Date(createdAtMs + 60_000).toISOString(),
    csrfToken: randomHandle(),
    createdAt: new Date(createdAtMs).toISOString(),
    expiresAt: new Date(createdAtMs + 300_000).toISOString()
  };
}

async function main() {
  const portal = config("portal", 3);
  const account = config("account", 3);
  const userId = randomUUID();
  const now = Date.now();
  const portalSession = session("portal", userId, now);
  const accountSession = session("account", userId, now + 1);

  try {
    await createBffSession(portal, randomHandle(), portalSession, 300);
    await createBffSession(account, randomHandle(), accountSession, 300);
    const listed = await listUserSessions(account, userId, accountSession.sessionId);
    assert.deepEqual(
      listed.map((item) => [item.appId, item.current]),
      [
        ["account", true],
        ["portal", false]
      ]
    );
    const serialized = JSON.stringify(listed);
    for (const forbidden of ["access-", "refresh-", "id-", "session-smoke@example.com"]) {
      assert.equal(serialized.includes(forbidden), false);
    }
    const inspector = createClient({ url: redisUrl });
    await inspector.connect();
    try {
      const metadataKeys = await inspector.keys("iweioo:session-meta:*");
      assert.equal(metadataKeys.length, 2);
      const metadataValues = await inspector.mGet(metadataKeys);
      for (const raw of metadataValues) {
        assert.ok(raw);
        const metadata = JSON.parse(raw) as Record<string, unknown>;
        assert.deepEqual(Object.keys(metadata).sort(), [
          "appId",
          "createdAt",
          "device",
          "expiresAt",
          "sessionId"
        ]);
      }
    } finally {
      await inspector.close();
    }

    assert.equal(await revokeUserSession(account, userId, portalSession.sessionId), true);
    assert.equal(await revokeUserSession(account, userId, portalSession.sessionId), false);
    assert.equal((await listUserSessions(account, userId, accountSession.sessionId)).length, 1);
    assert.equal(await revokeAllUserSessions(account, userId), 1);
    assert.deepEqual(await listUserSessions(account, userId, accountSession.sessionId), []);

    const cappedUserId = randomUUID();
    const cappedPortal = config("portal", 2);
    const created = [0, 1, 2].map((offset) =>
      session("portal", cappedUserId, now + 100 + offset)
    );
    for (const candidate of created) {
      await createBffSession(cappedPortal, randomHandle(), candidate, 300);
    }
    const capped = await listUserSessions(cappedPortal, cappedUserId, created[2].sessionId);
    assert.equal(capped.length, 2);
    assert.equal(capped.some((item) => item.sessionId === created[0].sessionId), false);
    await revokeAllUserSessions(cappedPortal, cappedUserId);
  } finally {
    await closeAuthStoreConnections();
  }
}

await main();
