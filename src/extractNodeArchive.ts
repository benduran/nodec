import path from 'node:path';
import zlib from 'node:zlib';
import glob from 'fast-glob';
import fs from 'fs-extra';
import StreamZip from 'node-stream-zip';
import * as tar from 'tar';

import { NodecFolders } from './folders.js';

/**
 * fast-glob only understands POSIX (forward-slash) patterns. Building a pattern
 * with path.join emits backslash separators on Windows, which silently match
 * nothing, so join the segments ourselves and normalise separators to `/`.
 */
function toPosixGlob(...segments: string[]): string {
  return segments.join('/').replace(/\\/g, '/');
}

/**
 * Streams the single `node.exe` entry out of a Windows Node.js `.zip`. We embed
 * only the node binary, so there is no reason to inflate the other ~2,400 files
 * in the archive — and extracting just the one entry also side-steps a hang in
 * yauzl-based extractors (e.g. extract-zip) on the very large node.exe entry.
 */
async function extractNodeFromZip(
  archivePath: string,
  dest: string,
): Promise<string> {
  const zip = new StreamZip.async({ file: archivePath });
  try {
    const entries = await zip.entries();
    // node.exe lives at `<node-vX-win-x64>/node.exe`; pick the shallowest match
    // so we never grab a stray node.exe nested elsewhere in the tree.
    const nodeEntry = Object.keys(entries)
      .filter(name => path.posix.basename(name) === 'node.exe')
      .sort((a, b) => a.split('/').length - b.split('/').length)[0];

    if (!nodeEntry) return '';

    // Drop the .exe suffix to match the layout the nix archives use.
    const outPath = path.join(dest, 'node');
    await zip.extract(nodeEntry, outPath);
    return outPath;
  } finally {
    await zip.close();
  }
}

/**
 * Inflates a Node.js `.tar.gz` and returns the path to the extracted `bin/node`.
 */
async function extractNodeFromTarball(
  archivePath: string,
  dest: string,
): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    const readStream = fs.createReadStream(archivePath);
    readStream.once('error', reject);
    readStream
      .pipe(zlib.createGunzip())
      .pipe(tar.extract({ C: dest }))
      .once('error', reject)
      .once('finish', resolve);
  });

  const [nixexe = ''] = await glob(toPosixGlob(dest, '**', 'bin', 'node'), {
    absolute: true,
    onlyFiles: true,
  });

  return nixexe;
}

/**
 * Given a path to a downloaded archive, extracts the bundled node executable to
 * the nodec temp folder and returns its path.
 */
export async function extractNodeArchive(archivePath: string) {
  const dest = path.join(
    NodecFolders.extracted,
    path.basename(archivePath).replace(/((\.tar)?(\.(xz|gz))|(\.zip))$/, ''),
  );
  await fs.ensureDir(dest);

  console.info(`Extracting ${archivePath} to ${dest}`);

  const nodePath = archivePath.endsWith('.zip')
    ? await extractNodeFromZip(archivePath, dest)
    : await extractNodeFromTarball(archivePath, dest);

  if (!nodePath) {
    throw new Error(
      `No node executable was found to extract in the archive rendered in "${archivePath}"`,
    );
  }

  return nodePath;
}
