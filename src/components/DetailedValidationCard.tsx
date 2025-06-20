import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Target, BarChart3, MessageSquare, Quote, Plus, CheckCircle, XCircle, Info, ChartBar } from 'lucide-react';
import { getOutcomeColors, getOutcomeIcon, getRoleStyle } from '../utils/validationHelpers';
import { getAttributeIconAndColors } from '../utils/attributeStyles';

interface Quote {
  text: string;
  author: string;
  speaker?: string;
  role?: string;
}

interface ValidationData {
  outcome: 'Aligned' | 'Misaligned' | 'Challenged' | 'New Data Added' | 'Refined' | 'Pending Validation';
  confidence: number;
  confidence_explanation: string;
  reality: string;
  quotes: Quote[];
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
}

const DetailedValidationCard: React.FC<DetailedValidationCardProps> = ({
  id,
  attributeTitle,
  subtitle,
  hasValidation = false,
  validation,
  isExpanded,
  onToggleExpand
}) => {
  const [showAllQuotes, setShowAllQuotes] = useState(false);
  const colors = validation ? getOutcomeColors(validation.outcome) : getOutcomeColors('New Data Added');
  const OutcomeIcon = validation ? getOutcomeIcon(validation.outcome) : getOutcomeIcon('New Data Added');
  
  // Pull in the dynamic icon + colors:
  const { Icon: AttributeIcon, bgClass, iconClass, titleClass } =
    getAttributeIconAndColors(attributeTitle);

  // Extract values for the button
  const outcomeColors = colors;
  const confidence = validation?.confidence || 0;
  const outcome = validation?.outcome || 'New Data Added';

  const toggleExpanded = useCallback(() => {
    onToggleExpand(id);
  }, [id, onToggleExpand]);

  const toggleShowAllQuotes = useCallback(() => {
    setShowAllQuotes(prev => !prev);
  }, []);

  return (
    <div className="bg-white/80 rounded-xl border border-gray-200/50 shadow-lg overflow-hidden transition-all duration-300">
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
              {outcome === 'Pending Validation' ? (
                // Show only "Pending Validation" in grey for pending state
                <span className="text-gray-500">
                  Pending Validation
                </span>
              ) : (
                // Show confidence % and outcome for validated states
                <>
                  <span style={{ color: outcomeColors.primary }}>
                    {confidence}%
                  </span>
                  <span className="text-gray-400">•</span>
                  <span style={{ color: outcomeColors.primary }}>
                    {outcome}
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
          {subtitle}
        </div>
      </div>

      {/* Expanded Panel */}
      {isExpanded && validation && (
        <div className="border-t border-gray-200/50 bg-gradient-to-b from-gray-50/30 to-white">
          <div className="p-6 space-y-6">
            
            {/* Hero Insight Section */}
            <div className="relative">
              <div 
                className="rounded-xl p-6 border-l-4 shadow-lg"
                style={{ 
                  backgroundColor: colors.bg, 
                  borderColor: colors.primary,
                  border: `1px solid ${colors.border}`
                }}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Target className="w-6 h-6" style={{ color: colors.primary }} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      {React.createElement(getOutcomeIcon(validation.outcome), { className: "w-5 h-5", style: { color: colors.primary } })}
                      <span className="font-bold text-lg" style={{ color: colors.primary }}>
                        {validation.outcome}
                      </span>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm font-semibold text-gray-700">
                        {validation.confidence}% confidence
                      </span>
                    </div>
                    <h5 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                      Key Finding
                    </h5>
                    <p className="text-base text-gray-900 leading-relaxed font-medium">
                      {validation.reality}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Confidence Analysis */}
            <div className="bg-white rounded-xl p-5 border border-blue-200/50 shadow-sm">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <h5 className="text-sm font-bold text-blue-800 uppercase tracking-wide">
                  Confidence Analysis
                </h5>
              </div>
              <div className="flex items-center space-x-4 mb-3">
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${validation.confidence}%`,
                      background: `linear-gradient(90deg, ${colors.primary}dd, ${colors.primary})`
                    }}
                  />
                </div>
                <span className="text-lg font-bold text-gray-900">
                  {validation.confidence}%
                </span>
              </div>
              <p className="text-sm text-blue-900 leading-relaxed">
                {validation.confidence_explanation}
              </p>
            </div>

            {/* Supporting Evidence */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-gray-600" />
                </div>
                <h5 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                  Supporting Evidence
                </h5>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {validation.quotes.length} interviews
                </span>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {validation.quotes.slice(0, 2).map((quote, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-xl p-5 border border-gray-200/50 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start space-x-3">
                      <Quote className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <blockquote className="text-gray-800 font-medium text-sm leading-relaxed mb-3 italic">
                          "{quote.text}"
                        </blockquote>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-600 font-medium">
                            — {quote.author}
                          </div>
                          {quote.role && (
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium ${getRoleStyle(quote.role)}`}
                            >
                              {quote.role}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {validation.quotes.length > 2 && (
                <div>
                  <button
                    className="text-blue-600 hover:text-blue-800 text-sm font-semibold transition-colors flex items-center space-x-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200"
                  >
                    <Plus className="w-4 h-4" />
                    <span>View {validation.quotes.length - 2} more quotes</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailedValidationCard; 