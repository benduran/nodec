import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import zlib from 'node:zlib';
import fs from 'fs-extra';
import fetch from 'node-fetch';
import * as tar from 'tar';

import { NodecFolders } from './folders.js';
import { parseTarget } from './target.js';
import type { SupportedOS } from './types.js';

// despicable that a node lib doesn't support ESM in 2026,
// but here we are 🫠
const require = createRequire(import.meta.url);
const { XzReadableStream } = require('xz-decompress') as {
  XzReadableStream: new (
    compressed: ReadableStream<Uint8Array>,
  ) => ReadableStream<Uint8Array>;
};

if (typeof XzReadableStream !== 'function') {
  throw new Error(
    `xz-decompress is not exporting XzReadableStream, which is required. While this is a bug with xz-decompress, nodec cannot continue 😭`,
  );
}

type RuntimeLib = {
  /** SHA-256 of the published package archive, pinned */
  checksum: string;
  /** matches the versioned real file inside the package, e.g. libstdc++.so.6.0.25 */
  match: RegExp;
  /** the SONAME node's DT_NEEDED actually asks the loader for */
  soName: string;
  url: string;
};

/**
 * Debian 10 (buster) ships gcc-8, whose libstdc++ provides GLIBCXX_3.4.25 --
 * comfortably above the GLIBCXX_3.4.21 node asks for -- while the libraries
 * themselves need no symbol newer than GLIBC_2.18. That combination matters:
 * libraries taken from a current release (bookworm) require GLIBC_2.36, which
 * would raise nodec's floor far above node's own GLIBC_2.28 and break RHEL 8,
 * Ubuntu 20.04 and Debian 11. buster is archived, so these URLs are frozen and
 * will not be superseded.
 */
const DEBIAN_POOL = 'https://archive.debian.org/debian/pool/main/g/gcc-8';

/** Alpine keeps published release trees online long after they go EOL. */
const ALPINE_POOL = 'https://dl-cdn.alpinelinux.org/alpine/v3.20/main';

const GLIBC_LIBS: Record<string, RuntimeLib[]> = {
  arm64: [
    {
      checksum:
        '1cef699ebc0bb80b1d1c7a27218bef0ec9d379eceddfacdf887fb25db73ed9e5',
      match: /libatomic\.so\.1\.\d+\.\d+$/,
      soName: 'libatomic.so.1',
      url: `${DEBIAN_POOL}/libatomic1_8.3.0-6_arm64.deb`,
    },
    {
      checksum:
        '52cf36333a405867a079a695f6a37cb63558859d7d19cef40fc7d112c39fefd6',
      match: /libstdc\+\+\.so\.6\.\d+\.\d+$/,
      soName: 'libstdc++.so.6',
      url: `${DEBIAN_POOL}/libstdc++6_8.3.0-6_arm64.deb`,
    },
    {
      checksum:
        '2851ac25d12958586c035de5ec4f2fc17272dec48f776dd0dd24c62f62674fd9',
      match: /libgcc_s\.so\.1$/,
      soName: 'libgcc_s.so.1',
      url: `${DEBIAN_POOL}/libgcc1_8.3.0-6_arm64.deb`,
    },
  ],
  x64: [
    {
      checksum:
        'f3aed76145c49f0b6be3eb6840abc4245eebf24448b55c8ed0736fc1d45e5f8a',
      match: /libatomic\.so\.1\.\d+\.\d+$/,
      soName: 'libatomic.so.1',
      url: `${DEBIAN_POOL}/libatomic1_8.3.0-6_amd64.deb`,
    },
    {
      checksum:
        '5cc70625329655ff9382580971d4616db8aa39af958b7c995ee84598f142a4ee',
      match: /libstdc\+\+\.so\.6\.\d+\.\d+$/,
      soName: 'libstdc++.so.6',
      url: `${DEBIAN_POOL}/libstdc++6_8.3.0-6_amd64.deb`,
    },
    {
      checksum:
        'b1bb7611f3372732889d502cb1d09fe572b5fbb5288a4a8b1ed0363fecc3555a',
      match: /libgcc_s\.so\.1$/,
      soName: 'libgcc_s.so.1',
      url: `${DEBIAN_POOL}/libgcc1_8.3.0-6_amd64.deb`,
    },
  ],
};

const MUSL_LIBS: Record<string, RuntimeLib[]> = {
  arm64: [
    {
      checksum:
        '0d6aabf922c91c8bfc62cf625366a6669d67048c3a4fef2318a1246f152de2c0',
      match: /libgcc_s\.so\.1$/,
      soName: 'libgcc_s.so.1',
      url: `${ALPINE_POOL}/aarch64/libgcc-13.2.1_git20240309-r1.apk`,
    },
    {
      checksum:
        'ee68ab3af02350f2135b6c0de393a55be88fbb20171e6182cdda6517c38b60a0',
      match: /libstdc\+\+\.so\.6\.\d+\.\d+$/,
      soName: 'libstdc++.so.6',
      url: `${ALPINE_POOL}/aarch64/libstdc++-13.2.1_git20240309-r1.apk`,
    },
  ],
  x64: [
    {
      checksum:
        'f348d99e10b5267566afe6f80861661b08cb5aa43a6d4d1c8f1792b5001d0995',
      match: /libgcc_s\.so\.1$/,
      soName: 'libgcc_s.so.1',
      url: `${ALPINE_POOL}/x86_64/libgcc-13.2.1_git20240309-r1.apk`,
    },
    {
      checksum:
        'af0fe894ef5051116e321bf4753a10fffa85abc2b71f30b2e949467775421ace',
      match: /libstdc\+\+\.so\.6\.\d+\.\d+$/,
      soName: 'libstdc++.so.6',
      url: `${ALPINE_POOL}/x86_64/libstdc++-13.2.1_git20240309-r1.apk`,
    },
  ],
};

export function getRuntimeLibsForTarget(
  target: SupportedOS | string,
): RuntimeLib[] {
  const { goOs, libc, nodeArch } = parseTarget(target);
  if (goOs !== 'linux') return [];

  const table = libc === 'musl' ? MUSL_LIBS : GLIBC_LIBS;

  return table[nodeArch] ?? [];
}

type ArMember = {
  data: Buffer;
  name: string;
};

/**
 * The fixed 8-byte signature every `ar` archive opens with. The trailing 0x0A
 * is part of the magic number itself, not a line ending -- it is the same eight
 * bytes on every platform, and we compare raw bytes rather than text, so
 * nothing here is affected by CRLF translation.
 */
const AR_MAGIC = Buffer.from([0x21, 0x3c, 0x61, 0x72, 0x63, 0x68, 0x3e, 0x0a]);

/**
 * Parses the `ar` container a .deb is wrapped in. The format is deliberately
 * simple: an 8-byte magic followed by 60-byte plain-text headers, each padded
 * to an even offset.
 */
export function parseArArchive(buf: Buffer): ArMember[] {
  if (!buf.subarray(0, AR_MAGIC.length).equals(AR_MAGIC)) {
    throw new Error('not an ar archive (bad magic)');
  }

  const members: ArMember[] = [];
  let offset = 8;

  while (offset + 60 <= buf.length) {
    const header = buf.subarray(offset, offset + 60);
    const name = header
      .subarray(0, 16)
      .toString('ascii')
      .trim()
      .replace(/\/$/, '');
    const size = Number.parseInt(
      header.subarray(48, 58).toString('ascii').trim(),
      10,
    );

    if (!Number.isFinite(size) || size < 0) {
      throw new Error(`ar member "${name}" declared an unreadable size`);
    }

    const start = offset + 60;
    members.push({ data: buf.subarray(start, start + size), name });
    // members are padded to an even byte boundary
    offset = start + size + (size % 2);
  }

  return members;
}

async function xzDecompress(compressed: Buffer): Promise<Buffer> {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(compressed));
      controller.close();
    },
  });

  const chunks: Buffer[] = [];
  for await (const chunk of new XzReadableStream(source)) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

/**
 * Unwraps a package archive down to the plain tar bytes inside it. .deb hides
 * its payload in an `ar` container as xz, while .apk is a plain gzip stream (of
 * several concatenated members, which gunzip handles).
 */
function readPackagePayload(url: string, archive: Buffer): Promise<Buffer> {
  if (url.endsWith('.apk')) return Promise.resolve(zlib.gunzipSync(archive));

  const payload = parseArArchive(archive).find(member =>
    member.name.startsWith('data.tar'),
  );
  if (!payload) throw new Error(`no data.tar member found in ${url}`);

  if (payload.name.endsWith('.xz')) return xzDecompress(payload.data);
  if (payload.name.endsWith('.gz')) {
    return Promise.resolve(zlib.gunzipSync(payload.data));
  }

  throw new Error(`unsupported payload compression: ${payload.name}`);
}

/**
 * Pulls the single real (non-symlink) shared object out of an already
 * decompressed tar. Distro packages ship libfoo.so.1 as a symlink to the
 * versioned libfoo.so.1.2.3, and a symlink is useless once the file is
 * extracted on its own, so match the versioned file and rename it to the
 * SONAME the loader will look for.
 */
async function extractSharedObject(
  tarBytes: Buffer,
  lib: RuntimeLib,
  destDir: string,
): Promise<string> {
  const dest = path.join(destDir, lib.soName);
  let found = false;

  await new Promise<void>((resolve, reject) => {
    const parser = new tar.Parser();
    parser.on('entry', entry => {
      if (found || entry.type !== 'File' || !lib.match.test(entry.path)) {
        entry.resume();
        return;
      }
      found = true;
      const out = fs.createWriteStream(dest);
      entry.pipe(out);
      out.once('error', reject);
    });
    parser.once('error', reject);
    parser.once('end', resolve);
    parser.end(tarBytes);
  });

  if (!found) {
    throw new Error(
      `could not find a file matching ${lib.match} for ${lib.soName}`,
    );
  }

  return dest;
}

function sha256(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function downloadPackage(lib: RuntimeLib): Promise<Buffer> {
  const cachePath = path.join(
    NodecFolders.downloadCache,
    path.basename(new URL(lib.url).pathname),
  );

  if (await fs.pathExists(cachePath)) {
    const cached = await fs.readFile(cachePath);
    if (sha256(cached) === lib.checksum) return cached;
    await fs.remove(cachePath);
  }

  console.info(`Downloading runtime library from ${lib.url}`);
  const response = await fetch(lib.url, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Failed to download ${lib.url} (${response.status})`);
  }

  const archive = Buffer.from(await response.arrayBuffer());
  const actual = sha256(archive);
  if (actual !== lib.checksum) {
    throw new Error(
      `Checksum mismatch for ${lib.url}: expected ${lib.checksum} but got ${actual}. ` +
        'The download may be corrupt or tampered with.',
    );
  }

  await fs.writeFile(cachePath, archive);

  return archive;
}

/**
 * Builds the `libs.tar.gz` that gets embedded next to the node runtime.
 *
 * No prebuilt node binary is statically linked, so on linux node always names a
 * few shared libraries it cannot start without.
 * Shipping them alongside node, and pointing
 * LD_LIBRARY_PATH at them, is what makes the compiled binary runnable without
 * asking anyone to install packages first.
 *
 * Non-linux targets still get an archive, just an empty one, so the Go template
 * can keep a single unconditional embed directive.
 */
export async function bundleRuntimeLibs(
  target: SupportedOS | string,
  destDir: string,
): Promise<string> {
  const libs = getRuntimeLibsForTarget(target);
  const tarPath = path.join(destDir, 'libs.tar.gz');

  // tar.create rejects an empty file list, so write the archive by hand for
  // macOS and Windows. Two 512-byte zero blocks is a valid, empty tar, which
  // the go side reads as "no libraries" and skips LD_LIBRARY_PATH for.
  if (libs.length === 0) {
    await fs.writeFile(tarPath, zlib.gzipSync(Buffer.alloc(1024)));
    return tarPath;
  }

  const stagingDir = path.join(destDir, 'runtime-libs');
  await fs.ensureDir(stagingDir);
  await fs.ensureDir(NodecFolders.downloadCache);

  for (const lib of libs) {
    const archive = await downloadPackage(lib);
    const payload = await readPackagePayload(lib.url, archive);
    await extractSharedObject(payload, lib, stagingDir);
  }

  await tar.create(
    { cwd: stagingDir, file: tarPath, gzip: true, portable: true },
    libs.map(lib => lib.soName),
  );

  return tarPath;
}
