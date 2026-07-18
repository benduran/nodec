import os from 'node:os';

function computeOsName(osType: string) {
  switch (osType) {
    case 'Linux':
      return 'linux';
    case 'Darwin':
      return 'macos';
    default:
      return 'win';
  }
}

/**
 * Resolves the default compilation OS + ARCH target for the host machine.
 * Accepts explicit os type / arch for testing; defaults to the running host.
 */
export function getDefaultTarget(
  osType: string = os.type(),
  arch: string = os.arch(),
): string {
  const osName = computeOsName(osType);
  const archName = arch === 'arm64' ? 'arm64' : 'x64';

  return `${osName}-${archName}`;
}
