import { readdirSync } from "node:fs";
import { packageName } from "./constants";

export type OS = "win32" | "linux" | "darwin";
export type Arch = "arm64" | "x64";
export type Libc = "glibc" | "musl";

export type Platform = {
  /** Suffix for the NPM package and uploaded artifact. */
  name: `${OS}-${Arch}${string}`;
  /** Target tuple used by Cargo. */
  target: string;
};

export const platforms: Platform[] = [
  { name: "darwin-arm64", target: "aarch64-apple-darwin" },
  { name: "darwin-x64", target: "x86_64-apple-darwin" },
  { name: "linux-arm64", target: "aarch64-unknown-linux-gnu" },
  { name: "linux-x64", target: "x86_64-unknown-linux-gnu" },
  { name: "linux-arm64-musl", target: "aarch64-unknown-linux-musl" },
  { name: "linux-x64-musl", target: "x86_64-unknown-linux-musl" },
  { name: "win32-x64", target: "x86_64-pc-windows-msvc" },
  { name: "win32-arm64", target: "aarch64-pc-windows-msvc" },
];

export function getPlatformPackageName(platform: Platform): string {
  return `${packageName}-${platform.name}`;
}

export function getPlatformBinName(platform: Platform): string {
  return `buildc-${platform.name}`;
}

/** Returns the libc a platform's binary is linked against, or `undefined` if the OS has no libc variants. */
export function getPlatformLibc(platform: Platform): Libc | undefined {
  if (!platform.name.startsWith("linux-")) return undefined;
  return platform.name.endsWith("-musl") ? "musl" : "glibc";
}

/** Detects the libc of the current Linux system, or `undefined` if not on Linux. */
export function detectCurrentLibc(): Libc | undefined {
  if (process.platform !== "linux") return undefined;

  // The diagnostic report only includes `glibcVersionRuntime` when running on glibc.
  const header = (
    process.report?.getReport() as
      | { header?: { glibcVersionRuntime?: string } }
      | undefined
  )?.header;
  if (header) return header.glibcVersionRuntime ? "glibc" : "musl";

  // If reports are unavailable, fall back to looking for musl's dynamic loader.
  try {
    return readdirSync("/lib").some((file) => file.startsWith("ld-musl-"))
      ? "musl"
      : "glibc";
  } catch {
    return "glibc";
  }
}

export function findCurrentPlatform(): Platform[] {
  const os =
    process.platform === "win32"
      ? "win32"
      : process.platform === "darwin"
        ? "darwin"
        : "linux";
  const libc = detectCurrentLibc();
  return platforms.filter(
    (p) =>
      p.name.startsWith(`${os}-${process.arch}`) &&
      getPlatformLibc(p) === libc,
  );
}
