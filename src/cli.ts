import cac from "cac";
import { version, description, name } from "../package.json";
import { buildPackage } from ".";
import { readMonorepo } from "./utils/monorepo-utils";
import { remove } from "fs-extra";

const cli = cac(name);
cli.help((sections) => {
  sections[0].body += "\n\n" + description;
});
cli.version(version);

// BUILD
cli
  .command("[command]", "Build package in working directory")
  .option("--deps", "Only build package dependencies")
  .example('buildc "unbuild --minify"')
  .example('buildc "tsup src/index.ts"')
  .example('buildc "esbuild src/index.ts --outdir=dist"')
  .action((command, { deps }) => buildPackage(command, deps));

// CLEAN
cli.command("clean", "Clean cache directory").action(async () => {
  const monorepo = await readMonorepo(process.cwd());
  await remove(monorepo.cacheDir);
});

cli.parse();
