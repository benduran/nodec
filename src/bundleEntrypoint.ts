import path from 'node:path';

import { build } from 'esbuild';

import { gzipCompress } from './compress.js';
import { TargetFormat } from './types.js';

/**
 * Compiles the user's entrypoint to ESM, using esbuild
 */
export async function bundleEntrypoint(
  entrypoint: string,
  nodePath: string,
  nodeVersion: string,
  format: TargetFormat,
) {
  const dest = path.join(path.dirname(nodePath), 'bundled.js');

  const entrypointPath = path.resolve(entrypoint);
  console.info('Compiling entrypoint', entrypointPath);
  await build({
    bundle: true,
    entryPoints: [entrypointPath],
    format,
    minify: true,
    outfile: dest,
    platform: 'node',
    target: `node${nodeVersion}`,
  });

  const compressedOutputPath = await gzipCompress(dest);

  return compressedOutputPath;
}
