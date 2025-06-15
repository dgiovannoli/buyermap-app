// Theme configuration for consistent styling across the app
type OutcomeType = 'Aligned' | 'New Data Added' | 'Misaligned';

export const outcomeColors: Record<OutcomeType | 'Default', string> = {
  Aligned: 'text-green-700 bg-green-100 border-green-300',
  'New Data Added': 'text-blue-700 bg-blue-100 border-blue-300',
  Misaligned: 'text-red-700 bg-red-100 border-red-300',
  Default: 'text-gray-600 bg-gray-50 border-gray-200',
};

export const confidenceColors = [
  { min: 80, className: 'bg-green-500' },
  { min: 60, className: 'bg-yellow-500' },
  { min: 0, className: 'bg-red-500' },
];

export const gradients = {
  primary: 'bg-gradient-to-r from-blue-600 to-purple-600',
  secondary: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500',
  blue: 'bg-gradient-to-br from-blue-500 to-blue-600',
  purple: 'bg-gradient-to-br from-purple-500 to-purple-600',
  green: 'bg-gradient-to-br from-green-500 to-green-600',
};

export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
  '3xl': 'shadow-3xl',
};

export const transitions = {
  all: 'transition-all duration-200',
  shadow: 'transition-shadow duration-200',
  transform: 'transition-transform duration-200',
  colors: 'transition-colors duration-200',
};

export const hover = {
  primary: 'hover:from-blue-700 hover:to-purple-700',
  shadow: 'hover:shadow-xl',
  scale: 'hover:scale-105',
  opacity: 'hover:opacity-90',
};

export function getOutcomeColor(outcome: OutcomeType | string) {
  return outcomeColors[outcome as OutcomeType] || outcomeColors.Default;
}

export function getConfidenceColor(confidence: number) {
  for (const { min, className } of confidenceColors) {
    if (confidence >= min) return className;
  }
  return 'bg-red-500';
} 