import React from 'react';
import { BarChart3, Database, Users, Target, Info } from 'lucide-react';
import { ConfidenceBreakdown as ConfidenceBreakdownType } from '../types/buyermap';

interface ConfidenceBreakdownProps {
  breakdown: ConfidenceBreakdownType;
  comparisonOutcome: string;
}

const ConfidenceBreakdown: React.FC<ConfidenceBreakdownProps> = ({ breakdown, comparisonOutcome }) => {
  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-blue-600 bg-blue-100';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-blue-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const confidenceMetrics = [
    {
      icon: Target,
      label: 'Gap Analysis',
      score: breakdown.alignment,
      description: `Confidence that the ${comparisonOutcome.toLowerCase()} assessment is accurate`,
      key: 'alignment'
    },
    {
      icon: Database,
      label: 'Data Quality',
      score: breakdown.dataQuality,
      description: 'Accuracy of assumptions extracted from your deck',
      key: 'dataQuality'
    },
    {
      icon: Users,
      label: 'Sample Size',
      score: breakdown.sampleSize,
      description: 'Statistical validity based on number of interviews',
      key: 'sampleSize'
    }
  ];

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <BarChart3 className="w-5 h-5 text-blue-600" />
        </div>
        <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wide">
          Confidence Analysis
        </h4>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-2xl font-bold text-gray-900">
            {breakdown.overall}%
          </span>
          <span className="text-sm text-gray-500">overall</span>
        </div>
      </div>

      {/* Overall confidence bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Confidence</span>
          <span className={`text-sm font-semibold px-2 py-1 rounded ${getConfidenceColor(breakdown.overall)}`}>
            {breakdown.overall}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-1000 ease-out ${getProgressBarColor(breakdown.overall)}`}
            style={{ width: `${breakdown.overall}%` }}
          />
        </div>
      </div>

      {/* Detailed breakdown */}
      <div className="space-y-4 mb-4">
        {confidenceMetrics.map((metric) => {
          const IconComponent = metric.icon;
          return (
            <div key={metric.key} className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <IconComponent className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${getConfidenceColor(metric.score)}`}>
                    {metric.score}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-1000 ease-out ${getProgressBarColor(metric.score)}`}
                    style={{ width: `${metric.score}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Explanation */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-600 leading-relaxed">
            {breakdown.explanation}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfidenceBreakdown; 