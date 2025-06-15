'use client';

import React, { useState } from 'react';
import BuyerMapInterface from './BuyerMapInterface';
import ResultsStep from './steps/ResultsStep';
import ExportStep from './steps/ExportStep';

interface BuyerResult {
  id?: string;
  buyerScore: number;
  confidence: number;
  outcome: string;
}

export default function BuyerMapApp() {
  const [currentStep, setCurrentStep] = useState<'home' | 'upload' | 'configure' | 'processing' | 'results' | 'export'>('home');
  const [results, setResults] = useState<BuyerResult[]>([]);

  const handleStartFlow = () => {
    setCurrentStep('upload');
  };

  const handleExport = () => {
    setCurrentStep('export');
  };

  const handleBack = () => {
    if (currentStep === 'results') {
      setCurrentStep('configure');
    } else if (currentStep === 'export') {
      setCurrentStep('results');
    }
  };

  const handleReset = () => {
    setCurrentStep('home');
    setResults([]);
  };

  const handleComplete = () => {
    setCurrentStep('home');
  };

  if (currentStep === 'home') {
    return <BuyerMapInterface onStartFlow={handleStartFlow} />;
  }

  if (currentStep === 'results') {
    return (
      <ResultsStep
        results={results}
        onExport={handleExport}
        onBack={handleBack}
      />
    );
  }

  if (currentStep === 'export') {
    return (
      <ExportStep
        results={results}
        onBack={handleBack}
        onComplete={handleComplete}
      />
    );
  }

  // For other steps (upload, configure, processing), show a simple message
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Step: {currentStep}
          </h2>
          <p className="text-gray-600 mb-6">
            This step is under development. Click below to return to home.
          </p>
          <button
            onClick={handleReset}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}