import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

export type MaskMode = 'digits' | 'fixed';

interface NumberMaskContextProps {
  showNumbers: boolean;
  setShowNumbers: (v: boolean) => void;
  maskMode: MaskMode;
  setMaskMode: (mode: MaskMode) => void;
  maskFixedValue: number;
  setMaskFixedValue: (v: number) => void;
}

const NumberMaskContext = createContext<NumberMaskContextProps>({
  showNumbers: true,
  setShowNumbers: () => {},
  maskMode: 'digits',
  setMaskMode: () => {},
  maskFixedValue: 50000,
  setMaskFixedValue: () => {},
});

export const NumberMaskProvider = ({ children }: { children: ReactNode }) => {
  const [showNumbers, setShowNumbers] = useState(true);
  const [maskMode, setMaskMode] = useState<MaskMode>('digits');
  const [maskFixedValue, setMaskFixedValue] = useState(50000);

  useEffect(() => {
    const storedShow = localStorage.getItem('financeHideNumbers');
    const storedMode = localStorage.getItem('financeMaskMode');
    const storedFixed = localStorage.getItem('financeMaskFixedValue');
    if (storedShow !== null) {
      setShowNumbers(storedShow === 'true');
    }
    if (storedMode) {
      const normalized: MaskMode = storedMode === 'all' || storedMode === 'same' ? 'digits' : storedMode as MaskMode;
      setMaskMode(normalized);
    }
    if (storedFixed) {
      setMaskFixedValue(parseFloat(storedFixed));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('financeHideNumbers', String(showNumbers));
    localStorage.setItem('financeMaskMode', maskMode);
    localStorage.setItem('financeMaskFixedValue', String(maskFixedValue));
  }, [showNumbers, maskMode, maskFixedValue]);

  return (
    <NumberMaskContext.Provider value={{ showNumbers, setShowNumbers, maskMode, setMaskMode, maskFixedValue, setMaskFixedValue }}>
      {children}
    </NumberMaskContext.Provider>
  );
};

export const useNumberMask = () => useContext(NumberMaskContext);
