import cac from "cac";
import { version, name } from "../package.json";
import { buildPackage, buildAllPackages } from ".";
import { readMonorepo, buildMonorepoGraph } from "./utils/monorepo-utils";
import fs from "fs-extra";
import { getGraphString } from "./utils/log-utils";
import consola from "consola";

const cli = cac(name);
cli.help();
cli.version(version);

// BUILD
cli
  .command("", "Build package in working directory")
  .option("--deps-only", "Only build package dependencies")
  .example("buildc -- unbuild --minify")
  .example("buildc -- tsup src/index.ts")
  .example("buildc -- esbuild src/index.ts --outdir=dist")
  .action((flags) => {
    return buildPackage(flags["--"], flags.depsOnly);
  });

// ALL
cli.command("all", "Build all packages").action((flags) => {
  return buildAllPackages(flags["--"], flags.depsOnly);
});

// CLEAN
cli.command("clean", "Clean cache directory").action(async () => {
  const monorepo = await readMonorepo(process.cwd());
  await fs.remove(monorepo.cacheDir);
});

// GRAPH
cli.command("graph", "Print your dependency graph").action(async () => {
  const monorepo = await readMonorepo(process.cwd());
  const graph = buildMonorepoGraph(monorepo);
  consola.info("Dependency Graph:\n" + getGraphString(graph));
});

cli.parse();
