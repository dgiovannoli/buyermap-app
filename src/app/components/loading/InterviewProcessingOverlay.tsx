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
    <div className="fixed inset-0 top-0 left-0 h-screen bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-blue-900/90 via-purple-900/90 to-indigo-900/90 backdrop-blur-xl rounded-lg shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-white/20">
        <div className="p-6">
          <ProcessVisualization
            phase="interview"
            progress={progress}
            stats={stats}
            onComplete={onComplete}
          />
          
          {/* Assumptions Being Processed */}
          {assumptions.length > 0 && (
            <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
              <h4 className="font-semibold text-white mb-3">
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
                      className={`p-2 rounded text-sm border backdrop-blur-sm ${
                        isCurrentlyProcessing
                          ? 'bg-blue-500/30 border-blue-400/50 text-blue-200'
                          : isCompleted
                          ? 'bg-green-500/30 border-green-400/50 text-green-200'
                          : 'bg-white/10 border-white/20 text-white/70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex-1">
                          {assumption.length > 60 ? assumption.substring(0, 57) + '...' : assumption}
                        </span>
                        <div className="flex-shrink-0 ml-2">
                          {isCurrentlyProcessing && (
                            <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          )}
                          {isCompleted && !isCurrentlyProcessing && (
                            <div className="w-3 h-3 bg-green-400 rounded-full" />
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
            <div className="mt-4 p-3 bg-blue-500/20 backdrop-blur-sm rounded-lg border border-blue-400/30">
              <div className="text-sm text-blue-200">
                <strong className="text-blue-100">Discovery in Progress:</strong> Found {stats.quotesFound} relevant quotes 
                {stats.uniqueSpeakers && ` from ${stats.uniqueSpeakers} different customers`}
                {stats.statisticalValidity && (
                  <span className={`ml-2 font-medium ${
                    stats.statisticalValidity === 'strong' ? 'text-green-400' :
                    stats.statisticalValidity === 'moderate' ? 'text-yellow-400' :
                    'text-red-400'
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