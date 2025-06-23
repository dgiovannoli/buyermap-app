"use client";

import React, { useState, useEffect } from 'react'
import BuyerMapHome from './components/BuyerMapHome'
import DeckUploadStage from './components/stages/DeckUploadStage'
import InterviewProcessingStage from './components/stages/InterviewProcessingStage'
import { BuyerMapData } from '../types/buyermap'
import DeckResultsStage from './components/stages/DeckResultsStage'
import InterviewUploadStage from './components/stages/InterviewUploadStage'

type Phase =
  | 'home'
  | 'deck-upload'
  | 'results'
  | 'interview-processing'
  | 'complete'

export default function ModernBuyerMapLanding() {
  const [phase, setPhase] = useState<Phase>('home')
  const [buyerMapData, setBuyerMapData] = useState<BuyerMapData[]>([])

  // Debug phase changes
  useEffect(() => {
    console.log('🔄 Phase changed to:', phase);
  }, [phase]);

  // Function declarations (must be before early return)
  const handleStart = () => setPhase('deck-upload')

  const onError = (err: Error | string | null) => {
    if (err === null) {
      // Clear any previous errors
      return;
    }
    
    // Handle different error types
    const message = err instanceof Error ? err.message : err || 'Unknown error';
    console.error('❌ Error in modern-buyermap-landing:', err);
    console.error('Error message:', message);
  }

  const onProgressUpdate = (progress: any) => {
    console.log('Progress update:', progress)
  }

  const onValidationUpdate = (data: any) => {
    console.log('Validation update:', data)
    if (data.assumptions) {
      setBuyerMapData(data.assumptions)
    }
  }

  const handleInterviewUpload = async (
    files: File[],
    assumptions: BuyerMapData[],
    onSuccess: (data: any) => void
  ) => {
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      formData.append('assumptions', JSON.stringify(assumptions));
      const res = await fetch('/api/validate-interviews', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
      }
      const data = await res.json();
      // Merge validationAttributes into each assumption
      if (data && data.assumptions) {
        setBuyerMapData(data.assumptions);
        setPhase('interview-processing');
        onSuccess(data);
      } else {
        throw new Error('No assumptions returned from validation API');
      }
    } catch (err) {
      console.error('⚠️ [handleInterviewUpload] caught error:', err);
      // Optionally surface error to UI
    }
  };

  const onDeckProcessed = (data: any) => {
    console.log('✅ Deck processed successfully:', data);
    if (data.assumptions) {
      setBuyerMapData(data.assumptions);
      // Go directly to the buyer map results page
      setPhase('results');
    } else {
      console.error('❌ No assumptions found in deck data:', data);
      onError('Invalid response: no assumptions found in deck data');
    }
  }

  // ←── EARLY RETURN GUARD - MUST BE FIRST RETURNABLE JSX ──→
  if (phase === 'results' && buyerMapData.length > 0) {
    console.log('🏁 Entering results page early‐return');
    return (
      <BuyerMapResultsPage
        buyerMapData={buyerMapData}
        onUploadInterviews={handleInterviewUpload}
      />
    );
  }

  // --- NOTHING ABOVE THIS RUNS IF phase === "results" ---

  // Inline BuyerMapResultsPage component
  function BuyerMapResultsPage({
    buyerMapData,
    onUploadInterviews,
  }: {
    buyerMapData: BuyerMapData[];
    onUploadInterviews: (files: File[], assumptions: BuyerMapData[], onSuccess: (data: any) => void) => void;
  }) {
    return (
      <div className="px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900">Your Buyer Map</h1>
        <p className="mt-2 text-gray-600">
          Here are the ICP assumptions we extracted from your deck. Upload transcripts below to validate them.
        </p>

        <div className="mt-8">
          {/* show the grid read-only */}
          <DeckResultsStage 
            buyerMapData={{
              assumptions: buyerMapData,
              overallAlignmentScore: 0,
              validatedCount: 0,
              partiallyValidatedCount: 0,
              pendingCount: buyerMapData.length
            }} 
            onError={onError}
            onProgressUpdate={onProgressUpdate}
            onValidationUpdate={onValidationUpdate}
          />
        </div>

        <div className="mt-12">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Upload Interview Transcripts</h3>
            <p className="text-lg text-gray-600 mb-6">
              Upload your customer interview transcripts to validate the assumptions above.
            </p>
          </div>
          {/* your interview uploader stage */}
          <InterviewUploadStage 
            assumptions={buyerMapData}
            onUploaded={() => setPhase('interview-processing')}
            onUpload={onUploadInterviews}
          />
        </div>
      </div>
    );
  }

  // Linear phase handling - only runs if phase !== "results"
  if (phase === 'home') {
    return <BuyerMapHome onStart={handleStart} />
  }

  if (phase === 'deck-upload') {
    return (
      <DeckUploadStage
        onDeckProcessed={onDeckProcessed}
        onError={onError}
        onProgressUpdate={onProgressUpdate}
      />
    )
  }

  if (phase === 'interview-processing') {
    return (
      <div className="space-y-8">
        <BuyerMapResultsPage
          buyerMapData={buyerMapData}
          onUploadInterviews={handleInterviewUpload}
        />
        <InterviewProcessingStage
          assumptions={buyerMapData}
          onValidated={(finalData: BuyerMapData[]) => {
            setBuyerMapData(finalData)
            // Stay on the same page but with updated data
          }}
        />
      </div>
    )
  }

  // Default fallback
  return null
} 