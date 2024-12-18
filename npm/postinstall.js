// To test, just run `cd npm && node postinstall.js`
import pkg from "./package.json" with { type: "json" };
import path from "node:path";
import fs from "node:fs";

const os = process.platform === "win32" ? "windows" : process.platform;
const arch = process.arch === "arm64" ? "arm64" : "x64";
const { version } = pkg;
const binUrl = `https://github.com/aklinker1/buildc/releases/download/v${version}/buildc-${os}-${arch}`;

const binDir = findNodeModulesBin();
const downloadTo = path.join(binDir, "buildc");

console.log("Downloading binary:", binUrl);
console.log("To:", downloadTo);

const res = await fetch(binUrl);
if (!res.ok) {
  console.error(`Failed to download binary: ${res.status} ${res.statusText}`);
  process.exit(1);
}

const bin = toBuffer(await res.arrayBuffer());
fs.writeFileSync(downloadTo, bin);
fs.chmodSync(downloadTo, 0o755);
console.log("Done!");

///
/// HELPERS
///

function findNodeModulesBin() {
  let currentDir = process.cwd();
  while (currentDir !== path.parse(currentDir).root) {
    const binPath = path.join(currentDir, "node_modules", ".bin");
    if (fs.existsSync(binPath)) {
      return binPath;
    }
    currentDir = path.dirname(currentDir);
  }
  return null;
}

function toBuffer(arrayBuffer) {
  const buffer = Buffer.alloc(arrayBuffer.byteLength);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; ++i) {
    buffer[i] = view[i];
  }
  return buffer;
}
