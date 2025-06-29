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
import ProgressTracker from './ProgressTracker';
import ModernBuyerMapLanding from '../../components/modern-buyermap-landing';

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
  // Store the last successful deck upload/analysis result
  const [lastDeckResult, setLastDeckResult] = useState<ICPValidationResponse | null>(null);
  // Store the last successful interview upload/analysis result
  const [lastInterviewResult, setLastInterviewResult] = useState<any>(null);

  // Memoize all callback functions at the top level
  const updateValidationProgress = useCallback((data: ICPValidationResponse) => {
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
  }, []);

  const handleDeckProcessed = useCallback((data: ICPValidationResponse) => {
    console.log('🚨 [BuyerMapApp] handleDeckProcessed called:', {
      timestamp: new Date().toISOString(),
      assumptionsCount: data.assumptions?.length || 0
    });
    setBuyerMapData(data);
    setCurrentStage('deck-results');
    setLastDeckResult(data); // Save the last successful result
    updateValidationProgress(data);
  }, [updateValidationProgress]);

  const handleDeckResultsError = useCallback((error: Error) => {
    setError(error.message);
  }, []);

  const handleDeckResultsProgress = useCallback((progress: number) => {
    setProcessingProgress(prev => ({ ...prev, percentage: progress }));
  }, []);

  const handleInterviewDataUpdated = useCallback((updatedBuyerMapData: any) => {
    console.log('🔄 [PARENT] Interview data update received:', {
      hasData: !!updatedBuyerMapData,
      assumptionsCount: updatedBuyerMapData?.length || 0,
      sampleReality: updatedBuyerMapData?.[0]?.validationAttributes?.[0]?.reality?.slice(0, 100)
    });
    
    // Store the last successful interview result
    setLastInterviewResult(updatedBuyerMapData);
    
    // Update the buyerMapData state with the new interview data
    if (updatedBuyerMapData && buyerMapData) {
      const updatedData = {
        ...buyerMapData,
        assumptions: updatedBuyerMapData
      };
      setBuyerMapData(updatedData);
      updateValidationProgress(updatedData);
      console.log('✅ [PARENT] Updated BuyerMapApp state with interview data');
    }
  }, [buyerMapData, updateValidationProgress]);

  const handleStart = useCallback(() => {
    console.log('handleStart called');
    setCurrentStage('deck-upload');
  }, []);

  // Add data processing function to clean up assumptions data
  const processAssumptionsForDisplay = (buyerMapData: ICPValidationResponse | null) => {
    if (!buyerMapData?.assumptions) return buyerMapData;
    
    const processedAssumptions = buyerMapData.assumptions.map(assumption => {
      // Get the correct outcome and reality from validationAttributes first, then fallback
      const validationData = assumption.validationAttributes?.[0];
      
      return {
        ...assumption,
        // Override with processed display values
        displayOutcome: validationData?.outcome || assumption.comparisonOutcome || 'pending',
        displayReality: validationData?.reality || assumption.evidenceFromDeck || 'Pending validation...',
        displayConfidence: validationData?.confidence || assumption.confidenceScore || 0,
        // Keep original data for debugging
        _originalOutcome: assumption.comparisonOutcome,
        _validationOutcome: validationData?.outcome
      };
    });

    console.log('🔧 [BuyerMapApp] Processed assumptions for display:', {
      originalCount: buyerMapData.assumptions.length,
      processedCount: processedAssumptions.length,
      sampleProcessed: processedAssumptions[0] ? {
        id: processedAssumptions[0].id,
        attribute: processedAssumptions[0].icpAttribute,
        displayOutcome: processedAssumptions[0].displayOutcome,
        displayReality: processedAssumptions[0].displayReality?.substring(0, 100) + '...'
      } : null
    });

    return {
      ...buyerMapData,
      assumptions: processedAssumptions
    };
  };

  // Replay last upload result as if a new upload just completed
  const replayLastUpload = useCallback(() => {
    if (lastDeckResult) {
      console.log('🔁 [BuyerMapApp] Replaying last upload result');
      handleDeckProcessed(lastDeckResult);
    }
  }, [lastDeckResult, handleDeckProcessed]);

  // Replay last interview result as if a new interview upload just completed
  const replayLastInterview = useCallback(() => {
    if (lastInterviewResult) {
      console.log('🔁 [BuyerMapApp] Replaying last interview result');
      handleInterviewDataUpdated(lastInterviewResult);
    }
  }, [lastInterviewResult, handleInterviewDataUpdated]);

  // Load replay state from localStorage on mount
  useEffect(() => {
    const storedDeck = localStorage.getItem('lastDeckResult');
    const storedInterview = localStorage.getItem('lastInterviewResult');
    if (storedDeck) setLastDeckResult(JSON.parse(storedDeck));
    if (storedInterview) setLastInterviewResult(JSON.parse(storedInterview));
    
    // Check for selected interviews from interview library
    const selectedInterviews = localStorage.getItem('selectedInterviewsForAnalysis');
    if (selectedInterviews) {
      try {
        const parsedSelectedInterviews = JSON.parse(selectedInterviews);
        if (parsedSelectedInterviews.length > 0) {
          console.log('🎯 [BuyerMapApp] Found selected interviews, setting stage to deck-results');
          
          // If we don't have existing buyer map data, create some default assumptions
          // This provides a foundation for the ModernBuyerMapLanding component to work with
          // The selected interviews will be analyzed against these assumptions
          if (!buyerMapData) {
            const defaultAssumptions = [
              {
                id: 1,
                icpAttribute: 'Buyer Title',
                icpTheme: 'WHO',
                v1Assumption: 'Target buyers include criminal defense attorneys and legal professionals',
                whyAssumption: 'Based on deck analysis of target market',
                evidenceFromDeck: 'Deck mentions legal professionals and attorneys',
                realityFromInterviews: undefined,
                reality: undefined,
                comparisonOutcome: 'Gap Identified' as const,
                waysToAdjustMessaging: undefined,
                confidenceScore: 85,
                confidenceExplanation: 'Default assumption from deck analysis',
                quotes: [],
                validationAttributes: [{
                  assumption: 'Target buyers include criminal defense attorneys and legal professionals',
                  reality: 'Pending validation...',
                  outcome: 'Insufficient Data' as const,
                  confidence: 85,
                  confidence_explanation: 'Default assumption from deck analysis',
                  quotes: []
                }]
              },
              {
                id: 2,
                icpAttribute: 'Pain Points',
                icpTheme: 'WHAT',
                v1Assumption: 'Manual transcription is time-consuming and error-prone',
                whyAssumption: 'Based on deck analysis of customer pain points',
                evidenceFromDeck: 'Deck highlights transcription challenges',
                realityFromInterviews: undefined,
                reality: undefined,
                comparisonOutcome: 'Gap Identified' as const,
                waysToAdjustMessaging: undefined,
                confidenceScore: 80,
                confidenceExplanation: 'Default assumption from deck analysis',
                quotes: [],
                validationAttributes: [{
                  assumption: 'Manual transcription is time-consuming and error-prone',
                  reality: 'Pending validation...',
                  outcome: 'Insufficient Data' as const,
                  confidence: 80,
                  confidence_explanation: 'Default assumption from deck analysis',
                  quotes: []
                }]
              },
              {
                id: 3,
                icpAttribute: 'Desired Outcomes',
                icpTheme: 'WHAT',
                v1Assumption: 'Need accurate, fast transcription to save time and improve efficiency',
                whyAssumption: 'Based on deck analysis of customer goals',
                evidenceFromDeck: 'Deck emphasizes time savings and accuracy',
                realityFromInterviews: undefined,
                reality: undefined,
                comparisonOutcome: 'Gap Identified' as const,
                waysToAdjustMessaging: undefined,
                confidenceScore: 90,
                confidenceExplanation: 'Default assumption from deck analysis',
                quotes: [],
                validationAttributes: [{
                  assumption: 'Need accurate, fast transcription to save time and improve efficiency',
                  reality: 'Pending validation...',
                  outcome: 'Insufficient Data' as const,
                  confidence: 90,
                  confidence_explanation: 'Default assumption from deck analysis',
                  quotes: []
                }]
              }
            ];
            
            setBuyerMapData({
              assumptions: defaultAssumptions,
              overallAlignmentScore: 85,
              validatedCount: 0,
              partiallyValidatedCount: 0,
              pendingCount: defaultAssumptions.length
            });
          }
          
          setCurrentStage('deck-results');
        }
      } catch (error) {
        console.error('❌ [BuyerMapApp] Failed to parse selected interviews:', error);
      }
    }
  }, [buyerMapData]);

  // Persist lastDeckResult to localStorage
  useEffect(() => {
    if (lastDeckResult) {
      localStorage.setItem('lastDeckResult', JSON.stringify(lastDeckResult));
    }
  }, [lastDeckResult]);

  // Persist lastInterviewResult to localStorage
  useEffect(() => {
    if (lastInterviewResult) {
      localStorage.setItem('lastInterviewResult', JSON.stringify(lastInterviewResult));
    }
  }, [lastInterviewResult]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    console.log('BuyerMapApp: buyerMapData changed:', {
      hasData: !!buyerMapData,
      assumptionsCount: buyerMapData?.assumptions?.length || 0,
      firstRealityData: buyerMapData?.assumptions?.[0]?.validationAttributes?.[0]?.reality?.slice(0, 100),
      timestamp: new Date().toISOString()
    });
  }, [buyerMapData]);

  if (!isClient) {
    return <div>Loading...</div>;
  }

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
            lastDeckResult={lastDeckResult}
            onReplayLastUpload={replayLastUpload}
          />
        );
      case 'deck-results':
        return (
          <ModernBuyerMapLanding
            buyerMapData={buyerMapData?.assumptions || []}
            overallScore={validationProgress.overallProgress || 0}
            currentStep={0}
            setCurrentStep={(step: number) => setCurrentStage('deck-results')}
            initialInsights={undefined}
            onInterviewDataUpdated={handleInterviewDataUpdated}
            lastInterviewResult={lastInterviewResult}
            onReplayLastInterview={replayLastInterview}
          />
        );
      default:
        console.log('🔍 Executing DEFAULT case');
        return null;
    }
  };

  return (
    <div className="relative">
      {error && (
        <div className="fixed top-20 right-4 bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-200 px-4 py-3 rounded-lg z-50">
          {error}
        </div>
      )}
      <ErrorBoundary>
        {renderCurrentStage()}
      </ErrorBoundary>
    </div>
  );
}