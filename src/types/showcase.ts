import React from 'react';

export type Category = 'text' | 'diagrams' | 'interactive' | 'visualization' | 'ai' | 'structure';

export interface Feature {
  id: string;
  name: string;
  icon: string;
  category: Category;
  description: string;
  whenUsed: string;
  demo: React.ReactNode;
  syntax: string;
}

export const CATEGORY_META: Record<Category, { label: string; color: string }> = {
  text: { label: 'Text', color: 'text-[#a8a29e]' },
  diagrams: { label: 'Diagrams', color: 'text-[#f59e0b]' },
  interactive: { label: 'Interactive', color: 'text-[#6fb38f]' },
  visualization: { label: 'Visualization', color: 'text-[#c2553a]' },
  ai: { label: 'AI-Powered', color: 'text-[#d946ef]' },
  structure: { label: 'Structure', color: 'text-[#78716c]' },
};
