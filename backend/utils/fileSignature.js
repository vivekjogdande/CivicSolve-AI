/** Detects the real file type from magic bytes so a renamed file cannot slip past the mimetype check. */
function detectFileType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { kind: 'image', ext: '.jpg', mime: 'image/jpeg' };
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { kind: 'image', ext: '.png', mime: 'image/png' };
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return { kind: 'image', ext: '.webp', mime: 'image/webp' };
  const box = buf.slice(4, 12).toString('ascii');
  if (box.startsWith('ftyp')) {
    const brand = buf.slice(8, 12).toString('ascii');
    if (['heic', 'heix', 'mif1', 'msf1'].includes(brand)) return { kind: 'image', ext: '.heic', mime: 'image/heic' };
    if (brand === 'qt  ') return { kind: 'video', ext: '.mov', mime: 'video/quicktime' };
    return { kind: 'video', ext: '.mp4', mime: 'video/mp4' };
  }
  if (buf.slice(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return { kind: 'video', ext: '.webm', mime: 'video/webm' };
  return null;
}

module.exports = { detectFileType };
