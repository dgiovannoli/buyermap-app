import { CheckCircle, XCircle, Plus, Info, AlertTriangle, Target } from 'lucide-react';

// Enhanced color mapping function for validation statuses
export const getValidationColors = (validationStatus) => {
  switch (validationStatus) {
    case 'VALIDATED': 
      return {
        primary: '#059669',
        bg: 'rgba(5, 150, 105, 0.1)',
        border: 'rgba(5, 150, 105, 0.3)'
      };
    case 'CONTRADICTED': 
      return {
        primary: '#dc2626',
        bg: 'rgba(220, 38, 38, 0.1)',
        border: 'rgba(220, 38, 38, 0.3)'
      };
    case 'GAP_IDENTIFIED': 
      return {
        primary: '#d97706',
        bg: 'rgba(217, 119, 6, 0.1)',
        border: 'rgba(217, 119, 6, 0.3)'
      };
    case 'INSUFFICIENT_DATA': 
      return {
        primary: '#6b7280',
        bg: 'rgba(107, 114, 128, 0.1)',
        border: 'rgba(107, 114, 128, 0.3)'
      };
    default:
      return {
        primary: '#6b7280',
        bg: 'rgba(107, 114, 128, 0.1)',
        border: 'rgba(107, 114, 128, 0.3)'
      };
  }
};

// Legacy color mapping function for backward compatibility
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

// Validation status icon mapping function
export const getValidationIcon = (validationStatus) => {
  switch (validationStatus) {
    case 'VALIDATED': return Target;
    case 'CONTRADICTED': return XCircle;
    case 'GAP_IDENTIFIED': return AlertTriangle;
    case 'INSUFFICIENT_DATA': return Info;
    default: return Info;
  }
};

// Legacy outcome icon mapping function for backward compatibility
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

// Helper to get display label for validation status
export const getValidationLabel = (validationStatus) => {
  switch (validationStatus) {
    case 'VALIDATED': return 'Validated';
    case 'CONTRADICTED': return 'Contradicted';
    case 'GAP_IDENTIFIED': return 'Gap Identified';
    case 'INSUFFICIENT_DATA': return 'Insufficient Data';
    default: return 'Pending';
  }
};

// Helper to get action needed label
export const getActionLabel = (actionNeeded) => {
  switch (actionNeeded) {
    case 'Keep': return 'Keep Current Approach';
    case 'Expand': return 'Expand Coverage';
    case 'Rewrite': return 'Rewrite Section';
    case 'Research': return 'Need More Research';
    default: return 'Review Required';
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