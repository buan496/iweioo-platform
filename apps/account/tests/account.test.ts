import assert from "node:assert/strict";
import test from "node:test";
import { accountCopy, accountLocales, isAccountLocale } from "../lib/i18n";

test("account center exposes only supported locales", () => {
  assert.deepEqual(accountLocales, ["zh", "en"]);
  assert.equal(isAccountLocale("zh"), true);
  assert.equal(isAccountLocale("en"), true);
  assert.equal(isAccountLocale("fr"), false);
});

test("consent copy is explicit that optional sharing is not granted", () => {
  assert.equal(accountCopy.zh.notGranted, "未授权");
  assert.equal(accountCopy.en.notGranted, "Not granted");
  assert.match(accountCopy.zh.profileIntro, /不使用浏览器或临时内存伪造写入/);
  assert.match(accountCopy.en.profileIntro, /does not fake writes/);
});
