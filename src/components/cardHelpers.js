import { CheckCircle, XCircle, Plus, Info } from 'lucide-react';

// Enhanced color mapping function for outcome colors
export const getOutcomeColors = (outcome) => {
  switch (outcome) {
    case 'Aligned': 
      return {
        primary: '#059669',
        bg: 'rgba(5, 150, 105, 0.1)',
        border: 'rgba(5, 150, 105, 0.3)'
      };
    case 'Misaligned': 
    case 'Challenged': 
      return {
        primary: '#dc2626',
        bg: 'rgba(220, 38, 38, 0.1)',
        border: 'rgba(220, 38, 38, 0.3)'
      };
    case 'New Data Added': 
    case 'Refined': 
      return {
        primary: '#d97706',
        bg: 'rgba(217, 119, 6, 0.1)',
        border: 'rgba(217, 119, 6, 0.3)'
      };
    default:
      return {
        primary: '#6b7280',
        bg: 'rgba(107, 114, 128, 0.1)',
        border: 'rgba(107, 114, 128, 0.3)'
      };
  }
};

// Outcome icon mapping function
export const getOutcomeIcon = (outcome) => {
  switch (outcome) {
    case 'Aligned': return CheckCircle;
    case 'Misaligned': 
    case 'Challenged': return XCircle;
    case 'New Data Added': return Plus;
    case 'Refined': return Info;
    default: return Info;
  }
};

// Role badge detection function
export const getRoleBadge = (speaker) => {
  if (!speaker) return null;
  const text = speaker.toLowerCase();
  if (text.includes('paralegal')) return 'paralegal';
  if (text.includes('attorney')) return 'attorney'; 
  if (text.includes('ops') || text.includes('operations')) return 'operations';
  return null;
};

// Role badge styling function
export const getRoleStyle = (role) => {
  const roleType = getRoleBadge(role);
  switch (roleType) {
    case 'paralegal':
      return 'bg-purple-100 text-purple-700';
    case 'attorney':
      return 'bg-blue-100 text-blue-700';
    case 'operations':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}; 