import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import commandExists from 'command-exists';

import { defaultNodeVersion } from '../../src/constants.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..', '..');

/**
 * These tests exist because every interesting failure mode here is invisible on
 * a developer machine. A full distro already has the shared libraries node
 * links against, so a binary that would die instantly on a slim image runs
 * perfectly locally. The only way to catch that is to execute the compiled
 * binary on a genuinely barebones userland, which is what docker gives us.
 */
const hasGo = await commandExists('go')
  .then(() => true)
  .catch(() => false);

const hasDockerCli = await commandExists('docker')
  .then(() => true)
  .catch(() => false);

// The CLI existing is not enough -- the daemon has to actually be reachable,
// which it is not on the windows/macos CI runners.
const hasDocker =
  hasDockerCli &&
  (await execFileAsync('docker', ['info'])
    .then(() => true)
    .catch(() => false));

const canRun = hasGo && hasDocker;
const skip = canRun
  ? false
  : `requires go (${hasGo}) and a running docker daemon (${hasDocker})`;

/**
 * Containers must match the architecture of the binaries we compile, otherwise
 * the run silently exercises an emulator instead of the real target.
 */
const hostArch = os.arch() === 'arm64' ? 'arm64' : 'x64';
const dockerPlatform = hostArch === 'arm64' ? 'linux/arm64' : 'linux/amd64';

const glibcTarget = `linux-${hostArch}`;
const muslTarget = `linux-${hostArch}-musl`;

/**
 * Deliberately barebones: these are the images that expose missing shared
 * libraries. `rockylinux:8` is the important one for the glibc floor -- it
 * ships glibc 2.28, exactly what node itself requires, so it fails the moment
 * a bundled library is sourced from a distro that needs something newer.
 */
const GLIBC_IMAGES = [
  'debian:bookworm-slim',
  'debian:bullseye-slim',
  'ubuntu:20.04',
  'rockylinux:8',
];

const MUSL_IMAGES = ['alpine:3.20', 'alpine:3.22'];

let outDir = '';

/** Compiles the fixture for one target and returns the binary's path. */
async function compile(target: string): Promise<string> {
  const name = `docker-${target}`;

  await execFileAsync(
    'node',
    [
      '--import',
      'tsx',
      'src/nodec.ts',
      '--entry',
      path.join('test', 'fixtures', 'linux-runtime.mjs'),
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

  return path.join(outDir, `${name}-${target}`);
}

/** Runs a compiled binary inside an image, with nothing installed into it. */
function runInImage(image: string, binPath: string) {
  return execFileAsync('docker', [
    'run',
    '--rm',
    '--platform',
    dockerPlatform,
    '--volume',
    `${binPath}:/nodec-app:ro`,
    image,
    '/nodec-app',
  ]);
}

let glibcBinary = '';
let muslBinary = '';

before(
  async () => {
    if (!canRun) return;

    outDir = await mkdtemp(path.join(os.tmpdir(), 'nodec-docker-'));
    glibcBinary = await compile(glibcTarget);
    muslBinary = await compile(muslTarget);
  },
  { timeout: 1_800_000 },
);

after(async () => {
  if (outDir) await rm(outDir, { force: true, recursive: true });
});

// Mirrors the go-toolchain guard in smoke.test.ts: on the linux CI runner
// docker is always available, so a missing daemon there means the whole suite
// silently degraded to a no-op and the job would go green having tested nothing.
test('docker is available so the linux matrix actually runs (enforced on linux CI)', () => {
  // biome-ignore lint/style/noProcessEnv: detecting the CI environment is exactly what this guard needs
  const isCi = Boolean(process.env.CI);

  if (isCi && os.platform() === 'linux') {
    assert.ok(
      hasDocker,
      'docker daemon was not reachable; the linux container matrix cannot run in CI',
    );
    assert.ok(
      hasGo,
      'Go toolchain was not found on PATH; the container matrix cannot compile binaries',
    );
  }
});

test('the barebones glibc images genuinely lack libatomic, so the matrix is meaningful', {
  skip,
  timeout: 300_000,
}, async () => {
  // If a future base image starts shipping libatomic, the tests below would
  // still pass while no longer proving anything. Assert the gap is real.
  const { stdout } = await execFileAsync('docker', [
    'run',
    '--rm',
    '--platform',
    dockerPlatform,
    'debian:bookworm-slim',
    'sh',
    '-c',
    'ls /usr/lib/*/libatomic.so.1 2>/dev/null | wc -l',
  ]);

  assert.equal(
    stdout.trim(),
    '0',
    'debian:bookworm-slim now ships libatomic; pick a leaner image so this suite still proves the bundling works',
  );
});

for (const image of GLIBC_IMAGES) {
  test(`glibc binary runs on ${image} with nothing installed`, {
    skip,
    timeout: 600_000,
  }, async () => {
    const { stdout } = await runInImage(image, glibcBinary);

    assert.match(stdout, /NODEC_OK/, `no successful run on ${image}`);
    assert.match(stdout, /platform=linux/);
    assert.match(
      stdout,
      new RegExp(`arch=${hostArch === 'x64' ? 'x64' : 'arm64'}`),
    );
    // execPath must still point at node itself; if the runtime were ever
    // started via the dynamic loader these would report the loader instead.
    assert.match(stdout, /execPathIsNode=true/);
    assert.match(stdout, /worker=0/, `worker_threads broken on ${image}`);
    assert.match(stdout, /fork=0/, `child_process.fork broken on ${image}`);
    // proves libstdc++/ICU resolved rather than merely loading
    assert.match(stdout, /intl=1\.234,5/);
  });
}

for (const image of MUSL_IMAGES) {
  test(`musl binary runs on stock ${image} without apk add`, {
    skip,
    timeout: 600_000,
  }, async () => {
    // Stock alpine ships no libgcc, so this fails outright unless the runtime
    // libraries are bundled into the binary.
    const { stdout } = await runInImage(image, muslBinary);

    assert.match(stdout, /NODEC_OK/, `no successful run on ${image}`);
    assert.match(stdout, /execPathIsNode=true/);
    assert.match(stdout, /worker=0/, `worker_threads broken on ${image}`);
    assert.match(stdout, /fork=0/, `child_process.fork broken on ${image}`);
  });
}

test('a musl binary on a glibc host explains the missing loader instead of claiming the file is absent', {
  skip,
  timeout: 600_000,
}, async () => {
  // execve reports ENOENT when the ELF interpreter is missing, which reads as
  // "no such file or directory" pointing at a file that is plainly there. That
  // wording sent us on a long chase once; it must never come back.
  await assert.rejects(
    () => runInImage('debian:bookworm-slim', muslBinary),
    (err: NodeJS.ErrnoException & { stderr?: string }) => {
      const stderr = String(err.stderr);
      assert.match(stderr, /ELF interpreter/);
      assert.match(stderr, /ld-musl/);
      assert.match(stderr, /glibc system/);
      assert.doesNotMatch(
        stderr,
        /^failed to start node: fork\/exec .*no such file or directory$/m,
      );
      return true;
    },
  );
});

test('a glibc binary on alpine explains the missing loader too', {
  skip,
  timeout: 600_000,
}, async () => {
  await assert.rejects(
    () => runInImage('alpine:3.20', glibcBinary),
    (err: NodeJS.ErrnoException & { stderr?: string }) => {
      const stderr = String(err.stderr);
      assert.match(stderr, /ELF interpreter/);
      assert.match(stderr, /ld-linux/);
      assert.match(stderr, /musl system/);
      return true;
    },
  );
});

test('exit codes still propagate out of the container', {
  skip,
  timeout: 600_000,
}, async () => {
  const name = 'docker-exit';
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
      glibcTarget,
    ],
    { cwd: repoRoot },
  );

  const binPath = path.join(outDir, `${name}-${glibcTarget}`);

  await assert.rejects(
    () =>
      execFileAsync('docker', [
        'run',
        '--rm',
        '--platform',
        dockerPlatform,
        '--volume',
        `${binPath}:/nodec-app:ro`,
        'debian:bookworm-slim',
        '/nodec-app',
        '7',
      ]),
    (err: NodeJS.ErrnoException & { code?: number }) => {
      assert.equal(err.code, 7);
      return true;
    },
  );
});
