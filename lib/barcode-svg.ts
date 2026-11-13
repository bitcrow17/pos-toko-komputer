/**
 * Standard Code 128 (Subset B) Vector SVG Barcode Generator
 * 100% zero-dependency, standards-compliant, scannable by all barcode guns & mobile cameras.
 */

const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
];

export function encodeCode128B(rawText: string): string {
  // Hanya ambil karakter ASCII 32 - 126
  const clean = rawText.replace(/[^\x20-\x7E]/g, "");
  if (!clean) return "";

  const codes: number[] = [104]; // Start Code B
  let checksum = 104;

  for (let i = 0; i < clean.length; i += 1) {
    const code = clean.charCodeAt(i) - 32;
    codes.push(code);
    checksum += code * (i + 1);
  }

  codes.push(checksum % 103);
  codes.push(106); // Stop Code

  let bits = "";
  for (const c of codes) {
    const pattern = CODE128_PATTERNS[c];
    if (!pattern) continue;
    for (let j = 0; j < pattern.length; j += 1) {
      const width = Number.parseInt(pattern[j], 10);
      bits += (j % 2 === 0 ? "1" : "0").repeat(width);
    }
  }

  return bits;
}

/**
 * Menghasilkan data rect SVG untuk barcode
 */
export function generateBarcodeRects(
  code: string,
  barWidth = 2,
  height = 50,
): { rects: { x: number; y: number; width: number; height: number }[]; totalWidth: number } {
  const bits = encodeCode128B(code);
  if (!bits) return { rects: [], totalWidth: 0 };

  const rects: { x: number; y: number; width: number; height: number }[] = [];
  let currentX = 10; // Quiet zone kiri

  let i = 0;
  while (i < bits.length) {
    if (bits[i] === "1") {
      let runLength = 0;
      while (i < bits.length && bits[i] === "1") {
        runLength += 1;
        i += 1;
      }
      rects.push({
        x: currentX,
        y: 0,
        width: runLength * barWidth,
        height,
      });
      currentX += runLength * barWidth;
    } else {
      let runLength = 0;
      while (i < bits.length && bits[i] === "0") {
        runLength += 1;
        i += 1;
      }
      currentX += runLength * barWidth;
    }
  }

  const totalWidth = currentX + 10; // Quiet zone kanan
  return { rects, totalWidth };
}

