import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

type JsonObject = Record<string, unknown>;

const root = process.cwd();

function readJson(relativePath: string): JsonObject {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8")) as JsonObject;
}

function collectOperationIds(value: unknown, result: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((item) => collectOperationIds(item, result));
    return result;
  }
  if (!value || typeof value !== "object") {
    return result;
  }
  for (const [key, item] of Object.entries(value as JsonObject)) {
    if (key === "operationId" && typeof item === "string") {
      result.push(item);
    }
    collectOperationIds(item, result);
  }
  return result;
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

test("platform OpenAPI contract contains unique operations and required boundaries", () => {
  const contract = readJson("contracts/openapi/platform-api.json");
  assert.equal(contract.openapi, "3.1.0");

  const paths = contract.paths as JsonObject;
  const requiredPaths = [
    "/users/me",
    "/users/me/credit-account",
    "/users/me/growth-profile",
    "/users/me/data-requests",
    "/internal/usage/holds",
    "/internal/events"
  ];
  requiredPaths.forEach((requiredPath) => assert.ok(paths[requiredPath], requiredPath));

  const operationIds = collectOperationIds(paths);
  assert.equal(new Set(operationIds).size, operationIds.length);
  assert.ok(operationIds.length >= 10);

  const components = contract.components as JsonObject;
  const securitySchemes = (components.securitySchemes ?? {}) as JsonObject;
  assert.ok(securitySchemes.userOidc);
  assert.ok(securitySchemes.serviceOAuth);

  const schemas = (components.schemas ?? {}) as JsonObject;
  const microAmount = schemas.MicroAmount as JsonObject;
  assert.equal(microAmount.type, "string");
});

test("event schema excludes sensitive classification and examples use safe envelopes", () => {
  const schema = readJson("contracts/events/event-envelope.schema.json");
  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");

  const properties = schema.properties as JsonObject;
  const classification = properties.data_classification as JsonObject;
  assert.deepEqual(classification.enum, ["public", "internal", "personal"]);

  const forbiddenKeys = new Set([
    "answer_text",
    "document_content",
    "password",
    "prompt",
    "raw_text",
    "resume_text",
    "thesis_text",
    "transcript"
  ]);
  const examplesDirectory = path.join(root, "contracts/events/examples");
  const examples = readdirSync(examplesDirectory).filter((name) => name.endsWith(".json"));
  assert.ok(examples.length >= 2);

  for (const exampleName of examples) {
    const example = readJson(path.join("contracts/events/examples", exampleName));
    assert.equal(example.specversion, "1.0");
    assert.equal(example.datacontenttype, "application/json");
    assert.match(String(example.type), /^iweioo\.[a-z0-9_.-]+\.v[1-9][0-9]*$/);
    assert.ok(!collectKeys(example).some((key) => forbiddenKeys.has(key)));
  }
});

test("application manifests define strict identity, billing, and privacy boundaries", () => {
  const schema = readJson("contracts/applications/application-manifest.schema.json");
  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");

  const manifestDirectory = path.join(root, "contracts/applications");
  const manifests = readdirSync(manifestDirectory)
    .filter((name) => name.endsWith(".json") && name !== "application-manifest.schema.json")
    .map((name) => readJson(path.join("contracts/applications", name)));

  assert.deepEqual(
    manifests.map((manifest) => manifest.app_id).sort(),
    ["defense", "interview"]
  );

  const forbiddenKeys = new Set(["client_secret", "password", "private_key", "token"]);
  for (const manifest of manifests) {
    const appId = String(manifest.app_id);
    assert.equal(manifest.schema_version, "1.0");
    assert.equal(manifest.status, "planned");
    assert.equal(new URL(String(manifest.public_base_url)).hostname, `${appId}.iweioo.com`);
    assert.ok(!collectKeys(manifest).some((key) => forbiddenKeys.has(key)));

    const oidc = manifest.oidc as JsonObject;
    const redirectUris = oidc.redirect_uris as string[];
    assert.ok(redirectUris.every((uri) => uri.startsWith(`https://${appId}.iweioo.com/`)));
    assert.ok(redirectUris.every((uri) => !uri.includes("*")));

    const billing = manifest.billing as JsonObject;
    assert.equal(billing.authority, "iweioo-platform-api");
    assert.equal(billing.billable, true);

    const privacy = manifest.privacy as JsonObject;
    assert.equal(privacy.lifecycle_callback_path, "/internal/v1/privacy/jobs");
    assert.ok(!Object.hasOwn(privacy, "lifecycle_callback_url"));
  }
});
