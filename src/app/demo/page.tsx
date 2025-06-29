'use client';

import React, { useEffect } from 'react';
import ModernBuyerMapLanding from '../../components/modern-buyermap-landing';
import sampleBuyerMapData from '../../mocks/sampleBuyerMapData.json';

export default function DemoPage() {
  // Clear any existing localStorage data to ensure demo data is always shown
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Clear all localStorage items that might interfere with demo data
      localStorage.removeItem('buyerMapData');
      localStorage.removeItem('interviewData');
      localStorage.removeItem('buyerMapScore');
      localStorage.removeItem('buyerMapCurrentStep');
      localStorage.removeItem('buyerMapUploaded');
      localStorage.removeItem('buyerMapScoreBreakdown');
      localStorage.removeItem('buyerMapOutcomeWeights');
      localStorage.removeItem('buyerMapSummary');
      localStorage.removeItem('buyerMapExpandedId');
      localStorage.removeItem('buyerMapUploadedFiles');
      localStorage.removeItem('selectedInterviewsForAnalysis');
    }
  }, []);

  // Calculate demo score based on the demo data
  const calculateDemoScore = () => {
    if (!sampleBuyerMapData || sampleBuyerMapData.length === 0) return 0;
    const total = sampleBuyerMapData.reduce((sum, item) => sum + (item.confidenceScore || 0), 0);
    return Math.round(total / sampleBuyerMapData.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Demo Badge */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-sm font-semibold shadow-lg">
            <span className="mr-2">🎯</span>
            Demo Buyer Map - Return Treasure DTC Returns Management
          </div>
        </div>
        
        <ModernBuyerMapLanding
          buyerMapData={sampleBuyerMapData as any}
          overallScore={calculateDemoScore()}
          currentStep={3}
          setCurrentStep={() => {}} // No-op since demo is static
          initialInsights={sampleBuyerMapData as any}
          onInterviewDataUpdated={() => {}} // No-op since demo is static
        />
      </div>
    </div>
  );
} 