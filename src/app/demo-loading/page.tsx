'use client';

import React, { useState } from 'react';
import ProcessVisualization from '../components/loading/ProcessVisualization';
import InterviewProcessingOverlay from '../components/loading/InterviewProcessingOverlay';
import { useProcessingProgress } from '../hooks/useProcessingProgress';

export default function LoadingDemo() {
  const [demoType, setDemoType] = useState<'deck' | 'interview' | 'none'>('none');
  const processingProgress = useProcessingProgress();

  const mockAssumptions = [
    "Our target buyers are legal assistants and paralegals at mid-size law firms",
    "Clients struggle with time-consuming administrative tasks and document management",
    "Decision makers prioritize tools that save time and improve efficiency",
    "Firms are triggered to seek new solutions during periods of high workload",
    "Main barriers include data security concerns and compliance requirements",
    "Messaging should emphasize strategic advantages and efficiency gains",
    "Companies range from solo practitioners to large corporate law firms"
  ];

  const startDeckDemo = () => {
    setDemoType('deck');
    processingProgress.startDeckProcessing(15); // 15 slides
  };

  const startInterviewDemo = () => {
    setDemoType('interview');
    processingProgress.startInterviewProcessing(6, mockAssumptions); // 6 interviews
  };

  const resetDemo = () => {
    setDemoType('none');
    processingProgress.resetProcessing();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Enhanced Loading States Demo
          </h1>
          <p className="text-gray-600 mb-8">
            Experience the new process visualization and value countdown loading states 
            that show users exactly what's happening during deck and interview processing.
          </p>

          {/* Demo Controls */}
          <div className="flex space-x-4 mb-8">
            <button
              onClick={startDeckDemo}
              disabled={processingProgress.phase !== 'idle'}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Demo Deck Processing
            </button>
            <button
              onClick={startInterviewDemo}
              disabled={processingProgress.phase !== 'idle'}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Demo Interview Processing
            </button>
            <button
              onClick={resetDemo}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700"
            >
              Reset Demo
            </button>
          </div>

          {/* Current Status */}
          <div className="bg-gray-50 rounded-lg p-4 mb-8">
            <h3 className="font-semibold text-gray-900 mb-2">Current Status:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Phase:</span>
                <span className="ml-2 font-medium capitalize">{processingProgress.phase}</span>
              </div>
              <div>
                <span className="text-gray-600">Progress:</span>
                <span className="ml-2 font-medium">{Math.round(processingProgress.progress)}%</span>
              </div>
              <div>
                <span className="text-gray-600">Completed:</span>
                <span className="ml-2 font-medium">{processingProgress.isComplete ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <span className="text-gray-600">Error:</span>
                <span className="ml-2 font-medium">{processingProgress.error || 'None'}</span>
              </div>
            </div>
          </div>

          {/* Features Highlight */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-3">Deck Processing Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Real-time slide analysis progress</li>
                <li>• Assumption identification counter</li>
                <li>• Process step visualization</li>
                <li>• Educational tips for product marketers</li>
                <li>• Value creation messaging</li>
              </ul>
            </div>
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-purple-900 mb-3">Interview Processing Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Conversation-by-conversation progress</li>
                <li>• Real-time quote discovery counter</li>
                <li>• Statistical validity indicators</li>
                <li>• Assumption-specific processing</li>
                <li>• Speaker diversity tracking</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Deck Processing Visualization */}
        {demoType === 'deck' && (
          <ProcessVisualization
            phase="deck"
            progress={processingProgress.progress}
            stats={processingProgress.stats}
            onComplete={() => {
              console.log('Deck processing demo completed!');
            }}
          />
        )}

        {/* Interview Processing Overlay */}
        <InterviewProcessingOverlay
          isVisible={demoType === 'interview' && processingProgress.phase === 'interview'}
          progress={processingProgress.progress}
          stats={processingProgress.stats}
          assumptions={mockAssumptions}
          onComplete={() => {
            console.log('Interview processing demo completed!');
          }}
        />
      </div>
    </div>
  );
} 