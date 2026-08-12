export enum SupportedOS {
  Linux_x64 = 'linux-x64',
  Linux_ARM64 = 'linux-arm64',
  Linux_x64_musl = 'linux-x64-musl',
  Linux_ARM64_musl = 'linux-arm64-musl',
  Mac_x64 = 'macos-x64',
  Mac_ARM64 = 'macos-arm64',
  Win_x64 = 'win-x64',
}

export enum TargetFormat {
  CJS = 'cjs',
  ESM = 'esm',
}

export type NodecOpts = {
  entry: string;
  format: TargetFormat;
  name: string;
  noCleanup: boolean;
  nodeFlags: string;
  nodeVersion: string;
  outDir: string;
};
