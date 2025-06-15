'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BuyerMapData } from '@/types/buyer-map'
import { getOutcomeColor, getConfidenceColor, getScoreMessage } from '@/styles/theme'

interface ResultsStepProps {
  buyerMapData: BuyerMapData[];
  overallScore: number | null;
  activeTab: string;
  expandedRows: Set<number>;
  rejectedQuotes: Set<number>;
  onTabChange: (tab: string) => void;
  onToggleRowExpansion: (id: number) => void;
  onQuoteRejection: (quoteId: number) => void;
  getEffectiveConfidence: (item: BuyerMapData) => number;
  onNext: () => void;
  onBack: () => void;
  onBackToHome: () => void;
}

export default function ResultsStep({
  buyerMapData,
  overallScore,
  activeTab,
  expandedRows,
  rejectedQuotes,
  onTabChange,
  onToggleRowExpansion,
  onQuoteRejection,
  getEffectiveConfidence,
  onNext,
  onBack,
  onBackToHome
}: ResultsStepProps) {
  const getFilteredData = () => {
    const sorted = [...buyerMapData].sort((a, b) => getEffectiveConfidence(b) - getEffectiveConfidence(a))
    switch (activeTab) {
      case 'aligned':
        return sorted.filter(item => item.comparisonOutcome === 'Aligned')
      case 'insights':
        return sorted.filter(item => item.comparisonOutcome === 'New Data Added')
      case 'misaligned':
        return sorted.filter(item => item.comparisonOutcome === 'Misaligned')
      case 'all':
      default:
        return sorted
    }
  }

  const getTabCounts = () => {
    return {
      aligned: buyerMapData.filter(item => item.comparisonOutcome === 'Aligned').length,
      insights: buyerMapData.filter(item => item.comparisonOutcome === 'New Data Added').length,
      misaligned: buyerMapData.filter(item => item.comparisonOutcome === 'Misaligned').length
    }
  }

  return (
    <div className="space-y-8">
      {/* Overall Score Display */}
      {overallScore !== null && (
        <div className="text-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl p-8 mb-8">
          <h2 className="text-lg font-medium mb-2">Overall Alignment Score</h2>
          <div className="text-6xl font-bold mb-4">{overallScore}%</div>
          <p className="text-lg opacity-90">{getScoreMessage(overallScore)}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'all', label: 'All Results', count: buyerMapData.length, color: 'gray' },
            { key: 'misaligned', label: 'Misalignments', count: getTabCounts().misaligned, color: 'red' },
            { key: 'insights', label: 'New Insights', count: getTabCounts().insights, color: 'blue' },
            { key: 'aligned', label: 'Validated', count: getTabCounts().aligned, color: 'green' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? `border-${tab.color}-500 text-${tab.color}-600`
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Results Data */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {getFilteredData().map((item) => (
          <div key={item.id} className="border-b border-gray-200 last:border-b-0">
            <div className="p-6 hover:bg-gray-50">
              <div className="grid grid-cols-12 gap-4 items-start">
                <div className="col-span-3">
                  <div className="text-xs text-gray-500 mb-1">{item.icpAttribute}</div>
                  <h3 className="font-semibold text-gray-900 mb-1">{item.icpTheme}</h3>
                  <p className="text-sm text-gray-600">{item.v1Assumption}</p>
                </div>
                <div className="col-span-3">
                  <p className="text-sm text-gray-700">{item.realityFromInterviews}</p>
                </div>
                <div className="col-span-2">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getOutcomeColor(item.comparisonOutcome)}`}>
                    {item.comparisonOutcome}
                  </span>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getConfidenceColor(getEffectiveConfidence(item))}`}
                        style={{ width: `${getEffectiveConfidence(item)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{getEffectiveConfidence(item)}%</span>
                  </div>
                </div>
                <div className="col-span-2 flex justify-end">
                  <button
                    onClick={() => onToggleRowExpansion(item.id)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    {expandedRows.has(item.id) ? 'Hide Details ▲' : 'Show Details ▼'}
                  </button>
                </div>
              </div>
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">💡 Messaging Recommendation:</h4>
                <p className="text-sm text-blue-800">{item.waysToAdjustMessaging}</p>
              </div>
            </div>
            {expandedRows.has(item.id) && (
              <div className="bg-gray-50 border-t border-gray-200 p-6">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Supporting Evidence</h4>
                    <div className="space-y-3">
                      {item.quotes.map((quote) => (
                        <div key={quote.id} className={`border rounded-lg p-4 ${rejectedQuotes.has(quote.id) ? 'bg-red-50 border-red-200 opacity-50' : 'bg-white border-gray-200'}`}>
                          <p className="text-gray-700 mb-2 italic">"{quote.text}"</p>
                          <div className="flex justify-between items-center">
                            <div className="text-xs text-gray-500">
                              <strong>{quote.speaker}</strong>, {quote.role} • {quote.source}
                            </div>
                            {!rejectedQuotes.has(quote.id) && (
                              <button
                                onClick={() => onQuoteRejection(quote.id)}
                                className="text-red-500 hover:text-red-700 text-xs px-2 py-1 border border-red-300 rounded"
                              >
                                Reject Quote
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Analysis Details</h4>
                    <div className="space-y-4">
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">Original Assumption Source</h5>
                        <p className="text-sm text-gray-600 mb-2">{item.whyAssumption}</p>
                        <p className="text-xs text-blue-600">{item.evidenceFromDeck}</p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">Confidence Explanation</h5>
                        <p className="text-sm text-gray-600">{item.confidenceExplanation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mt-8">
        <button 
          onClick={onBack}
          className="bg-gray-600 text-white px-8 py-3 rounded-lg"
        >
          Back to Step 2
        </button>
        <button 
          onClick={onNext}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg"
        >
          Continue to Step 4
        </button>
        <button 
          onClick={onBackToHome}
          className="bg-gray-400 text-white px-8 py-3 rounded-lg"
        >
          Back to Homepage
        </button>
      </div>
    </div>
  )
} 