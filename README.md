# buildc

Zero config CLI tool for caching package builds in monorepos.

```sh
bun add -D @aklinker1/buildc
```

Prefix any package-specific build commands you want to cache with `buildc -- `:

```diff
// packages/example/package.json
-"build": "tsdown",
+"build": "buildc -- tsdown",
```

Now when you run the `build` script for that package, it will only rebuild the package if a file has changed.

Additionally, if your package depends on one or more other packages in the monorepo, `buildc` will detect that and run those package's `build` scripts in the correct order!

If you need to ensure a package's dependencies are built before running a command, use `buildc deps && `:

```diff
-"test": "vitest",
+"test": "buildc deps && vitest",
```

Only one `buildc` process builds packages at a time, so it's safe to run multiple `buildc` commands in parallel. Commands after `buildc deps &&` run after the lock is released, so they run in parallel too.

##### Supports:

- [x] PNPM workspaces
- [x] Bun workspaces

> Buildc ships as a native binary, installed by a `postinstall` script. If your package manager blocks lifecycle scripts, allow them for `@aklinker1/buildc`.

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

## Other Commands

- `buildc all`: Build all the packages in your monorepo. Can be ran from any directory inside the monorepo.
- `buildc graph`: Print a dependency graph showing which packages depend on others.
- `buildc clean`: Delete all build caches.
- `buildc prune`: Delete old build caches, keeping current ones. Useful for keeping CI caches small.

## Migrating from v1

- `buildc --deps-only -- <cmd>` is now `buildc deps && <cmd>`.
- The `cachable`/`cacheable` option is now `cache`.
- The default `include`/`exclude` lists changed, see [Config](#config).
- Debug logs are enabled with `DEBUG=buildc` instead of `DEBUG=1`.

## TODO

- [x] `buildc --help`
- [x] `buildc graph`
- [x] `buildc clean`
- [x] `buildc all`
- [x] `buildc -- <command>`
- [x] `buildc deps && <command>`
- [x] Test binary in WXT
   - v1 `buildc all` ran in 0.65s
      ```
      ./node_modules/.bin/buildc all  0.68s user 0.16s system 126% cpu 0.663 total
      ```
   - v2 `buildc all` ran in 0.315s
      ```
      ./node_modules/.bin/buildc all  0.30s user 0.05s system 103% cpu 0.340 total
      ```
- [x] Release workflow
- [x] Lockfile to prevent running multiple buildc commands at the same time
- [x] NPM package works
- [x] Works on linux
- [ ] Works on windows
- [ ] Works on mac
   - [ ] Sign macos binary

## Contributing

### Assumptions

1. Packages depending on each other are external, and are not bundled into the final output. If package A depends on package B, package A should not need rebuilt if package B is changed, because it should import package B, not bundle it into A's output.

### Manual Testing

The `demo/` directory contains a Bun monorepo you can test your changes against. Before running any `bun` commands below, run `cargo build` to build the latest version of `buildc`

To build a single package, `cd` into the package directory, and run `bun run build`:

```sh
cd demo/packages/b
bun run build
```

All the package.json's have an alias for `buildc`, so you can run any `buildc` command from any demo directory:

```sh
cargo build

cd demo
bun buildc
bun buildc graph
cd packages
bun buildc clean
cd a
bun buildc deps && echo "TODO"
```

To enable debug logs, set the `DEBUG` environment variable to "buildc" before running the command:

```sh
DEBUG=buildc bun buildc ...
```
