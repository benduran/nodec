# `@better-builds/nodec`
The `node compiler (nodec)`, or rather, unofficial node-application-to-standalone-executable compiler, complete with ESBuild bundling support.

**Warning:** This project is *highly experimental* and likely has bugs.
If you notice anything strange, please report it.
PRs are also welcome, too!
Thanks!

## Prerequisites

* `golang v1.16` or greater (the `go` command must be available in your system `$PATH`)
* `node v18` or greater

## Installation

```
npm install @better-builds/nodec --save-dev
```

## Usage

```
npx nodec --entrypoint ./src/entrypoint.ts --name my-cool-app
```

The example, above 👆🏼, will compile your TypeScript file, using the `nodec` default Node.js version (`20.12.0`), and a resulting `my-cool-app` binary file with appear in your `cwd`.
The resulting binary will match OS + ARCH of the machine where it is run.

If you want to cross-compile to multiple OS targets, you can provide a comma-separated list of all the targets you desire:

```
npx nodec --entrypoint ./src/entrypoint.ts --name my-cool-app --target linux-x64,macos-x64,macos-arm64,win-x64
```

You will then see four (4) different binaries in your `cwd`, each corresponding to the various OS + ARCH targets you've specified.

For more options, you can run `npx nodec --help` to see the help menu:

```
npx nodec --help

Usage of nodec:
--noCleanup boolean
       If true, will leave all of the downloaded, bundled and compresses assets in a temporary
       folder on your machine, so you can inspect the state of them
--entry string
       (Required): the entrypoint to your JavaScript or TypeScript application
--format string
       which module format your JavaScript and / or TypeScript code will be compiled to. Supports 'cjs' or 'esm'. Defaults to 'esm'.
--name string
       the final outputted filename that represents your compiled application (default "my-app")
--node-version string
       defines the version of NodeJS that will be used when compiling your standalone executable. Must be an explicit version. Semver ranges are not supported. (default "20.12.0")
--outDir
       if set, uses this dir as the location where your binaries will be placed after compilation. Defaults to your CWD.
--target
       one or more comma-separated os+arch compilation targets: linux-x64,macos-x64,macos-arm64,win-x64
```

---

## Project Background

### Motivation

You, as a software engineer, might prefer JavaScript or TypeScript as your primary language of choice.
You might also prefer the feature set and APIs available in Node.js, and you're looking to compile a portable, fully standalone executable file you can share with your users, one which doesn't require them to have `npm`, `node` or any other toolchain installed to use.

If this sounds like you, then you're in the right place!

### Similar Libraries

Here are some alternate libraries you might be interested in instead, which have their own unique pros and cons. These libraries definitely helped inspire the creation of `nodec`
* [pkg](https://www.npmjs.com/package/pkg)
* [nexe](https://www.npmjs.com/package/nexe)
* [deno standalone executables](https://docs.deno.com/runtime/manual/tools/compiler)
* [bun single-file executable](https://bun.sh/docs/bundler/executables)

### How `nodec` works

**NodeC** is a *slightly different* take at the Node.js single file executable compilation story.
It downloads an official Node.js build for your target OS + ARCH combinations, compiles your JavaScript or TypeScript entry point with [ESBuild](https://esbuild.github.io/) to a valid ESM JS target that matches your expected Node.js target version, then uses the [Golang](https://go.dev/doc/install) compiler to embed Node and your bundled JavaScript into a cross-compiled binary application.

The resulting compiled binary then inflates your JavaScript bundle and your chosen Node.js target at runtime and executes them, piping all `stdio` to your user.

---

## Contributing

* Ensure you have the prerequisites (mentioned above 👆🏼) installed on your system
* Clone this repo
* Run `./repo-setup.sh`

Happy hacking!
