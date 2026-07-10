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

test("identity Compose is local-only, pinned, and keeps data services private", () => {
  const compose = read("deploy/compose/identity.compose.yml");
  const envExample = read("deploy/compose/.env.identity.example");

  assert.match(compose, /quay\.io\/keycloak\/keycloak:26\.6\.4/);
  assert.match(compose, /postgres:18\.4-alpine3\.24/);
  assert.match(compose, /axllent\/mailpit:v1\.30\.0/);
  assert.ok(!compose.includes(":latest"));
  assert.match(compose, /127\.0\.0\.1:\$\{KEYCLOAK_HTTP_PORT:-8080\}:8080/);
  assert.match(compose, /127\.0\.0\.1:\$\{MAILPIT_UI_PORT:-8025\}:8025/);
  assert.ok(!compose.includes(":5432\""));
  assert.ok(!compose.includes(":1025\""));
  assert.match(compose, /identity-postgres:\/var\/lib\/postgresql/);
  assert.match(compose, /internal: true/);
  assert.match(compose, /no-new-privileges:true/);
  assert.match(envExample, /^KC_BOOTSTRAP_ADMIN_PASSWORD=$/m);
  assert.match(envExample, /^KEYCLOAK_DB_PASSWORD=$/m);
});
