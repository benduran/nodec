import path from 'node:path';

import { build } from 'esbuild';

/**
 * Compiles the user's entrypoint to ESM, using esbuild
 * @param {string} entrypoint
 * @param {string} nodePath
 * @param {string} nodeVersion
 */
export async function bundleEntrypoint(entrypoint, nodePath, nodeVersion) {
  const dest = path.join(path.dirname(nodePath), 'bundled.js');

  await build({
    bundle: true,
    entryPoints: [entrypoint],
    format: 'esm',
    outfile: dest,
    platform: 'node',
    target: `node${nodeVersion}`,
  });

  return dest;
}
