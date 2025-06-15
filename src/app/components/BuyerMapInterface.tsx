'use client';

import React from 'react';
import { Upload, ArrowLeft, Brain, BarChart3, Download } from 'lucide-react';

interface BuyerMapInterfaceProps {
  onStartFlow: () => void;
}

export default function BuyerMapInterface({ onStartFlow }: BuyerMapInterfaceProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button className="text-gray-600 hover:text-gray-800 mr-4">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex items-center">
            <Brain className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">BuyerMap Analysis</h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Data</h2>
            <p className="text-gray-600">
              Upload your customer data file to begin the buyer scoring analysis
            </p>
          </div>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Drop your file here or click to browse
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supports CSV, Excel (.xlsx, .xls) files up to 50MB
            </p>
            <button 
              onClick={onStartFlow}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Choose File
            </button>
          </div>

          {/* Feature Preview */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">AI Scoring</h3>
              <p className="text-sm text-gray-600">Advanced algorithms analyze buyer patterns</p>
            </div>
            
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Smart Insights</h3>
              <p className="text-sm text-gray-600">Discover hidden buyer behavior patterns</p>
            </div>
            
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Download className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Export Results</h3>
              <p className="text-sm text-gray-600">Download scored data and insights</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}