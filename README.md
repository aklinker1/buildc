<div align="center">

# `@aklinker1/buildc`

[![NPM Version](https://img.shields.io/npm/v/%40aklinker1%2Fbuildc?logo=npm&labelColor=red&color=white)](https://www.npmjs.com/package/@aklinker1/buildc)
[![License](https://img.shields.io/npm/l/%40aklinker1%2Fbuildc)](https://github.com/aklinker1/buildc/blob/main/LICENSE)
[![Changelog](https://img.shields.io/badge/Changelog-blue?logo=github&logoColor=white)](https://github.com/aklinker1/buildc/blob/main/CHANGELOG.md)

Zero config CLI tool for caching package builds in monorepos.

</div>

```sh
pnpm add -D @aklinker1/buildc
bun  add -D @aklinker1/buildc
```

## Features

- ⚡️ Only rebuilds packages when their files change
- 🔗 Builds workspace dependencies in the correct order
- 🔒 Safe to run in parallel, only one process builds at a time
- 🛠️ Zero config, with per-package overrides
- 🦀 Ships as a native binary

**Supported workspaces**

- ✅ PNPM
- ✅ Bun

> [!NOTE]
> The native binary is installed by a `postinstall` script. If your package manager blocks lifecycle scripts, allow them for `@aklinker1/buildc`.

## Usage

Prefix any package-specific build commands you want to cache with `buildc -- `:

```diff
// packages/example/package.json
-"build": "tsdown",
+"build": "buildc -- tsdown",
```

Now when you run the `build` script for that package, it will only rebuild the package if a file has changed.

If your package depends on one or more other packages in the monorepo, `buildc` detects that and runs those packages' `build` scripts in the correct order.

### Building Dependencies

To ensure a package's dependencies are built before running a command, use `buildc deps && `:

```diff
-"test": "vitest",
+"test": "buildc deps && vitest",
```

Only one `buildc` process builds packages at a time, so it's safe to run multiple `buildc` commands in parallel. Commands after `buildc deps &&` run after the lock is released, so they run in parallel too.

### Other Commands

- `buildc all`: Build all the packages in your monorepo. Can be run from any directory inside the monorepo.
- `buildc graph`: Print a dependency graph showing which packages depend on others.
- `buildc clean`: Delete all build caches.
- `buildc prune`: Delete old build caches, keeping current ones. Useful for keeping CI caches small.

### Debug Logs

Set `DEBUG=buildc` to enable debug logs:

```sh
DEBUG=buildc bun run build
```

## Config

Each `package.json` can have a `buildc` field where you can configure options. Listed below are the defaults:

```jsonc
{
  // ...,
  "buildc": {
    // Set to false to disable the cache-checking behavior for this package
    "cache": true,
    // The directory where your build is output to
    "outDir": "dist",
    // List of glob patterns to include when checking if the package needs rebuilt
    "include": ["src/**/*", "package.json", "*.config.ts"],
    // List of glob patterns to ignore when checking if the package needs rebuilt
    "exclude": ["**/__tests__/**", "**/__mocks__/**", "**/*.test.*", "**/e2e/**", "**/dist/**", "**/.output/**"],
  },
}
```
