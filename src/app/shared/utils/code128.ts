/**
 * Code 128B → módulos 0/1 para SVG. El carnet imprime el `studentCode`.
 * Patrones oficiales (11 módulos por símbolo; Stop añade barra de 2).
 */
const PATTERNS = [
  '11011001100', '11001101100', '11001100110', '10010011000', '10010001100',
  '10001001100', '10011001000', '10011000100', '10001100100', '11001001000',
  '11001000100', '11000100100', '10110011100', '10011011100', '10011001110',
  '10111001100', '10011101100', '10011100110', '11001110010', '11001011100',
  '11001001110', '11011100100', '11001110100', '11101101110', '11101001100',
  '11100101100', '11100100110', '11101100100', '11100110100', '11100110010',
  '11011011000', '11011000110', '11000110110', '10100011000', '10001011000',
  '10001000110', '10110001000', '10001101000', '10001100010', '11010001000',
  '11000101000', '11000100010', '10110111000', '10110001110', '10001101110',
  '10111011000', '10111000110', '10001110110', '11101110110', '11010001110',
  '11000101110', '11011101000', '11011100010', '11011101110', '11101011000',
  '11101000110', '11100010110', '11101101000', '11101100010', '11100011010',
  '11101111010', '11001000010', '11110001010', '10100110000', '10100001100',
  '10010110000', '10010000110', '10000101100', '10000100110', '10110010000',
  '10110000100', '10011010000', '10011000010', '10000110100', '10000110010',
  '11000010010', '11001010000', '11110111010', '11000010100', '10001111010',
  '10100111100', '10010111100', '10010011110', '10111100100', '10011110100',
  '10011110010', '11110100100', '11110010100', '11110010010', '11011011110',
  '11011110110', '11110110110', '10101111000', '10100011110', '10001011110',
  '10111101000', '10111100010', '11110101000', '11110100010', '10111011110',
  '10111101110', '11101011110', '11110101110', '11010000100', '11010010000',
  '11010011100', '1100011101011',
];

const START_B = 104;
const STOP = 106;

export function encodeCode128B(text: string): number[] {
  const value = String(text ?? '');
  if (!value) return [];
  const symbols: number[] = [START_B];
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    if (code < 32 || code > 126) {
      throw new Error(`El código «${value}» tiene un carácter no válido para el carnet`);
    }
    symbols.push(code - 32);
  }
  let checksum = START_B;
  for (let i = 1; i < symbols.length; i++) {
    checksum += symbols[i] * i;
  }
  symbols.push(checksum % 103);
  symbols.push(STOP);

  const modules: number[] = [];
  for (const s of symbols) {
    const pattern = PATTERNS[s];
    for (const bit of pattern) modules.push(bit === '1' ? 1 : 0);
  }
  return modules;
}

export function code128Svg(text: string, height = 48, moduleWidth = 2): string {
  const modules = encodeCode128B(text);
  if (!modules.length) return '';
  const quiet = 10;
  const width = (modules.length + quiet * 2) * moduleWidth;
  let x = quiet * moduleWidth;
  let rects = '';
  let run = 0;
  for (let i = 0; i <= modules.length; i++) {
    const on = modules[i] === 1;
    if (on) {
      run += 1;
    } else if (run) {
      rects += `<rect x="${x - run * moduleWidth}" y="0" width="${run * moduleWidth}" height="${height}"/>`;
      run = 0;
    }
    x += moduleWidth;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeAttr(text)}">${rects}</svg>`;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
