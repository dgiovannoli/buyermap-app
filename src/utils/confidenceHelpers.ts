import { ConfidenceBreakdown } from '../types/buyermap';

/**
 * Simplified confidence system focused on product marketing decisions
 * Based on interview count, not quote count, for better statistical validity
 */
export function generateConfidenceBreakdown(
  comparisonOutcome: string,
  uniqueSpeakers: number,
  deckQuality: number = 85
): ConfidenceBreakdown {
  
  // 1. Interview-Based Confidence (Primary metric)
  const interviewConfidence = calculateInterviewConfidence(uniqueSpeakers);
  
  // 2. Simplified overall score (heavily weighted toward interview count)
  const overall = Math.round(
    (interviewConfidence.confidence * 0.8) +  // 80% weight on interview count
    (deckQuality * 0.2)                       // 20% weight on deck quality
  );
  
  // 3. Generate product marketing focused explanation
  const explanation = generateProductMarketingExplanation(
    comparisonOutcome, 
    overall, 
    interviewConfidence,
    uniqueSpeakers,
    deckQuality
  );
  
  return {
    overall,
    dataQuality: deckQuality,
    sampleSize: interviewConfidence.confidence,
    alignment: interviewConfidence.confidence, // Simplified - same as sample size
    explanation
  };
}

function calculateInterviewConfidence(uniqueSpeakers: number): {
  confidence: number;
  level: 'Low' | 'Medium' | 'High';
  explanation: string;
} {
  if (uniqueSpeakers >= 6) {
    return {
      confidence: 95,
      level: 'High',
      explanation: `Strong validation from ${uniqueSpeakers} different customers`
    };
  } else if (uniqueSpeakers >= 3) {
    return {
      confidence: 75,
      level: 'Medium', 
      explanation: `Moderate validation from ${uniqueSpeakers} customers - consider more interviews`
    };
  } else if (uniqueSpeakers >= 1) {
    return {
      confidence: 50,
      level: 'Low',
      explanation: `Limited validation from ${uniqueSpeakers} customer(s) - need more interviews`
    };
  } else {
    return {
      confidence: 0,
      level: 'Low',
      explanation: 'No interview data available'
    };
  }
}

function generateProductMarketingExplanation(
  outcome: string,
  overall: number,
  interviewConfidence: { confidence: number; level: string; explanation: string },
  uniqueSpeakers: number,
  deckQuality: number
): string {
  const parts = [];
  
  // Core validation assessment
  if (outcome.toLowerCase().includes('validat')) {
    parts.push(`✅ Deck messaging aligns with customer reality (${interviewConfidence.explanation})`);
  } else if (outcome.toLowerCase().includes('contradict') || outcome.toLowerCase().includes('misalign')) {
    parts.push(`❌ Deck messaging conflicts with customer reality (${interviewConfidence.explanation})`);
  } else if (outcome.toLowerCase().includes('gap')) {
    parts.push(`🔍 Deck missing key customer insights (${interviewConfidence.explanation})`);
  } else if (outcome.toLowerCase().includes('insufficient') || uniqueSpeakers === 0) {
    parts.push(`⚠️ Need more interviews to determine deck effectiveness`);
  } else {
    parts.push(`${interviewConfidence.explanation}`);
  }
  
  // Confidence level recommendation
  if (interviewConfidence.level === 'Low') {
    parts.push(`Recommendation: Conduct more customer interviews for reliable validation`);
  } else if (interviewConfidence.level === 'Medium') {
    parts.push(`Recommendation: Consider additional interviews for stronger validation`);
  } else {
    parts.push(`Recommendation: Strong statistical basis for deck decisions`);
  }
  
  return parts.join('. ') + '.';
}

/**
 * Generate product marketing decision recommendation
 */
export function generateDeckRecommendation(
  outcome: string,
  uniqueSpeakers: number
): {
  recommendation: 'Use As-Is' | 'Revise Messaging' | 'Add Missing Content' | 'Conduct More Research';
  actionItems: string[];
  confidence: 'Low' | 'Medium' | 'High';
} {
  const outcomeLower = outcome.toLowerCase();
  
  // Determine recommendation based on outcome and interview count
  if (uniqueSpeakers === 0) {
    return {
      recommendation: 'Conduct More Research',
      actionItems: [
        'Schedule customer interviews to validate assumptions',
        'Focus on key buyer personas and decision makers',
        'Ask about pain points, desired outcomes, and purchase triggers'
      ],
      confidence: 'Low'
    };
  }
  
  if (outcomeLower.includes('validat')) {
    return {
      recommendation: 'Use As-Is',
      actionItems: [
        'Deck messaging aligns with customer reality',
        'Continue using current value propositions',
        'Monitor for any shifts in customer needs'
      ],
      confidence: uniqueSpeakers >= 3 ? 'High' : 'Medium'
    };
  }
  
  if (outcomeLower.includes('contradict') || outcomeLower.includes('misalign')) {
    return {
      recommendation: 'Revise Messaging',
      actionItems: [
        'Update value propositions to align with customer feedback',
        'Revise pain point descriptions based on interview insights',
        'Adjust messaging to address actual customer concerns'
      ],
      confidence: uniqueSpeakers >= 3 ? 'High' : 'Medium'
    };
  }
  
  if (outcomeLower.includes('gap')) {
    return {
      recommendation: 'Add Missing Content',
      actionItems: [
        'Add new sections addressing uncovered customer needs',
        'Include additional value propositions from interviews',
        'Expand messaging to cover missing pain points or outcomes'
      ],
      confidence: uniqueSpeakers >= 3 ? 'High' : 'Medium'
    };
  }
  
  // Default case
  return {
    recommendation: 'Conduct More Research',
    actionItems: [
      'Need more interviews to make confident deck decisions',
      'Current data insufficient for reliable validation'
    ],
    confidence: 'Low'
  };
}

/**
 * Creates a confidence breakdown for your specific case study
 */
export function createExampleConfidenceBreakdown(): ConfidenceBreakdown {
  return generateConfidenceBreakdown(
    'Gap Identified',
    6, // 6 interviews conducted
    85 // 85% deck extraction quality
  );
} 