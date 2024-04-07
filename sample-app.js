import path from 'path';
import os from 'os';

console.info('tmp dir is', path.join(os.tmpdir(), performance.now().toString()));