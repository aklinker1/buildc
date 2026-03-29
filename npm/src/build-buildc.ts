import { build } from "tsdown";
import { getPlatformPackageName, platforms } from "./platforms";
import { chmod } from "node:fs/promises";
import { styleText } from "node:util";
import { logFile } from "./utils";
import { github, license, packageName, readmeContents } from "./constants";
import { getVersion } from "./version";

const outDir = `dist/${packageName}`;

const distPackageJson = Bun.file(`${outDir}/package.json`);
const distReadme = Bun.file(`${outDir}/README.md`);
const distBin = Bun.file(`${outDir}/buildc`);

const version = await getVersion();

console.log(styleText("cyan", "\nBuilding postinstall.mjs"));

await build({
  outDir,
  clean: true,
  entry: "src/postinstall.ts",
  banner: `// SOURCE: ${github}/main/npm/src/postinstall.ts`,
});

console.log(styleText("cyan", "\nGenerating NPM package"));

await distPackageJson.write(
  JSON.stringify(
    {
      name: packageName,
      description:
        "Zero config CLI tool for caching and orchestrating builds in monorepos",
      version,
      type: "module",
      scripts: {
        postinstall: "node postinstall.mjs",
      },
      optionalDependencies: platforms.reduce((deps, platform) => {
        deps[getPlatformPackageName(platform)] = version;
        return deps;
      }, Object.create(null)),
      bin: "buildc",
      os: ["darwin", "linux", "win32"],
      cpu: ["arm64", "x64"],
      keywords: ["monorepo", "build", "cache", "orchestration"],
      license,
      repository: github,
    },
    null,
    2,
  ),
);
logFile(outDir, distPackageJson);

await distReadme.write(readmeContents);
logFile(outDir, distReadme);

await distBin.write(`#!/bin/sh
echo "Buildc postinstall step not performed."
echo ""
echo "The postinstall replaces this placeholder script with a native binary for your operating system, making buildc lightning fast."
echo "If you see this message, it means you didn't run the postinstall step, or your package manager blocked running it."
exit 1
`);
await chmod(distBin.name!, 0o755);
logFile(outDir, distBin);

console.log(`\n${styleText("green", "✓")} Done\n`);
