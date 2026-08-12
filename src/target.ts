import type { SupportedOS } from './types.js';

export type TargetLibc = 'glibc' | 'musl';

export type ParsedTarget = {
  /** GOARCH value handed to the go toolchain */
  goArch: string;
  /** GOOS value handed to the go toolchain */
  goOs: string;
  /** which C library the downloaded node build links against */
  libc: TargetLibc;
  /** arch segment as it appears in node's release filenames */
  nodeArch: string;
  /** os segment as it appears in node's release filenames */
  nodeOs: string;
};

function toNodeOs(os: string) {
  return os === 'macos' ? 'darwin' : os;
}

function toGoOs(os: string) {
  switch (os) {
    case 'macos':
      return 'darwin';
    case 'win':
      return 'windows';
    default:
      return 'linux';
  }
}

function toGoArch(arch: string) {
  return arch === 'x64' ? 'amd64' : arch;
}

/**
 * Splits a `<os>-<arch>[-<libc>]` compilation target into the pieces the
 * download and compile steps each need.
 *
 * The optional third segment only ever appears on linux targets
 * (`linux-x64-musl`) and selects which C library the embedded node runtime is
 * linked against. It does not affect GOOS / GOARCH: the go stub is statically
 * linked either way, so only the node build it carries changes.
 */
export function parseTarget(target: SupportedOS | string): ParsedTarget {
  const [os = '', arch = '', libc = ''] = target
    .trim()
    .toLowerCase()
    .split('-');

  return {
    goArch: toGoArch(arch),
    goOs: toGoOs(os),
    libc: libc === 'musl' ? 'musl' : 'glibc',
    nodeArch: arch,
    nodeOs: toNodeOs(os),
  };
}
