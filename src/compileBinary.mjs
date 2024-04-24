import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { execa } from 'execa';
import fs from 'fs-extra';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @typedef {'linux' | 'macos' | 'win'} SupportedOS
 */

/**
 * Uses the go toolchain to compile the resulting node + JS bundle into a
 * portable, standalone executable
 *
 * @param {string} bundlePath
 * @param {string} nodePath
 * @param {SupportedOS} target
 * @param {string} appName
 * @param {string} outDir
 */
export async function compileBinary(bundlePath, nodePath, target, appName, outDir) {
  console.info('nodePath', nodePath);
  const [os, arch] = target.split('-');

  const goTargetArch = arch === 'x64' ? 'amd64' : arch;
  const goTargetOs = os === 'macos' ? 'darwin' : os === 'win' ? 'windows' : 'linux';

  const goEntryTemplate = await fs.readFile(path.join(__dirname, 'go', 'compiler.go'), 'utf-8');

  const goEntryTmpPath = path.join(path.dirname(nodePath), 'compiler.go');
  await fs.writeFile(goEntryTmpPath, goEntryTemplate, 'utf-8');

  await execa('go', ['build', 'compiler.go'], {
    cwd: path.dirname(goEntryTmpPath),
    env: { GOARCH: goTargetArch, GOOS: goTargetOs },
  });

  const compilerPath = `${path.join(path.dirname(goEntryTmpPath), 'compiler')}${
    goTargetOs === 'windows' ? '.exe' : ''
  }`;
  const outFilePath = path.join(outDir, `${appName}-${target}${goTargetOs === 'windows' ? '.exe' : ''}`);
  await fs.move(compilerPath, outFilePath, {
    overwrite: true,
  });

  return outFilePath;
}
