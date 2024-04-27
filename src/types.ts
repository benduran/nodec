export enum SupportedOS {
  Linux_x64 = 'linux-x64',
  Mac_x64 = 'macos-x64',
  Mac_ARM64 = 'macos-arm64',
  Win_x64 = 'win-x64',
}

export enum TargetFormat {
  CJS = 'cjs',
  ESM = 'esm',
}

export interface NodecOpts {
  entry: string;
  format: TargetFormat;
  name: string;
  noCleanup: boolean;
  nodeFlags: string;
  nodeVersion: string;
  outDir: string;
}
