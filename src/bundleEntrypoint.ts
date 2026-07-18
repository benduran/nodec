import path from 'node:path';
import { build } from 'esbuild';

import { gzipCompress } from './compress.js';
import { TargetFormat } from './types.js';

/**
 * ESM is a royal pain. why this module format cannot die yet is beyond me.
 */
const cjsShimBanner = `import { createRequire as __nodecCreateRequire } from 'node:module';
import { fileURLToPath as __nodecFileURLToPath } from 'node:url';
import { dirname as __nodecDirname } from 'node:path';

if (typeof globalThis.require !== 'function') {
  Object.defineProperty(globalThis, 'require', {
    configurable: true,
    enumerable: false,
    value: __nodecCreateRequire(import.meta.url),
    writable: true,
  });
}

if (typeof globalThis.__filename !== 'string') {
  const __nodecFilename = __nodecFileURLToPath(import.meta.url);
  Object.defineProperty(globalThis, '__filename', {
    configurable: true,
    enumerable: false,
    value: __nodecFilename,
    writable: true,
  });
  Object.defineProperty(globalThis, '__dirname', {
    configurable: true,
    enumerable: false,
    value: __nodecDirname(__nodecFilename),
    writable: true,
  });
}
`;

/**
 * Compiles the user's entrypoint using esbuild
 */
export async function bundleEntrypoint(
  entrypoint: string,
  nodePath: string,
  nodeVersion: string,
  format: TargetFormat,
  minify: boolean,
) {
  const dest = path.join(path.dirname(nodePath), 'bundled.js');

  const entrypointPath = path.resolve(entrypoint);
  console.info('Compiling entrypoint', entrypointPath);

  const buildOpts: Parameters<typeof build>[0] = {
    bundle: true,
    entryPoints: [entrypointPath],
    format,
    minify,
    outfile: dest,
    platform: 'node',
    target: `node${nodeVersion}`,
  };

  if (format === TargetFormat.ESM) {
    buildOpts.banner = { js: cjsShimBanner };
  }

  await build(buildOpts);

  const compressedOutputPath = await gzipCompress(dest);

  return compressedOutputPath;
}
