# Contributing

## Assumptions

1. Packages depending on each other are external, and are not bundled into the final output. If package A depends on package B, package A should not need rebuilt if package B changes, because it should import package B, not bundle it.

## Manual Testing

The `demo/` directory contains a Bun monorepo you can test your changes against. Before running any `bun` commands below, run `cargo build` to build the latest version of `buildc`.

To build a single package, `cd` into the package directory and run `bun run build`:

```sh
cd demo/packages/b
bun run build
```

All the demo `package.json`s have a `buildc` alias, so you can run any `buildc` command from any demo directory:

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

To enable debug logs, set the `DEBUG` environment variable to `buildc` before running the command:

```sh
DEBUG=buildc bun buildc ...
```
