'use client';

import React, { useState } from 'react';
import { MessageSquare, ExternalLink, Heart, Star, Bug } from 'lucide-react';

interface FeedbackButtonProps {
  className?: string;
  variant?: 'floating' | 'inline' | 'minimal';
  position?: 'bottom-right' | 'bottom-left' | 'top-right';
}

const FEEDBACK_URL = process.env.NEXT_PUBLIC_FEEDBACK_URL || 'https://feedback.buyermap.ai';

export default function FeedbackButton({ 
  className = '', 
  variant = 'floating',
  position = 'bottom-right' 
}: FeedbackButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleFeedbackClick = () => {
    // Open in new tab to avoid disrupting user workflow
    window.open(FEEDBACK_URL, '_blank', 'noopener,noreferrer');
  };

  if (variant === 'floating') {
    return (
      <div 
        className={`fixed z-50 ${getPositionClasses(position)} ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          onClick={handleFeedbackClick}
          className={`
            group flex items-center space-x-3 px-4 py-3 rounded-full
            bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700
            text-white font-medium shadow-lg hover:shadow-xl
            transform transition-all duration-300 ease-out
            ${isHovered ? 'scale-105 translate-x-1' : 'scale-100'}
          `}
        >
          <MessageSquare className="h-5 w-5" />
          <span className={`transition-all duration-300 ${isHovered ? 'opacity-100 max-w-32' : 'opacity-0 max-w-0 overflow-hidden'}`}>
            Share Feedback
          </span>
          <ExternalLink className="h-4 w-4 opacity-60 group-hover:opacity-100" />
        </button>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <button
        onClick={handleFeedbackClick}
        className={`
          inline-flex items-center space-x-2 px-4 py-2 rounded-lg
          bg-white/10 backdrop-blur-sm border border-white/20 
          text-white hover:bg-white/20 hover:border-white/30
          transition-all duration-200 ${className}
        `}
      >
        <MessageSquare className="h-4 w-4" />
        <span>Feedback</span>
        <ExternalLink className="h-3 w-3 opacity-60" />
      </button>
    );
  }

  // Minimal variant for navigation
  return (
    <button
      onClick={handleFeedbackClick}
      className={`
        p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10
        transition-colors duration-200 ${className}
      `}
      title="Share Feedback"
    >
      <MessageSquare className="h-5 w-5" />
    </button>
  );
}

function getPositionClasses(position: string): string {
  switch (position) {
    case 'bottom-left':
      return 'bottom-6 left-6';
    case 'top-right':
      return 'top-6 right-6';
    case 'bottom-right':
    default:
      return 'bottom-6 right-6';
  }
}

// Export feedback categories for use in different contexts
export const FEEDBACK_CATEGORIES = {
  feature: {
    icon: Star,
    label: 'Feature Request',
    description: 'Suggest new features or improvements'
  },
  bug: {
    icon: Bug,
    label: 'Bug Report',
    description: 'Report issues or unexpected behavior'
  },
  general: {
    icon: Heart,
    label: 'General Feedback',
    description: 'Share your thoughts about BuyerMap'
  }
} as const; 