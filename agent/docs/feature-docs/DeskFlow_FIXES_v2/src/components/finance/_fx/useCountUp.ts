import { useEffect, useRef, useState } from 'react';
import { useMotionValue, animate, useReducedMotion } from 'framer-motion';
import { DUR } from './financeMotion';

export function useCountUp(target: number, duration = DUR.COUNTER) {
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState('0');
  const prevRef = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) {
      setDisplay(Math.round(target).toLocaleString());
      return;
    }
    const controls = animate(motionValue, target, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        setDisplay(Math.round(latest).toLocaleString());
      },
    });
    prevRef.current = target;
    return controls.stop;
  }, [target, duration, reduce, motionValue]);

  return display;
}
