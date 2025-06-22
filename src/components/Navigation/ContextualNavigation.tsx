'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Library, Download, Filter, RefreshCw } from 'lucide-react';

interface ContextualAction {
  href?: string;
  onClick?: () => void;
  label: string;
  icon: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
}

interface ContextualNavigationProps {
  context: 'home' | 'upload' | 'results' | 'library' | 'processing';
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  backHref?: string;
  actions?: ContextualAction[];
  onBack?: () => void;
}

const getDefaultActions = (context: string): ContextualAction[] => {
  switch (context) {
    case 'results':
      return [
        {
          href: '/upload',
          label: 'Upload More',
          icon: <Upload className="h-4 w-4" />,
          variant: 'secondary'
        },
        {
          href: '/interviews',
          label: 'View Library',
          icon: <Library className="h-4 w-4" />,
          variant: 'secondary'
        },
        {
          onClick: () => window.print(),
          label: 'Export Results',
          icon: <Download className="h-4 w-4" />,
          variant: 'primary'
        }
      ];
    case 'library':
      return [
        {
          href: '/upload',
          label: 'Upload Interviews',
          icon: <Upload className="h-4 w-4" />,
          variant: 'primary'
        },
        {
          onClick: () => {}, // This would trigger filter UI
          label: 'Filter',
          icon: <Filter className="h-4 w-4" />,
          variant: 'secondary'
        }
      ];
    case 'upload':
      return [
        {
          href: '/interviews',
          label: 'View Library',
          icon: <Library className="h-4 w-4" />,
          variant: 'secondary'
        }
      ];
    default:
      return [];
  }
};

export default function ContextualNavigation({
  context,
  title,
  subtitle,
  showBackButton = false,
  backHref = '/',
  actions = [],
  onBack
}: ContextualNavigationProps) {
  const defaultActions = getDefaultActions(context);
  const allActions = actions.length > 0 ? actions : defaultActions;

  const getButtonStyles = (variant: string = 'secondary') => {
    const baseStyles = "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200";
    
    switch (variant) {
      case 'primary':
        return `${baseStyles} bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg`;
      case 'ghost':
        return `${baseStyles} text-gray-300 hover:text-white hover:bg-white/10`;
      default:
        return `${baseStyles} bg-white/10 hover:bg-white/20 text-white border border-white/20`;
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Left Section - Title & Back */}
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <div>
                {onBack ? (
                  <button
                    onClick={onBack}
                    className="flex items-center text-gray-300 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                ) : (
                  <Link
                    href={backHref}
                    className="flex items-center text-gray-300 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                )}
              </div>
            )}
            
            <div>
              <h1 className="text-xl font-bold text-white">{title}</h1>
              {subtitle && (
                <p className="text-sm text-gray-300 mt-1">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center space-x-3">
            {allActions.map((action, index) => (
              <div key={index}>
                {action.href ? (
                  <Link
                    href={action.href}
                    className={getButtonStyles(action.variant)}
                  >
                    {action.icon}
                    <span>{action.label}</span>
                  </Link>
                ) : (
                  <button
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={`${getButtonStyles(action.variant)} ${
                      action.disabled ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {action.icon}
                    <span>{action.label}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 