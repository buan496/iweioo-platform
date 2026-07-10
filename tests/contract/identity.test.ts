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

test("portal and account consume the shared server-side OIDC BFF", () => {
  const portalConfig = read("apps/web/next.config.ts");
  const accountConfig = read("apps/account/next.config.ts");
  const webPackage = readJson("apps/web/package.json");
  const accountPackage = readJson("apps/account/package.json");
  const authPackage = readJson("packages/auth-bff/package.json");
  const authConfig = read("packages/auth-bff/src/config.ts");
  const authEntry = read("packages/auth-bff/src/index.ts");
  const publicAuthEntry = read("packages/auth-bff/src/public.ts");
  const oidc = read("packages/auth-bff/src/oidc.ts");
  const handlers = read("packages/auth-bff/src/next.ts");
  const portalCallback = read("apps/web/app/auth/callback/route.ts");
  const accountCallback = read("apps/account/app/auth/callback/route.ts");
  const accountCopy = read("apps/account/lib/i18n.ts");
  const accountLayout = read("apps/account/app/[locale]/layout.tsx");
  const portalControls = read("apps/web/components/AuthControls.tsx");
  const portalEnv = read("apps/web/.env.example");
  const proxy = read("apps/web/proxy.ts");

  assert.ok(!portalConfig.includes('output: "export"'));
  assert.ok(!accountConfig.includes('output: "export"'));
  assert.match(portalConfig, /skipTrailingSlashRedirect: true/);
  assert.match(accountConfig, /skipTrailingSlashRedirect: true/);
  assert.match(portalConfig, /@iweioo\/auth-bff/);
  assert.match(accountConfig, /@iweioo\/auth-bff/);
  assert.equal((webPackage.scripts as JsonObject).start, "next start");
  assert.equal((accountPackage.scripts as JsonObject).start, "next start -p 3001");
  assert.equal((webPackage.dependencies as JsonObject)["@iweioo/auth-bff"], "0.1.0");
  assert.equal((accountPackage.dependencies as JsonObject)["@iweioo/auth-bff"], "0.1.0");
  const authDependencies = authPackage.dependencies as JsonObject;
  assert.match(String(authDependencies["openid-client"]), /^\^6\./);
  assert.match(String(authDependencies.redis), /^\^6\./);

  assert.match(authConfig, /__Host-iweioo_session/);
  assert.match(authConfig, /iweioo_\$\{appId\}_session/);
  assert.match(authConfig, /AUTH_APP_ID/);
  assert.match(authConfig, /httpOnly: true/);
  assert.match(authConfig, /sameSite: "lax"/);
  assert.ok(!authConfig.includes("domain:"));
  assert.match(authEntry, /import "server-only"/);
  assert.ok(!authEntry.includes("isPublicSession"));
  assert.match(publicAuthEntry, /isPublicSession/);
  assert.match(oidc, /randomPKCECodeVerifier/);
  assert.match(oidc, /randomState/);
  assert.match(oidc, /randomNonce/);
  assert.match(oidc, /prompt = "create"/);
  assert.match(handlers, /verifiedUserFromClaims/);
  assert.match(handlers, /constantTimeEqual/);
  assert.match(handlers, /authenticated: false/);
  assert.ok(!handlers.includes("accessToken: session.accessToken"));
  assert.ok(!handlers.includes("refreshToken: session.refreshToken"));
  assert.match(portalCallback, /handleAuthorizationCallback/);
  assert.match(accountCallback, /handleAuthorizationCallback/);
  assert.match(accountCopy, /不使用浏览器或临时内存伪造写入/);
  assert.match(accountCopy, /Not granted/);
  assert.match(accountLayout, /NEXT_PUBLIC_PORTAL_URL/);
  assert.match(accountLayout, /https:\/\/iweioo\.com/);
  assert.match(portalControls, /NEXT_PUBLIC_ACCOUNT_URL/);
  assert.match(portalControls, /https:\/\/account\.iweioo\.com/);
  assert.match(portalEnv, /^NEXT_PUBLIC_ACCOUNT_URL=http:\/\/localhost:3001$/m);
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
