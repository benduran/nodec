import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findChecksum } from './downloadNode.js';

const manifest = [
  'aaaa1111  node-v26.5.0-linux-x64.tar.gz',
  'bbbb2222  node-v26.5.0-linux-arm64.tar.gz',
  'cccc3333  node-v26.5.0-win-x64.zip',
  '',
].join('\n');

test('findChecksum returns the digest for a matching filename', () => {
  assert.equal(
    findChecksum(manifest, 'node-v26.5.0-linux-arm64.tar.gz'),
    'bbbb2222',
  );
});

test('findChecksum returns undefined for a missing filename', () => {
  assert.equal(
    findChecksum(manifest, 'node-v26.5.0-darwin-arm64.tar.gz'),
    undefined,
  );
});

test('findChecksum does not partial-match filenames', () => {
  assert.equal(findChecksum(manifest, 'linux-x64.tar.gz'), undefined);
});
