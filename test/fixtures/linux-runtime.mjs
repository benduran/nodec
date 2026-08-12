import { fork } from 'node:child_process';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { isMainThread, Worker } from 'node:worker_threads';

// Re-entered as a worker thread: nothing to do but exit cleanly.
if (!isMainThread) process.exit(0);

// Re-entered as a forked child process: same. Signalled through argv rather
// than the environment so the fixture needs no env plumbing.
const FORK_SENTINEL = '--nodec-fork-child';
if (process.argv.includes(FORK_SENTINEL)) process.exit(0);

const self = fileURLToPath(import.meta.url);

// worker_threads and child_process.fork both re-launch process.execPath. They
// are the first things to break if the runtime is ever started through the
// dynamic loader instead of directly, because execPath then points at the
// loader rather than at node.
const workerCode = await new Promise(resolve => {
  new Worker(self).on('exit', resolve);
});

const forkCode = await new Promise(resolve => {
  fork(self, [FORK_SENTINEL]).on('exit', resolve);
});

// Exercises libstdc++ (ICU / Intl) and the crypto stack, so a subtly broken
// shared library shows up as a failure rather than a silent difference.
const parts = [
  'NODEC_OK',
  `version=${process.version}`,
  `platform=${os.platform()}`,
  `arch=${os.arch()}`,
  `worker=${workerCode}`,
  `fork=${forkCode}`,
  `hash=${crypto.createHash('sha256').update('nodec').digest('hex').slice(0, 8)}`,
  `intl=${new Intl.NumberFormat('de-DE').format(1234.5)}`,
  `execPathIsNode=${/node$/.test(process.execPath)}`,
];

console.log(parts.join(' '));
