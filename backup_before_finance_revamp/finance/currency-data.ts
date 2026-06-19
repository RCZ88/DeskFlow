export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', locale: 'id-ID' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', locale: 'ko-KR' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', locale: 'de-CH' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', locale: 'ms-MY' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', locale: 'en-PH' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', locale: 'th-TH' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', locale: 'vi-VN' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR' },
];

export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 151.50,
  CNY: 7.24,
  IDR: 16250,
  SGD: 1.35,
  KRW: 1375,
  INR: 83.50,
  AUD: 1.53,
  CAD: 1.37,
  CHF: 0.91,
  MYR: 4.72,
  PHP: 58.50,
  THB: 36.80,
  VND: 25450,
  BRL: 5.15,
};

const currencySymbolCache = new Map<string, CurrencyInfo>();
for (const c of CURRENCIES) currencySymbolCache.set(c.code, c);

export function getCurrencyInfo(code: string): CurrencyInfo {
  return currencySymbolCache.get(code) || currencySymbolCache.get('USD')!;
}

export function convertAmount(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return amount;
  const usdAmount = amount / (EXCHANGE_RATES[fromCurrency] || 1);
  return usdAmount * (EXCHANGE_RATES[toCurrency] || 1);
}

export function formatCurrency(amount: number, currencyCode: string = 'USD'): string {
  const info = getCurrencyInfo(currencyCode);
  const sign = amount >= 0 ? '' : '-';
  const abs = Math.abs(amount);

  if (currencyCode === 'IDR' || currencyCode === 'VND' || currencyCode === 'KRW' || currencyCode === 'JPY') {
    return `${sign}${info.symbol}${Math.round(abs).toLocaleString(info.locale)}`;
  }

  return `${sign}${info.symbol}${abs.toLocaleString(info.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const COMMON_CURRENCIES = ['USD', 'IDR', 'SGD', 'GBP', 'EUR', 'JPY', 'AUD', 'CNY', 'KRW', 'INR'];
