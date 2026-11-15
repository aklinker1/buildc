import { mkdir } from "node:fs/promises";
import {
  getPlatformBinName,
  getPlatformLibc,
  getPlatformPackageName,
  platforms,
  type Platform,
} from "./platforms";
import { copyFile } from "node:fs/promises";
import { styleText } from "node:util";
import { logFile } from "./utils";
import {
  license,
  publishConfig,
  readmeContents,
  repository,
} from "./constants";
import { getVersion } from "./version";
import { signMacosBinary } from "./sign-macos";

if (import.meta.main) {
  const name = process.argv[2];
  if (!name) {
    console.error("No platform name provided");
    process.exit(1);
  }

  const platform = platforms.find((p) => p.name === name);
  if (!platform) {
    console.error(`Platform not found: ${name}`);
    process.exit(1);
  }

  await Bun.$`rustup target add ${platform.target}`;
  await buildPlatforms([platform]);
}

export async function buildPlatforms(platforms: Platform[]): Promise<void> {
  await compile(platforms);
  // Packaging is dominated by waiting on Apple's notary service, so do it
  // concurrently.
  await Promise.all(platforms.map(packagePlatform));
}

function isWindows(platform: Platform): boolean {
  return platform.name.startsWith("win32");
}

/**
 * Passing all targets to a single cargo invocation lets cargo build them in
 * parallel. That matters because the release profile's fat LTO and single
 * codegen unit leave most of each target's build on one core.
 */
async function compile(platforms: Platform[]): Promise<void> {
  const windows = platforms.filter(isWindows);
  const others = platforms.filter((p) => !isWindows(p));
  const targetArgs = (group: Platform[]) =>
    group.flatMap((p) => ["--target", p.target]);
  const names = (group: Platform[]) => group.map((p) => p.name).join(", ");

  if (others.length > 0) {
    console.log(styleText("cyan", `\nBuilding ${names(others)}`));
    await Bun.$`cargo zigbuild --release ${targetArgs(others)}`.cwd("..");
  }
  if (windows.length > 0) {
    console.log(styleText("cyan", `\nBuilding ${names(windows)}`));
    await Bun.$`cargo xwin build --release ${targetArgs(windows)}`.cwd("..");
  }
}

async function packagePlatform(platform: Platform): Promise<void> {
  const { name, target } = platform;
  const binName = getPlatformBinName(platform);
  const packageName = getPlatformPackageName(platform);
  const ext = isWindows(platform) ? ".exe" : "";
  const binPath = `../target/${target}/release/aklinker1_buildc${ext}`;
  const artifactsDir = `dist/artifacts`;
  const artifactsBinPath = `${artifactsDir}/${binName}${ext}`;
  const npmPackageDir = `dist/${packageName}`;
  const npmBinPath = `${npmPackageDir}/buildc${ext}`;
  const npmReadme = Bun.file(`${npmPackageDir}/README.md`);
  const npmPackageJson = Bun.file(`${npmPackageDir}/package.json`);
  const version = await getVersion();
  const parts = name.split("-", 2);
  const libc = getPlatformLibc(platform);

  console.log(styleText("cyan", `\nCopying ${name} artifact`));

  await mkdir(artifactsDir, { recursive: true });
  await copyFile(binPath, artifactsBinPath);
  if (name.startsWith("darwin")) await signMacosBinary(artifactsBinPath);
  logFile(artifactsDir, Bun.file(artifactsBinPath));

  console.log(styleText("cyan", `\nGenerating ${packageName} NPM package`));

  await mkdir(npmPackageDir, { recursive: true });
  await copyFile(artifactsBinPath, npmBinPath);
  logFile(npmPackageDir, Bun.file(npmBinPath));

  await npmReadme.write(readmeContents);
  logFile(npmPackageDir, npmReadme);
  await npmPackageJson.write(
    JSON.stringify(
      {
        name: packageName,
        version,
        description: `The "${target}" binary for @aklinker1/buildc`,
        license,
        repository,
        publishConfig,
        os: [parts[0]],
        cpu: [parts[1]],
        // Without this, package managers install both the glibc and musl
        // packages on Linux.
        ...(libc && { libc: [libc] }),
      },
      null,
      2,
    ),
  );
  logFile(npmPackageDir, npmPackageJson);

  console.log(`\n${styleText("green", "✓")} ${name} done\n`);
}
