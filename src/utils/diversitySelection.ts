import { Quote } from '../types/buyermap';
import { ScoredQuote, SpeakerRole, DiversityMetrics, classifySpeakerRole } from './quoteScoring';

/**
 * Select optimal quotes with strict speaker diversity (max 1 per speaker)
 * Picks the best quote per speaker, then sorts all by score
 */
export function selectOptimalQuotes(
  scoredQuotes: ScoredQuote[], 
  maxQuotes: number = 5
): Quote[] {
  if (scoredQuotes.length === 0) return [];

  // 1. Group by speaker
  const quotesBySpeaker: Record<string, ScoredQuote[]> = {};
  for (const sq of scoredQuotes) {
    const speakerKey = sq.quote.speaker || 'Unknown';
    if (!quotesBySpeaker[speakerKey]) quotesBySpeaker[speakerKey] = [];
    quotesBySpeaker[speakerKey].push(sq);
  }

  // 2. Pick the best quote per speaker
  const bestPerSpeaker: ScoredQuote[] = Object.values(quotesBySpeaker).map(
    (quotes) => quotes.sort((a, b) => b.score.overallScore - a.score.overallScore)[0]
  );

  // 3. Sort all best quotes by score
  const sortedBest = bestPerSpeaker.sort((a, b) => b.score.overallScore - a.score.overallScore);

  // 4. Limit to maxQuotes
  return sortedBest.slice(0, maxQuotes).map(sq => sq.quote);
}

/**
 * Group quotes by speaker/interview source
 */
export function groupBySpeaker(scoredQuotes: ScoredQuote[]): Map<string, ScoredQuote[]> {
  const groups = new Map<string, ScoredQuote[]>();
  
  scoredQuotes.forEach(scoredQuote => {
    // Use speaker name + source as unique identifier
    const speakerKey = `${scoredQuote.quote.speaker || 'Unknown'}-${scoredQuote.quote.source || 'Unknown'}`;
    
    if (!groups.has(speakerKey)) {
      groups.set(speakerKey, []);
    }
    groups.get(speakerKey)!.push(scoredQuote);
  });
  
  return groups;
}

/**
 * Select quotes with speaker diversity constraint
 * Max 2 quotes per speaker/interview
 */
export function selectWithSpeakerDiversity(
  sortedQuotes: ScoredQuote[],
  speakerGroups: Map<string, ScoredQuote[]>,
  maxQuotes: number
): Quote[] {
  const selectedQuotes: Quote[] = [];
  const speakerQuotesUsed = new Map<string, number>(); // Track quotes used per speaker
  
  // First pass: Select top quotes while respecting diversity
  for (const scoredQuote of sortedQuotes) {
    if (selectedQuotes.length >= maxQuotes) break;
    
    const speakerKey = `${scoredQuote.quote.speaker || 'Unknown'}-${scoredQuote.quote.source || 'Unknown'}`;
    const currentCount = speakerQuotesUsed.get(speakerKey) || 0;
    
    // Allow max 2 quotes per speaker
    if (currentCount < 2) {
      selectedQuotes.push(scoredQuote.quote);
      speakerQuotesUsed.set(speakerKey, currentCount + 1);
    }
  }
  
  // Second pass: If we haven't filled quota, add more quotes from different speakers
  if (selectedQuotes.length < maxQuotes) {
    for (const scoredQuote of sortedQuotes) {
      if (selectedQuotes.length >= maxQuotes) break;
      
      const speakerKey = `${scoredQuote.quote.speaker || 'Unknown'}-${scoredQuote.quote.source || 'Unknown'}`;
      const currentCount = speakerQuotesUsed.get(speakerKey) || 0;
      
      // Allow up to 3 quotes per speaker if we need to fill quota
      if (currentCount < 3) {
        // Check if this quote is already selected
        const alreadySelected = selectedQuotes.some(q => q.id === scoredQuote.quote.id);
        if (!alreadySelected) {
          selectedQuotes.push(scoredQuote.quote);
          speakerQuotesUsed.set(speakerKey, currentCount + 1);
        }
      }
    }
  }
  
  return selectedQuotes;
}

/**
 * Calculate diversity metrics for selected quotes
 */
export function calculateDiversityMetrics(selectedQuotes: Quote[]): DiversityMetrics {
  if (selectedQuotes.length === 0) {
    return {
      uniqueSpeakers: 0,
      speakerRoles: [],
      quoteVariety: 'low',
      diversityScore: 0
    };
  }
  
  // Count unique speakers
  const uniqueSpeakers = new Set(
    selectedQuotes.map(q => `${q.speaker || 'Unknown'}-${q.source || 'Unknown'}`)
  ).size;
  
  // Get speaker roles
  const speakerRoles = selectedQuotes.map(q => {
    return classifySpeakerRole(q.speaker || '', q.role || '');
  });
  
  // Calculate quote variety based on length diversity
  const lengths = selectedQuotes.map(q => q.text.length);
  const lengthVariance = calculateVariance(lengths);
  let quoteVariety: 'high' | 'medium' | 'low';
  
  if (lengthVariance > 10000) quoteVariety = 'high';
  else if (lengthVariance > 5000) quoteVariety = 'medium';
  else quoteVariety = 'low';
  
  // Calculate overall diversity score
  const speakerDiversity = Math.min(100, (uniqueSpeakers / selectedQuotes.length) * 100);
  const roleDiversity = Math.min(100, (new Set(speakerRoles).size / 3) * 100); // 3 possible roles
  const varietyScore = quoteVariety === 'high' ? 100 : quoteVariety === 'medium' ? 70 : 40;
  
  const diversityScore = Math.round((speakerDiversity * 0.5) + (roleDiversity * 0.3) + (varietyScore * 0.2));
  
  return {
    uniqueSpeakers,
    speakerRoles: Array.from(new Set(speakerRoles)),
    quoteVariety,
    diversityScore
  };
}

/**
 * Calculate variance of an array of numbers
 */
function calculateVariance(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  
  const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  const squaredDifferences = numbers.map(num => Math.pow(num - mean, 2));
  const variance = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  
  return variance;
}

/**
 * Get diversity summary for debugging
 */
export function getDiversitySummary(selectedQuotes: Quote[]): {
  totalQuotes: number;
  uniqueSpeakers: number;
  speakerBreakdown: Record<string, number>;
  roleBreakdown: Record<SpeakerRole, number>;
  diversityMetrics: DiversityMetrics;
} {
  const diversityMetrics = calculateDiversityMetrics(selectedQuotes);
  
  // Speaker breakdown
  const speakerBreakdown: Record<string, number> = {};
  selectedQuotes.forEach(quote => {
    const speakerKey = `${quote.speaker || 'Unknown'}-${quote.source || 'Unknown'}`;
    speakerBreakdown[speakerKey] = (speakerBreakdown[speakerKey] || 0) + 1;
  });
  
  // Role breakdown
  const roleBreakdown: Record<SpeakerRole, number> = {
    [SpeakerRole.DECISION_MAKER]: 0,
    [SpeakerRole.INFLUENCER]: 0,
    [SpeakerRole.END_USER]: 0
  };
  
  selectedQuotes.forEach(quote => {
    const role: SpeakerRole = classifySpeakerRole(quote.speaker || '', quote.role || '');
    roleBreakdown[role]++;
  });
  
  return {
    totalQuotes: selectedQuotes.length,
    uniqueSpeakers: diversityMetrics.uniqueSpeakers,
    speakerBreakdown,
    roleBreakdown,
    diversityMetrics
  };
}

/**
 * Validate quote selection quality
 */
export function validateQuoteSelection(
  originalQuotes: ScoredQuote[],
  selectedQuotes: Quote[]
): {
  qualityMaintained: boolean;
  diversityAchieved: boolean;
  recommendations: string[];
} {
  const recommendations: string[] = [];
  
  // Check if we maintained quality
  const originalTopScores = originalQuotes
    .sort((a, b) => b.score.overallScore - a.score.overallScore)
    .slice(0, selectedQuotes.length)
    .map(sq => sq.score.overallScore);
  
  const selectedScores = selectedQuotes.map(quote => {
    const original = originalQuotes.find(sq => sq.quote.id === quote.id);
    return original?.score.overallScore || 0;
  });
  
  const qualityMaintained = selectedScores.every((score, index) => 
    score >= originalTopScores[index] * 0.8 // Allow 20% quality drop for diversity
  );
  
  // Check diversity
  const diversityMetrics = calculateDiversityMetrics(selectedQuotes);
  const diversityAchieved = diversityMetrics.diversityScore >= 70;
  
  // Generate recommendations
  if (!qualityMaintained) {
    recommendations.push('Consider relaxing diversity constraints to maintain quote quality');
  }
  
  if (!diversityAchieved) {
    recommendations.push('Consider increasing speaker diversity in quote selection');
  }
  
  if (selectedQuotes.length < originalQuotes.length * 0.5) {
    recommendations.push('Quote selection may be too restrictive - consider increasing max quotes');
  }
  
  return {
    qualityMaintained,
    diversityAchieved,
    recommendations
  };
} 