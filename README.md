# buildc

Zero config CLI tool for caching and orchestrating builds in monorepos.

```sh
pnpm i -D buildc
```

Then prefix any build commands you want to cache with `buildc -- `:

```diff
-"build": "unbuild --minify",
+"build": "buildc -- unbuild --minify",
```

`build` also supports only building the package's dependencies, not the package itself. You can use this by adding `buildc --deps-only -- ` before any scripts that needs the dependencies built before running, like tests:

```diff
-"build": "vitest",
+"build": "buildc --deps-only -- vitest",
```

##### Supports:

- [x] PNPM workspaces
- [ ] Bun workspaces

> Note that this is a personal tool, and I only plan on supporting the tools I use. If you want to add support for NPM or Yarn, feel free to open a PR!

## Config

Each `package.json` can have a `buildc` field where you can configure options. Listed below are the defaults:

```jsonc
{
  // ...,
  "buildc": {
    // Set to false to disable the cache-checking behavior for this package
    "cachable": true,
    // The directory where your build is output to
    "outDir": "dist",
    // List of glob patterns to include when checking if the package needs rebuilt
    "include": ["src/**/*"],
    // List of glob patterns to ignore when checking if the package needs rebuilt
    "exclude": ["**/__tests__/**", "**/*.test.*", "**/e2e/**"],
  },
}
```
