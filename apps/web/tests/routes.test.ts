import assert from "node:assert/strict";
import test from "node:test";
import { canonicalPublicPath } from "../lib/public-route";

test("public pages keep canonical slashes without rewriting exact BFF routes", () => {
  assert.equal(canonicalPublicPath("/zh"), "/zh/");
  assert.equal(canonicalPublicPath("/zh/blog"), "/zh/blog/");
  assert.equal(canonicalPublicPath("/zh/"), null);
  assert.equal(canonicalPublicPath("/auth/callback"), null);
  assert.equal(canonicalPublicPath("/api/auth/session"), null);
  assert.equal(canonicalPublicPath("/robots.txt"), null);
});
