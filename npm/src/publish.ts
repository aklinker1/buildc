import { styleText } from "node:util";
import { packageName } from "./constants";
import { getPlatformPackageName, platforms } from "./platforms";
import { getVersion } from "./version";

const dryRun = process.argv.includes("--dry-run");
const version = await getVersion();

// npm requires an explicit dist-tag when publishing prereleases
const tag = version.includes("-") ? "next" : "latest";

// Publish platform packages first so the main package's optionalDependencies
// are installable as soon as it's published.
const packages = [...platforms.map(getPlatformPackageName), packageName];

const args = ["--tag", tag];
if (dryRun) args.push("--dry-run");

for (const pkg of packages) {
  console.log(styleText("cyan", `\nPublishing ${pkg}@${version} (${tag})`));
  await Bun.$`npm publish ${args}`.cwd(`dist/${pkg}`);
}

console.log(`\n${styleText("green", "✓")} Done\n`);
