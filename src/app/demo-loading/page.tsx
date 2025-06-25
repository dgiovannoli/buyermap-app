'use client';

import React, { useState } from 'react';
import ProcessVisualization from '../components/loading/ProcessVisualization';
import { useProcessingProgress } from '../hooks/useProcessingProgress';

export default function DemoLoadingPage() {
  const [showDemo, setShowDemo] = useState(false);
  const processingProgress = useProcessingProgress();

  const startDeckDemo = () => {
    setShowDemo(true);
    processingProgress.startDeckProcessing(12);
  };

  const startInterviewDemo = () => {
    setShowDemo(true);
    processingProgress.startInterviewProcessing(8, [
      'Buyer titles are attorneys and paralegals',
      'Company size is small to mid-sized law firms',
      'Pain points include manual review time'
    ]);
  };

  if (showDemo && processingProgress.phase !== 'idle') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <ProcessVisualization
          phase={processingProgress.phase as 'deck' | 'interview'}
          progress={processingProgress.progress}
          stats={processingProgress.stats}
          onComplete={() => {
            console.log('Demo completed!');
            setShowDemo(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Loading Screen Demo</h1>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Loading Screens</h2>
          <p className="text-gray-300 mb-6">
            This page helps test the loading screen functionality to debug production issues.
          </p>
          
          <div className="space-y-4">
            <button
              onClick={startDeckDemo}
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
            >
              Test Deck Processing Loading Screen
            </button>
            
            <button
              onClick={startInterviewDemo}
              className="w-full py-3 px-6 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 transition-all duration-200"
            >
              Test Interview Processing Loading Screen
            </button>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
          <h3 className="text-lg font-semibold mb-4">Debug Information</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-300">Current Phase:</span>
              <span className="ml-2 text-white">{processingProgress.phase}</span>
            </div>
            <div>
              <span className="text-gray-300">Progress:</span>
              <span className="ml-2 text-white">{processingProgress.progress}%</span>
            </div>
            <div>
              <span className="text-gray-300">Is Complete:</span>
              <span className="ml-2 text-white">{processingProgress.isComplete ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-gray-300">Current Step:</span>
              <span className="ml-2 text-white">{processingProgress.currentStep || 'None'}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-400">
          <p>If the loading screen doesn't appear, check the browser console for debug logs.</p>
          <p>This helps identify if the issue is with the component rendering or state management.</p>
        </div>
      </div>
    </div>
  );
} 