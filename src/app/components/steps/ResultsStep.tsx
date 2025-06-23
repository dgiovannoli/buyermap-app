'use client';

import React from 'react';
import { BarChart, Users, TrendingUp, ArrowRight, Brain, Target, Zap } from 'lucide-react';
import { BuyerMapData, Quote, InterviewBatch } from '../../../types/buyermap';

interface ResultsStepProps {
  results: BuyerMapData[];
  onBackToHome: () => void;
  onContinueToInterviews?: () => void;
  validationStatus: 'pending' | 'partial' | 'validated';
  processedBatches?: InterviewBatch[];
}

export default function ResultsStep({
  results,
  onBackToHome,
  onContinueToInterviews,
  validationStatus,
  processedBatches
}: ResultsStepProps) {
  const totalRecords = results?.length || 0;
  const alignedAssumptions = results?.filter(r => r.comparisonOutcome === 'Aligned').length || 0;
  const misalignedAssumptions = results?.filter(r => r.comparisonOutcome === 'Misaligned').length || 0;
  const newInsights = results?.filter(r => r.comparisonOutcome === 'New Data Added').length || 0;
  const averageConfidence = totalRecords > 0 
    ? (results || []).reduce((acc, r) => acc + (r.effectiveConfidence || r.confidenceScore || 0), 0) / totalRecords
    : 0;

  const getScoreColor = (outcome: string) => {
    switch (outcome) {
      case 'Aligned':
        return 'text-green-600';
      case 'Misaligned':
      case 'Contradicted':
        return 'text-red-600';
      case 'New Data Added':
      case 'Refined':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'Aligned':
      case 'Validated':
        return 'bg-green-100 text-green-800';
      case 'Misaligned':
      case 'Contradicted':
        return 'bg-red-100 text-red-800';
      case 'New Data Added':
      case 'Refined':
      case 'Challenged':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Analysis Results</h1>
            <button
              onClick={onBackToHome}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Back to Home
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500">Total Assumptions</h3>
              <p className="text-2xl font-semibold text-gray-900">{totalRecords}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-600">Aligned</h3>
              <p className="text-2xl font-semibold text-green-700">{alignedAssumptions}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-600">Misaligned</h3>
              <p className="text-2xl font-semibold text-red-700">{misalignedAssumptions}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-600">New Insights</h3>
              <p className="text-2xl font-semibold text-blue-700">{newInsights}</p>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="space-y-6">
            {results.map((result, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{result.icpAttribute}</h3>
                    <p className="text-sm text-gray-500">{result.icpTheme}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getOutcomeColor(result.comparisonOutcome)}`}>
                    {result.comparisonOutcome.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Original Assumption</h4>
                    <p className="text-gray-900">{result.v1Assumption}</p>
                    <p className="text-sm text-gray-500 mt-1">{result.whyAssumption}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Evidence</h4>
                    <p className="text-gray-900">{result.evidenceFromDeck}</p>
                    {result.realityFromInterviews && (
                      <p className="text-sm text-gray-500 mt-1">{result.realityFromInterviews}</p>
                    )}
                  </div>
                </div>

                {result.waysToAdjustMessaging && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Recommended Adjustments</h4>
                    <p className="text-gray-900">{result.waysToAdjustMessaging}</p>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">Confidence</h4>
                      <p className="text-lg font-semibold text-gray-900">
                        {Math.round((result.effectiveConfidence || result.confidenceScore) * 100)}%
                      </p>
                    </div>
                    <p className="text-sm text-gray-500">{result.confidenceExplanation}</p>
                  </div>
                </div>

                {result.quotes && result.quotes.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Supporting Quotes</h4>
                    <div className="space-y-2">
                      {result.quotes.map((quote: Quote, quoteIndex: number) => (
                        <div key={quoteIndex} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-gray-900">{quote.text}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            - {quote.speaker}, {quote.role}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}