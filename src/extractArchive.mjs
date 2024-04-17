import extractZip from 'extract-zip';
import fs from 'fs-extra';
import path from 'path';
import tar from 'tar-stream';

import { getTempFolder } from './getTempFolder.mjs';

/**
 * Given a path to a downloaded archive, extracts all of the contents
 * to the nodec temp folder
 * @param {string} archivePath
 */
export function extractArchive(archivePath) {
  return new Promise(async (resolve, reject) => {
    const dest = path.join(getTempFolder());
    console.info(`Extracting ${archivePath} to ${dest}`);
    if (archivePath.endsWith('.zip')) {
      try {
        await extractZip(archivePath, { dir: dest });
        return resolve();
      } catch (error) {
        reject(error);
      }
    }
    const extract = tar.extract();

    extract.on('entry', (header, stream, next) => {
      const filePath = `${getTempFolder()}/${header.name}`;
      if (header.type === 'file') {
        stream.pipe(fs.createWriteStream(filePath));
      } else if (header.type === 'directory') {
        fs.mkdirSync(filePath, { recursive: true });
      }
      stream.on('end', next);
      stream.resume();
    });

    extract.on('finish', () => {
      resolve();
    });

    extract.on('error', err => {
      reject(err);
    });

    fs.createReadStream(archivePath).pipe(zlib.createGunzip()).pipe(extract);
  });
}
