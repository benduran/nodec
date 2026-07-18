import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getDefaultTarget } from './platform.js';

test('getDefaultTarget maps linux x64', () => {
  assert.equal(getDefaultTarget('Linux', 'x64'), 'linux-x64');
});

test('getDefaultTarget maps linux arm64', () => {
  assert.equal(getDefaultTarget('Linux', 'arm64'), 'linux-arm64');
});

test('getDefaultTarget maps macos arm64', () => {
  assert.equal(getDefaultTarget('Darwin', 'arm64'), 'macos-arm64');
});

test('getDefaultTarget maps macos x64', () => {
  assert.equal(getDefaultTarget('Darwin', 'x64'), 'macos-x64');
});

test('getDefaultTarget maps windows to win', () => {
  assert.equal(getDefaultTarget('Windows_NT', 'x64'), 'win-x64');
});

test('getDefaultTarget treats non-arm64 arches as x64', () => {
  assert.equal(getDefaultTarget('Linux', 'ia32'), 'linux-x64');
});
