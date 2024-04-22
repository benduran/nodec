import zlib from 'node:zlib';

import fs from 'fs-extra';

/**
 * Compresses a file using gzip compression.
 * Writes the output to the same path as the input file, but with a .gz suffix
 * @param {string} input - Input file to compress, using gzip
 *
 * @returns {Promise<string>} Path to compressed archive
 */
export function gzipCompress(input) {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(input);

    const outputPath = `${input}.gz`;
    console.info('compressing', input, 'to', outputPath);
    const writeStream = fs.createWriteStream(outputPath);
    const gzip = zlib.createGzip();

    readStream.once('error', reject);
    gzip.once('error', reject);
    writeStream.once('finish', () => resolve(outputPath));
    writeStream.once('error', reject);

    readStream.pipe(gzip).pipe(writeStream);
  });
}
