/**
 * Strip all ANSI escape sequences from text.
 * Handles CSI (ESC[), OSC (ESC]), and DEC private modes (ESC[?).
 */
export function stripAnsi(text: string): string {
  if (!text) return '';
  return text
    // CSI sequences: ESC[ ... final byte
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    // CSI with ? (DEC private modes): ESC[? ... h/l
    .replace(/\x1b\[\?[0-9;]*[a-zA-Z]/g, '')
    // OSC sequences: ESC] ... BEL or ESC\
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    // ESC followed by any single character (charset, etc.)
    .replace(/\x1b./g, '')
    // Unicode escape representations (␛ = U+241B = ESC)
    .replace(/\u241b/g, '')
    // Control characters (except newline and tab)
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
}
