/**
 * @typedef {'linux-x64' | 'macos-x64' | 'macos-arm64' | 'win-x64'} SupportedOSKeys
 */

/**
 * The set of supported compilation targets
 * @type {Set<SupportedOSKeys>}
 */
export const supportedOs = new Set(['linux-x64', 'macos-x64', 'macos-arm64', 'win-x64']);

/**
 * The default version of node that will be downloaded and used if one isn't provided
 */
export const defaultNodeVersion = '20.12.0';
