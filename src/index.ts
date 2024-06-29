import { buildMonorepoGraph, readMonorepo } from "./utils/monorepo-utils";
import { getGraphString } from "./utils/log-utils";
import consola from "consola";
import { spawnSync } from "node:child_process";
import fs from "fs-extra";
import type { Monorepo, Package } from "./types";
import { hashDir } from "./utils/cache-utils";
import { relative, resolve } from "pathe";
import { withLock } from "./utils/lock-utils";

export type { BuildcOptions } from "./types";

/**
 * Builds a package and all it's dependencies.
 */
export async function buildPackage(
  command: string[],
  depsOnly = false,
): Promise<void> {
  const cwd = resolve(process.cwd());

  // Do a regular build if called inside another buildc command - in this case,
  // we know all dependencies have already been built, and we're only calling
  // this function if the cache was missing.
  if (process.env.INSIDE_BUILDC) {
    consola.log(`\x1b[2m  > ${command.join(" ")}\x1b[0m`);
    return execCommand(cwd, command);
  }
  process.env.INSIDE_BUILDC = "true";

  const monorepo = await readMonorepo(cwd);
  consola.debug("Monorepo:", monorepo);

  const targetPkg = monorepo.packages.find((pkg) => pkg.dir === cwd);
  if (targetPkg == null)
    throw Error(
      "Could not detect package to build. Working directory must be in a package: " +
        cwd,
    );
  consola.debug("Target package:", targetPkg);

  const graph = buildMonorepoGraph(monorepo);
  // Remove unrelated deps from graph
  graph.entryNodes().forEach((entry) => {
    if (entry !== targetPkg.name) graph.removeNode(entry);
  });
  consola.debug("Dependency Graph:\n" + getGraphString(graph));

  let toBuild = graph.overallOrder();
  if (depsOnly) {
    toBuild = toBuild.filter((pkg) => pkg !== targetPkg.name);
  }
  consola.debug("Build order:", toBuild);

  const packages = toBuild.map((pkgName) => graph.getNodeData(pkgName));

  // Use a lockfile to prevent running multiple builds in parallel. PNPM for
  // example, tries to orchastrate builds in parrallel during post-install,
  // which can cause problems like files not existing when different processes
  // delete directories.
  await withLock(monorepo.cacheDir, async () => {
    for (const pkg of packages) {
      await buildCached(
        monorepo,
        pkg,
        pkg === targetPkg
          ? command
          : [monorepo.packageManager, "-s", "run", "build"],
      );
    }

    if (depsOnly) {
      // When using --deps-only, the command after -- needs to be ran manually,
      // since it was excluded above
      consola.info(`${targetPkg.name}: \`${command.join(" ")}\``);
      execCommand(targetPkg.dir, command);
    }
  });
}

export async function buildAllPackages(): Promise<void> {
  const cwd = process.cwd();
  const monorepo = await readMonorepo(cwd);
  const graph = buildMonorepoGraph(monorepo);
  consola.debug("Dependency Graph:\n" + getGraphString(graph));

  let toBuild = graph.overallOrder();
  consola.debug("Build order:", toBuild);

  for (const _pkgName of toBuild) {
    const pkg = graph.getNodeData(_pkgName);
    await buildCached(monorepo, pkg, [
      monorepo.packageManager,
      "-s",
      "run",
      "build",
    ]);
  }
}

async function buildCached(
  monorepo: Monorepo,
  pkg: Package,
  command: string[],
): Promise<void> {
  try {
    consola.start(`${pkg.name}: \`${command.join(" ")}\``);
    const cacheDir = await getCacheDir(monorepo, pkg);
    if (pkg.options.cachable === true && (await fs.exists(cacheDir))) {
      await fs.ensureDir(pkg.options.outDir);
      await fs.copy(cacheDir, pkg.options.outDir);
      consola.success(`${pkg.name}: Cached!`);
    } else {
      execCommand(pkg.dir, command);
      try {
        await fs.ensureDir(cacheDir);
        await fs.copy(pkg.options.outDir, cacheDir);
      } catch (err) {
        consola.debug(
          "Failed to copy cache, command probably didn't create an output.",
        );
      }
      consola.success(`${pkg.name}`);
    }
  } catch (err) {
    consola.fail(`${pkg.name}: Failed`);
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

function execCommand(cwd: string, command: string[]) {
  const { error, status } = spawnSync(command[0], command.slice(1), {
    stdio: "inherit",
    cwd,
    env: {
      ...process.env,
      INSIDE_BUILDC: "true",
    },
    shell: true,
  });
  if (error) throw error;
  if (status !== 0) throw Error("Commaned exited with code " + status);
}
