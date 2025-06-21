import { CheckCircle, XCircle, AlertTriangle, Plus, Minus, Info } from 'lucide-react';

export const getOutcomeColors = (outcome: string) => {
  switch (outcome) {
    case 'Aligned':
    case 'Validated':
      return {
        primary: '#10b981',
        bg: '#f0fdf4',
        border: '#bbf7d0',
        text: '#065f46'
      };
    case 'Misaligned':
    case 'Contradicted':
      return {
        primary: '#ef4444',
        bg: '#fef2f2',
        border: '#fecaca',
        text: '#991b1b'
      };
    case 'Challenged':
      return {
        primary: '#f59e0b',
        bg: '#fffbeb',
        border: '#fed7aa',
        text: '#92400e'
      };
    case 'New Data Added':
      return {
        primary: '#3b82f6',
        bg: '#eff6ff',
        border: '#bfdbfe',
        text: '#1e40af'
      };
    case 'Gap Identified':
      return {
        primary: '#f59e0b',
        bg: '#fffbeb',
        border: '#fed7aa',
        text: '#92400e'
      };
    case 'Refined':
      return {
        primary: '#8b5cf6',
        bg: '#faf5ff',
        border: '#c4b5fd',
        text: '#5b21b6'
      };
    case 'Insufficient Data':
    case 'Pending Validation':
      return {
        primary: '#9ca3af',
        bg: '#f9fafb',
        border: '#e5e7eb',
        text: '#6b7280'
      };
    default:
      return {
        primary: '#6b7280',
        bg: '#f9fafb',
        border: '#d1d5db',
        text: '#374151'
      };
  }
};

export const getOutcomeIcon = (outcome: string) => {
  switch (outcome) {
    case 'Aligned':
    case 'Validated':
      return CheckCircle;
    case 'Misaligned':
    case 'Contradicted':
      return XCircle;
    case 'Challenged':
      return AlertTriangle;
    case 'New Data Added':
      return Plus;
    case 'Gap Identified':
      return AlertTriangle;
    case 'Refined':
      return Minus;
    case 'Insufficient Data':
    case 'Pending Validation':
      return Info;
    default:
      return Info;
  }
};

export const getRoleStyle = (role: string) => {
  const roleStyles: { [key: string]: string } = {
    'CEO': 'bg-purple-100 text-purple-800',
    'CTO': 'bg-blue-100 text-blue-800',
    'VP': 'bg-green-100 text-green-800',
    'Director': 'bg-yellow-100 text-yellow-800',
    'Manager': 'bg-orange-100 text-orange-800',
    'Lead': 'bg-red-100 text-red-800',
    'Senior': 'bg-indigo-100 text-indigo-800',
    'Junior': 'bg-gray-100 text-gray-800'
  };

  for (const [key, style] of Object.entries(roleStyles)) {
    if (role.includes(key)) {
      return style;
    }
  }
  return 'bg-gray-100 text-gray-800';
}; 