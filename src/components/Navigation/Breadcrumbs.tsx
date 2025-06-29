'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  homeHref?: string;
}

export default function Breadcrumbs({ items, className = '', homeHref = '/' }: BreadcrumbsProps) {
  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="Breadcrumb">
      <Link
        href={homeHref}
        className="flex items-center text-gray-400 hover:text-white transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="h-4 w-4 text-gray-500" />
          
          {item.href && !item.active ? (
            <Link
              href={item.href}
              className="text-gray-400 hover:text-white transition-colors font-medium"
            >
              {item.label}
            </Link>
          ) : (
            <span
              className={`font-medium ${
                item.active ? 'text-white' : 'text-gray-300'
              }`}
            >
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

// Preset breadcrumb configurations for common workflows
export const BreadcrumbPresets = {
  upload: [
    { label: 'Upload Interviews', active: true }
  ],
  
  processing: [
    { label: 'Upload Interviews', href: '/upload' },
    { label: 'Processing', active: true }
  ],
  
  results: [
    { label: 'Upload Interviews', href: '/upload' },
    { label: 'Analysis Results', active: true }
  ],
  
  library: [
    { label: 'Interview Library', active: true }
  ],
  
  libraryToAnalysis: [
    { label: 'Interview Library', href: '/interviews' },
    { label: 'Selected Analysis', active: true }
  ],
  
  refinedAnalysis: [
    { label: 'Upload Interviews', href: '/upload' },
    { label: 'Analysis Results', href: '/results' },
    { label: 'Refined Analysis', active: true }
  ]
}; 