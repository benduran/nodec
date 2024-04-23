import path from 'node:path';

import { build } from 'esbuild';

import { gzipCompress } from './compress.mjs';

/**
 * Compiles the user's entrypoint to ESM, using esbuild
 * @param {string} entrypoint
 * @param {string} nodePath
 * @param {string} nodeVersion
 * @param {'cjs' | 'esm'} format
 */
export async function bundleEntrypoint(entrypoint, nodePath, nodeVersion, format) {
  const dest = path.join(path.dirname(nodePath), 'bundled.js');

  const entrypointPath = path.resolve(entrypoint);
  console.info('Compiling entrypoint', entrypointPath);
  await build({
    bundle: true,
    entryPoints: [entrypointPath],
    format,
    outfile: dest,
    platform: 'node',
    target: `node${nodeVersion}`,
  });

  const compressedOutputPath = await gzipCompress(dest);

  return compressedOutputPath;
}
