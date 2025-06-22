'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brain, Upload, BarChart3, Library, Settings } from 'lucide-react';
import FeedbackButton from './FeedbackButton';
import UserMenu from '../../app/components/UserMenu';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
}

const navigationItems: NavItem[] = [
  {
    href: '/',
    label: 'Home',
    icon: <Brain className="h-5 w-5" />,
    description: 'BuyerMap Analysis'
  },
  {
    href: '/upload',
    label: 'Upload',
    icon: <Upload className="h-5 w-5" />,
    description: 'Upload Interviews'
  },
  {
    href: '/results',
    label: 'Results',
    icon: <BarChart3 className="h-5 w-5" />,
    description: 'View Analysis'
  },
  {
    href: '/interviews',
    label: 'Library',
    icon: <Library className="h-5 w-5" />,
    description: 'Interview Library'
  }
];

export default function TopNavigation() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-white group-hover:text-blue-200 transition-colors">
                BuyerMap
              </h1>
              <p className="text-xs text-gray-300 -mt-1">ICP Analysis</p>
            </div>
          </Link>

          {/* Navigation Items */}
          <div className="flex items-center space-x-1">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive(item.href)
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }
                `}
              >
                {item.icon}
                <span className="hidden md:block">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Action Button */}
          <div className="flex items-center space-x-3">
            <UserMenu />
            <FeedbackButton variant="minimal" />
            <Link
              href="/upload"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg"
            >
              <span className="hidden sm:inline">New Analysis</span>
              <span className="sm:hidden">+</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
} 