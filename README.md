# buildc

Zero config CLI tool for caching and orchestrating builds in monorepos.

```sh
pnpm i -D buildc
```

Then prefix any package-specific build commands you want to cache with `buildc -- `:

```diff
-"build": "unbuild --minify",
+"build": "buildc -- unbuild --minify",
```

`build` also supports only building the package's dependencies, not the package itself. Add `buildc --deps-only -- ` before any scripts that needs the dependencies built before running, like tests:

```diff
-"test": "vitest",
+"test": "buildc --deps-only -- vitest",
```

##### Supports:

- [x] PNPM workspaces
- [ ] Bun workspaces

> Note that this is a personal tool, and I only plan on supporting the tools I use. If you want to add support for NPM or Yarn, feel free to open a PR!

#### Why Not NX/Turborepo

It's hard to just use the caching feature of NX/Turborepo without completely migrating to the tools, and using them instead of `pnpm`/`bun`, which more developers are familiar with. I found that since build-caching was really the only feature I used from those packages, it wasn't worth migrating to.

Instead, this tools is a simpler version that doesn't add another CLI people have to memorize to use. Well, technically it does, but at the same time, it doesn't get in your way, and I bet people wouldn't even realize it was being called most the time. Which is the goal.

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
