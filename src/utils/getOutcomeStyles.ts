export interface OutcomeStyles {
  textColor: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
}

export const getOutcomeStyles = (outcome: string) => {
  switch (outcome?.toLowerCase()) {
    case 'aligned':
      return {
        color: 'rgb(34, 197, 94)', // green-500
        bgColor: 'rgb(240, 253, 244)', // green-50
        borderColor: 'rgb(34, 197, 94)' // green-500
      };
    case 'misaligned':
      return {
        color: 'rgb(239, 68, 68)', // red-500
        bgColor: 'rgb(254, 242, 242)', // red-50
        borderColor: 'rgb(239, 68, 68)' // red-500
      };
    case 'new data added':
      return {
        color: 'rgb(59, 130, 246)', // blue-500
        bgColor: 'rgb(239, 246, 255)', // blue-50
        borderColor: 'rgb(59, 130, 246)' // blue-500
      };
    case 'refined':
      return {
        color: 'rgb(245, 158, 11)', // amber-500
        bgColor: 'rgb(255, 251, 235)', // amber-50
        borderColor: 'rgb(245, 158, 11)' // amber-500
      };
    default:
      return {
        color: 'rgb(107, 114, 128)', // gray-500
        bgColor: 'rgb(249, 250, 251)', // gray-50
        borderColor: 'rgb(107, 114, 128)' // gray-500
      };
  }
}; 