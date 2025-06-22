'use client';

import React from 'react';
import Link from 'next/link';
import { Upload, Library, ArrowRight, FileText, Users, Brain } from 'lucide-react';

export default function UploadPage() {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Upload Customer Interviews</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Upload your customer interview transcripts to validate your ICP assumptions and uncover new insights
          </p>
        </div>

        {/* Upload Area */}
        <div className="bg-white/10 backdrop-blur-md border-2 border-dashed border-white/30 rounded-2xl p-12 text-center hover:border-white/50 transition-all duration-200 mb-8">
          <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Upload className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">Drop your interview files here</h3>
          <p className="text-gray-300 mb-6 max-w-md mx-auto">
            Supports PDF, Word docs, and text files. We'll extract quotes and analyze them against your assumptions.
          </p>
          <div className="space-y-4">
            <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-medium transition-all duration-200">
              Choose Files
            </button>
            <p className="text-sm text-gray-400">
              or drag and drop files here
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Link 
            href="/interviews"
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-all duration-200 group"
          >
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-purple-500 rounded-lg group-hover:bg-purple-600 transition-colors">
                <Library className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">View Interview Library</h3>
                <p className="text-gray-300 text-sm">
                  Browse your uploaded interviews and create filtered analyses
                </p>
                <div className="flex items-center text-blue-300 text-sm mt-3 group-hover:text-blue-200">
                  View Library <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              </div>
            </div>
          </Link>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-green-500 rounded-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Smart Analysis</h3>
                <p className="text-gray-300 text-sm">
                  Our AI will automatically extract insights and validate your assumptions
                </p>
                <div className="flex items-center text-gray-400 text-sm mt-3">
                  <FileText className="h-4 w-4 mr-1" />
                  Auto-processing enabled
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-white mb-4">💡 Upload Tips</h4>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              Include the interviewer and interviewee names for better speaker attribution
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              Clean transcripts work best - remove excessive filler words if possible
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              Upload multiple interviews at once for batch processing
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
} 