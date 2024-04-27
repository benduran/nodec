import os from 'node:os';
import path from 'node:path';

const root = path.join(os.tmpdir(), 'nodec');

export const NodecFolders = {
  downloadCache: path.join(root, 'download-cache'),
  extracted: path.join(root, 'extracted'),
  root,
};
