# Buildc NPM Scripts

This directory is a [bun](https://bun.dev) project responsible for building all the NPM packages buildc is shipped with.

```sh
bun install
```

## Cross Compilation

We use [`cargo-zigbuild`](https://github.com/rust-cross/cargo-zigbuild) to build Mac/Linux and [`cargo-xwin`](https://github.com/rust-cross/cargo-xwin) to build for Windows.

I've tried to create the scripts in a way that will run on all operating systems. Howveer, for production builds they all are ran from inside a MacOS GitHub Actions runner.

You can build all targets by running the following:

```sh
cd npm
bun build:all
```

This will build:

- `npm/dist/@aklinker1/buildc` - The main package installed from NPM.
- `npm/dist/@aklinker1/buildc-*` - Packages containing the native binary for that platform.
