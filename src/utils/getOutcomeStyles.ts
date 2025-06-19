export interface OutcomeStyles {
  textColor: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
}

export function getOutcomeStyles(outcome: string): OutcomeStyles {
  switch (outcome?.toLowerCase()) {
    case 'aligned':
      return {
        textColor: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        iconColor: 'text-green-600'
      };
    case 'misaligned':
      return {
        textColor: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        iconColor: 'text-red-600'
      };
    case 'new data added':
    case 'refined':
      return {
        textColor: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        iconColor: 'text-blue-600'
      };
    case 'challenged':
      return {
        textColor: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        iconColor: 'text-orange-600'
      };
    default:
      return {
        textColor: 'text-gray-700',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        iconColor: 'text-gray-600'
      };
  }
} 