export interface Monorepo {
  packageManager: "pnpm" | "bun";
  rootDir: string;
  cacheDir: string;
  packages: Package[];
}

export interface Package {
  name: string;
  dir: string;
  options: BuildcOptions;
  dependencies: string[];
  hasBuildScript: boolean;
}

export interface BuildcOptions {
  cacheable: boolean;
  outDir: string;
  include: string[];
  exclude: string[];
}
