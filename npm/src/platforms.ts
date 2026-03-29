import { packageName } from "./constants";

export type OS = "win32" | "linux" | "darwin";
export type Arch = "arm64" | "x64";

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

export function findCurrentPlatform(): Platform[] {
  return platforms.filter((p) =>
    p.name.startsWith(`${process.platform}-${process.arch}`),
  );
}
