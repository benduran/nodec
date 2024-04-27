#!/usr/bin/env node

import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import fs from 'fs-extra';
import createCLI from 'yargs';
import { hideBin } from 'yargs/helpers';

import { bundleEntrypoint } from './bundleEntrypoint.js';
import { compileBinary } from './compileBinary.js';
import { defaultNodeVersion, supportedOs } from './constants.js';
import { downloadNode } from './downloadNode.js';
import { NodecFolders } from './folders.js';
import { guardGoToolchain } from './guardGoToolchain.js';
import { SupportedOS, TargetFormat } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Cleans up the download folder after nodec executes,
 * regardless of whether it was a success or a failure
 */
function cleanup(noCleanup: boolean) {
  if (noCleanup) {
    return console.info(
      'you opted for --noCleanup so all artifacts have been left in the following temp folder:',
      NodecFolders.root,
    );
  }
  const foldersToRemove = [NodecFolders.extracted];
  for (const folder of foldersToRemove) fs.removeSync(folder);
}

/**
 * Gets the default compilation OS + ARCH target,
 * if the user didn't provide one
 */
function getDefaultTarget() {
  return `${os.type() === 'Linux' ? 'linux' : os.type() === 'Darwin' ? 'macos' : 'win'}-${
    os.arch() === 'arm64' ? 'arm64' : 'x64'
  }`;
}

/**
 * Executes the Nodec program
 */
async function nodec() {
  const yargs = createCLI(hideBin(process.argv));

  const { version } = JSON.parse(await fs.readFile(path.join(__dirname, '../package.json'), 'utf-8')) as {
    version: string;
  };

  const { entry, format, name, noCleanup, nodeFlags, nodeVersion, outDir, target } = await yargs
    .scriptName('nodec')
    .version(version)
    .option('entry', {
      demandOption: true,
      description: 'the entrypoint to your JavaScript or TypeScript application',
      type: 'string',
    })
    .option('format', {
      choices: Object.values(TargetFormat),
      default: 'esm',
      description: 'which module format your JavaScript and / or TypeScript code will be compiled to',
      type: 'string',
    })
    .option('name', {
      default: 'my-app',
      description: 'the final outputted filename that represents your compiled application',
      type: 'string',
    })
    .option('noCleanup', {
      default: false,
      description:
        'if true, will leave all of the downloaded, bundled and compresses assets in a temporary folder on your machine, so you can inspect the state of them',
      type: 'boolean',
    })
    .option('nodeFlags', {
      default: [],
      description:
        'one or more node.js flags to automatically set when executing your compiled application (like --experimental-require-module, --experimental-default-type and others). for a list of available flags, please refer to the official node.js documentation: https://nodejs.org/docs/latest/api',
      type: 'array',
    })
    .option('nodeVersion', {
      default: defaultNodeVersion,
      description:
        'defines the version of NodeJS that will be used when compiling your standalone executable. Must be an explicit version. Semver ranges are not supported.',
      type: 'string',
    })
    .option('outDir', {
      default: process.cwd(),
      description:
        'if set, uses this dir as the location where your binaries will be placed after compilation. Defaults to your CWD.',
      type: 'string',
    })
    .option('target', {
      choices: Array.from(supportedOs),
      default: [getDefaultTarget()],
      description: 'one or more os+arch compilation targets',
      type: 'array',
    })
    .help().argv;

  console.info('nodeFlags', nodeFlags, 'noCleanup', noCleanup);

  try {
    if (!target.every(t => supportedOs.has(t as SupportedOS))) {
      throw new Error(
        `you have provided one or more compilation targets that are not supported. ${Array.from(supportedOs).join(
          ',',
        )} are supported`,
      );
    }

    await guardGoToolchain();

    const downloadLocations = await Promise.all(
      target.map(async osname => downloadNode(nodeVersion, osname as SupportedOS)),
    );

    const bundleLocations = await Promise.all(
      downloadLocations.map(async nodePath => bundleEntrypoint(entry, nodePath, nodeVersion, format as TargetFormat)),
    );

    const renderedLocations = await Promise.all(
      target.map(async (target, i) =>
        compileBinary(
          bundleLocations[i]!,
          downloadLocations[i]!,
          nodeFlags.map(arg => String(arg)),
          target as SupportedOS,
          name,
          outDir,
        ),
      ),
    );

    console.info('rendered the following binaries:');
    console.info(renderedLocations.join(os.EOL));
    cleanup(noCleanup);
  } catch (error) {
    cleanup(noCleanup);
    console.error(error.message || error);
    process.exit(1);
  }
}

nodec();
