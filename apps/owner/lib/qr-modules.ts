import QRCode from 'qrcode';

/**
 * The QR code for `text` as module data: its side length in modules, and one
 * SVG path of 1×1 squares for the dark modules (render in a
 * `viewBox="0 0 size size"`). No quiet zone: the surrounding frame provides it.
 */
export function qrModules(text: string): { size: number; path: string } {
  const { size, data } = QRCode.create(text, { errorCorrectionLevel: 'M' }).modules;
  let path = '';
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (data[y * size + x]) path += `M${x} ${y}h1v1h-1z`;
    }
  }
  return { size, path };
}
