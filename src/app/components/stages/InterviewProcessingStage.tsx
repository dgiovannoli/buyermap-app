'use client';

import React from 'react';
import { BuyerMapData } from '../../../types/buyermap';

interface InterviewProcessingStageProps {
  assumptions: BuyerMapData[];
  onValidated: (finalData: BuyerMapData[]) => void;
}

export default function InterviewProcessingStage({
  assumptions,
  onValidated
}: InterviewProcessingStageProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Processing Interviews
        </h2>
        <p className="text-gray-600 mb-6">
          Analyzing interview transcripts and validating assumptions...
        </p>
        
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
        
        <div className="mt-8 bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Processing Status
          </h3>
          <p className="text-sm text-gray-600">
            {assumptions.length} assumptions being validated...
          </p>
        </div>
      </div>
    </div>
  );
} 