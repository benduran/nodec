import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseTarget } from './target.js';
import { SupportedOS } from './types.js';

test('parseTarget maps a glibc linux target', () => {
  assert.deepEqual(parseTarget(SupportedOS.Linux_x64), {
    goArch: 'amd64',
    goOs: 'linux',
    libc: 'glibc',
    nodeArch: 'x64',
    nodeOs: 'linux',
  });
});

test('parseTarget reads the optional musl segment', () => {
  assert.deepEqual(parseTarget(SupportedOS.Linux_x64_musl), {
    goArch: 'amd64',
    goOs: 'linux',
    libc: 'musl',
    nodeArch: 'x64',
    nodeOs: 'linux',
  });
});

test('parseTarget keeps arm64 arch naming on both libc flavours', () => {
  assert.equal(parseTarget(SupportedOS.Linux_ARM64).goArch, 'arm64');
  assert.equal(parseTarget(SupportedOS.Linux_ARM64_musl).goArch, 'arm64');
  assert.equal(parseTarget(SupportedOS.Linux_ARM64_musl).libc, 'musl');
});

test('parseTarget renames macos to darwin for node, but not for go', () => {
  const parsed = parseTarget(SupportedOS.Mac_ARM64);
  assert.equal(parsed.nodeOs, 'darwin');
  assert.equal(parsed.goOs, 'darwin');
  assert.equal(parsed.goArch, 'arm64');
});

test('parseTarget renames win to windows for go, but not for node', () => {
  const parsed = parseTarget(SupportedOS.Win_x64);
  assert.equal(parsed.nodeOs, 'win');
  assert.equal(parsed.goOs, 'windows');
  assert.equal(parsed.goArch, 'amd64');
});

test('parseTarget never reports musl for a non-linux target', () => {
  for (const target of [
    SupportedOS.Mac_x64,
    SupportedOS.Mac_ARM64,
    SupportedOS.Win_x64,
  ]) {
    assert.equal(parseTarget(target).libc, 'glibc');
  }
});

test('parseTarget ignores an unrecognised third segment', () => {
  assert.equal(parseTarget('linux-x64-glibc').libc, 'glibc');
  assert.equal(parseTarget('linux-x64-nonsense').libc, 'glibc');
});

test('every supported target parses to a usable go os + arch', () => {
  for (const target of Object.values(SupportedOS)) {
    const { goArch, goOs } = parseTarget(target);
    assert.ok(goArch, `${target} produced an empty GOARCH`);
    assert.ok(goOs, `${target} produced an empty GOOS`);
  }
});
