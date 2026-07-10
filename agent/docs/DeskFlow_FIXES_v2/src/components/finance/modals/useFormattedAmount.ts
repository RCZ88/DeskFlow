import { useState, useCallback, useRef } from 'react';

/** Formats a numeric string with thousands separators as the user types.
 *  Preserves caret position to prevent cursor jumping during formatting. */
export function useFormattedAmount(initial = '') {
  const [raw, setRaw] = useState(initial);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastCaret = useRef(0);

  const setFormatted = useCallback((val: string, caretPos?: number) => {
    if (caretPos !== undefined) lastCaret.current = caretPos;
    // Strip non-numeric chars except decimal point
    const cleaned = val.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    const safe = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('') : '');
    setRaw(safe);

    // Restore caret after React re-render by scheduling after the paint
    const savedCaret = lastCaret.current;
    lastCaret.current = 0;
    requestAnimationFrame(() => {
      if (inputRef.current) {
        // Count commas before the saved caret in the OLD value to adjust position
        const oldCommas = val.slice(0, savedCaret).split(',').length - 1;
        const cursorInRaw = savedCaret - oldCommas;
        // Now find where that raw position maps in the formatted display string
        const intRaw = (parts[0] || '0').replace(/^0+/, '') || '0';
        const formattedInt = parseInt(intRaw, 10).toLocaleString('en-US');
        const hasDec = parts.length > 1;
        const display = hasDec ? `${formattedInt}.${parts[1]}` : formattedInt;
        // Walk through display to find position matching raw cursor
        let rawIdx = 0;
        let displayPos = 0;
        while (rawIdx < cursorInRaw && displayPos < display.length) {
          if (display[displayPos] !== ',') rawIdx++;
          displayPos++;
        }
        inputRef.current.setSelectionRange(displayPos, displayPos);
      }
    });
    return safe;
  }, []);

  const display = raw ? (() => {
    const [int, dec] = raw.split('.');
    const intClean = int.replace(/^0+/, '') || '0';
    const formatted = parseInt(intClean, 10).toLocaleString('en-US');
    return dec !== undefined ? `${formatted}.${dec}` : formatted;
  })() : '';

  const numeric = parseFloat(raw) || 0;

  return { raw, display, numeric, setFormatted, inputRef };
}
