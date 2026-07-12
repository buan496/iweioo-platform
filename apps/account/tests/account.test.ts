import assert from "node:assert/strict";
import test from "node:test";
import { accountCopy, accountLocales, isAccountLocale } from "../lib/i18n";
import {
  isApplicationSummaryList,
  isConsentBundle,
  isCurrentUser
} from "../lib/platform-public";

test("account center exposes only supported locales", () => {
  assert.deepEqual(accountLocales, ["zh", "en"]);
  assert.equal(isAccountLocale("zh"), true);
  assert.equal(isAccountLocale("en"), true);
  assert.equal(isAccountLocale("fr"), false);
});

test("consent copy is explicit that optional sharing is not granted", () => {
  assert.equal(accountCopy.zh.notGranted, "未授权");
  assert.equal(accountCopy.en.notGranted, "Not granted");
  assert.match(accountCopy.zh.profileIntro, /Platform API 和 PostgreSQL/);
  assert.match(accountCopy.en.profileIntro, /Platform API and PostgreSQL/);
});

test("platform response guards reject incomplete account data", () => {
  assert.equal(
    isCurrentUser({
      user_id: "11111111-1111-4111-8111-111111111111",
      status: "active",
      email: "student@example.com",
      email_verified: true,
      created_at: new Date().toISOString(),
      profile: { display_name: "Student", locale: "zh-CN", timezone: "Asia/Shanghai" }
    }),
    true
  );
  assert.equal(isCurrentUser({ profile: {} }), false);
  assert.equal(
    isCurrentUser({
      user_id: "11111111-1111-4111-8111-111111111111",
      status: "active",
      email: "student@example.com",
      email_verified: false,
      created_at: new Date().toISOString(),
      profile: { display_name: "Student", locale: "zh-CN", timezone: "Asia/Shanghai" }
    }),
    false
  );
  assert.equal(
    isConsentBundle({
      consents: [],
      policies: {
        agent_memory: "beta-2026-07-10",
        growth_profile: "beta-2026-07-10"
      }
    }),
    true
  );
  assert.equal(isConsentBundle({ consents: [], policies: {} }), false);
  assert.equal(
    isConsentBundle({
      consents: [{ purpose: "growth_profile", status: "granted", policy_version: "", updated_at: "never" }],
      policies: {
        agent_memory: "beta-2026-07-10",
        growth_profile: "beta-2026-07-10"
      }
    }),
    false
  );
  assert.equal(
    isApplicationSummaryList([
      {
        app_id: "interview",
        name: "iweioo Interview",
        url: "https://interview.iweioo.com/",
        availability: "planned",
        user_state: "not_started",
        first_used_at: null,
        last_used_at: null
      }
    ]),
    true
  );
  assert.equal(
    isApplicationSummaryList([
      {
        app_id: "interview",
        name: "iweioo Interview",
        url: "https://attacker.example/",
        availability: "available",
        user_state: "active"
      }
    ]),
    false
  );
});
