import { useState, useEffect, useRef, forwardRef } from 'react';

interface CurrencyInputProps {
  value: number | string;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  min?: number;
  step?: string;
  prefix?: string;
  autoFocus?: boolean;
  style?: React.CSSProperties;
}

function formatWithCommas(value: string): string {
  if (!value) return '';
  const negative = value.startsWith('-');
  const clean = value.replace(/[^0-9.]/g, '');
  if (!clean) return '';
  const [intPart, decPart] = clean.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (decPart !== undefined) return (negative ? '-' : '') + withCommas + '.' + decPart.slice(0, 2);
  return (negative ? '-' : '') + withCommas;
}

function stripCommas(formatted: string): string {
  return formatted.replace(/,/g, '');
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput({ value, onChange, className = '', placeholder = '0.00', min, step, prefix, autoFocus, style }, ref) {
    const [display, setDisplay] = useState('');
    const internalRef = useRef<HTMLInputElement>(null);
    const inputRef = (ref as React.RefObject<HTMLInputElement>) || internalRef;

    useEffect(() => {
      const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
      if (!isNaN(num) && num !== 0) {
        setDisplay(formatWithCommas(String(num)));
      } else if (typeof value === 'string' && value) {
        setDisplay(formatWithCommas(value));
      } else {
        setDisplay('');
      }
    }, [value]);

    const handleChange = (raw: string) => {
      const stripped = stripCommas(raw);
      const num = parseFloat(stripped);
      setDisplay(stripped === '' || stripped === '-' ? stripped : formatWithCommas(stripped));
      if (!isNaN(num)) onChange(num);
      else if (stripped === '' || stripped === '-') onChange(0);
    };

    return (
      <div className="relative">
        {prefix && <span className="absolute left-0 top-1/2 -translate-y-1/2 text-inherit opacity-50 pointer-events-none">{prefix}</span>}
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={display}
          onChange={e => handleChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          style={style}
          className={`${prefix ? 'pl-5' : ''} ${className}`}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              const cur = parseFloat(stripCommas(display)) || 0;
              const stepVal = parseFloat(step) || 1;
              onChange(cur + stepVal);
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              const cur = parseFloat(stripCommas(display)) || 0;
              const stepVal = parseFloat(step) || 1;
              const next = cur - stepVal;
              onChange(min != null ? Math.max(min, next) : next);
            }
          }}
        />
      </div>
    );
  }
);
