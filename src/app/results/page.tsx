'use client';

import React from 'react';
import Link from 'next/link';
import { BarChart3, Download, Upload, Library, TrendingUp, Users, MessageSquare, Target } from 'lucide-react';

export default function ResultsPage() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Analysis Results</h1>
            <p className="text-gray-300">
              ICP validation results from 3 customer interviews
            </p>
          </div>
          <div className="flex space-x-4">
            <Link
              href="/upload"
              className="inline-flex items-center px-4 py-2 border border-white/20 rounded-lg text-sm font-medium text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-200"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload More
            </Link>
            <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200">
              <Download className="w-4 h-4 mr-2" />
              Export Results
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-500 rounded-lg mr-4">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-300">Overall Alignment</p>
                <p className="text-2xl font-bold text-white">78%</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-500 rounded-lg mr-4">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-300">Total Quotes</p>
                <p className="text-2xl font-bold text-white">35</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-500 rounded-lg mr-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-300">Interviews</p>
                <p className="text-2xl font-bold text-white">3</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-500 rounded-lg mr-4">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-300">New Insights</p>
                <p className="text-2xl font-bold text-white">7</p>
              </div>
            </div>
          </div>
        </div>

        {/* Results Placeholder */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-8 text-center">
          <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">Analysis Results</h3>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Your ICP validation results would appear here. This page will show detailed analysis of how your assumptions align with customer interview data.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-white/10 rounded-lg p-6 text-left">
              <h4 className="text-lg font-semibold text-white mb-3">✅ Validated Assumptions</h4>
              <ul className="space-y-2 text-gray-300">
                <li>• Company size targeting is accurate</li>
                <li>• Pain points align with reality</li>
                <li>• Desired outcomes are confirmed</li>
              </ul>
            </div>

            <div className="bg-white/10 rounded-lg p-6 text-left">
              <h4 className="text-lg font-semibold text-white mb-3">🔍 New Insights</h4>
              <ul className="space-y-2 text-gray-300">
                <li>• Different messaging resonates better</li>
                <li>• Additional triggers identified</li>
                <li>• Barriers we hadn't considered</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 space-x-4">
            <Link
              href="/interviews"
              className="inline-flex items-center px-6 py-3 border border-white/20 rounded-lg text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-all duration-200"
            >
              <Library className="w-4 h-4 mr-2" />
              View Interview Library
            </Link>
            <Link
              href="/upload"
              className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload More Interviews
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 