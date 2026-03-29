import { createRequire } from "node:module";
import { findCurrentPlatform, getPlatformPackageName } from "./platforms";
import { symlink } from "node:fs/promises";

const ext = process.platform === "win32" ? ".exe" : "";

const targetPath = `node_modules/.bin/buildc${ext}`;
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

await symlink(sourcePath, targetPath, "file");
