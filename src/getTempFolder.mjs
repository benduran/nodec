import fs from 'fs-extra';
import { temporaryDirectory } from 'tempy';

// this will be populated after the first initial call to getTempFolder() (below)
let tempPath = '';

/**
 * Returns the path to a temp folder to use for storing
 * all the bits required to compile a node.js-powered executable
 */
export function getTempFolder() {
  if (tempPath) return tempPath;
  tempPath = temporaryDirectory({ prefix: 'nodec' });

  fs.ensureDirSync(tempPath);

  return tempPath;
}
