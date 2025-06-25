"use client";

import React from 'react';
import { useBuyerMapFlow, Phase } from '../hooks/useBuyerMapFlow';
import BuyerMapHome from './BuyerMapHome';
import DeckUploadStage from './stages/DeckUploadStage';
import InterviewProcessingStage from './stages/InterviewProcessingStage';
import BuyerMapResultsPage from './BuyerMapResultsPage';

export default function BuyerMapRouter() {
  const { phase, buyerMapData, handlers } = useBuyerMapFlow();

  // Early return for results page
  if (phase === 'results' && buyerMapData.length > 0) {
    console.log('🏁 Entering results page early‐return');
    return (
      <BuyerMapResultsPage
        buyerMapData={buyerMapData}
        onUploadInterviews={handlers.handleInterviewUpload}
        onError={handlers.onError}
        onProgressUpdate={handlers.onProgressUpdate}
        onValidationUpdate={handlers.onValidationUpdate}
        onUploaded={handlers.onInterviewUploaded}
      />
    );
  }

  // Phase-based routing
  switch (phase) {
    case 'home':
      return <BuyerMapHome onStart={handlers.handleStart} />;
    
    case 'deck-upload':
      return (
        <DeckUploadStage
          onDeckProcessed={handlers.onDeckProcessed}
          onError={handlers.onError}
          onProgressUpdate={handlers.onProgressUpdate}
        />
      );
    
    case 'interview-processing':
      return (
        <div className="space-y-8">
          <BuyerMapResultsPage
            buyerMapData={buyerMapData}
            onUploadInterviews={handlers.handleInterviewUpload}
            onError={handlers.onError}
            onProgressUpdate={handlers.onProgressUpdate}
            onValidationUpdate={handlers.onValidationUpdate}
            onUploaded={handlers.onInterviewUploaded}
          />
          <InterviewProcessingStage
            assumptions={buyerMapData}
            onValidated={handlers.onInterviewValidated}
          />
        </div>
      );
    
    default:
      return null;
  }
} 