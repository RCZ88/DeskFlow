import { useEffect } from 'react';
import { useSelectionEngine } from './SelectionContext';

export function SelectionEngineActivator() {
  const { activate, deactivate, isActive } = useSelectionEngine();

  useEffect(() => {
    const handleToggle = () => {
      if (isActive) {
        deactivate();
      } else {
        activate();
      }
    };
    window.addEventListener('selection-engine:toggle', handleToggle);
    return () => window.removeEventListener('selection-engine:toggle', handleToggle);
  }, [activate, deactivate, isActive]);

  return null;
}
