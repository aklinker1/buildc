import { buildMonorepoGraph, readMonorepo } from "./utils/monorepo-utils";
import { debugGraph } from "./utils/log-utils";
import consola from "consola";
import { execSync } from "node:child_process";
import { copy, exists, mkdir } from "fs-extra";
import type { Monorepo, Package } from "./types";
import { hashDir } from "./utils/cache-utils";
import { relative, resolve } from "node:path";

export type { BuildcOptions } from "./types";

/**
 * Builds a package and all it's dependencies.
 */
export async function buildPackage(command: string): Promise<void> {
  // Do a regular build if called inside another buildc command - in this case,
  // we know all dependencies have already been built, and we're only calling
  // this function if the cache was missing.
  if (process.env.INSIDE_BUILDC) {
    consola.log(`\x1b[2m  > ${command}\x1b[0m`);
    execSync(command, { stdio: "inherit" });
    return;
  }
  process.env.INSIDE_BUILDC = "true";

  const cwd = process.cwd();
  const monorepo = await readMonorepo(cwd);

  const targetPkg = monorepo.packages.find((pkg) => pkg.dir === cwd);
  if (targetPkg == null)
    throw Error("Working directory is not apart of the monorepo");
  consola.debug("Target package:", targetPkg);

  const graph = buildMonorepoGraph(monorepo);
  // Remove unrelated deps from graph
  graph.entryNodes().forEach((entry) => {
    if (entry !== targetPkg.name) graph.removeNode(entry);
  });
  debugGraph(graph);

  const toBuild = graph.overallOrder();
  consola.debug("Build order:", toBuild);

  for (const _pkgName of toBuild) {
    const pkg = graph.getNodeData(_pkgName);
    await buildCached(
      monorepo,
      pkg,
      pkg === targetPkg ? command : `${monorepo.packageManager} -s run build`,
    );
  }
}

async function buildCached(
  monorepo: Monorepo,
  pkg: Package,
  command: string,
): Promise<void> {
  try {
    consola.start(`${pkg.name} \`${command}\``);
    const cacheDir = await getCacheDir(monorepo, pkg);
    if (pkg.options.cachable === true && (await exists(cacheDir))) {
      await mkdir(pkg.options.outDir, { recursive: true });
      await copy(cacheDir, pkg.options.outDir);
      consola.success(`${pkg.name} cached!`);
    } else {
      execSync(command, {
        cwd: pkg.dir,
        stdio: "inherit",
        env: {
          ...process.env,
          INSIDE_BUILDC: "true",
        },
      });
      await mkdir(cacheDir, { recursive: true });
      await copy(pkg.options.outDir, cacheDir);
      consola.success(`${pkg.name}`);
    }
  } catch (err) {
    consola.fail(`${pkg.name}`);
    console.error(err);
    process.exit(1);
  }
}

async function getCacheDir(monorepo: Monorepo, pkg: Package): Promise<string> {
  const hash = await hashDir(pkg.dir, pkg.options.include, pkg.options.exclude);
  const cacheDir = resolve(
    monorepo.cacheDir,
    relative(monorepo.rootDir, pkg.dir),
    hash,
  );
  return cacheDir;
}
