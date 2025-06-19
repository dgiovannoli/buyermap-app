import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronDown, MessageSquare, Quote, Plus, BarChart3 } from 'lucide-react';
import { getOutcomeIcon, getOutcomeColors, getRoleStyle } from './cardHelpers';
import { ValidationDataObject } from '../types/buyermap';

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

const ValidationCard: React.FC<React.PropsWithChildren<{ data: ValidationDataObject } & React.HTMLAttributes<HTMLDivElement>>> = ({ data, ...rest }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showAllQuotes, setShowAllQuotes] = useState(false);

  const sectionInfo = useMemo(() => getSectionInfo(data.icpAttribute), [data.icpAttribute]);
  const IconComponent = sectionInfo.icon;
  const outcomeColors = useMemo(() => getOutcomeColors(data.comparisonOutcome), [data.comparisonOutcome]);
  const OutcomeIcon = useMemo(() => getOutcomeIcon(data.comparisonOutcome), [data.comparisonOutcome]);

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
            <span className="flex items-center justify-center" style={{ color: outcomeColors.primary }}>
              <OutcomeIcon className="w-4 h-4 mr-1" />
            </span>
            <span
              className="text-xs font-semibold px-2 py-1 rounded"
              style={{ color: outcomeColors.primary, background: outcomeColors.bg, border: `1px solid ${outcomeColors.border}` }}
            >
              {data.confidenceScore}%
            </span>
            <span
              className="text-xs font-bold px-2 py-1 rounded"
              style={{ color: outcomeColors.primary, background: outcomeColors.bg, border: `1px solid ${outcomeColors.border}` }}
            >
              {data.comparisonOutcome}
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
          {data.assumption}
        </div>
        {isExpanded && (
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
                    style={containerStyle}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          {React.createElement(OutcomeIcon, {
                            className: "w-6 h-6",
                            style: { color: outcomeColors.primary }
                          })}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span 
                            className="font-bold text-lg"
                            style={{ color: outcomeColors.primary }}
                          >
                            {data.comparisonOutcome}
                          </span>
                          <span className="text-sm font-semibold text-gray-600">
                            {data.confidenceScore}% confidence
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Key Finding
                        </div>
                        <div className="text-base text-gray-900 leading-relaxed font-medium">
                          {data.reality}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Messaging Recommendation */}
              {data.waysToAdjustMessaging && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">💡 Messaging Recommendation</h4>
                  <p className="text-sm text-blue-800">{data.waysToAdjustMessaging}</p>
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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    {(showAllQuotes ? data.quotes : data.quotes.slice(0, 2)).map((quote, index) => (
                      <div 
                        key={index} 
                        className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex items-start gap-3">
                          <Quote className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <blockquote className="text-gray-900 font-medium text-sm leading-relaxed mb-3 italic">
                              "{quote.text}"
                            </blockquote>
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-gray-600 font-medium">
                                {quote.author || 'Anonymous'}
                              </div>
                              {quote.role && (
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRoleStyle(quote.role)}`}>
                                  {quote.role}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {data.quotes.length > 2 && (
                    <button
                      onClick={toggleShowAllQuotes}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-600 text-sm font-semibold transition-colors duration-200"
                    >
                      <Plus className="w-4 h-4" />
                      {showAllQuotes 
                        ? 'Show less' 
                        : `View ${data.quotes.length - 2} more quote${data.quotes.length - 2 !== 1 ? 's' : ''}`
                      }
                    </button>
                  )}
                </div>
              )}
              {/* Confidence Analysis */}
              {data.confidenceExplanation && (
                <div className="bg-white rounded-xl p-5 border border-blue-200 shadow-sm mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                    <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wide">
                      Confidence Analysis
                    </h4>
                  </div>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div 
                        className="h-3 rounded-full transition-all duration-1000 ease-out"
                        style={progressBarStyle}
                      />
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {data.confidenceScore}%
                    </span>
                  </div>
                  <p className="text-sm text-blue-600 leading-relaxed">
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