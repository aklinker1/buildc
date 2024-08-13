import { DepGraph } from "dependency-graph";
import type { Monorepo, Package } from "../types";
import fs from "fs-extra";
import { dirname, join, resolve } from "pathe";
import glob from "fast-glob";
import YAML from "yaml";

export async function readMonorepo(dir: string): Promise<Monorepo> {
  const { packageManager, rootDir } = await findWorkspaceRoot(dir);
  let packagesGlobPattern: string[];
  if (packageManager === "pnpm") {
    const workspace: { packages: string[] } = YAML.parse(
      await fs.readFile(join(rootDir, "pnpm-workspace.yaml"), "utf8"),
    );
    packagesGlobPattern = workspace.packages;
  } else if (packageManager === "bun") {
    const { workspaces } = JSON.parse(
      await fs.readFile(join(rootDir, "package.json"), "utf-8"),
    );
    packagesGlobPattern = workspaces;
  } else {
    throw Error("Unknown package manager: " + packageManager);
  }

  const dirs = await glob(packagesGlobPattern, {
    cwd: rootDir,
    absolute: true,
    onlyDirectories: true,
  });
  return {
    packageManager,
    rootDir,
    cacheDir: resolve(rootDir, ".cache"),
    packages: (await Promise.all(dirs.map(readPackage))).filter(
      (pkg) => pkg != null,
    ) as Package[],
  };
}

async function findWorkspaceRoot(
  currentDir: string,
): Promise<{ packageManager: Monorepo["packageManager"]; rootDir: string }> {
  const pnpmWorkspace = join(currentDir, "pnpm-workspace.yaml");
  if (await fs.exists(pnpmWorkspace))
    return {
      packageManager: "pnpm",
      rootDir: currentDir,
    };
  const pkgJson = join(currentDir, "package.json");
  if (await fs.exists(pkgJson)) {
    const { workspaces } = JSON.parse(await fs.readFile(pkgJson, "utf-8"));
    if (workspaces != null) {
      const bunLockfile = join(currentDir, "bun.lockb");
      if (await fs.exists(bunLockfile))
        return {
          packageManager: "bun",
          rootDir: currentDir,
        };
    }
  }

  // Check if the current directory is the root directory
  const parentDir = dirname(currentDir);
  if (parentDir === currentDir) {
    throw Error("Not in monorepo");
  }

  return findWorkspaceRoot(parentDir);
}

async function readPackage(dir: string): Promise<Package | undefined> {
  const pkgJsonText = await fs
    .readFile(join(dir, "package.json"), "utf8")
    .catch(() => void 0);
  if (pkgJsonText == null) return;

  const pkgJson = JSON.parse(pkgJsonText);
  return {
    dir,
    name: pkgJson.name,
    dependencies: {
      ...pkgJson.dependencies,
      ...pkgJson.devDependencies,
    },
    options: {
      cachable: true,
      include: ["src/**/*", "package.json"],
      exclude: ["**/__tests__/**", "**/*.test.*", "**/e2e/**"],
      ...pkgJson.buildc,
      outDir: resolve(dir, pkgJson.buildc?.outDir ?? "dist"),
    },
  };
}

export function buildMonorepoGraph(monorepo: Monorepo): DepGraph<Package> {
  const graph = new DepGraph<Package>();
  monorepo.packages.forEach((pkg) => graph.addNode(pkg.name, pkg));
  monorepo.packages.forEach((pkg) =>
    Object.entries(pkg.dependencies).forEach(([dep, version]) => {
      if (version === "workspace:*") graph.addDependency(pkg.name, dep);
    }),
  );
  return graph;
}
