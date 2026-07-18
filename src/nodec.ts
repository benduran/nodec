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
import { errorToString } from './errorToString.js';
import { NodecFolders } from './folders.js';
import { guardGoToolchain } from './guardGoToolchain.js';
import { getDefaultTarget } from './platform.js';
import type { SupportedOS } from './types.js';
import { TargetFormat } from './types.js';

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
 * Executes the Nodec program
 */
async function nodec() {
  const yargs = createCLI(hideBin(process.argv));

  const { version } = JSON.parse(
    await fs.readFile(path.join(__dirname, '../package.json'), 'utf-8'),
  ) as {
    version: string;
  };

  const argv = await yargs
    .scriptName('nodec')
    // https://github.com/yargs/yargs-parser#populate---
    .parserConfiguration({ 'populate--': true })
    .version(version)
    .option('entry', {
      demandOption: true,
      description:
        'the entrypoint to your JavaScript or TypeScript application',
      type: 'string',
    })
    .option('format', {
      choices: Object.values(TargetFormat),
      default: 'esm',
      description:
        'which module format your JavaScript and / or TypeScript code will be compiled to',
      type: 'string',
    })
    .option('name', {
      default: 'my-app',
      description:
        'the final outputted filename that represents your compiled application',
      type: 'string',
    })
    .option('noCleanup', {
      default: false,
      description:
        'if true, will leave all of the downloaded, bundled and compresses assets in a temporary folder on your machine, so you can inspect the state of them',
      type: 'boolean',
    })
    .option('noMinify', {
      default: false,
      description:
        'if true, will emit uncompressed JavaScript code into the compiled binary',
      type: 'boolean',
    })
    .option('nodeFlags', {
      default: [],
      description:
        'one or more node.js flags to automatically set when executing your compiled application (like --experimental-require-module, --experimental-default-type and others). Because these values start with a dash, pass them with the `=` form (--nodeFlags=--throw-deprecation) or after a `--` separator (-- --throw-deprecation). for a list of available flags, please refer to the official node.js documentation: https://nodejs.org/docs/latest/api',
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
    // Reject unknown arguments loudly instead of silently ignoring them. This
    // is what turns a mistyped node flag from a silent no-op into an error.
    .strict()
    .fail(msg => {
      console.error(msg);
      if (/unknown\s+argument/i.test(msg ?? '')) {
        console.error(
          'To pass flags to the bundled Node.js runtime, put them after a `--` separator:',
        );
        console.error(
          '  nodec --entry app.js -- --throw-deprecation --unhandled-rejections=none',
        );
        console.error('or use the `=` form of --nodeFlags:');
        console.error('  nodec --entry app.js --nodeFlags=--throw-deprecation');
        console.error(
          'The space-separated form (`--nodeFlags --throw-deprecation`) is not supported: yargs would drop the flag.',
        );
      }
      process.exit(1);
    })
    .help().argv;

  const {
    entry,
    format,
    name,
    noCleanup,
    noMinify,
    nodeVersion,
    outDir,
    target,
  } = argv;
  // Node flags can arrive two ways: as --nodeFlags=<flag> values, or as verbatim
  // tokens after a `--` separator. Merge both, preserving order (explicit first).
  const passthroughFlags =
    (argv['--'] as Array<string | number> | undefined) ?? [];
  const nodeFlags = [
    ...(argv.nodeFlags as Array<string | number>),
    ...passthroughFlags,
  ].map(String);

  try {
    if (!target.every(t => supportedOs.has(t as SupportedOS))) {
      throw new Error(
        `you have provided one or more compilation targets that are not supported. ${Array.from(
          supportedOs,
        ).join(',')} are supported`,
      );
    }

    await guardGoToolchain();

    const downloadLocations = await Promise.all(
      target.map(async osname =>
        downloadNode(nodeVersion, osname as SupportedOS),
      ),
    );

    const bundleLocations = await Promise.all(
      downloadLocations.map(async nodePath =>
        bundleEntrypoint(
          entry,
          nodePath,
          nodeVersion,
          format as TargetFormat,
          !noMinify,
        ),
      ),
    );

    const renderedLocations = await Promise.all(
      target.map(async (target, i) =>
        compileBinary(
          bundleLocations[i] || '',
          downloadLocations[i] || '',
          nodeFlags,
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
    console.error(errorToString(error));
    process.exit(1);
  }
}

nodec();
