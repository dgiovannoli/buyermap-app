'use client';

import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Target, BarChart3, MessageSquare, Quote, Plus, CheckCircle, XCircle, Info, ChartBar, FileText } from 'lucide-react';
import { getOutcomeColors, getOutcomeIcon, getRoleStyle } from '../utils/validationHelpers';
import { getAttributeIconAndColors } from '../utils/attributeStyles';
import ConfidenceBreakdown from './ConfidenceBreakdown';
import { ConfidenceBreakdown as ConfidenceBreakdownType } from '../types/buyermap';

interface Quote {
  text: string;
  author: string;
  speaker?: string;
  role?: string;
  companySnapshot?: string;
  relevanceScore?: number;
}

interface ValidationData {
  outcome: 'Aligned' | 'Misaligned' | 'Challenged' | 'New Data Added' | 'Refined' | 'Pending Validation' | 'Validated' | 'Contradicted' | 'Gap Identified' | 'Insufficient Data';
  confidence: number;
  confidence_explanation: string;
  reality: string;
  quotes: Quote[];
  confidenceBreakdown?: ConfidenceBreakdownType;
  evidenceFromDeck?: string;
  dataSource?: 'interview' | 'deck' | 'none';
  validationAttributes?: Array<{
    outcome: 'Validated' | 'Contradicted' | 'Gap Identified' | 'Insufficient Data';
    reality: string;
    confidence: number;
    quotes: Quote[];
  }>;
  displayOutcome?: string;
}

interface DetailedValidationCardProps {
  id: number;
  /** The attribute's name (e.g. "Buyer Titles", "Company Size", "Pain Points") */
  attributeTitle: string;
  /** The assumption text to display as subtitle */
  subtitle?: string;
  hasValidation?: boolean;
  validation?: ValidationData;
  isExpanded: boolean;
  onToggleExpand: (id: number) => void;
  hasInterviewData?: boolean;
}

const getBestGuessLabel = (outcome: string, quotes: any[], dataSource?: string): 'Validated' | 'Contradicted' | 'Gap Identified' | 'No Data' | 'From Deck Analysis' => {
  if (!quotes || quotes.length === 0) {
    if (dataSource === 'deck') return 'From Deck Analysis';
    return 'No Data';
  }
  switch (outcome) {
    case 'Validated':
      return 'Validated';
    case 'Contradicted':
      return 'Contradicted';
    case 'Gap Identified':
      return 'Gap Identified';
    case 'New Data Added':
      return dataSource === 'deck' ? 'From Deck Analysis' : 'Gap Identified';
    default:
      return dataSource === 'deck' ? 'From Deck Analysis' : 'Validated'; // fallback based on data source
  }
};

const getLabelColor = (label: string) => {
  switch (label) {
    case 'Validated':
      return { primary: '#059669', bg: 'rgba(5, 150, 105, 0.1)', border: 'rgba(5, 150, 105, 0.3)' };
    case 'Contradicted':
      return { primary: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)', border: 'rgba(220, 38, 38, 0.3)' };
    case 'Gap Identified':
      return { primary: '#d97706', bg: 'rgba(217, 119, 6, 0.1)', border: 'rgba(217, 119, 6, 0.3)' };
    case 'From Deck Analysis':
      return { primary: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)', border: 'rgba(37, 99, 235, 0.3)' };
    case 'No Data':
    default:
      return { primary: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', border: 'rgba(107, 114, 128, 0.3)' };
  }
};

const DetailedValidationCard: React.FC<DetailedValidationCardProps> = ({
  id,
  attributeTitle,
  subtitle,
  hasValidation = false,
  validation,
  isExpanded,
  onToggleExpand,
  hasInterviewData
}) => {
  const [showAllQuotes, setShowAllQuotes] = useState(false);
  
  // Use the flat validation structure that's actually being passed
  const label = validation?.displayOutcome || '';
  const confidence = validation?.confidence || 0;
  const reality = validation?.reality || '';
  
  const labelColors = getLabelColor(label);
  const showNoData = label === 'Insufficient Data' || label === 'No Data';
  const showLowConfidenceWarning = showNoData;
  
  const OutcomeIcon = validation ? getOutcomeIcon(validation.outcome) : getOutcomeIcon('New Data Added');
  
  // Pull in the dynamic icon + colors:
  const { Icon: AttributeIcon, bgClass, iconClass, titleClass } =
    getAttributeIconAndColors(attributeTitle);

  const toggleExpanded = useCallback(() => {
    onToggleExpand(id);
  }, [id, onToggleExpand]);

  const toggleShowAllQuotes = useCallback(() => {
    setShowAllQuotes(prev => !prev);
  }, []);

  // Helper function to get diverse quotes (prioritize different speakers)
  const getDiverseQuotes = useCallback((quotes: Quote[], count: number = 2) => {
    if (!quotes || quotes.length === 0) return [];
    
    const seenSpeakers = new Set<string>();
    const diverseQuotes: Quote[] = [];
    const remainingQuotes: Quote[] = [];
    
    // First pass: collect quotes from unique speakers (prefer longer, more substantive quotes)
    const sortedQuotes = [...quotes].sort((a, b) => (b.text?.length || 0) - (a.text?.length || 0));
    
    for (const quote of sortedQuotes) {
      const speaker = quote.author || quote.speaker || 'Unknown';
      if (!seenSpeakers.has(speaker) && diverseQuotes.length < count) {
        seenSpeakers.add(speaker);
        diverseQuotes.push(quote);
      } else {
        remainingQuotes.push(quote);
      }
    }
    
    // Second pass: fill remaining slots if needed
    while (diverseQuotes.length < count && remainingQuotes.length > 0) {
      diverseQuotes.push(remainingQuotes.shift()!);
    }
    
    return diverseQuotes;
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden transition-all duration-300">
      <div className="p-6">
        {/* Card Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className={`${bgClass} p-2 rounded-lg mr-3`}>
              <AttributeIcon className={`w-5 h-5 ${iconClass}`} />
            </div>
            <h3 className={`${titleClass} text-sm font-bold uppercase tracking-wide`}>
              {attributeTitle}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            {hasValidation && validation && (
              <>
                {/* removed boxed badges—replaced by plain-text in the toggle button */}
              </>
            )}
            <button
              onClick={toggleExpanded}
              className="flex items-center space-x-2 text-sm font-medium p-1 hover:bg-gray-100 rounded transition-colors"
            >
              {showNoData ? (
                // Show only "No Data" in grey for no data state
                <span className="text-gray-500">
                  No Data
                </span>
              ) : (
                // Show only outcome label for validated states
                <>
                  <span style={{ color: labelColors.primary }}>
                    {label}
                  </span>
                </>
              )}
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
        </div>

        {/* Assumption Text */}
        <div className="text-sm text-gray-800 leading-relaxed">
          {showNoData ? 'No Data' : subtitle || reality}
        </div>
        {showLowConfidenceWarning && hasInterviewData && (
          <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
            Not enough data to validate this assumption.
          </div>
        )}
      </div>

      {/* Expanded Panel */}
      {isExpanded && validation && !showNoData && (
        <div className="border-t border-gray-200 bg-gradient-to-b from-gray-50/30 to-white">
          <div className="p-6 space-y-6">
            
            {/* Hero Insight Section */}
            {reality && (
              <div className="relative">
                <div 
                  className="rounded-xl p-6 border-l-4 shadow-lg"
                  style={{ 
                    backgroundColor: labelColors.bg, 
                    borderColor: labelColors.primary,
                    border: `1px solid ${labelColors.border}`
                  }}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Target className="w-6 h-6" style={{ color: labelColors.primary }} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        {React.createElement(getOutcomeIcon(validation.outcome), { className: "w-5 h-5", style: { color: labelColors.primary } })}
                        <span className="font-bold text-lg" style={{ color: labelColors.primary }}>
                          {label}
                        </span>
                      </div>
                      <h5 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                        Key Finding
                      </h5>
                      <p className="text-base text-gray-900 leading-relaxed font-medium">
                        {reality}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Deck Evidence Section */}
            {validation.evidenceFromDeck && (
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wide">
                    Evidence from Sales Deck
                  </h4>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    Deck Analysis
                  </span>
                </div>
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h5 className="text-sm font-semibold text-blue-800 mb-2">
                        Supporting Evidence from Deck
                      </h5>
                      <div className="text-sm text-blue-900 leading-relaxed">
                        {validation.evidenceFromDeck}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Supporting Quotes */}
            {validation.quotes && validation.quotes.length > 0 && (
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-gray-600" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wide">
                    Supporting Evidence
                  </h4>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {validation.quotes.length} quote{validation.quotes.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-4">
                  {(showAllQuotes ? validation.quotes : getDiverseQuotes(validation.quotes, 2)).map((quote, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm font-medium text-gray-800">
                          {quote.speaker || quote.author || 'Unknown Speaker'}
                        </div>
                        {quote.relevanceScore && (
                          <div className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                            {quote.relevanceScore.toFixed(1)} relevance
                          </div>
                        )}
                      </div>
                      {quote.role && (
                        <div className="text-xs text-gray-600 mb-1">{quote.role}</div>
                      )}
                      <div className="text-sm text-gray-700 italic">"{quote.text}"</div>
                    </div>
                  ))}
                </div>
                {validation.quotes.length > 2 && (
                  <button
                    className="mt-2 text-xs text-blue-600 hover:underline"
                    onClick={toggleShowAllQuotes}
                  >
                    {showAllQuotes
                      ? 'Show fewer quotes'
                      : `View ${validation.quotes.length - 2} more quote${validation.quotes.length - 2 !== 1 ? 's' : ''}`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailedValidationCard; 