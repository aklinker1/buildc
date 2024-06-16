import { DepGraph } from "dependency-graph";
import type { Monorepo, Package } from "../types";
import fs from "fs-extra";
import { dirname, join } from "node:path";
import glob from "fast-glob";
import YAML from "yaml";
import { resolve } from "node:path";

export async function readMonorepo(dir: string): Promise<Monorepo> {
  const { packageManager, rootDir } = await findWorkspaceRoot(dir);
  let packages: Package[];
  if (packageManager === "pnpm") {
    const workspace: { packages: string[] } = YAML.parse(
      await fs.readFile(join(rootDir, "pnpm-workspace.yaml"), "utf8"),
    );
    const dirs = await glob(workspace.packages, {
      cwd: rootDir,
      absolute: true,
      onlyDirectories: true,
    });
    packages = (await Promise.all(dirs.map(readPackage))).filter(
      (pkg) => !!pkg,
    ) as Package[];
  } else {
    throw Error("Unknown package manager: " + packageManager);
  }
  return {
    packageManager,
    rootDir,
    cacheDir: resolve(rootDir, ".cache"),
    packages,
  };
}

async function findWorkspaceRoot(
  currentDir: string,
): Promise<{ packageManager: "pnpm"; rootDir: string }> {
  if (await fs.exists(join(currentDir, "pnpm-workspace.yaml")))
    return {
      packageManager: "pnpm",
      rootDir: currentDir,
    };

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
      include: ["src/**/*"],
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
