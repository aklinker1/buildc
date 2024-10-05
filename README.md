## Contributing

### Manual Testing

The `demo/` directory contains a Bun monorepo you can test your changes against.

To build a single package, `cd` into the package directory, and run `bun run build`:

```sh
cd demo/packages/b
bun run build
```

All the package.json's have an alias for `buildc`, so you can run any `buildc` command from any demo directory:

```sh
cd demo
bun buildc
bun buildc graph
cd packages
bun buildc clean
cd a
bun buildc deps -- echo "TODO"
```

To enable debug logs, set the `DEBUG` environment variable to "buildc" before running the command:

```sh
DEBUG=buildc bun buildc ...
```
