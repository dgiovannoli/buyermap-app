'use client';

import React from 'react';
import TopNavigation from '../Navigation/TopNavigation';
import ContextualNavigation from '../Navigation/ContextualNavigation';
import Breadcrumbs, { BreadcrumbPresets } from '../Navigation/Breadcrumbs';

interface AppLayoutProps {
  children: React.ReactNode;
  context?: 'home' | 'upload' | 'results' | 'library' | 'processing';
  title?: string;
  subtitle?: string;
  showContextualNav?: boolean;
  showBreadcrumbs?: boolean;
  breadcrumbPreset?: keyof typeof BreadcrumbPresets;
  customBreadcrumbs?: Array<{ label: string; href?: string; active?: boolean }>;
  contextualActions?: Array<{
    href?: string;
    onClick?: () => void;
    label: string;
    icon: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'ghost';
    disabled?: boolean;
  }>;
  showBackButton?: boolean;
  backHref?: string;
  onBack?: () => void;
  backgroundColor?: string;
}

export default function AppLayout({
  children,
  context = 'home',
  title,
  subtitle,
  showContextualNav = false,
  showBreadcrumbs = false,
  breadcrumbPreset,
  customBreadcrumbs,
  contextualActions,
  showBackButton = false,
  backHref = '/',
  onBack,
  backgroundColor = 'bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900'
}: AppLayoutProps) {
  
  const breadcrumbItems = customBreadcrumbs || (breadcrumbPreset ? BreadcrumbPresets[breadcrumbPreset] : []);

  return (
    <div className={`min-h-screen ${backgroundColor}`}>
      {/* Top Navigation */}
      <TopNavigation />
      
      {/* Contextual Navigation */}
      {showContextualNav && title && (
        <ContextualNavigation
          context={context}
          title={title}
          subtitle={subtitle}
          showBackButton={showBackButton}
          backHref={backHref}
          actions={contextualActions}
          onBack={onBack}
        />
      )}
      
      {/* Breadcrumbs */}
      {showBreadcrumbs && breadcrumbItems.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Breadcrumbs items={breadcrumbItems} />
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <main className="relative">
        {children}
      </main>
    </div>
  );
} 