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
- [ ] Release workflow
- [ ] NPM package works
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
