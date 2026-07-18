# `@better-builds/nodec`
The `node compiler (nodec)`, or rather, the unofficial node-application-to-standalone-executable compiler, complete with ESBuild bundling support.

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
npx nodec --entry ./src/entrypoint.ts --name my-cool-app
```

The example, above 👆, will compile your TypeScript file using the `nodec` default Node.js version (`26.5.0`), and a `my-cool-app` binary will appear in your `cwd`.
The resulting binary will match the OS and architecture of the machine on which it was built.

If you want to cross-compile to multiple OS targets, you can provide multiple `--target` values for all the targets you desire:

```
npx nodec --entry ./src/entrypoint.ts --name my-cool-app --target linux-x64 --target linux-arm64 --target macos-x64 --target macos-arm64 --target win-x64
```

You will then see five different binaries in your `cwd`, each corresponding to the various OS and architecture targets you have specified.

### Output format

By default, `nodec` compiles your code to ESM.
You can target CJS instead with the `--format` option:

```bash
npx nodec --entry ./src/entrypoint.ts --format cjs
```

### Passing Node.js runtime flags

You can bake Node.js runtime flags into the compiled binary so they are applied every time it runs. Because these flags, themselves, begin with a dash, they must be passed in either of the two following ways:

```bash
# 1. after a `--` separator (recommended, pass as many as you like, verbatim)
npx nodec --entry ./src/entrypoint.ts --name my-cool-app -- --throw-deprecation --unhandled-rejections=none

# 2. with the `=` form of --nodeFlags (repeat the option per flag)
npx nodec --entry ./src/entrypoint.ts --name my-cool-app --nodeFlags=--throw-deprecation --nodeFlags=--unhandled-rejections=none
```

> The space-separated form `--nodeFlags --throw-deprecation` is **not** supported. The argument parser cannot tell the flag apart from a `nodec` option, so it would be dropped. `nodec` errors loudly in that case, instead of silently ignoring the flag.

### All options

For more options, you can run `npx nodec --help`:

```bash
npx nodec --help

Options:
  --version      Show version number                                   [boolean]
  --entry        the entrypoint to your JavaScript or TypeScript application
                                                             [string] [required]
  --format       which module format your JavaScript and / or TypeScript code
                 will be compiled to
                               [string] [choices: "cjs", "esm"] [default: "esm"]
  --name         the final outputted filename that represents your compiled
                 application                        [string] [default: "my-app"]
  --noCleanup    if true, will leave all of the downloaded, bundled and
                 compresses assets in a temporary folder on your machine, so you
                 can inspect the state of them        [boolean] [default: false]
  --nodeFlags    one or more node.js flags to automatically set when executing
                 your compiled application (like --experimental-require-module,
                 --experimental-default-type and others). Because these values
                 start with a dash, pass them with the `=` form
                 (--nodeFlags=--throw-deprecation) or after a `--` separator (--
                 --throw-deprecation). for a list of available flags, please
                 refer to the official node.js documentation:
                 https://nodejs.org/docs/latest/api        [array] [default: []]
  --nodeVersion  defines the version of NodeJS that will be used when compiling
                 your standalone executable. Must be an explicit version. Semver
                 ranges are not supported.          [string] [default: "26.5.0"]
  --outDir       if set, uses this dir as the location where your binaries will
                 be placed after compilation. Defaults to your CWD.
                [string] [default: "/Users/benjaminduran/dddddd/personal/nodec"]
  --target       one or more os+arch compilation targets
       [array] [choices: "linux-x64", "linux-arm64", "macos-x64", "macos-arm64",
                                           "win-x64"] [default: ["macos-arm64"]]
  --help         Show help                                             [boolean]
```

---

## macOS code signing and notarization

nodec cross-compiles the launcher with `Go`, which automatically ad-hoc signs the
`macos-arm64` output.
This signature is required for the binary to run at all on Apple Silicon, so nodec fails the build if it is ever missing.
The embedded Node.js runtime keeps its original Apple signature (nodec never rewrites its bytes).

Ad-hoc signing is enough to run a binary you compiled locally, but macOS
Gatekeeper may still block an ad-hoc-signed binary that an end user
*downloads*, because the download carries the `com.apple.quarantine` attribute.
To ship a macOS binary that opens without warnings, sign it with your Apple
Developer ID and notarize it.
On macOS:

```
codesign --force --options runtime --timestamp \
  --sign "Developer ID Application: Your Name (TEAMID)" my-app-macos-arm64
xcrun notarytool submit my-app-macos-arm64 --keychain-profile <profile> --wait
```

You can also sign and notarize from any OS using
[`rcodesign`](https://github.com/indygreg/apple-platform-rs) (the
`apple-codesign` project), which handles Mach-O binaries without a Mac.

---

## Runtime integrity check

At compile time, nodec records the SHA-256 digests of the inflated Node.js
runtime and your bundled application and embeds them into the binary. At
startup, the binary re-hashes each asset as it inflates it. If either digest
does not match, the binary refuses to run and exits with a security warning.

This catches accidental corruption of a distributed binary and casual tampering
with the embedded payload (useful on Linux/Windows, which have no OS-level code
signing enforcement). It is **tamper-evident, not tamper-proof**. An attacker who
can modify the binary can also patch the embedded digests, so treat it as
defense-in-depth alongside code signing, rather than a replacement for it.

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

**NodeC** is a *slightly different* take on the Node.js single file executable compilation story.
It downloads an official Node.js build for your target OS and architecture combinations, compiles your JavaScript or TypeScript entry point with [ESBuild](https://esbuild.github.io/) to a valid ESM JS target that matches your expected Node.js target version, then uses the [Golang](https://go.dev/doc/install) compiler to embed Node and your bundled JavaScript into a cross-compiled binary application.

The resulting compiled binary then inflates your JavaScript bundle and your chosen Node.js target at runtime and executes them, piping all `stdio` to your user, then self-destructing the inflated files after exit.

---

## Contributing

* Ensure you have the prerequisites (mentioned above) installed on your system
* Clone this repo
* Run `./repo-setup.sh`

Happy hacking!
