import { packageName } from "./constants";

export type OS = "win32" | "linux" | "darwin";
export type Arch = "arm64" | "x64";

// export const os = process.platform as OS;
// export const arch = process.arch as Arch;

export type Platform = {
  /** Suffix for the NPM package and uploaded artifact. */
  name: `${OS}-${Arch}${string}`;
  /** GitHub actions runner to use. */
  runner: string;
  /** Target tuple used by Cargo. */
  target: string;
  /** Use [cross](https://github.com/cross-rs/cross) to build instead of cargo. */
  cross?: true;
};

const macRunner = "macos-latest";
const linuxRunner = "ubuntu-latest";
const windowsRunner = "windows-latest";

export const platforms: Platform[] = [
  {
    name: "darwin-arm64",
    runner: macRunner,
    target: "aarch64-apple-darwin",
  },
  {
    name: "darwin-x64",
    runner: macRunner,
    target: "x86_64-apple-darwin",
  },
  {
    name: "linux-arm64",
    runner: linuxRunner,
    target: "aarch64-unknown-linux-gnu",
    cross: true,
  },
  {
    name: "linux-x64",
    runner: linuxRunner,
    target: "x86_64-unknown-linux-gnu",
    cross: true,
  },
  {
    name: "linux-arm64-musl",
    runner: linuxRunner,
    target: "aarch64-unknown-linux-musl",
  },
  {
    name: "linux-x64-musl",
    runner: linuxRunner,
    target: "x86_64-unknown-linux-musl",
  },
  {
    name: "win32-x64",
    runner: windowsRunner,
    target: "x86_64-pc-windows-msvc",
  },
  {
    name: "win32-arm64",
    runner: windowsRunner,
    target: "aarch64-pc-windows-msvc",
  },
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
