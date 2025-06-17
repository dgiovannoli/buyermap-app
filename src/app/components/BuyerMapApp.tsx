'use client';

import React, { useState, useCallback, useEffect } from 'react';
import BuyerMapInterface from './BuyerMapInterface';
import ResultsStep from './steps/ResultsStep';
import ExportStep from './steps/ExportStep';
import { BuyerMapData, Quote, AssumptionData, ProcessingStep, InterviewBatch, ProcessingProgress, ValidationProgress } from '../../types/buyer-map';
import { ICPValidationResponse } from '../../types/buyermap';
import FileUploadStep from './steps/FileUploadStep';
import dynamic from 'next/dynamic';
import DeckUploadStage from './stages/DeckUploadStage';
import DeckResultsStage from './stages/DeckResultsStage';
import ProgressTracker from './ProgressTracker';

const BATCH_SIZE = 3; // Process 3 interview files at a time

const BuyerMapHome = dynamic(() => import('./BuyerMapHome'), { ssr: false });

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h2>
          <p className="text-red-600">{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function BuyerMapApp() {
  const [isClient, setIsClient] = useState(false);
  const [currentStage, setCurrentStage] = useState<ProcessingStep>('home');
  const [buyerMapData, setBuyerMapData] = useState<ICPValidationResponse | null>(null);
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress>({
    phase: 'idle',
    step: 'home',
    currentBatch: 0,
    totalBatches: 0,
    percentage: 0,
    status: 'idle'
  });
  const [validationProgress, setValidationProgress] = useState<ValidationProgress>({
    validatedCount: 0,
    partiallyValidatedCount: 0,
    pendingCount: 0,
    totalQuotes: 0,
    overallProgress: 0,
    totalAssumptions: 0,
    partialCount: 0,
    totalInterviews: 0,
    processedBatches: 0
  });
  const [error, setError] = useState<string | null>(null);

  const handleStart = useCallback(() => {
    console.log('handleStart called');
    setCurrentStage('deck-upload');
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div>Loading...</div>;
  }

  const handleDeckProcessed = (data: ICPValidationResponse) => {
    setBuyerMapData(data);
    setCurrentStage('deck-results');
    updateValidationProgress(data);
  };

  const updateValidationProgress = (data: ICPValidationResponse) => {
    setBuyerMapData(data);
    const assumptions = data.assumptions || [];
    setValidationProgress({
      validatedCount: data.validatedCount || 0,
      partiallyValidatedCount: data.partiallyValidatedCount || 0,
      pendingCount: data.pendingCount || 0,
      totalQuotes: assumptions.reduce((sum, a) => sum + (a.quotes?.length || 0), 0),
      overallProgress: data.overallAlignmentScore || 0,
      totalAssumptions: assumptions.length,
      partialCount: data.partiallyValidatedCount || 0,
      totalInterviews: 0,
      processedBatches: 0
    });
  };

  const handleDeckResultsError = (error: Error) => {
    setError(error.message);
  };

  const handleDeckResultsProgress = (progress: number) => {
    setProcessingProgress(prev => ({ ...prev, percentage: progress }));
  };

  const renderCurrentStage = () => {
    console.log('🔍 renderCurrentStage called, currentStage:', currentStage);
    switch (currentStage) {
      case 'home':
        console.log('🔍 Executing HOME case');
        console.log('About to render BuyerMapHome with onStart:', handleStart);
        console.log('handleStart type:', typeof handleStart);
        return <BuyerMapHome onStart={handleStart} />;
      case 'deck-upload':
        return (
          <DeckUploadStage
            onDeckProcessed={handleDeckProcessed}
            onError={setError}
            onProgressUpdate={setProcessingProgress}
          />
        );
      case 'deck-results':
        return (
          <DeckResultsStage
            buyerMapData={buyerMapData!}
            onError={handleDeckResultsError}
            onProgressUpdate={handleDeckResultsProgress}
            onValidationUpdate={updateValidationProgress}
          />
        );
      default:
        console.log('🔍 Executing DEFAULT case');
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {currentStage !== 'home' && (
        <ProgressTracker
          processingProgress={processingProgress}
          validationProgress={validationProgress}
        />
      )}
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      <ErrorBoundary>
        {renderCurrentStage()}
      </ErrorBoundary>
    </div>
  );
}