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

let hasPulledCargoXwin = false;
let hasPulledCargoZigBuild = false;

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

  await buildPlatform(platform);
}

export async function buildPlatform(platform: Platform): Promise<void> {
  const { name, target } = platform;
  const binName = getPlatformBinName(platform);
  const packageName = getPlatformPackageName(platform);
  const ext = name.startsWith("win32") ? ".exe" : "";
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
  const zigBuildDockerImage = "ghcr.io/rust-cross/cargo-zigbuild";
  const xwinDockerImage = "messense/cargo-xwin";

  if (name.startsWith("win32")) {
    if (!hasPulledCargoXwin) {
      console.log(styleText("cyan", "\nPulling docker image"));
      await Bun.$`docker pull ${xwinDockerImage}`;
      hasPulledCargoXwin = true;
    }

    console.log(styleText("cyan", `\nBuilding ${name} executable`));
    await Bun.$`
      docker run --rm -v $(pwd)/..:/io -w /io ${xwinDockerImage} \
        cargo xwin build --release --target ${target}
    `;
  } else {
    if (!hasPulledCargoZigBuild) {
      console.log(styleText("cyan", "\nPulling docker image"));
      await Bun.$`docker pull ${zigBuildDockerImage}`;
      hasPulledCargoZigBuild = true;
    }

    console.log(styleText("cyan", `\nBuilding ${name} binary`));
    await Bun.$`
      docker run --rm -v $(pwd)/..:/io -w /io ${zigBuildDockerImage} \
        cargo zigbuild --release --target ${target}
    `;
  }
  console.log(styleText("cyan", "\nCopying artifact"));

  await mkdir(artifactsDir, { recursive: true });
  await copyFile(binPath, artifactsBinPath);
  // Sign the copy: the docker-built original in `target/` may be owned by root.
  if (name.startsWith("darwin")) await signMacosBinary(artifactsBinPath);
  logFile(artifactsDir, Bun.file(artifactsBinPath));

  console.log(styleText("cyan", "\nGenerating NPM package"));

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

  console.log(`\n${styleText("green", "✓")} Done\n`);
}
