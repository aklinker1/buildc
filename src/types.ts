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
}

export interface BuildcOptions {
  cachable: boolean;
  outDir: string;
  include: string[];
  exclude: string[];
}
