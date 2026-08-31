// Single source of categorical color for the app.
// Re-exports the canonical map from src/components/CategoryColors.tsx and adds a
// stable accessor. New charts MUST pull category colors from here (LAMINAR §5).
// Legacy chart.js / Tableau-10 palettes are frozen and must not be expanded.

export type CategoryStyle = {
  bg: string;
  text: string;
  border: string;
};

export { CATEGORY_COLORS, getCategoryStyle } from '../components/CategoryColors';

/** Resolve a category name to its style, falling back to "Other". */
export function getCategoryColor(category: string): CategoryStyle {
  return getCategoryStyle(category);
}
