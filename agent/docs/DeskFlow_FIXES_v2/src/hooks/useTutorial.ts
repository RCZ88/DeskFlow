import { useState, useCallback } from 'react';

interface TutorialStep {
  target: string;
  title: string;
  instruction: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const TUTORIAL_KEY = 'tutorial-completed';

function loadCompleted(): string[] {
  try {
    const raw = localStorage.getItem(TUTORIAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveCompleted(ids: string[]) {
  localStorage.setItem(TUTORIAL_KEY, JSON.stringify(ids));
}

export function useTutorial(stepsMap: Record<string, TutorialStep[]>) {
  const [featureId, setFeatureId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [completed, setCompleted] = useState<string[]>(loadCompleted);

  const steps = featureId ? stepsMap[featureId] || [] : [];
  const currentStep = steps[stepIndex] || null;
  const totalSteps = steps.length;
  const isLastStep = stepIndex === totalSteps - 1;
  const isCompleted = featureId ? completed.includes(featureId) : false;

  const startTutorial = useCallback((id: string) => {
    setFeatureId(id);
    setStepIndex(0);
    setVisible(true);
  }, []);

  const nextStep = useCallback(() => {
    if (stepIndex < totalSteps - 1) {
      setStepIndex(i => i + 1);
      return;
    }
    if (featureId) {
      const next = loadCompleted();
      if (!next.includes(featureId)) {
        next.push(featureId);
        saveCompleted(next);
        setCompleted(next);
      }
    }
    setVisible(false);
  }, [stepIndex, totalSteps, featureId]);

  const prevStep = useCallback(() => {
    setStepIndex(i => Math.max(0, i - 1));
  }, []);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  const handleTryIt = useCallback(() => {
    setVisible(false);
  }, []);

  return {
    currentStep,
    stepIndex,
    totalSteps,
    isVisible: visible,
    isLastStep,
    isCompleted,
    completed,
    startTutorial,
    nextStep,
    prevStep,
    closeTutorial: close,
    tryIt: handleTryIt,
    activeFeatureId: featureId,
  };
}

export type { TutorialStep };
