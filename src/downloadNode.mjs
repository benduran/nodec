import fs from 'fs-extra';
import fetch from 'node-fetch';
import path from 'path';

import { extractNodeArchive } from './extractNodeArchive.mjs';
import { getTempFolder } from './getTempFolder.mjs';

/**
 * @typedef {import('./constants.mjs').SupportedOSKeys} SupportedOSKeys
 */

/**
 * Downloads the specific node.js version to disk in a temporary location
 * @param {string} version
 * @param {SupportedOSKeys} target
 */
export async function downloadNode(version, target) {
  const tempFolder = getTempFolder();

  const [providedOs, arch] = target.split('-');

  const os = providedOs === 'macos' ? 'darwin' : providedOs;

  // linux format: https://nodejs.org/dist/v20.12.0/node-v20.12.0-linux-x64.tar.xz
  // mac format: https://nodejs.org/dist/v20.12.0/node-v20.12.0-darwin-arm64.tar.gz
  // windows format: https://nodejs.org/dist/v20.12.0/node-v20.12.0-win-x64.zip

  const filename = `node-v${version}-${os}-${arch}.${os === 'win' ? 'zip' : `tar.${os === 'darwin' ? 'xz' : 'gz'}`}`;
  const url = `https://nodejs.org/dist/v${version}/${filename}`;

  const downloadPath = path.join(tempFolder, filename);

  console.info(`Downloading node from ${url}`);
  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Failed to download ${url}`);
  }

  await fs.writeFile(downloadPath, Buffer.from(await response.arrayBuffer()));

  const nodePath = await extractNodeArchive(downloadPath);

  return nodePath;
}
