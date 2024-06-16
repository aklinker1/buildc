# buildc

Cache build output and orchastrate dependency builds in monorepos.

```sh
pnpm i -D buildc
```

Supports:

- [x] PNPM workspaces
- [ ] Bun workspaces

> Note that this is a personal tool, and I only plan on supporting the tools I use. If you want to add support for NPM or Yarn, feel free to open a PR!

## Usage

Replace the build command in your package's `package.json` like so:

```diff
-"build": "unbuild --minify",
+"build": "buildc \"unbuild --minify\"",
```

When you run the build script, it will:

1. Detect workspace dependencies and run their `build` scripts
2. Run the build script you provided or restore a previous build from cache

If the other dependencies also use `buildc`, you can get a fully cached, instant build.

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
