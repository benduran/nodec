import { execSync } from 'node:child_process';
import os from 'node:os';

import commandExists from 'command-exists';

/**
 * Checks to see if the Golang toolchain is installed on the user's machine.
 * If it isn't, throws an error
 */
export async function guardGoToolchain() {
  let gobinpath = '';
  try {
    gobinpath = await commandExists('go');
  } catch (error) {
    /* no-op */
  }

  if (!gobinpath) {
    throw new Error(
      `The Go toolchain is required to be installed, in order to compile your node application to a binary with nodec. To get started with Go, head to Go install guide:${os.EOL}https://go.dev/doc/install`,
    );
  }

  // if we got here, go is installed, but we need to be on a certain minimum version that supports
  // embedding, wh9ich is go 1.16
  const goVersionResult = execSync('go version', { stdio: 'pipe' }).toString('utf-8').trim();
  const [, versionMatch = ''] = /go\s+version\sgo((\d+\.?){1,3})/.exec(goVersionResult) ?? [];
  const minRequiredVersion = '1.16';
  const sortedSemver = [versionMatch, minRequiredVersion].sort();

  if (!versionMatch.startsWith(minRequiredVersion) && sortedSemver[0] === versionMatch) {
    // the version of go the user has installed is not at least something in the 1.16 range or above
    throw new Error(
      `The version of the Go toolchain yuo have installed is not supported. Wanted at least ${minRequiredVersion} but found ${versionMatch}`,
    );
  }
}
