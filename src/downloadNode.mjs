import glob from 'fast-glob';
import fs from 'fs-extra';
import fetch from 'node-fetch';
import path from 'path';

import { gzipCompress } from './compress.mjs';
import { extractNodeArchive } from './extractNodeArchive.mjs';
import { NodecFolders } from './folders.mjs';

/**
 * @typedef {import('./constants.mjs').SupportedOSKeys} SupportedOSKeys
 */

/**
 * Downloads the specific node.js version to disk in a temporary location
 * @param {string} version
 * @param {SupportedOSKeys} target
 */
export async function downloadNode(version, target) {
  const tempFolder = NodecFolders.downloadCache;

  await fs.ensureDir(tempFolder);

  const [providedOs, arch] = target.split('-');

  const os = providedOs === 'macos' ? 'darwin' : providedOs;

  // linux format: https://nodejs.org/dist/v20.12.0/node-v20.12.0-linux-x64.tar.xz
  // mac format: https://nodejs.org/dist/v20.12.0/node-v20.12.0-darwin-arm64.tar.gz
  // windows format: https://nodejs.org/dist/v20.12.0/node-v20.12.0-win-x64.zip

  const filename = `node-v${version}-${os}-${arch}.${os === 'win' ? 'zip' : `tar.${os === 'darwin' ? 'xz' : 'gz'}`}`;

  // before attempting to download node, check to see if the requested version already exists in the disk cache
  const cacheDirResults = await glob(path.join(tempFolder, filename), { absolute: true, onlyFiles: true });
  const downloadPath = path.join(tempFolder, filename);

  if (cacheDirResults.every(p => p !== downloadPath)) {
    const url = `https://nodejs.org/dist/v${version}/${filename}`;

    console.info(`Downloading node from ${url}`);
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Failed to download ${url}`);
    }

    await fs.writeFile(downloadPath, Buffer.from(await response.arrayBuffer()));
  } else console.info('Found', filename, 'in the nodec cache. Skipping download!');

  const nodePath = await extractNodeArchive(downloadPath);

  const compressedNodePath = await gzipCompress(nodePath);

  return compressedNodePath;
}
