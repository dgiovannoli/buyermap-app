import { Quote } from '../types/buyermap';

// Quote scoring interface
export interface QuoteScore {
  relevance: number;        // 0-100: How directly it addresses the assumption
  specificity: number;      // 0-100: Detail level and concreteness
  authority: number;        // 0-100: Decision-making power
  overallScore: number;     // Weighted average
}

// Speaker role classification
export enum SpeakerRole {
  DECISION_MAKER = 'decision-maker',    // CEO, VP, Director, Partner, Owner
  INFLUENCER = 'influencer',            // Manager, Lead, Senior, Supervisor
  END_USER = 'end-user'                 // Staff, Assistant, Paralegal, User
}

// Scored quote interface
export interface ScoredQuote {
  quote: Quote;
  score: QuoteScore;
}

// Diversity metrics
export interface DiversityMetrics {
  uniqueSpeakers: number;
  speakerRoles: SpeakerRole[];
  quoteVariety: 'high' | 'medium' | 'low';
  diversityScore: number; // 0-100
}

// Decision-maker keywords (high authority)
const DECISION_MAKER_KEYWORDS = [
  'ceo', 'president', 'director', 'vp', 'vice president', 'partner', 'owner', 
  'founder', 'principal', 'executive', 'chief', 'head of', 'managing'
];

// Influencer keywords (medium authority)
const INFLUENCER_KEYWORDS = [
  'manager', 'lead', 'senior', 'supervisor', 'coordinator', 'team lead',
  'project manager', 'department head', 'supervising'
];

// End-user keywords (low authority)
const END_USER_KEYWORDS = [
  'assistant', 'staff', 'paralegal', 'user', 'employee', 'member',
  'associate', 'specialist', 'coordinator', 'clerk'
];

/**
 * Calculate comprehensive quote score based on relevance, specificity, and authority
 */
export function calculateQuoteScore(quote: Quote, assumption: string): QuoteScore {
  const relevance = calculateRelevanceScore(quote.text, assumption);
  const specificity = calculateSpecificityScore(quote.text);
  const authority = calculateAuthorityScore(quote.speaker, quote.role);
  
  // Weighted average: relevance 50%, specificity 30%, authority 20%
  const overallScore = Math.round(
    (relevance * 0.5) + (specificity * 0.3) + (authority * 0.2)
  );
  
  return {
    relevance,
    specificity,
    authority,
    overallScore
  };
}

/**
 * Calculate relevance score based on how directly the quote addresses the assumption
 */
export function calculateRelevanceScore(quoteText: string, assumption: string): number {
  if (!quoteText || !assumption) return 0;
  
  const quoteLower = quoteText.toLowerCase();
  const assumptionLower = assumption.toLowerCase();
  
  // Extract key terms from assumption (first 3-4 words)
  const assumptionWords = assumptionLower
    .split(' ')
    .slice(0, 4)
    .filter(word => word.length > 3); // Filter out short words
  
  let relevanceScore = 0;
  let matchedWords = 0;
  
  // Check for exact word matches
  assumptionWords.forEach(word => {
    if (quoteLower.includes(word)) {
      matchedWords++;
      relevanceScore += 25; // 25 points per matched word
    }
  });
  
  // Bonus for multiple matches
  if (matchedWords >= 2) {
    relevanceScore += 20; // Bonus for multiple relevant terms
  }
  
  // Bonus for assumption topic keywords
  const topicKeywords = extractTopicKeywords(assumption);
  const topicMatches = topicKeywords.filter(keyword => 
    quoteLower.includes(keyword)
  ).length;
  
  relevanceScore += topicMatches * 10;
  
  // Cap at 100
  return Math.min(100, relevanceScore);
}

/**
 * Calculate specificity score based on detail level and concreteness
 */
export function calculateSpecificityScore(quoteText: string): number {
  if (!quoteText) return 0;
  
  let specificityScore = 0;
  
  // Length factor (longer quotes tend to be more specific)
  const length = quoteText.length;
  if (length > 200) specificityScore += 30;
  else if (length > 100) specificityScore += 20;
  else if (length > 50) specificityScore += 10;
  
  // Specific details indicators
  const specificIndicators = [
    /[0-9]+%/,           // Percentages
    /\$[0-9,]+/,         // Dollar amounts
    /[0-9]+ hours?/,     // Time references
    /[0-9]+ people/,     // People counts
    /specific/,          // Explicit specificity
    /exactly/,           // Exactness
    /precisely/,         // Precision
    /specifically/,      // Specificity
    /in particular/,     // Particularity
    /specifically/,      // Specificity
  ];
  
  specificIndicators.forEach(indicator => {
    if (indicator.test(quoteText)) {
      specificityScore += 8; // 8 points per specific indicator
    }
  });
  
  // Concrete action words
  const actionWords = [
    'decide', 'choose', 'select', 'implement', 'adopt', 'use',
    'buy', 'purchase', 'approve', 'recommend', 'suggest', 'propose'
  ];
  
  const actionMatches = actionWords.filter(word => 
    quoteText.toLowerCase().includes(word)
  ).length;
  
  specificityScore += actionMatches * 5;
  
  // Cap at 100
  return Math.min(100, specificityScore);
}

/**
 * Calculate authority score based on speaker role and title
 */
export function calculateAuthorityScore(speaker: string | undefined, role: string | undefined): number {
  const speakerRole = classifySpeakerRole(speaker || '', role || '');
  
  switch (speakerRole) {
    case SpeakerRole.DECISION_MAKER:
      return 90; // High authority
    case SpeakerRole.INFLUENCER:
      return 70; // Medium authority
    case SpeakerRole.END_USER:
      return 40; // Lower authority
    default:
      return 50; // Default medium authority
  }
}

/**
 * Classify speaker role based on name and title
 */
export function classifySpeakerRole(speaker: string, role: string): SpeakerRole {
  const combinedText = `${speaker} ${role}`.toLowerCase();
  
  // Check for decision-maker indicators
  for (const keyword of DECISION_MAKER_KEYWORDS) {
    if (combinedText.includes(keyword)) {
      return SpeakerRole.DECISION_MAKER;
    }
  }
  
  // Check for influencer indicators
  for (const keyword of INFLUENCER_KEYWORDS) {
    if (combinedText.includes(keyword)) {
      return SpeakerRole.INFLUENCER;
    }
  }
  
  // Check for end-user indicators
  for (const keyword of END_USER_KEYWORDS) {
    if (combinedText.includes(keyword)) {
      return SpeakerRole.END_USER;
    }
  }
  
  // Default classification based on role length and content
  if (role && role.length > 0) {
    if (role.toLowerCase().includes('manager') || role.toLowerCase().includes('lead')) {
      return SpeakerRole.INFLUENCER;
    }
    if (role.toLowerCase().includes('assistant') || role.toLowerCase().includes('staff')) {
      return SpeakerRole.END_USER;
    }
  }
  
  // Default to influencer if we can't determine
  return SpeakerRole.INFLUENCER;
}

/**
 * Extract topic keywords from assumption for relevance matching
 */
function extractTopicKeywords(assumption: string): string[] {
  const lowerAssumption = assumption.toLowerCase();
  const keywords: string[] = [];
  
  // Common business topic keywords
  const topicKeywords = [
    'buyer', 'decision', 'purchase', 'buy', 'select', 'choose',
    'pain', 'problem', 'challenge', 'issue', 'frustration',
    'goal', 'objective', 'outcome', 'result', 'success',
    'timing', 'when', 'schedule', 'deadline', 'urgent',
    'budget', 'cost', 'price', 'money', 'investment',
    'process', 'workflow', 'procedure', 'method', 'approach'
  ];
  
  topicKeywords.forEach(keyword => {
    if (lowerAssumption.includes(keyword)) {
      keywords.push(keyword);
    }
  });
  
  return keywords;
}

/**
 * Score all quotes for a given assumption
 */
export function scoreQuotesForAssumption(quotes: Quote[], assumption: string): ScoredQuote[] {
  return quotes.map(quote => ({
    quote,
    score: calculateQuoteScore(quote, assumption)
  }));
}

/**
 * Sort scored quotes by overall score (highest first)
 */
export function sortQuotesByScore(scoredQuotes: ScoredQuote[]): ScoredQuote[] {
  return [...scoredQuotes].sort((a, b) => b.score.overallScore - a.score.overallScore);
}

/**
 * Get quote quality summary for debugging
 */
export function getQuoteQualitySummary(scoredQuotes: ScoredQuote[]): {
  averageScore: number;
  highQualityCount: number;
  mediumQualityCount: number;
  lowQualityCount: number;
  roleDistribution: Record<SpeakerRole, number>;
} {
  if (scoredQuotes.length === 0) {
    return {
      averageScore: 0,
      highQualityCount: 0,
      mediumQualityCount: 0,
      lowQualityCount: 0,
      roleDistribution: {
        [SpeakerRole.DECISION_MAKER]: 0,
        [SpeakerRole.INFLUENCER]: 0,
        [SpeakerRole.END_USER]: 0
      }
    };
  }
  
  const totalScore = scoredQuotes.reduce((sum, sq) => sum + sq.score.overallScore, 0);
  const averageScore = Math.round(totalScore / scoredQuotes.length);
  
  const highQualityCount = scoredQuotes.filter(sq => sq.score.overallScore >= 80).length;
  const mediumQualityCount = scoredQuotes.filter(sq => sq.score.overallScore >= 60 && sq.score.overallScore < 80).length;
  const lowQualityCount = scoredQuotes.filter(sq => sq.score.overallScore < 60).length;
  
  const roleDistribution = {
    [SpeakerRole.DECISION_MAKER]: 0,
    [SpeakerRole.INFLUENCER]: 0,
    [SpeakerRole.END_USER]: 0
  };
  
  scoredQuotes.forEach(sq => {
    const role = classifySpeakerRole(sq.quote.speaker || '', sq.quote.role || '');
    roleDistribution[role]++;
  });
  
  return {
    averageScore,
    highQualityCount,
    mediumQualityCount,
    lowQualityCount,
    roleDistribution
  };
} 