import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import fetch from 'node-fetch';

import { gzipCompress } from './compress.js';
import { extractNodeArchive } from './extractNodeArchive.js';
import { NodecFolders } from './folders.js';
import type { SupportedOS } from './types.js';

/**
 * Computes the SHA-256 hex digest of a file on disk.
 */
async function sha256File(filePath: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  hash.update(await fs.readFile(filePath));
  return hash.digest('hex');
}

/**
 * Extracts the SHA-256 digest for a given filename from the contents of a
 * SHASUMS256.txt manifest.
 */
export function findChecksum(
  manifest: string,
  filename: string,
): string | undefined {
  for (const line of manifest.split('\n')) {
    const [checksum, name] = line.trim().split(/\s+/);
    if (name === filename && checksum) return checksum;
  }

  return undefined;
}

/**
 * Fetches the official SHASUMS256.txt for a Node.js release and returns the
 * expected SHA-256 digest for the requested archive filename.
 */
async function getExpectedChecksum(
  version: string,
  filename: string,
): Promise<string> {
  const url = `https://nodejs.org/dist/v${version}/SHASUMS256.txt`;
  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error(
      `Failed to download checksum manifest ${url} (is node v${version} a real release?)`,
    );
  }

  const checksum = findChecksum(await response.text(), filename);
  if (!checksum) throw new Error(`No checksum found for ${filename} in ${url}`);

  return checksum;
}

/**
 * Downloads the specific node.js version to disk in a temporary location and
 * verifies its integrity against the official SHASUMS256.txt before use.
 */
export async function downloadNode(version: string, target: SupportedOS) {
  const tempFolder = NodecFolders.downloadCache;

  await fs.ensureDir(tempFolder);

  const [providedOs, arch] = target.split('-');

  const os = providedOs === 'macos' ? 'darwin' : providedOs;

  const filename = `node-v${version}-${os}-${arch}.${os === 'win' ? 'zip' : 'tar.gz'}`;

  const downloadPath = path.join(tempFolder, filename);

  const expectedChecksum = await getExpectedChecksum(version, filename);

  let useCache = false;
  if (await fs.pathExists(downloadPath)) {
    if ((await sha256File(downloadPath)) === expectedChecksum) {
      useCache = true;
    } else {
      console.info(
        `Cached ${filename} failed checksum verification. Re-downloading.`,
      );
      await fs.remove(downloadPath);
    }
  }

  if (useCache) {
    console.info('Found', filename, 'in the nodec cache. Skipping download!');
  } else {
    const url = `https://nodejs.org/dist/v${version}/${filename}`;

    console.info(`Downloading node from ${url}`);
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Failed to download ${url}`);
    }

    await fs.writeFile(downloadPath, Buffer.from(await response.arrayBuffer()));

    const actualChecksum = await sha256File(downloadPath);
    if (actualChecksum !== expectedChecksum) {
      await fs.remove(downloadPath);
      throw new Error(
        `Checksum mismatch for ${filename}: expected ${expectedChecksum} but got ${actualChecksum}. ` +
          'The download may be corrupt or tampered with.',
      );
    }
  }

  const nodePath = await extractNodeArchive(downloadPath);

  const compressedNodePath = await gzipCompress(nodePath);

  return compressedNodePath;
}
