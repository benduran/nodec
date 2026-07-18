import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { gzipSync } from 'node:zlib';

import commandExists from 'command-exists';

import { renderGoTemplate } from '../src/compileBinary.js';
import { defaultNodeVersion } from '../src/constants.js';
import { machoHasCodeSignature } from '../src/macho.js';
import { getDefaultTarget } from '../src/platform.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const hasGo = await commandExists('go')
  .then(() => true)
  .catch(() => false);

// The whole point of this suite is to exercise real compiled binaries. Skipping
// when Go is absent is fine for local dev, but in CI a missing toolchain must
// fail loudly instead of silently turning every test below into a no-op (which
// would leave the job green while testing nothing).
test('go toolchain is present so the smoke tests actually compile real binaries (enforced in CI)', () => {
  // biome-ignore lint/style/noProcessEnv: detecting the CI environment is exactly what this guard needs
  if (process.env.CI) {
    assert.ok(
      hasGo,
      'Go toolchain was not found on PATH; the smoke tests cannot compile real binaries in CI',
    );
  }
});

test('compiles a standalone binary that runs, pipes stdout, and propagates exit codes', {
  skip: hasGo ? false : 'go toolchain not available',
  timeout: 300_000,
}, async () => {
  const outDir = await mkdtemp(path.join(os.tmpdir(), 'nodec-smoke-'));
  after(() => rm(outDir, { force: true, recursive: true }));

  const target = getDefaultTarget();
  const name = 'smoke-app';

  await execFileAsync(
    'node',
    [
      '--import',
      'tsx',
      'src/nodec.ts',
      '--entry',
      path.join('test', 'fixtures', 'exit-code.mjs'),
      '--name',
      name,
      '--outDir',
      outDir,
      '--nodeVersion',
      defaultNodeVersion,
      '--target',
      target,
    ],
    { cwd: repoRoot },
  );

  const binName = target.startsWith('win')
    ? `${name}-${target}.exe`
    : `${name}-${target}`;
  const binPath = path.join(outDir, binName);

  const ok = await execFileAsync(binPath, ['0', 'hello']);
  assert.match(ok.stdout, /ARGS: 0,hello/);

  await assert.rejects(
    () => execFileAsync(binPath, ['5']),
    (err: NodeJS.ErrnoException & { code?: number }) => {
      assert.equal(err.code, 5);
      return true;
    },
  );
});

test('passes node flags through to the bundled node runtime', {
  skip: hasGo ? false : 'go toolchain not available',
  timeout: 300_000,
}, async () => {
  const outDir = await mkdtemp(path.join(os.tmpdir(), 'nodec-flags-'));
  after(() => rm(outDir, { force: true, recursive: true }));

  const target = getDefaultTarget();
  const name = 'flags-app';

  await execFileAsync(
    'node',
    [
      '--import',
      'tsx',
      'src/nodec.ts',
      '--entry',
      path.join('test', 'fixtures', 'node-flags.mjs'),
      '--name',
      name,
      '--outDir',
      outDir,
      '--nodeVersion',
      defaultNodeVersion,
      '--target',
      target,
      // Exercise both supported ways of forwarding node flags in one compile:
      // the `=` form of --nodeFlags, and verbatim tokens after a `--` separator.
      '--nodeFlags=--throw-deprecation',
      '--',
      '--unhandled-rejections=none',
    ],
    { cwd: repoRoot },
  );

  const binName = target.startsWith('win')
    ? `${name}-${target}.exe`
    : `${name}-${target}`;
  const binPath = path.join(outDir, binName);

  const ok = await execFileAsync(binPath);
  assert.match(
    ok.stdout,
    /NODE_FLAGS: .*?--throw-deprecation,.*?--unhandled-rejections=none/,
  );
});

test('cross-compiled macos-arm64 output is code signed so it can run on Apple Silicon', {
  skip: hasGo ? false : 'go toolchain not available',
  timeout: 300_000,
}, async () => {
  const outDir = await mkdtemp(path.join(os.tmpdir(), 'nodec-mac-'));
  after(() => rm(outDir, { force: true, recursive: true }));

  const name = 'mac-app';
  await execFileAsync(
    'node',
    [
      '--import',
      'tsx',
      'src/nodec.ts',
      '--entry',
      path.join('test', 'fixtures', 'exit-code.mjs'),
      '--name',
      name,
      '--outDir',
      outDir,
      '--nodeVersion',
      defaultNodeVersion,
      '--target',
      'macos-arm64',
    ],
    { cwd: repoRoot },
  );

  const binPath = path.join(outDir, `${name}-macos-arm64`);
  assert.equal(await machoHasCodeSignature(binPath), true);
});

test('refuses to execute when an embedded integrity checksum does not match', {
  skip: hasGo ? false : 'go toolchain not available',
  timeout: 120_000,
}, async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'nodec-tamper-'));
  after(() => rm(dir, { force: true, recursive: true }));

  await writeFile(
    path.join(dir, 'node.gz'),
    gzipSync(Buffer.from('pretend node binary')),
  );
  await writeFile(
    path.join(dir, 'bundled.js.gz'),
    gzipSync(Buffer.from("console.log('x')")),
  );

  const template = await readFile(
    path.join(repoRoot, 'src', 'go', 'compiler.go'),
    'utf-8',
  );
  // deliberately wrong expected digests -> the runtime must reject before exec
  const src = renderGoTemplate(template, 'tamper', [], {
    bundle: '0'.repeat(64),
    node: '0'.repeat(64),
  });
  await writeFile(path.join(dir, 'compiler.go'), src);

  await execFileAsync('go', ['build', 'compiler.go'], { cwd: dir });

  await assert.rejects(
    () => execFileAsync(path.join(dir, 'compiler')),
    (err: NodeJS.ErrnoException & { code?: number; stderr?: string }) => {
      assert.equal(err.code, 1);
      assert.match(String(err.stderr), /integrity check/);
      return true;
    },
  );
});
