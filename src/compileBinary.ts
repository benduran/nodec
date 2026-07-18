import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

import { execa } from 'execa';
import fs from 'fs-extra';

import { machoHasCodeSignature } from './macho.js';
import type { SupportedOS } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type EmbeddedChecksums = {
  node: string;
  bundle: string;
};

/**
 * @typedef {'linux' | 'macos' | 'win'} SupportedOS
 */

/**
 * Substitutes the appName, nodeFlags and integrity-checksum placeholders in the
 * Go source template with safely-escaped values, returning compilable Go source.
 */
export function renderGoTemplate(
  template: string,
  appName: string,
  nodeFlags: string[],
  checksums: EmbeddedChecksums = { bundle: '', node: '' },
): string {
  const safeAppName = appName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'app';

  return template
    .replace('{{appName}}', safeAppName)
    .replace('{{nodeChecksum}}', checksums.node)
    .replace('{{bundleChecksum}}', checksums.bundle)
    .replace(
      'nodeFlags := []string{}',
      `nodeFlags := []string{${nodeFlags.map(flag => JSON.stringify(String(flag))).join(', ')}}`,
    );
}

/**
 * Computes the SHA-256 digest of a gzip file's inflated contents, matching what
 * the Go runtime hashes after it inflates the embedded asset.
 */
async function sha256OfInflated(gzPath: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  const gunzip = zlib.createGunzip();
  fs.createReadStream(gzPath).pipe(gunzip);
  for await (const chunk of gunzip) hash.update(chunk as Buffer);
  return hash.digest('hex');
}

function computeGoTargetOs(os: string | undefined) {
  const trimmedOs = (os?.trim() || '').toLowerCase();
  switch (trimmedOs) {
    case 'macos':
      return 'darwin';
    case 'win':
      return 'windows';
    default:
      return 'linux';
  }
}

function computeGoTargetArch(arch: string | undefined) {
  const trimmedArch = (arch?.trim() || '').toLowerCase();
  switch (trimmedArch) {
    case 'x64':
      return 'amd64';
    default:
      return trimmedArch;
  }
}

/**
 * Uses the go toolchain to compile the resulting node + JS bundle into a
 * portable, standalone executable
 */
export async function compileBinary(
  bundlePath: string,
  nodePath: string,
  nodeFlags: string[],
  target: SupportedOS,
  appName: string,
  outDir: string,
) {
  console.info('nodePath', nodePath);
  const [os, arch] = target.split('-');

  const goTargetArch = computeGoTargetArch(arch);
  const goTargetOs = computeGoTargetOs(os);

  const template = await fs.readFile(
    path.join(__dirname, 'go', 'compiler.go'),
    'utf-8',
  );
  const checksums = {
    bundle: await sha256OfInflated(bundlePath),
    node: await sha256OfInflated(nodePath),
  };
  const goEntryTemplate = renderGoTemplate(
    template,
    appName,
    nodeFlags,
    checksums,
  );

  const goEntryTmpPath = path.join(path.dirname(nodePath), 'compiler.go');
  await fs.writeFile(goEntryTmpPath, goEntryTemplate, 'utf-8');

  await execa('go', ['build', 'compiler.go'], {
    cwd: path.dirname(goEntryTmpPath),
    env: { GOARCH: goTargetArch, GOOS: goTargetOs },
  });

  const compilerPath = `${path.join(path.dirname(goEntryTmpPath), 'compiler')}${
    goTargetOs === 'windows' ? '.exe' : ''
  }`;
  const outFilePath = path.join(
    outDir,
    `${appName}-${target}${goTargetOs === 'windows' ? '.exe' : ''}`,
  );
  await fs.move(compilerPath, outFilePath, {
    overwrite: true,
  });

  // Apple Silicon refuses to execute an unsigned arm64 binary (it dies with
  // "Killed: 9"). Go's linker ad-hoc signs darwin/arm64 by default, but that is
  // implicit; if anything ever suppresses it we would ship a binary that is
  // dead on arrival for every macOS user. Fail the build here instead.
  if (
    goTargetOs === 'darwin' &&
    goTargetArch === 'arm64' &&
    !(await machoHasCodeSignature(outFilePath))
  ) {
    throw new Error(
      `The compiled macOS arm64 binary "${outFilePath}" is not code signed and will not run on Apple Silicon. ` +
        'Ad-hoc sign it (e.g. `codesign -s - <binary>` on macOS, or `rcodesign sign <binary>`) before distributing.',
    );
  }

  return outFilePath;
}
