"use client";

import React from 'react';
import { BuyerMapData } from '../../types/buyermap';
import DeckResultsStage from './stages/DeckResultsStage';
import InterviewUploadStage from './stages/InterviewUploadStage';

interface BuyerMapResultsPageProps {
  buyerMapData: BuyerMapData[];
  onUploadInterviews: (files: File[], assumptions: BuyerMapData[], onSuccess: (data: any) => void) => void;
  onError: (err: Error | string | null) => void;
  onProgressUpdate: (progress: any) => void;
  onValidationUpdate: (data: any) => void;
  onUploaded: () => void;
  lastInterviewResult?: any;
  onReplayLastInterview?: () => void;
}

export default function BuyerMapResultsPage({
  buyerMapData,
  onUploadInterviews,
  onError,
  onProgressUpdate,
  onValidationUpdate,
  onUploaded,
  lastInterviewResult,
  onReplayLastInterview,
}: BuyerMapResultsPageProps) {
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
          onUploaded={onUploaded}
          onUpload={onUploadInterviews}
          lastInterviewResult={lastInterviewResult}
          onReplayLastInterview={onReplayLastInterview}
        />
      </div>
    </div>
  );
} 