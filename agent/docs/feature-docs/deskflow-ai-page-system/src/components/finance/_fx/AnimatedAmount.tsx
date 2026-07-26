import { useNumberMask } from '../../../context/NumberMaskContext';
import { maskNumber } from '../../../utils/maskNumber';
import { useCountUp } from './useCountUp';

interface AnimatedAmountProps {
  value: number;
  currency?: string;
  formatter: (val: number, currency?: string) => string;
  className?: string;
}

export function AnimatedAmount({ value, currency, formatter, className }: AnimatedAmountProps) {
  const { showNumbers, maskMode, maskFixedValue } = useNumberMask();

  if (!showNumbers) {
    return <span className={className}>{maskNumber(formatter(value, currency), maskMode, maskFixedValue)}</span>;
  }

  const display = useCountUp(value);
  const symbol = currency ? formatter(0, currency).replace(/[\d,.]/g, '').trim() : '$';

  return <span className={className}>{symbol}{display}</span>;
}
