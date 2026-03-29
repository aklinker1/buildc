import { mkdir } from "node:fs/promises";
import {
  getPlatformBinName,
  getPlatformPackageName,
  platforms,
  type Platform,
} from "./platforms";
import { copyFile } from "node:fs/promises";
import { styleText } from "node:util";
import { logFile } from "./utils";
import { github, license, readmeContents } from "./constants";
import { getVersion } from "./version";

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
  const { name, target, cross } = platform;
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
  const zigBuildDockerImage = "ghcr.io/rust-cross/cargo-zigbuild";
  const xwinDockerImage = "messense/cargo-xwin";

  console.log(styleText("cyan", `\nBuilding ${name} binary`));
  if (name.startsWith("win32")) {
    if (!hasPulledCargoXwin) {
      console.log(styleText("cyan", "\nPulling docker image"));
      await Bun.$`docker pull ${xwinDockerImage}`;
      hasPulledCargoXwin = true;
    }

    await Bun.$`
      docker run --rm -it -v $(pwd)/..:/io -w /io ${xwinDockerImage} \
        cargo xwin build --release --target ${target}
    `;
  } else {
    if (!hasPulledCargoZigBuild) {
      console.log(styleText("cyan", "\nPulling docker image"));
      await Bun.$`docker pull ${zigBuildDockerImage}`;
      hasPulledCargoZigBuild = true;
    }

    await Bun.$`
      docker run --rm -it -v $(pwd)/..:/io -w /io ${zigBuildDockerImage} \
        cargo zigbuild --release --target ${target}
    `;
  }
  console.log(styleText("cyan", "\nCopying artifact"));

  await mkdir(artifactsDir, { recursive: true });
  await copyFile(binPath, artifactsBinPath);
  logFile(artifactsDir, Bun.file(artifactsBinPath));

  console.log(styleText("cyan", "\nGenerating NPM package"));

  await mkdir(npmPackageDir, { recursive: true });
  await copyFile(binPath, npmBinPath);
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
        repository: github,
        os: [parts[0]],
        cpu: [parts[1]],
      },
      null,
      2,
    ),
  );
  logFile(npmPackageDir, npmPackageJson);

  console.log(`\n${styleText("green", "✓")} Done\n`);
}
