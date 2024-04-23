#!/usr/bin/env node

import os from 'node:os';

import fs from 'fs-extra';
import minimist from 'minimist';

import { bundleEntrypoint } from './bundleEntrypoint.mjs';
import { compileBinary } from './compileBinary.mjs';
import { defaultNodeVersion, supportedOs } from './constants.mjs';
import { downloadNode } from './downloadNode.mjs';
import { getTempFolder } from './getTempFolder.mjs';
import { guardGoToolchain } from './guardGoToolchain.mjs';

/**
 * @typedef {Object} NodecOpts
 * @property {string} entry
 * @property {string} [name]
 * @property {string} [nodeVersion]
 * @property {boolean} [noCleanup]
 * @property {string} [outDir]
 * @property {'cjs' | 'esm'} [format]
 * @property {boolean} [help]
 */

function printHelp() {
  console.info(`Usage of nodec:
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
       defines the version of NodeJS that will be used when compiling your standalone executable. Must be an explicit version. Semver ranges are not supported. (default "${defaultNodeVersion}")
--outDir
       if set, uses this dir as the location where your binaries will be placed after compilation. Defaults to your CWD.
--target
       one or more comma-separated os+arch compilation targets: ${Array.from(supportedOs).join(',')}
`);
}

/**
 * Cleans up the download folder after nodec executes,
 * regardless of whether it was a success or a failure
 * @param {boolean} noCleanup
 */
function cleanup(noCleanup) {
  if (noCleanup) {
    return console.info(
      'you opted for --no-cleanup so all artifacts have been left in the following temp folder:',
      getTempFolder(),
    );
  }
  fs.removeSync(getTempFolder());
}

/**
 * Executes the Nodec program
 * @param {NodecOpts} opts
 */
async function nodec(opts) {
  let {
    entry,
    format = 'esm',
    help,
    name = 'my-app',
    noCleanup = false,
    nodeVersion = defaultNodeVersion,
    outDir = process.cwd(),
    target,
  } = opts;
  try {
    if (help) return printHelp();

    // first, validate the opts and / or set defaults
    if (!entry) {
      throw new Error('you did not provide a required --entry flag to nodec');
    }

    target = (
      target ||
      `${os.type() === 'Linux' ? 'linux' : os.type() === 'Darwin' ? 'macos' : 'win'}-${
        os.arch() === 'arm64' ? 'arm64' : 'x64'
      }`
    ).split(',');

    if (!target.every(t => supportedOs.has(t))) {
      throw new Error(
        `you have provided one or more compilation targets that are not supported. ${Array.from(supportedOs).join(
          ',',
        )} are supported`,
      );
    }

    await guardGoToolchain();

    const downloadLocations = await Promise.all(target.map(async osname => downloadNode(nodeVersion, osname)));

    const bundleLocations = await Promise.all(
      downloadLocations.map(async nodePath => bundleEntrypoint(entry, nodePath, nodeVersion, format)),
    );

    await Promise.all(
      target.map(async (target, i) => compileBinary(bundleLocations[i], downloadLocations[i], target, name, outDir)),
    );

    cleanup(noCleanup);
  } catch (error) {
    cleanup(noCleanup);
    console.error(error.message || error);
    process.exit(1);
  }
}

nodec(minimist(process.argv.slice(2)));
