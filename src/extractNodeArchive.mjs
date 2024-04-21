import decompress from 'decompress';
import decompressTarxz from 'decompress-tarxz';
import extractZip from 'extract-zip';
import glob from 'fast-glob';
import fs from 'fs-extra';
import path from 'path';
import * as tar from 'tar';

import { getTempFolder } from './getTempFolder.mjs';

/**
 * Given a path to a downloaded archive, extracts all of the contents
 * to the nodec temp folder
 * @param {string} archivePath
 */
export async function extractNodeArchive(archivePath) {
  const dest = path.join(getTempFolder(), path.basename(archivePath).replace(/((\.tar)?(\.(xz|gz))|(\.zip))$/, ''));
  await fs.ensureDir(dest);

  console.info(`Extracting ${archivePath} to ${dest}`);

  if (archivePath.endsWith('.zip')) await extractZip(archivePath, { dir: dest });
  else if (archivePath.endsWith('.xz')) {
    await decompress(archivePath, dest, {
      plugins: [decompressTarxz()],
    });
  } else await tar.x({ file: archivePath, C: dest });

  const nixMatches = await glob(path.join(dest, '**', 'bin', 'node'), { absolute: true, onlyFiles: true });
  const winMatches = await glob(path.join(dest, '**', 'node.exe'), { absolute: true, onlyFiles: true });

  const nodePath = nixMatches[0] || winMatches[0];

  if (!nodePath) {
    throw new Error(`No node executable was found to extract in the archive rendered in "${archivePath}"`);
  }

  return nodePath;
}
