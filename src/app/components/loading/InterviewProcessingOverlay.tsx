import React from 'react';
import ProcessVisualization from './ProcessVisualization';

interface InterviewProcessingOverlayProps {
  isVisible: boolean;
  progress: number;
  stats: {
    quotesFound?: number;
    conversationsProcessed?: number;
    totalConversations?: number;
    currentAssumption?: string;
    uniqueSpeakers?: number;
    statisticalValidity?: 'strong' | 'moderate' | 'limited';
  };
  assumptions: string[];
  onComplete?: () => void;
}

export default function InterviewProcessingOverlay({
  isVisible,
  progress,
  stats,
  assumptions,
  onComplete
}: InterviewProcessingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <ProcessVisualization
            phase="interview"
            progress={progress}
            stats={stats}
            onComplete={onComplete}
          />
          
          {/* Assumptions Being Processed */}
          {assumptions.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">
                Validating {assumptions.length} Assumptions
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {assumptions.map((assumption, index) => {
                  const isCurrentlyProcessing = stats.currentAssumption && 
                    assumption.includes(stats.currentAssumption.replace('...', ''));
                  const isCompleted = progress > ((index + 1) / assumptions.length) * 60; // Completed if past 60% of that assumption's processing
                  
                  return (
                    <div
                      key={index}
                      className={`p-2 rounded text-sm border ${
                        isCurrentlyProcessing
                          ? 'bg-blue-100 border-blue-300 text-blue-800'
                          : isCompleted
                          ? 'bg-green-100 border-green-300 text-green-800'
                          : 'bg-white border-gray-200 text-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex-1">
                          {assumption.length > 60 ? assumption.substring(0, 57) + '...' : assumption}
                        </span>
                        <div className="flex-shrink-0 ml-2">
                          {isCurrentlyProcessing && (
                            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          )}
                          {isCompleted && !isCurrentlyProcessing && (
                            <div className="w-3 h-3 bg-green-500 rounded-full" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Real-time Insights */}
          {stats.quotesFound && stats.quotesFound > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-800">
                <strong>Discovery in Progress:</strong> Found {stats.quotesFound} relevant quotes 
                {stats.uniqueSpeakers && ` from ${stats.uniqueSpeakers} different customers`}
                {stats.statisticalValidity && (
                  <span className={`ml-2 font-medium ${
                    stats.statisticalValidity === 'strong' ? 'text-green-600' :
                    stats.statisticalValidity === 'moderate' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    ({stats.statisticalValidity} statistical validity)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 