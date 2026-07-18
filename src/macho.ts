import { open } from 'node:fs/promises';

const LC_CODE_SIGNATURE = 0x1d;

const MH_MAGIC_64 = 0xfe_ed_fa_cf;
const MH_MAGIC_32 = 0xfe_ed_fa_ce;
const FAT_MAGIC = 0xca_fe_ba_be;
const FAT_MAGIC_64 = 0xca_fe_ba_bf;

type MachoView = {
  buf: Buffer;
  base: number;
  le: boolean;
  is64: boolean;
};

function readU32(buf: Buffer, offset: number, le: boolean): number {
  return le ? buf.readUInt32LE(offset) : buf.readUInt32BE(offset);
}

/**
 * Scans a single (thin) Mach-O image for the LC_CODE_SIGNATURE load command.
 */
function thinHasSignature({ buf, base, le, is64 }: MachoView): boolean {
  const ncmds = readU32(buf, base + 16, le);
  let cursor = base + (is64 ? 32 : 28);

  for (let i = 0; i < ncmds; i++) {
    if (cursor + 8 > buf.length) break;
    const cmd = readU32(buf, cursor, le);
    const cmdsize = readU32(buf, cursor + 4, le);
    if (cmd === LC_CODE_SIGNATURE) return true;
    if (cmdsize <= 0) break;
    cursor += cmdsize;
  }

  return false;
}

/**
 * Reports whether a Mach-O executable carries a code signature (the
 * LC_CODE_SIGNATURE load command). Handles thin binaries of either bit width /
 * endianness as well as fat/universal binaries, for which every contained
 * architecture must be signed.
 */
export async function machoHasCodeSignature(
  filePath: string,
): Promise<boolean> {
  const handle = await open(filePath, 'r');
  try {
    // The header and all load commands live at the very start of the file, so a
    // small prefix is enough; no need to read a multi-hundred-MB binary.
    const prefix = Buffer.alloc(64 * 1024);
    const { bytesRead } = await handle.read(prefix, 0, prefix.length, 0);
    const buf = prefix.subarray(0, bytesRead);
    if (buf.length < 8) return false;

    const magicBE = buf.readUInt32BE(0);

    if (magicBE === FAT_MAGIC || magicBE === FAT_MAGIC_64) {
      const nArch = buf.readUInt32BE(4);
      const wide = magicBE === FAT_MAGIC_64;
      const archSize = wide ? 32 : 20;
      for (let i = 0; i < nArch; i++) {
        const entry = 8 + i * archSize;
        const sliceOffset = wide
          ? Number(buf.readBigUInt64BE(entry + 8))
          : buf.readUInt32BE(entry + 8);
        const view = viewAt(buf, sliceOffset);
        if (!view || !thinHasSignature(view)) return false;
      }
      return nArch > 0;
    }

    const view = viewAt(buf, 0);
    return view ? thinHasSignature(view) : false;
  } finally {
    await handle.close();
  }
}

/**
 * Resolves the Mach-O magic at a given offset into a typed view, or undefined
 * if the bytes there are not a recognized thin Mach-O header.
 */
function viewAt(buf: Buffer, base: number): MachoView | undefined {
  if (base + 4 > buf.length) return undefined;
  const be = buf.readUInt32BE(base);
  const le = buf.readUInt32LE(base);

  if (le === MH_MAGIC_64) return { base, buf, is64: true, le: true };
  if (be === MH_MAGIC_64) return { base, buf, is64: true, le: false };
  if (le === MH_MAGIC_32) return { base, buf, is64: false, le: true };
  if (be === MH_MAGIC_32) return { base, buf, is64: false, le: false };

  return undefined;
}
