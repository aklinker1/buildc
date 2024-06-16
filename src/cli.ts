import cac from "cac";
import { version, name } from "../package.json";
import { buildPackage } from ".";
import { readMonorepo } from "./utils/monorepo-utils";
import fs from "fs-extra";

const cli = cac(name);
cli.help();
cli.version(version);

// BUILD
cli
  .command("[command]", "Build package in working directory")
  .option("--deps-only", "Only build package dependencies")
  .example('buildc "unbuild --minify"')
  .example('buildc "tsup src/index.ts"')
  .example('buildc "esbuild src/index.ts --outdir=dist"')
  .action((command, flags) => buildPackage(command, flags.depsOnly));

// CLEAN
cli.command("clean", "Clean cache directory").action(async () => {
  const monorepo = await readMonorepo(process.cwd());
  await fs.remove(monorepo.cacheDir);
});

cli.parse();
