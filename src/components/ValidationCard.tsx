'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronDown, MessageSquare, Quote, Plus, BarChart3 } from 'lucide-react';
import { getOutcomeIcon, getOutcomeColors, getRoleStyle } from './cardHelpers';
import { ValidationDataObject } from '../types/buyermap';
import ConfidenceBreakdown from './ConfidenceBreakdown';

const getSectionInfo = (icpAttribute: string = '') => {
  const attribute = icpAttribute?.toLowerCase() || '';
  if (attribute.includes('buyer') || attribute.includes('title') || attribute.includes('decision maker')) {
    return {
      section: 'WHO',
      category: 'Buyer Titles',
      icon: MessageSquare,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      titleColor: 'text-blue-800'
    };
  }
  if (attribute.includes('company') || attribute.includes('size') || attribute.includes('firm')) {
    return {
      section: 'WHO',
      category: 'Company Size', 
      icon: MessageSquare,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
      titleColor: 'text-purple-800'
    };
  }
  if (attribute.includes('pain') || attribute.includes('problem') || attribute.includes('challenge')) {
    return {
      section: 'WHAT',
      category: 'Pain Points',
      icon: MessageSquare,
      iconColor: 'text-red-600', 
      iconBg: 'bg-red-100',
      titleColor: 'text-red-800'
    };
  }
  if (attribute.includes('desired') || attribute.includes('outcome') || attribute.includes('goal')) {
    return {
      section: 'WHAT',
      category: 'Desired Outcomes',
      icon: MessageSquare,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100', 
      titleColor: 'text-green-800'
    };
  }
  if (attribute.includes('trigger') || attribute.includes('timing') || attribute.includes('when')) {
    return {
      section: 'WHEN',
      category: 'Triggers',
      icon: MessageSquare,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-100',
      titleColor: 'text-orange-800'
    };
  }
  if (attribute.includes('barrier') || attribute.includes('objection') || attribute.includes('concern')) {
    return {
      section: 'WHY',
      category: 'Barriers',
      icon: MessageSquare,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-100',
      titleColor: 'text-indigo-800'
    };
  }
  if (attribute.includes('messaging') || attribute.includes('communication') || attribute.includes('emphasis')) {
    return {
      section: 'WHY',
      category: 'Messaging Emphasis',
      icon: MessageSquare,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-100',
      titleColor: 'text-teal-800'
    };
  }
  // Default fallback
  return {
    section: 'OTHER',
    category: icpAttribute || 'Unknown',
    icon: MessageSquare,
    iconColor: 'text-gray-600',
    iconBg: 'bg-gray-100',
    titleColor: 'text-gray-800'
  };
};

const getBestGuessLabel = (outcome: string, quotes: any[]): 'Validated' | 'Contradicted' | 'Gap Identified' | 'No Data' => {
  if (!quotes || quotes.length === 0) return 'No Data';
  switch (outcome) {
    case 'Validated':
      return 'Validated';
    case 'Contradicted':
      return 'Contradicted';
    case 'Gap Identified':
      return 'Gap Identified';
    default:
      return 'Validated'; // fallback to Validated if outcome is unclear but there is data
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
    case 'No Data':
    default:
      return { primary: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', border: 'rgba(107, 114, 128, 0.3)' };
  }
};

const ValidationCard: React.FC<React.PropsWithChildren<{ data: ValidationDataObject; initialExpanded?: boolean } & React.HTMLAttributes<HTMLDivElement>>> = ({ data, initialExpanded = false, ...rest }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [progress, setProgress] = useState(0);
  const [showAllQuotes, setShowAllQuotes] = useState(false);

  // 🚨 EMERGENCY DEBUG: Log what data we're receiving
  console.log('🚨 VALIDATION CARD DEBUG:', {
    data: data,
    comparisonOutcome: data.comparisonOutcome,
    outcome: data.outcome,
    icpAttribute: data.icpAttribute,
    confidenceScore: data.confidenceScore
  });

  const sectionInfo = useMemo(() => getSectionInfo(data.icpAttribute), [data.icpAttribute]);
  const IconComponent = sectionInfo.icon;
  const outcomeColors = useMemo(() => getOutcomeColors(data.outcome || data.comparisonOutcome), [data.outcome, data.comparisonOutcome]);
  const OutcomeIcon = useMemo(() => getOutcomeIcon(data.outcome || data.comparisonOutcome), [data.outcome, data.comparisonOutcome]);

  const progressBarStyle = useMemo(() => ({
    width: `${progress}%`,
    background: `linear-gradient(90deg, ${outcomeColors.primary}dd, ${outcomeColors.primary})`,
    transition: 'all 1s ease-out'
  }), [progress, outcomeColors.primary]);

  const containerStyle = useMemo(() => ({
    backgroundColor: outcomeColors.bg,
    borderColor: outcomeColors.border,
    borderLeftColor: outcomeColors.primary
  }), [outcomeColors]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const toggleShowAllQuotes = useCallback(() => {
    setShowAllQuotes(prev => !prev);
  }, []);

  useEffect(() => {
    if (isExpanded) {
      setProgress(0);
      setTimeout(() => setProgress(data.confidenceScore), 100);
    } else {
      setProgress(0);
    }
  }, [isExpanded, data.confidenceScore]);

  const label = getBestGuessLabel(data.outcome || data.comparisonOutcome, data.quotes);
  const labelColors = getLabelColor(label);
  const showNoData = (!data.quotes || data.quotes.length === 0) && !data.evidenceFromDeck && !data.reality;
  const showLowConfidenceWarning = !showNoData && (data.confidenceScore < 40);

  return (
    <div className="bg-white/80 rounded-xl border border-gray-200/50 shadow-lg overflow-hidden transition-all duration-300" {...rest}>
      <div className="p-6">
        {/* Card Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className={`${sectionInfo.iconBg} p-2 rounded-lg mr-3`}>
              <IconComponent className={`w-5 h-5 ${sectionInfo.iconColor}`} />
            </div>
            <h3 className={`${sectionInfo.titleColor} text-sm font-bold uppercase tracking-wide`}>
              {sectionInfo.category}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="flex items-center justify-center" style={{ color: labelColors.primary }}>
              <OutcomeIcon className="w-4 h-4 mr-1" />
            </span>
            {!showNoData && (
              <span
                className="text-xs font-semibold px-2 py-1 rounded"
                style={{ color: '#6b7280', background: 'rgba(107, 114, 128, 0.1)', border: '1px solid rgba(107, 114, 128, 0.3)' }}
              >
                {data.confidenceScore}%
              </span>
            )}
            <span
              className="text-xs font-bold px-2 py-1 rounded"
              style={{ color: labelColors.primary, background: labelColors.bg, border: `1px solid ${labelColors.border}` }}
            >
              {label}
            </span>
            <button 
              onClick={toggleExpanded}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-800 leading-relaxed">
          {showNoData ? 'No Data' : data.assumption}
        </div>
        {showLowConfidenceWarning && (
          <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
            Low confidence: Not enough interview data to validate this assumption.
          </div>
        )}
        {isExpanded && !showNoData && (
          <div 
            className="mt-6 pt-6 border-t border-gray-200 transition-all duration-500"
            style={{ background: 'linear-gradient(to bottom, rgba(249, 250, 251, 0.3), white)' }}
          >
            <div className="space-y-6">
              {/* Key Finding */}
              {data.reality && (
                <div className="relative mb-6">
                  <div 
                    className="rounded-xl p-6 border-l-4"
                    style={{ backgroundColor: labelColors.bg, borderColor: labelColors.primary, border: `1px solid ${labelColors.border}` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          {React.createElement(OutcomeIcon, {
                            className: "w-6 h-6",
                            style: { color: labelColors.primary }
                          })}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span 
                            className="font-bold text-lg"
                            style={{ color: labelColors.primary }}
                          >
                            {label}
                          </span>
                          <span className="text-sm font-semibold text-gray-600">
                            {data.confidenceScore}% confidence
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Key Finding
                        </div>
                        <div className="text-base text-gray-900 leading-relaxed font-medium">
                          {data.reality?.replace(/^(GAP IDENTIFIED:|VALIDATED:|CONTRADICTED:|INSUFFICIENT DATA:|ALIGNED:|MISALIGNED:|CHALLENGED:|NEW DATA ADDED:|REFINED:)\s*/i, '')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Deck Evidence Section */}
              {data.evidenceFromDeck && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
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
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h5 className="text-sm font-semibold text-blue-800 mb-2">
                          Supporting Evidence from Deck
                        </h5>
                        <div className="text-sm text-blue-900 leading-relaxed">
                          {data.evidenceFromDeck}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Supporting Quotes */}
              {data.quotes && data.quotes.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-gray-600" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wide">
                      Supporting Evidence
                    </h4>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {data.quotes.length} quote{data.quotes.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {/* Evidence Quality Indicator */}
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-xs font-medium text-blue-800">Evidence Quality</span>
                    </div>
                    <div className="text-xs text-blue-700">
                      {data.quotes.length >= 4 ? 'Strong validation' : 
                       data.quotes.length >= 2 ? 'Moderate validation' : 
                       'Limited validation'} • {new Set(data.quotes.map(q => q.speaker || q.author)).size} unique speakers
                      {data.quotes.some(q => q.relevanceScore) && (
                        <span className="ml-2 text-blue-600">
                          • Relevance-filtered
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {(showAllQuotes ? data.quotes : data.quotes.slice(0, 2)).map((quote, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="text-gray-700 text-sm mb-3">"{quote.text}"</div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{quote.speaker || quote.author || 'Unknown'}</span>
                            {quote.role && (
                              <span className="px-2 py-1 bg-gray-200 rounded-full text-xs">
                                {quote.role}
                              </span>
                            )}
                            {/* Relevance Score Indicator */}
                            {quote.relevanceScore && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                quote.relevanceScore >= 2.5 ? 'bg-green-100 text-green-700' :
                                quote.relevanceScore >= 1.5 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {quote.relevanceScore.toFixed(1)} relevance
                              </span>
                            )}
                          </div>
                          {quote.companySnapshot && (
                            <span className="text-gray-400 italic">
                              {quote.companySnapshot}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {data.quotes.length > 2 && (
                    <button
                      className="mt-2 text-xs text-blue-600 hover:underline"
                      onClick={toggleShowAllQuotes}
                    >
                      {showAllQuotes
                        ? 'Show fewer quotes'
                        : `View ${data.quotes.length - 2} more quote${data.quotes.length - 2 !== 1 ? 's' : ''}`}
                    </button>
                  )}
                </div>
              )}
              {/* Confidence Analysis */}
              {data.confidenceBreakdown ? (
                <ConfidenceBreakdown 
                  breakdown={data.confidenceBreakdown} 
                  comparisonOutcome={data.comparisonOutcome}
                />
              ) : data.confidenceExplanation && (
                <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-gray-400" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wide">
                      Confidence Analysis
                    </h4>
                  </div>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div 
                        className="h-3 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #9ca3afdd, #9ca3af)' }}
                      />
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {data.confidenceScore}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {data.confidenceExplanation}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ValidationCard); 