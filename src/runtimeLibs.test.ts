import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import zlib from 'node:zlib';

import {
  bundleRuntimeLibs,
  getRuntimeLibsForTarget,
  parseArArchive,
} from './runtimeLibs.js';
import { SupportedOS } from './types.js';

/**
 * Builds a minimal `ar` archive so the parser is exercised without reaching for
 * a real 8MB .deb over the network.
 */
function makeArArchive(members: Array<{ body: string; name: string }>): Buffer {
  const chunks: Buffer[] = [Buffer.from('!<arch>\n', 'ascii')];

  for (const { body, name } of members) {
    const header = Buffer.alloc(60, 0x20);
    header.write(`${name}/`, 0, 'ascii');
    header.write(String(body.length), 48, 'ascii');
    header.write('`\n', 58, 'ascii');
    chunks.push(header, Buffer.from(body, 'ascii'));
    // members are padded to an even boundary
    if (body.length % 2) chunks.push(Buffer.from('\n', 'ascii'));
  }

  return Buffer.concat(chunks);
}

test('parseArArchive reads member names and payloads', () => {
  const archive = makeArArchive([
    { body: '2.0\n', name: 'debian-binary' },
    { body: 'CONTROL', name: 'control.tar.xz' },
    { body: 'PAYLOAD', name: 'data.tar.xz' },
  ]);

  const members = parseArArchive(archive);
  assert.deepEqual(
    members.map(m => m.name),
    ['debian-binary', 'control.tar.xz', 'data.tar.xz'],
  );
  assert.equal(members[2]?.data.toString('ascii'), 'PAYLOAD');
});

test('parseArArchive realigns after an odd-length member', () => {
  // 'ODD' is 3 bytes, so the next header only lines up if the pad byte is
  // consumed -- the exact bug that would silently corrupt every later member.
  const archive = makeArArchive([
    { body: 'ODD', name: 'first' },
    { body: 'SECOND', name: 'data.tar.xz' },
  ]);

  const members = parseArArchive(archive);
  assert.equal(members[1]?.name, 'data.tar.xz');
  assert.equal(members[1]?.data.toString('ascii'), 'SECOND');
});

test('parseArArchive rejects a non-ar buffer', () => {
  assert.throws(
    () => parseArArchive(Buffer.from('not an archive at all', 'ascii')),
    /bad magic/,
  );
});

test('getRuntimeLibsForTarget bundles the gcc runtime for glibc linux', () => {
  const names = getRuntimeLibsForTarget(SupportedOS.Linux_x64).map(
    lib => lib.soName,
  );
  assert.deepEqual(names, [
    'libatomic.so.1',
    'libstdc++.so.6',
    'libgcc_s.so.1',
  ]);
});

test('getRuntimeLibsForTarget omits libatomic for musl, which does not need it', () => {
  const names = getRuntimeLibsForTarget(SupportedOS.Linux_x64_musl).map(
    lib => lib.soName,
  );
  assert.deepEqual(names, ['libgcc_s.so.1', 'libstdc++.so.6']);
});

test('getRuntimeLibsForTarget bundles nothing for macOS and Windows', () => {
  for (const target of [
    SupportedOS.Mac_x64,
    SupportedOS.Mac_ARM64,
    SupportedOS.Win_x64,
  ]) {
    assert.deepEqual(getRuntimeLibsForTarget(target), []);
  }
});

test('bundleRuntimeLibs writes a valid empty archive for non-linux targets', async () => {
  // tar.create throws when handed an empty file list, so the macOS / Windows
  // path has to build the archive itself -- and it still has to be a real,
  // inflatable tar or the go side fails at startup.
  const destDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nodec-libs-test-'));

  try {
    const tarPath = await bundleRuntimeLibs(SupportedOS.Mac_ARM64, destDir);
    const inflated = zlib.gunzipSync(await fs.readFile(tarPath));

    assert.equal(path.basename(tarPath), 'libs.tar.gz');
    // a tar with no members is two 512-byte zero blocks
    assert.equal(inflated.length, 1024);
    assert.ok(inflated.every(byte => byte === 0));
  } finally {
    await fs.rm(destDir, { force: true, recursive: true });
  }
});

test('every linux target resolves a non-empty, checksum-pinned lib set', () => {
  const linuxTargets = Object.values(SupportedOS).filter(t =>
    t.startsWith('linux-'),
  );

  for (const target of linuxTargets) {
    const libs = getRuntimeLibsForTarget(target);
    assert.ok(libs.length > 0, `${target} resolved no runtime libraries`);
    for (const lib of libs) {
      assert.match(lib.checksum, /^[a-f0-9]{64}$/, `${target} ${lib.soName}`);
      assert.match(lib.url, /^https:\/\//, `${target} ${lib.soName}`);
    }
  }
});
