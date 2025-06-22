'use client';

import React, { useState } from 'react';
import { MessageSquare, ExternalLink, Heart, Star, Bug, Lightbulb, AlertCircle } from 'lucide-react';

interface EnhancedFeedbackButtonProps {
  className?: string;
  variant?: 'floating' | 'inline' | 'minimal' | 'dropdown';
  position?: 'bottom-right' | 'bottom-left' | 'top-right';
  category?: 'feature' | 'bug' | 'general' | 'interview' | 'rag';
  context?: string; // For context-aware feedback
}

const FEEDBACK_BASE_URL = 'https://feedback.buyermap.ai';

export default function EnhancedFeedbackButton({ 
  className = '', 
  variant = 'floating',
  position = 'bottom-right',
  category,
  context
}: EnhancedFeedbackButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const getFeedbackUrl = (selectedCategory?: string) => {
    let url = FEEDBACK_BASE_URL;
    
    if (selectedCategory) {
      // Map categories to Fider category URLs
      const categoryMap = {
        feature: 'feature-requests',
        bug: 'bug-reports',
        general: 'general-feedback',
        interview: 'interview-library',
        rag: 'rag-system'
      };
      
      const fiderCategory = categoryMap[selectedCategory as keyof typeof categoryMap];
      if (fiderCategory) {
        url += `/posts?category=${fiderCategory}`;
      }
    }
    
    if (context) {
      // Add context as URL parameter for pre-filling
      url += `${url.includes('?') ? '&' : '?'}context=${encodeURIComponent(context)}`;
    }
    
    return url;
  };

  const handleFeedbackClick = (selectedCategory?: string) => {
    const url = getFeedbackUrl(selectedCategory || category);
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowDropdown(false);
  };

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Feedback</span>
        </button>
        
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-2">
              <div className="text-sm font-medium text-gray-900 px-3 py-2 border-b border-gray-100">
                Share Your Feedback
              </div>
              
              <FeedbackOption
                icon={Star}
                title="Feature Request"
                description="Suggest new features"
                onClick={() => handleFeedbackClick('feature')}
              />
              
              <FeedbackOption
                icon={Bug}
                title="Bug Report"
                description="Report issues"
                onClick={() => handleFeedbackClick('bug')}
              />
              
              <FeedbackOption
                icon={Lightbulb}
                title="Interview Library"
                description="Feedback on interviews"
                onClick={() => handleFeedbackClick('interview')}
              />
              
              <FeedbackOption
                icon={AlertCircle}
                title="RAG System"
                description="AI insights feedback"
                onClick={() => handleFeedbackClick('rag')}
              />
              
              <FeedbackOption
                icon={Heart}
                title="General Feedback"
                description="Share your thoughts"
                onClick={() => handleFeedbackClick('general')}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'floating') {
    return (
      <div 
        className={`fixed z-50 ${getPositionClasses(position)} ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          onClick={() => handleFeedbackClick()}
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
        onClick={() => handleFeedbackClick()}
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
      onClick={() => handleFeedbackClick()}
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

function FeedbackOption({ 
  icon: Icon, 
  title, 
  description, 
  onClick 
}: { 
  icon: React.ComponentType<any>; 
  title: string; 
  description: string; 
  onClick: () => void; 
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start space-x-3 px-3 py-2 text-left hover:bg-gray-50 rounded-md transition-colors duration-150"
    >
      <Icon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900">{title}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      <ExternalLink className="h-3 w-3 text-gray-400 mt-1 flex-shrink-0" />
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
export const BUYERMAP_FEEDBACK_CATEGORIES = {
  feature: {
    icon: Star,
    label: 'Feature Request',
    description: 'Suggest new features or improvements',
    url: `${FEEDBACK_BASE_URL}/posts?category=feature-requests`
  },
  bug: {
    icon: Bug,
    label: 'Bug Report', 
    description: 'Report issues or unexpected behavior',
    url: `${FEEDBACK_BASE_URL}/posts?category=bug-reports`
  },
  interview: {
    icon: Lightbulb,
    label: 'Interview Library',
    description: 'Feedback on interview features and content',
    url: `${FEEDBACK_BASE_URL}/posts?category=interview-library`
  },
  rag: {
    icon: AlertCircle,
    label: 'RAG System',
    description: 'AI insights and analysis feedback',
    url: `${FEEDBACK_BASE_URL}/posts?category=rag-system`
  },
  general: {
    icon: Heart,
    label: 'General Feedback',
    description: 'Share your thoughts about BuyerMap',
    url: `${FEEDBACK_BASE_URL}/posts?category=general-feedback`
  }
} as const; 