# Buildc NPM Scripts

This directory is a [bun](https://bun.dev) project responsible for building all the NPM packages buildc is shipped with.

```sh
bun install
```

## Cross Compilation

We use [`cargo-zigbuild`](https://github.com/rust-cross/cargo-zigbuild) to build Mac/Linux and [`cargo-xwin`](https://github.com/rust-cross/cargo-xwin) to build for Windows.

Both run directly on the host, so you'll need [`zig`](https://ziglang.org/download/), `cargo-zigbuild`, `cargo-xwin`, and `clang` installed. The first Windows build downloads the MSVC CRT and Windows SDK (~1GB) to `~/.cache/cargo-xwin`.

You can build all targets by running the following:

```sh
cd npm
bun build:all
```

This will build:

- `npm/dist/@aklinker1/buildc` - The main package installed from NPM.
- `npm/dist/@aklinker1/buildc-*` - Packages containing the native binary for that platform.
