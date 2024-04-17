import fs from 'fs-extra';
import fetch from 'node-fetch';
import path from 'path';

import { getTempFolder } from './getTempFolder.mjs';
import { extractArchive } from './extractArchive.mjs';

/**
 * @typedef {import('./constants.mjs').SupportedOSKeys} SupportedOSKeys
 */

/**
 * Downloads the specific node.js version to disk in a temporary location
 * @param {string} version
 * @param {SupportedOSKeys} target
 */
export function downloadNode(version, target) {
  return new Promise(async (resolve, reject) => {
    try {
      const tempFolder = getTempFolder();

      const [providedOs, arch] = target.split('-');

      const os = providedOs === 'macos' ? 'darwin' : providedOs;

      // linux format: https://nodejs.org/dist/v20.12.0/node-v20.12.0-linux-x64.tar.xz
      // mac format: https://nodejs.org/dist/v20.12.0/node-v20.12.0-darwin-arm64.tar.gz
      // windows format: https://nodejs.org/dist/v20.12.0/node-v20.12.0-win-x64.zip

      const filename = `node-v${version}-${os}-${arch}.${
        os === 'win' ? 'zip' : `tar.${os === 'darwin' ? 'xz' : 'gz'}`
      }`;
      const url = `https://nodejs.org/dist/v${version}/${filename}`;

      const downloadPath = path.join(tempFolder, filename);
      const dlStream = fs.createWriteStream(downloadPath);

      console.info(`Downloading node from ${url}`);
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) {
        return reject(new Error(`Failed to download ${url}`));
      }
      await extractArchive(downloadPath);

      dlStream.once('error', reject);
      dlStream.once('finish', () => resolve(downloadPath));
      response.body.pipe(dlStream);
    } catch (error) {
      reject(error);
    }
  });
}
