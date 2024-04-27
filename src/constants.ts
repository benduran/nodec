import { SupportedOS } from './types.js';

/**
 * The set of supported compilation targets
 */
export const supportedOs = new Set(Object.values(SupportedOS));

/**
 * The default version of node that will be downloaded and used if one isn't provided
 */
export const defaultNodeVersion = '20.12.0';
