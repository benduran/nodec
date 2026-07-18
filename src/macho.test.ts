import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

import { machoHasCodeSignature } from './macho.js';

const LC_CODE_SIGNATURE = 0x1d;
const LC_SEGMENT_64 = 0x19;
const MH_MAGIC_64 = 0xfe_ed_fa_cf;

/**
 * Builds a minimal 64-bit little-endian Mach-O image with a single load
 * command of the given type.
 */
function machoWithLoadCommand(cmd: number): Buffer {
  const header = Buffer.alloc(32);
  header.writeUInt32LE(MH_MAGIC_64, 0);
  header.writeUInt32LE(1, 16); // ncmds
  header.writeUInt32LE(16, 20); // sizeofcmds

  const load = Buffer.alloc(16);
  load.writeUInt32LE(cmd, 0);
  load.writeUInt32LE(16, 4); // cmdsize

  return Buffer.concat([header, load]);
}

let dir: string;
async function fixture(name: string, buf: Buffer): Promise<string> {
  dir ??= await mkdtemp(path.join(os.tmpdir(), 'macho-test-'));
  const p = path.join(dir, name);
  await writeFile(p, buf);
  return p;
}

after(() => (dir ? rm(dir, { force: true, recursive: true }) : undefined));

test('machoHasCodeSignature detects an LC_CODE_SIGNATURE load command', async () => {
  const p = await fixture('signed', machoWithLoadCommand(LC_CODE_SIGNATURE));
  assert.equal(await machoHasCodeSignature(p), true);
});

test('machoHasCodeSignature returns false when no signature command is present', async () => {
  const p = await fixture('unsigned', machoWithLoadCommand(LC_SEGMENT_64));
  assert.equal(await machoHasCodeSignature(p), false);
});

test('machoHasCodeSignature returns false for a non-Mach-O file', async () => {
  const p = await fixture('garbage', Buffer.from('not a mach-o binary at all'));
  assert.equal(await machoHasCodeSignature(p), false);
});
