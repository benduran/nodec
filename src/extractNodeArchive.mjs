import zlib from 'node:zlib';

import extractZip from 'extract-zip';
import glob from 'fast-glob';
import fs from 'fs-extra';
import lzma from 'lzma-native';
import path from 'path';
import * as tar from 'tar';

import { NodecFolders } from './folders.mjs';

/**
 * Generically inflates an archive file
 * @param {string} archivePath
 * @param {string} dest
 * @returns {Promise<void>}
 */
async function extractArchive(archivePath, dest) {
  if (archivePath.endsWith('.zip')) return extractZip(archivePath, { dir: dest });
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(archivePath);
    readStream.once('error', reject);
    if (archivePath.endsWith('.xz')) {
      readStream
        .pipe(lzma.createDecompressor())
        .pipe(tar.extract({ C: dest }))
        .once('error', reject)
        .once('finish', resolve);
    } else
      readStream
        .pipe(zlib.createGunzip())
        .pipe(tar.extract({ C: dest }))
        .once('error', reject)
        .once('finish', resolve);
  });
}

/**
 * Given a path to a downloaded archive, extracts all of the contents
 * to the nodec temp folder
 * @param {string} archivePath
 */
export async function extractNodeArchive(archivePath) {
  const dest = path.join(
    NodecFolders.extracted,
    path.basename(archivePath).replace(/((\.tar)?(\.(xz|gz))|(\.zip))$/, ''),
  );
  await fs.ensureDir(dest);

  console.info(`Extracting ${archivePath} to ${dest}`);

  await extractArchive(archivePath, dest);

  const [nixexe = ''] = await glob(path.join(dest, '**', 'bin', 'node'), { absolute: true, onlyFiles: true });
  const [winexec = ''] = await glob(path.join(dest, '**', 'node.exe'), { absolute: true, onlyFiles: true });

  let nodePath = '';

  if (winexec) {
    // need to drop the .exe from the binary
    const winMvPath = path.join(path.dirname(winexec), 'node');
    await fs.move(winexec, winMvPath, { overwrite: true });
    nodePath = winMvPath;
  } else nodePath = nixexe;

  if (!nodePath) {
    throw new Error(`No node executable was found to extract in the archive rendered in "${archivePath}"`);
  }

  return nodePath;
}
