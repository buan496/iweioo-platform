import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

type PackageManifest = {
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};

type PackageLock = {
  packages: Record<string, { name?: string; version?: string }>;
};

async function readManifest(path: string): Promise<PackageManifest> {
  return JSON.parse(await readFile(path, "utf8")) as PackageManifest;
}

test("TypeScript compiler boundaries remain workspace-owned", async () => {
  const [web, ui, sdk, lock] = await Promise.all([
    readManifest("apps/web/package.json"),
    readManifest("packages/ui/package.json"),
    readManifest("packages/sdk/package.json"),
    readFile("package-lock.json", "utf8").then(
      (content) => JSON.parse(content) as PackageLock,
    ),
  ]);

  assert.match(
    web.devDependencies?.typescript ?? "",
    /^npm:@typescript\/typescript6@\^6\./,
  );
  assert.match(
    web.devDependencies?.["typescript-7"] ?? "",
    /^npm:typescript@\^7\./,
  );
  assert.equal(
    web.scripts?.typecheck,
    "node scripts/run-typescript-7.mjs --noEmit",
  );
  assert.match(ui.devDependencies?.typescript ?? "", /^\^7\./);
  assert.match(sdk.devDependencies?.typescript ?? "", /^5\.[0-9]+\.[0-9]+$/);

  assert.equal(
    lock.packages["apps/web/node_modules/typescript"]?.name,
    "@typescript/typescript6",
  );
  assert.match(
    lock.packages["apps/web/node_modules/typescript"]?.version ?? "",
    /^6\./,
  );
  assert.match(lock.packages["node_modules/typescript-7"]?.version ?? "", /^7\./);
  assert.match(
    lock.packages["packages/sdk/node_modules/typescript"]?.version ?? "",
    /^5\./,
  );
  assert.match(
    lock.packages["packages/ui/node_modules/typescript"]?.version ?? "",
    /^7\./,
  );

  const compiler = spawnSync(
    process.execPath,
    ["apps/web/scripts/run-typescript-7.mjs", "--version"],
    { encoding: "utf8" },
  );
  assert.equal(compiler.status, 0, compiler.stderr);
  assert.match(compiler.stdout, /^Version 7\./);
});
