#!/usr/bin/env node

// To test, just run `cd npm && node postinstall.js`
import pkg from "./package.json" with { type: "json" };
import path from "node:path";
import fs from "node:fs";

const os = process.platform === "win32" ? "windows" : process.platform;
const arch = process.arch === "arm64" ? "arm64" : "x64";
const { version } = pkg;
const binUrl = `https://github.com/aklinker1/buildc/releases/download/v${version}/buildc-${os}-${arch}`;

const downloadTo = path.resolve("buildc");

console.log("Downloading binary:", binUrl);
console.log("To:", downloadTo);

// TODO: Check SHA before redownloading the same binary.
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

function toBuffer(arrayBuffer) {
  const buffer = Buffer.alloc(arrayBuffer.byteLength);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; ++i) {
    buffer[i] = view[i];
  }
  return buffer;
}
