export type MaskMode = 'digits' | 'fixed';

export function maskNumber(value: number | string, mode: MaskMode = 'digits', fixedValue?: number): string {
  const str = typeof value === 'number' ? value.toLocaleString() : value;
  if (mode === 'fixed' && fixedValue !== undefined) {
    return fixedValue.toLocaleString();
  }
  const digitCount = (str.match(/[0-9]/g) || []).length;
  return '*'.repeat(digitCount);
}
