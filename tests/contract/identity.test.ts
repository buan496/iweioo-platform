import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

type JsonObject = Record<string, unknown>;

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(relativePath: string): JsonObject {
  return JSON.parse(read(relativePath)) as JsonObject;
}

function collectKeys(value: unknown, result: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, result));
    return result;
  }
  if (!value || typeof value !== "object") {
    return result;
  }
  for (const [key, item] of Object.entries(value as JsonObject)) {
    result.push(key);
    collectKeys(item, result);
  }
  return result;
}

test("local realm enforces the accepted email and password baseline", () => {
  const realm = readJson("deploy/keycloak/realm/iweioo-realm.json");

  assert.equal(realm.realm, "iweioo");
  assert.equal(realm.enabled, true);
  assert.equal(realm.registrationAllowed, true);
  assert.equal(realm.registrationEmailAsUsername, true);
  assert.equal(realm.verifyEmail, true);
  assert.equal(realm.resetPasswordAllowed, true);
  assert.equal(realm.bruteForceProtected, true);
  assert.equal(realm.accessTokenLifespan, 300);
  assert.match(String(realm.passwordPolicy), /length\(12\)/);
  assert.match(String(realm.passwordPolicy), /notUsername/);
  assert.deepEqual(realm.users, []);
  assert.ok(!collectKeys(realm).some((key) => ["clientSecret", "privateKey", "secret"].includes(key)));

  const smtp = realm.smtpServer as JsonObject;
  assert.equal(smtp.host, "identity-mail");
  assert.equal(smtp.port, "1025");
  assert.equal(smtp.auth, "false");

  const roles = (realm.roles as JsonObject).realm as JsonObject[];
  assert.deepEqual(
    roles.map((role) => role.name).sort(),
    ["auditor", "content_operator", "platform_admin", "support_agent", "user"]
  );
});

test("local OIDC clients are confidential BFF clients with exact PKCE routes", () => {
  const realm = readJson("deploy/keycloak/realm/iweioo-realm.json");
  const clients = realm.clients as JsonObject[];
  const expectedPorts: Record<string, number> = {
    "iweioo-account": 3001,
    "iweioo-defense": 3200,
    "iweioo-interview": 3100,
    "iweioo-portal": 3000
  };

  assert.deepEqual(
    clients.map((client) => client.clientId).sort(),
    Object.keys(expectedPorts).sort()
  );

  for (const client of clients) {
    const clientId = String(client.clientId);
    const origin = `http://localhost:${expectedPorts[clientId]}`;
    assert.equal(client.publicClient, false);
    assert.equal(client.standardFlowEnabled, true);
    assert.equal(client.implicitFlowEnabled, false);
    assert.equal(client.directAccessGrantsEnabled, false);
    assert.equal(client.serviceAccountsEnabled, false);
    assert.equal(client.fullScopeAllowed, false);
    assert.deepEqual(client.redirectUris, [`${origin}/auth/callback`]);
    assert.deepEqual(client.webOrigins, [origin]);

    const attributes = client.attributes as JsonObject;
    assert.equal(attributes["pkce.code.challenge.method"], "S256");
    assert.equal(attributes["post.logout.redirect.uris"], `${origin}/`);
    assert.ok(!JSON.stringify(client).includes("*"));

    const mappers = client.protocolMappers as JsonObject[];
    const audience = mappers.find((mapper) => mapper.protocolMapper === "oidc-audience-mapper");
    assert.ok(audience);
    assert.equal((audience.config as JsonObject)["included.client.audience"], clientId);
  }
});

test("portal exposes a server-side OIDC BFF without browser token storage", () => {
  const nextConfig = read("apps/web/next.config.ts");
  const webPackage = readJson("apps/web/package.json");
  const authConfig = read("apps/web/lib/auth/config.ts");
  const oidc = read("apps/web/lib/auth/oidc.ts");
  const callback = read("apps/web/app/auth/callback/route.ts");
  const logout = read("apps/web/app/auth/logout/route.ts");
  const session = read("apps/web/app/api/auth/session/route.ts");
  const proxy = read("apps/web/proxy.ts");

  assert.ok(!nextConfig.includes('output: "export"'));
  assert.match(nextConfig, /skipTrailingSlashRedirect: true/);
  assert.equal((webPackage.scripts as JsonObject).start, "next start");
  const dependencies = webPackage.dependencies as JsonObject;
  assert.match(String(dependencies["openid-client"]), /^\^6\./);
  assert.match(String(dependencies.redis), /^\^6\./);

  assert.match(authConfig, /__Host-iweioo_session/);
  assert.match(authConfig, /httpOnly: true/);
  assert.match(authConfig, /sameSite: "lax"/);
  assert.ok(!authConfig.includes("domain:"));
  assert.match(oidc, /randomPKCECodeVerifier/);
  assert.match(oidc, /randomState/);
  assert.match(oidc, /randomNonce/);
  assert.match(oidc, /prompt = "create"/);
  assert.match(callback, /verifiedUserFromClaims/);
  assert.match(logout, /export async function POST/);
  assert.ok(!logout.includes("export async function GET"));
  assert.match(logout, /constantTimeEqual/);
  assert.match(session, /authenticated: false/);
  assert.ok(!session.includes("accessToken: session.accessToken"));
  assert.ok(!session.includes("refreshToken: session.refreshToken"));
  assert.match(proxy, /canonicalPublicPath/);
  assert.match(proxy, /NextResponse\.redirect\(target, 308\)/);
});

test("identity Compose is local-only, pinned, and keeps data services private", () => {
  const compose = read("deploy/compose/identity.compose.yml");
  const envExample = read("deploy/compose/.env.identity.example");
  const databaseBlock = compose.match(/  identity-db:\n([\s\S]*?)\n  identity-mail:/)?.[1];
  const mailBlock = compose.match(/  identity-mail:\n([\s\S]*?)\n  identity-session:/)?.[1];
  const sessionBlock = compose.match(/  identity-session:\n([\s\S]*?)\n  identity:/)?.[1];
  const identityBlock = compose.match(/  identity:\n([\s\S]*?)\nnetworks:/)?.[1];

  assert.match(compose, /quay\.io\/keycloak\/keycloak:26\.6\.4/);
  assert.match(compose, /postgres:18\.4-alpine3\.24/);
  assert.match(compose, /axllent\/mailpit:v1\.30\.0/);
  assert.match(compose, /redis:8\.4\.4-alpine3\.22/);
  assert.ok(!compose.includes(":latest"));
  assert.match(compose, /127\.0\.0\.1:\$\{KEYCLOAK_HTTP_PORT:-8080\}:8080/);
  assert.match(compose, /127\.0\.0\.1:\$\{MAILPIT_UI_PORT:-8025\}:8025/);
  assert.match(compose, /127\.0\.0\.1:\$\{IDENTITY_REDIS_PORT:-6379\}:6379/);
  assert.ok(!compose.includes(":5432\""));
  assert.ok(!compose.includes(":1025\""));
  assert.match(compose, /identity-postgres:\/var\/lib\/postgresql/);
  assert.match(compose, /internal: true/);
  assert.match(compose, /identity-edge:/);
  assert.match(compose, /no-new-privileges:true/);
  assert.ok(databaseBlock);
  assert.ok(mailBlock);
  assert.ok(sessionBlock);
  assert.ok(identityBlock);
  assert.match(databaseBlock, /- identity-internal/);
  assert.ok(!databaseBlock.includes("identity-edge"));
  assert.match(mailBlock, /- identity-internal/);
  assert.match(mailBlock, /- identity-edge/);
  assert.match(sessionBlock, /- identity-edge/);
  assert.ok(!sessionBlock.includes("identity-internal"));
  assert.match(sessionBlock, /--appendonly no/);
  assert.match(sessionBlock, /--maxmemory 192mb/);
  assert.match(sessionBlock, /--maxmemory-policy volatile-ttl/);
  assert.match(sessionBlock, /--requirepass/);
  assert.match(identityBlock, /- identity-internal/);
  assert.match(identityBlock, /- identity-edge/);
  assert.match(envExample, /^KC_BOOTSTRAP_ADMIN_PASSWORD=$/m);
  assert.match(envExample, /^KEYCLOAK_DB_PASSWORD=$/m);
  assert.match(envExample, /^IDENTITY_REDIS_PASSWORD=$/m);
});
