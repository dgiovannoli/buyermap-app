import { ConfidenceBreakdown } from '../types/buyermap';

/**
 * Generates a confidence breakdown for validation results
 * This addresses the issue where single confidence scores are ambiguous
 */
export function generateConfidenceBreakdown(
  comparisonOutcome: string,
  quotesCount: number,
  interviewCount: number,
  deckQuality: number = 85, // Default deck extraction quality
  hasRealInterviewData: boolean = true
): ConfidenceBreakdown {
  
  // 1. Data Quality Score (How well we extracted assumptions from deck)
  const dataQuality = deckQuality;
  
  // 2. Sample Size Score (Statistical validity based on interview count)
  const sampleSize = calculateSampleSizeConfidence(interviewCount, quotesCount, hasRealInterviewData);
  
  // 3. Alignment Assessment Score (How confident we are in the gap/alignment finding)
  const alignment = calculateAlignmentConfidence(comparisonOutcome, quotesCount, hasRealInterviewData);
  
  // 4. Overall Score (Weighted average)
  const overall = Math.round(
    (alignment * 0.5) +      // 50% weight on gap analysis accuracy
    (dataQuality * 0.3) +   // 30% weight on data extraction quality  
    (sampleSize * 0.2)      // 20% weight on sample size
  );
  
  // 5. Generate explanation
  const explanation = generateConfidenceExplanation(
    comparisonOutcome, 
    overall, 
    alignment, 
    dataQuality, 
    sampleSize, 
    quotesCount, 
    interviewCount,
    hasRealInterviewData
  );
  
  return {
    overall,
    dataQuality,
    sampleSize,
    alignment,
    explanation
  };
}

function calculateSampleSizeConfidence(
  interviewCount: number, 
  quotesCount: number, 
  hasRealData: boolean
): number {
  if (!hasRealData) return 0;
  
  // Base confidence on interview count
  let score = 0;
  if (interviewCount >= 10) score = 95;
  else if (interviewCount >= 6) score = 85;
  else if (interviewCount >= 3) score = 70;
  else if (interviewCount >= 1) score = 50;
  else score = 0;
  
  // Boost if we have multiple supporting quotes
  if (quotesCount >= 5) score = Math.min(95, score + 10);
  else if (quotesCount >= 3) score = Math.min(90, score + 5);
  
  return score;
}

function calculateAlignmentConfidence(
  outcome: string, 
  quotesCount: number, 
  hasRealData: boolean
): number {
  if (!hasRealData) return 0;
  
  let baseScore = 0;
  
  switch (outcome) {
    case 'Gap Identified':
    case 'Misaligned':
      // High confidence when we find clear contradictions
      baseScore = quotesCount >= 3 ? 90 : quotesCount >= 2 ? 80 : 70;
      break;
    case 'Aligned':
    case 'Validated':
      // Good confidence when interviews confirm deck assumptions
      baseScore = quotesCount >= 3 ? 85 : quotesCount >= 2 ? 75 : 65;
      break;
    case 'New Data Added':
      // Medium confidence - we found additional insights
      baseScore = quotesCount >= 3 ? 80 : quotesCount >= 2 ? 70 : 60;
      break;
    default:
      baseScore = 50;
  }
  
  return baseScore;
}

function generateConfidenceExplanation(
  outcome: string,
  overall: number,
  alignment: number,
  dataQuality: number,
  sampleSize: number,
  quotesCount: number,
  interviewCount: number,
  hasRealData: boolean
): string {
  if (!hasRealData) {
    return `This analysis is based solely on deck extraction (${dataQuality}% accuracy). Interview validation is needed for reliable confidence scores.`;
  }
  
  const parts = [];
  
  // Gap analysis confidence
  if (outcome === 'Gap Identified' || outcome === 'Misaligned') {
    parts.push(`${alignment}% confident in the gap analysis based on ${quotesCount} contradictory quotes from ${interviewCount} interviews`);
  } else if (outcome === 'Aligned') {
    parts.push(`${alignment}% confident in alignment based on ${quotesCount} supporting quotes from ${interviewCount} interviews`);
  } else {
    parts.push(`${alignment}% confident in the ${outcome.toLowerCase()} assessment based on ${quotesCount} quotes`);
  }
  
  // Data quality note
  if (dataQuality < 90) {
    parts.push(`Deck extraction confidence: ${dataQuality}%`);
  }
  
  // Sample size note
  if (sampleSize < 70) {
    parts.push(`Consider more interviews for higher statistical confidence (current: ${sampleSize}%)`);
  }
  
  return parts.join('. ') + '.';
}

/**
 * Creates a confidence breakdown for your specific case study
 */
export function createExampleConfidenceBreakdown(): ConfidenceBreakdown {
  return generateConfidenceBreakdown(
    'Gap Identified',
    5, // 5 quotes supporting the gap
    6, // 6 interviews conducted
    85, // 85% deck extraction quality
    true // Has real interview data
  );
} 