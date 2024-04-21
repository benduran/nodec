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
 * @property {boolean} [help]
 */

function printHelp() {
  console.info(`Usage of nodec:
--entry string
       (Required): The entrypoint t o your JavaScript or TypeScript application
--name string
       the final outputted filename that represents your compiled application (default "my-app")
--node-version
       defines the version of NodeJS that will be used when compiling your standalone executable. Must be an explicit version. Semver ranges are not supported. (default "${defaultNodeVersion}")
--target
       one or more comma-separated os+arch compilation targets: ${Array.from(supportedOs).join(',')}
`);
}

/**
 * Cleans up the download folder after nodec executes,
 * regardless of whether it was a success or a failure
 */
function cleanup() {
  fs.removeSync(getTempFolder());
}

/**
 * Executes the Nodec program
 * @param {NodecOpts} opts
 */
async function nodec(opts) {
  try {
    let { entry, help, name = 'my-app', nodeVersion = defaultNodeVersion, target } = opts;
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
      downloadLocations.map(async nodePath => bundleEntrypoint(entry, nodePath, nodeVersion)),
    );

    await Promise.all(
      target.map(async (target, i) => compileBinary(bundleLocations[i], downloadLocations[i], target, name)),
    );

    cleanup();
  } catch (error) {
    cleanup();
    console.error(error.message || error);
    process.exit(1);
  }
}

nodec(minimist(process.argv.slice(2)));
