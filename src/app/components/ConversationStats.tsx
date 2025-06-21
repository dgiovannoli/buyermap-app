import React from 'react';

interface ConversationStatsProps {
  stats: {
    totalQuotes: number;
    uniqueConversations: number;
    uniqueSpeakers: number;
    conversationCoverage: string;
    speakerDiversity: string;
  };
  className?: string;
}

export default function ConversationStats({ stats, className = '' }: ConversationStatsProps) {
  // Determine coverage strength for styling
  const getCoverageStrength = (conversations: number) => {
    if (conversations >= 4) return 'strong';
    if (conversations >= 2) return 'moderate';
    return 'limited';
  };

  const coverageStrength = getCoverageStrength(stats.uniqueConversations);
  
  // Color coding based on statistical validity
  const getCoverageColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'text-green-700 bg-green-50 border-green-200';
      case 'moderate': return 'text-amber-700 bg-amber-50 border-amber-200';
      default: return 'text-orange-700 bg-orange-50 border-orange-200';
    }
  };

  const getSpeakerColor = (speakerCount: number, quoteCount: number) => {
    const diversity = speakerCount / Math.max(quoteCount, 1);
    if (diversity >= 0.8) return 'text-green-600';
    if (diversity >= 0.5) return 'text-amber-600';
    return 'text-orange-600';
  };

  const coverageColor = getCoverageColor(coverageStrength);
  const speakerColor = getSpeakerColor(stats.uniqueSpeakers, stats.totalQuotes);

  return (
    <div className={`border rounded-lg p-3 ${coverageColor} ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm">Statistical Validity</h4>
        <span className="text-xs px-2 py-1 rounded-full bg-white/60">
          {coverageStrength.toUpperCase()} COVERAGE
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="font-semibold text-lg">
            {stats.uniqueConversations}
          </div>
          <div className="text-xs opacity-75">
            {stats.uniqueConversations === 1 ? 'Conversation' : 'Conversations'}
          </div>
        </div>
        
        <div>
          <div className={`font-semibold text-lg ${speakerColor}`}>
            {stats.uniqueSpeakers}
          </div>
          <div className="text-xs opacity-75">
            {stats.uniqueSpeakers === 1 ? 'Speaker' : 'Speakers'}
          </div>
        </div>
      </div>
      
      <div className="mt-2 pt-2 border-t border-current/20">
        <div className="text-xs">
          <div className="flex justify-between">
            <span>Total quotes:</span>
            <span className="font-medium">{stats.totalQuotes}</span>
          </div>
          <div className="mt-1 text-xs opacity-75">
            {stats.uniqueConversations > 1 
              ? `Evidence from ${stats.uniqueConversations} independent sources`
              : 'Single-source evidence - interpret with caution'
            }
          </div>
        </div>
      </div>
    </div>
  );
} 