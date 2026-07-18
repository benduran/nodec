import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { renderGoTemplate } from './compileBinary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const template =
  'dir := "nodec-{{appName}}-"\nnode := "{{nodeChecksum}}"\nbundle := "{{bundleChecksum}}"\nnodeFlags := []string{}\n';

test('renderGoTemplate substitutes both placeholders', () => {
  const out = renderGoTemplate(template, 'my-app', []);
  assert.match(out, /dir := "nodec-my-app-"/);
  assert.match(out, /nodeFlags := \[\]string\{\}/);
  assert.doesNotMatch(out, /\{\{appName\}\}/);
});

test('renderGoTemplate escapes flags containing quotes and backslashes', () => {
  const out = renderGoTemplate(template, 'app', ['--a"b', 'c\\d']);
  assert.match(out, /nodeFlags := \[\]string\{"--a\\"b", "c\\\\d"\}/);
});

test('renderGoTemplate confines an unsafe appName to the string literal', () => {
  const out = renderGoTemplate(template, 'evil"; os.Exit(1) //', []);
  const dirLine = out.split('\n').find(l => l.startsWith('dir :='));
  // the whole appName must reduce to safe chars and stay inside the two quotes,
  // so a crafted --name cannot break out and inject Go
  assert.match(dirLine ?? '', /^dir := "nodec-[a-zA-Z0-9._-]+-"$/);
});

test('renderGoTemplate falls back to "app" for an empty appName', () => {
  const out = renderGoTemplate(template, '', []);
  assert.match(out, /dir := "nodec-app-"/);
});

test('renderGoTemplate embeds the integrity checksums', () => {
  const node = 'a'.repeat(64);
  const bundle = 'b'.repeat(64);
  const out = renderGoTemplate(template, 'my-app', [], { bundle, node });
  assert.match(out, new RegExp(`node := "${node}"`));
  assert.match(out, new RegExp(`bundle := "${bundle}"`));
});

test('renderGoTemplate leaves no placeholders in the real Go template', async () => {
  const real = await readFile(
    path.join(__dirname, 'go', 'compiler.go'),
    'utf-8',
  );
  const out = renderGoTemplate(real, 'my-app', ['--x'], {
    bundle: 'b'.repeat(64),
    node: 'a'.repeat(64),
  });
  assert.doesNotMatch(out, /\{\{appName\}\}/);
  assert.doesNotMatch(out, /\{\{nodeChecksum\}\}/);
  assert.doesNotMatch(out, /\{\{bundleChecksum\}\}/);
  assert.match(out, /nodeFlags := \[\]string\{"--x"\}/);
});
