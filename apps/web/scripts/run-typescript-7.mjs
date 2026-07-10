import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const packageDirectory = dirname(require.resolve("typescript-7/package.json"));
const compiler = resolve(packageDirectory, "bin", "tsc");
const result = spawnSync(process.execPath, [compiler, ...process.argv.slice(2)], {
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
