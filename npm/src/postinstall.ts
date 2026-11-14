import { createRequire } from "node:module";
import { findCurrentPlatform, getPlatformPackageName } from "./platforms";
import { chmod, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const ext = process.platform === "win32" ? ".exe" : "";

// Replace the placeholder script that package.json#bin points to. Package
// managers link `.bin/buildc` to this file, wherever their `.bin` dir is, and
// the postinstall's CWD is this package's directory, not the project's.
const targetPath = fileURLToPath(new URL("./buildc", import.meta.url));
let sourcePath: string | undefined;

const platforms = findCurrentPlatform();
const require = globalThis.require ?? createRequire(import.meta.url);
for (const test of platforms) {
  try {
    const binModule = `${getPlatformPackageName(test)}/buildc${ext}`;
    sourcePath = require.resolve(binModule);
    break;
  } catch {
    // TODO: only ignore MODULE_NOT_FOUND errors
  }
}
if (!sourcePath) {
  console.error("Buildc does not support your OS/arch:", {
    os: process.platform,
    arch: process.arch,
  });
  process.exit(1);
}

await copyFile(sourcePath, targetPath);
await chmod(targetPath, 0o755);
