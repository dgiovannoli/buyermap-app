'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brain, Menu, X, Home, Library, Play, LogOut, BarChart3 } from 'lucide-react';
import FeedbackButton from './FeedbackButton';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase-client';

export default function TopNavigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [hasResults, setHasResults] = useState(false);
  const pathname = usePathname();
  // supabase client is already imported and ready to use

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Check for persisted results in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const buyerMapData = localStorage.getItem('buyerMapData');
      setHasResults(!!buyerMapData && buyerMapData !== '[]');
    }
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Clear beta access from localStorage
    localStorage.removeItem('betaAuthorized');
    window.location.reload();
  };

  const menuItems = [
    {
      href: hasResults ? '/results' : '/',
      label: 'Home',
      icon: <Home className="h-5 w-5" />,
      description: hasResults ? 'BuyerMap Dashboard' : 'Get Started'
    },
    {
      href: '/interviews',
      label: 'Library',
      icon: <Library className="h-5 w-5" />,
      description: 'Interview Library'
    },
    // Results button is always visible
    {
      href: '/results',
      label: 'Results',
      icon: <BarChart3 className="h-5 w-5" />,
      description: 'Analysis Results',
      isResults: true
    },
    {
      href: '/',
      label: 'Start Analysis',
      icon: <Play className="h-5 w-5" />,
      description: 'Upload Sales Deck'
    }
  ];

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
            <div className="p-2 rounded-lg">
              <img src="/logo.svg" alt="BuyerMap Logo" className="h-6 w-6" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-white group-hover:text-blue-200 transition-colors">
                BuyerMap
              </h1>
              <p className="text-xs text-gray-300 -mt-1">ICP Analysis</p>
            </div>
          </Link>

          {/* Right Section - Feedback Button + Demo Link + Hamburger */}
          <div className="flex items-center space-x-3">
            <FeedbackButton variant="inline" />
            
            {/* Demo Buyer Map Link */}
            <Link
              href="/demo"
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold rounded-lg shadow-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-105 border border-purple-400/30"
            >
              <span className="mr-2">🎯</span>
              Demo Buyer Map
            </Link>
            
            {/* Hamburger Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Open menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Hamburger Menu Overlay */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed top-16 right-0 w-80 bg-white/95 backdrop-blur-md border-l border-white/20 shadow-2xl z-50 h-[calc(100vh-4rem)]">
            <div className="p-6 space-y-6">
              
              {/* User Account Section */}
              {user && (
                <div className="pb-6 border-b border-gray-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{user.email}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">BETA</span>
                        <span className="text-xs text-gray-500">Beta Access User</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Items */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Navigation
                </h3>
                
                {menuItems.map((item) => (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`
                      flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                      ${item.isResults
                        ? 'border border-blue-400 bg-blue-50 text-blue-700'
                        : isActive(item.href)
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50'
                    }
                    `}
                  >
                    {item.icon}
                    <div className="flex-1">
                      <div>{item.label}</div>
                      <div className="text-xs text-gray-500">
                        {item.description}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Account Actions */}
              {user && (
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Account
                  </h3>
                  
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                  >
                    <LogOut className="h-5 w-5" />
                    <div>
                      <div>Sign Out</div>
                      <div className="text-xs text-red-500">Clear Beta Access</div>
                    </div>
                  </button>
                </div>
              )}

              {/* App Info */}
              <div className="pt-6 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900 mb-1">BuyerMap</div>
                  <div className="text-xs text-gray-500">ICP Validation Platform</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </nav>
  );
} 