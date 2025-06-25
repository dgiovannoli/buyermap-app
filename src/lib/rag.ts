import { getPineconeIndex } from './pinecone';
import OpenAI from 'openai';

// Initialize OpenAI client
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Enhanced quote quality metrics
interface QuoteQualityMetrics {
  quoteScore: number;
  speakerDiversityScore: number;
  conversationCoverageScore: number;
  finalScore: number;
}

// Quote with enhanced metadata
interface EnhancedQuote {
  text: string;
  speaker?: string;
  role?: string;
  source: string;
  classification?: string;
  score?: number;
  topic_relevance?: string;
  specificity_score?: number;
  companySnapshot?: string;
  // New quality metrics
  qualityMetrics?: QuoteQualityMetrics;
  wordCount?: number;
  hasBuzzwords?: boolean;
  isSpecific?: boolean;
  hasMetrics?: boolean;
}

/**
 * ✅ 1️⃣ Enhanced query formulation for ALL attribute validation
 * Creates targeted queries that focus on specific BuyerMap attribute validation
 */
function createBuyerValidationQuery(attributeText: string, attributeType?: string): string {
  // Attribute-specific query formulation
  const attributeQueries = {
    'buyer-titles': `Find quotes that explicitly validate this assumption about buyer roles and titles: "${attributeText}". Include quotes mentioning job titles, decision makers, or purchasing authority.`,
    'company-size': `Find quotes that validate this assumption about company/firm size: "${attributeText}". Include quotes mentioning team size, employee count, or organizational scale.`,
    'pain-points': `Find quotes that validate this assumption about customer pain points: "${attributeText}". Include quotes mentioning problems, challenges, or frustrations.`,
    'desired-outcomes': `Find quotes that validate this assumption about desired outcomes: "${attributeText}". Include quotes mentioning goals, improvements, or success metrics.`,
    'triggers': `Find quotes that validate this assumption about purchase triggers: "${attributeText}". Include quotes mentioning timing, events, or circumstances that drive decisions.`,
    'barriers': `Find quotes that validate this assumption about adoption barriers: "${attributeText}". Include quotes mentioning obstacles, concerns, or resistance.`,
    'messaging-emphasis': `Find quotes that validate this assumption about messaging emphasis: "${attributeText}". Include quotes mentioning what matters most, priorities, or value propositions.`
  };

  // Use attribute-specific query if type is provided, otherwise default to buyer focus
  return attributeType && attributeQueries[attributeType as keyof typeof attributeQueries]
    ? attributeQueries[attributeType as keyof typeof attributeQueries]
    : `Find quotes that explicitly validate this assumption: "${attributeText}". Focus on quotes that provide specific evidence or contradictory information.`;
}

/**
 * ✅ 2️⃣ ENHANCED Post-RAG filtering by ALL attribute relevance
 * Filters matches to include quotes relevant to ANY BuyerMap attribute category
 * @param matches - Vector search results to filter
 * @param attributeType - Optional specific attribute to filter for ('buyer-titles', 'company-size', 'pain-points', 'desired-outcomes', 'triggers', 'barriers', 'messaging-emphasis')
 * @param enableBuyerFiltering - Whether to apply any filtering (for backward compatibility)
 */
function filterByAllAttributeRelevance(matches: any[], attributeType?: string, enableBuyerFiltering = true): any[] {
  if (!enableBuyerFiltering) {
    return matches;
  }

  // Define comprehensive keyword sets for each attribute category (INDUSTRY-AGNOSTIC)
  const attributeKeywords = {
    'buyer-titles': [
      // Universal job titles and roles (industry-agnostic)
      'buyer', 'client', 'customer', 'director', 'manager', 'partner', 'owner', 'founder',
      'associate', 'coordinator', 'executive', 'specialist', 'analyst', 'administrator', 
      'officer', 'principal', 'senior', 'lead', 'head of', 'chief', 'vp of', 'vice president', 
      'cto', 'ceo', 'cfo', 'president', 'supervisor', 'team lead', 'project manager', 
      'program manager', 'consultant', 'advisor', 'practitioner', 'professional',
      // Decision making phrases (universal)
      'i decide', 'i choose', 'i approve', 'my decision', 'i purchase', 'i buy', 'i select',
      'i evaluate', 'i recommend', 'i sign off', 'i authorize', 'my role is', 'i handle',
      'i\'m responsible for', 'i make the call', 'i have authority', 'i oversee', 'i manage',
      // Business roles (generic across industries)
      'decision maker', 'stakeholder', 'department head', 'team leader', 'account manager',
      'operations manager', 'technical lead', 'business owner', 'entrepreneur'
    ],

    'company-size': [
      // Universal size indicators (industry-neutral)
      'employees', 'staff', 'team size', 'headcount', 'workforce', 'people', 'workers',
      'team members', 'colleagues', 'personnel', 'small company', 'large company', 
      'mid-size', 'mid-sized', 'enterprise', 'startup', 'boutique', 'solo business', 
      'independent', 'freelancer', 'one-person', 'single person',
      // Numeric size indicators
      'person company', 'employee company', 'person business', 'office', 'branch', 'location',
      'department', 'division', 'team', 'unit', 'group of', 'staff of',
      // Scale indicators (universal)
      'we are', 'our company', 'our organization', 'our business', 'our office', 'our team',
      'big enough', 'too small', 'right size', 'growing', 'expanding', 'downsizing',
      'scaling', 'startup phase', 'established', 'mature company',
      // Business metrics (universal)
      'budget', 'revenue', 'sales', 'clients', 'customers', 'volume', 'capacity'
    ],

    'pain-points': [
      // Problem words
      'problem', 'issue', 'challenge', 'difficulty', 'struggle', 'pain', 'frustration', 
      'obstacle', 'barrier', 'bottleneck', 'roadblock', 'hurdle', 'setback', 'limitation',
      'constraint', 'friction', 'inefficiency', 'waste', 'burden', 'stress', 'pressure',
      // Negative experiences
      'hard to', 'difficult to', 'impossible to', 'can\'t', 'unable to', 'fails to',
      'doesn\'t work', 'broken', 'slow', 'tedious', 'manual', 'time-consuming', 'overwhelming',
      'confusing', 'complicated', 'error-prone', 'unreliable', 'inconsistent', 'outdated',
      // Time/effort pain
      'takes too long', 'too much time', 'hours', 'days', 'weeks', 'workdays', 'overtime',
      'repetitive', 'redundant', 'duplicate', 'rework', 'redo', 'start over', 'constantly',
      // Cost pain
      'expensive', 'costly', 'budget', 'price', 'afford', 'cheaper', 'cost us', 'paying for',
      'waste money', 'overpaying', 'hidden costs', 'additional fees'
    ],

    'desired-outcomes': [
      // Goal words
      'goal', 'objective', 'outcome', 'result', 'want', 'need', 'desire', 'hope', 'expect',
      'looking for', 'trying to', 'aiming for', 'seeking', 'pursuing', 'target', 'achieve',
      'accomplish', 'complete', 'finish', 'deliver', 'succeed', 'win', 'gain', 'obtain',
      // Improvement words
      'better', 'improve', 'enhance', 'optimize', 'streamline', 'efficient', 'effective',
      'faster', 'quicker', 'easier', 'simpler', 'cleaner', 'smoother', 'automated',
      'accurate', 'reliable', 'consistent', 'quality', 'professional', 'organized',
      // Success indicators
      'success', 'successful', 'advantage', 'benefit', 'value', 'roi', 'return on investment',
      'competitive edge', 'differentiation', 'winning', 'ahead', 'leading', 'best practice',
      // Specific outcomes
      'save time', 'reduce cost', 'increase efficiency', 'improve accuracy', 'eliminate errors',
      'reduce risk', 'increase productivity', 'scale', 'grow', 'expand', 'standardize'
    ],

    'triggers': [
      // Timing words
      'when', 'timing', 'trigger', 'event', 'happens', 'occurs', 'situation', 'circumstance',
      'moment', 'point', 'stage', 'phase', 'period', 'time', 'season', 'cycle', 'process',
      // Change indicators
      'change', 'transition', 'shift', 'move', 'switch', 'upgrade', 'migrate', 'adopt',
      'implement', 'deploy', 'rollout', 'launch', 'start', 'begin', 'initiate', 'kick off',
      // Crisis/urgency
      'urgent', 'crisis', 'emergency', 'deadline', 'pressure', 'rush', 'asap', 'immediately',
      'critical', 'important', 'priority', 'must have', 'need now', 'can\'t wait',
      // Growth triggers
      'growing', 'expanding', 'scaling', 'hiring', 'onboarding', 'new cases', 'more clients',
      'increased volume', 'busy', 'swamped', 'overwhelmed', 'capacity', 'workload',
      // Regulatory/compliance
      'compliance', 'regulation', 'audit', 'review', 'requirement', 'mandate', 'policy',
      'standard', 'certification', 'accreditation', 'legal requirement', 'must comply'
    ],

    'barriers': [
      // Adoption barriers
      'barrier', 'obstacle', 'resistance', 'hesitation', 'concern', 'worry', 'fear', 'risk',
      'uncertainty', 'doubt', 'skeptical', 'cautious', 'careful', 'conservative', 'traditional',
      // Technical barriers
      'technical', 'technology', 'system', 'integration', 'compatibility', 'security',
      'infrastructure', 'setup', 'installation', 'configuration', 'training', 'learning curve',
      'complexity', 'complicated', 'difficult', 'expertise', 'knowledge', 'skill',
      // Budget barriers
      'budget', 'cost', 'price', 'expensive', 'afford', 'funding', 'investment', 'roi',
      'justify', 'approve', 'authorization', 'financial', 'economic', 'money', 'payment',
      // Process barriers
      'process', 'procedure', 'workflow', 'approval', 'consensus', 'agreement', 'buy-in',
      'stakeholder', 'politics', 'culture', 'change management', 'adoption', 'rollout',
      // Time barriers
      'time', 'bandwidth', 'capacity', 'resources', 'busy', 'priorities', 'focus',
      'distracted', 'competing', 'urgent', 'immediate', 'short-term', 'long-term'
    ],

    'messaging-emphasis': [
      // Value propositions
      'value', 'benefit', 'advantage', 'important', 'matters', 'priority', 'focus',
      'emphasis', 'highlight', 'key', 'critical', 'essential', 'vital', 'crucial',
      'primary', 'main', 'core', 'fundamental', 'basic', 'foundation', 'cornerstone',
      // Messaging themes
      'message', 'communication', 'explain', 'describe', 'tell', 'inform', 'educate',
      'demonstrate', 'show', 'prove', 'evidence', 'example', 'case study', 'story',
      'testimonial', 'reference', 'recommendation', 'endorsement', 'review', 'feedback',
      // Positioning
      'position', 'differentiate', 'unique', 'special', 'different', 'stand out',
      'competitive', 'comparison', 'alternative', 'option', 'choice', 'selection',
      'decision', 'criteria', 'factor', 'consideration', 'requirement', 'specification',
      // Persuasion
      'convince', 'persuade', 'sell', 'pitch', 'present', 'proposal', 'recommendation',
      'suggestion', 'advice', 'guidance', 'direction', 'insight', 'perspective', 'opinion'
    ]
  };

  // If specific attribute type is provided, filter for only that attribute
  if (attributeType && attributeKeywords[attributeType as keyof typeof attributeKeywords]) {
    const keywords = attributeKeywords[attributeType as keyof typeof attributeKeywords];
    return matches.filter(m => {
      const text = m.metadata?.text?.toLowerCase() || '';
      return keywords.some(keyword => text.includes(keyword.toLowerCase()));
    });
  }

  // Otherwise, filter for ANY attribute relevance (broader filtering)
  return matches.filter(m => {
    const text = m.metadata?.text?.toLowerCase() || '';
    return Object.values(attributeKeywords).flat().some(keyword => 
      text.includes(keyword.toLowerCase())
    );
  });
}

// Keep the old function name for backward compatibility but mark as deprecated
/**
 * @deprecated Use filterByAllAttributeRelevance instead for better coverage
 */
function filterByBuyerRelevance(matches: any[]): any[] {
  return filterByAllAttributeRelevance(matches, 'buyer-titles', true);
}

/**
 * ✅ 3️⃣ OpenAI-assisted quote justification
 * Uses LLM to filter for direct relevance to buyer identity assumptions
 */
async function filterQuotesWithOpenAI(attributeText: string, matches: any[], attributeType?: string): Promise<any[]> {
  if (!openai || matches.length === 0) {
    return matches;
  }

  try {
    // Get attribute-specific instructions
    const attributeInstructions = {
      'buyer-titles': 'Focus on quotes that explicitly mention buyer roles, titles, decision makers, or purchasing authority.',
      'company-size': 'Focus on quotes that mention company/firm size, team size, employee count, or organizational scale.',
      'pain-points': 'Focus on quotes that describe problems, challenges, frustrations, or difficulties.',
      'desired-outcomes': 'Focus on quotes that express goals, improvements, success metrics, or desired benefits.',
      'triggers': 'Focus on quotes that describe timing, events, circumstances, or conditions that drive decisions.',
      'barriers': 'Focus on quotes that mention obstacles, concerns, resistance, or adoption challenges.',
      'messaging-emphasis': 'Focus on quotes that discuss what matters most, priorities, value propositions, or key messaging points.'
    };

    const specificInstruction = attributeType && attributeInstructions[attributeType as keyof typeof attributeInstructions]
      ? attributeInstructions[attributeType as keyof typeof attributeInstructions]
      : 'Focus on quotes that explicitly mention buyer roles, titles, or identity characteristics.';

    const prompt = `
You are validating this assumption: "${attributeText}". 
From the following quotes, identify only those that directly support or contradict the assumption.

${specificInstruction}

Quotes:
${matches.map((m, i) => `${i + 1}. "${m.metadata?.text || ''}"`).join('\n')}

Respond with a JSON array containing only the numbers of relevant quotes (e.g., [1, 3, 5]).
Only include quotes that provide strong evidence for or against the specific assumption being validated.
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 500
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.warn('No response from OpenAI for quote filtering');
      return matches;
    }

    // Parse the JSON response
    try {
      const relevantIndices = JSON.parse(content);
      if (Array.isArray(relevantIndices)) {
        const filteredMatches = relevantIndices
          .map(index => matches[index - 1]) // Convert 1-based to 0-based indexing
          .filter(Boolean); // Remove any undefined entries
        
        console.log(`🤖 OpenAI filtered quotes for ${attributeType || 'general'}: ${matches.length} → ${filteredMatches.length}`);
        return filteredMatches;
      }
    } catch (parseError) {
      console.warn('Failed to parse OpenAI response for quote filtering:', parseError);
    }

    return matches;
  } catch (error) {
    console.warn('OpenAI quote filtering failed:', error);
    return matches;
  }
}

/**
 * Enhanced quote quality scoring based on product marketing principles
 */
export function calculateQuoteQuality(quote: EnhancedQuote): number {
  const text = quote.text || '';
  const wordCount = text.split(' ').length;
  
  let qualityScore = 0;
  
  // Length quality (sweet spot 15-40 words) - STRICTER
  if (wordCount >= 15 && wordCount <= 40) {
    qualityScore += 0.3;
  } else if (wordCount >= 8 && wordCount <= 60) {
    qualityScore += 0.1; // Reduced from 0.15
  } else {
    qualityScore -= 0.2; // Penalize very short or very long quotes
  }
  
  // Specificity indicators - ENHANCED
  const specificityIndicators = [
    /\d+/, // Numbers
    /\$\d+/, // Money amounts
    /\d+%/, // Percentages
    /hours?|days?|weeks?|months?|years?/i, // Time references
    /we spend|costs us|takes|saves|reduces/i, // Quantified actions
    /for example|specifically|exactly|precisely/i, // Specificity words
    /paralegal|attorney|partner|director|manager|coordinator/i, // Role mentions
    /our firm|our company|our team|our department/i, // Organizational context
    /when we|if we|because we|since we/i, // Conditional/contextual statements
  ];
  
  const specificityMatches = specificityIndicators.reduce((count, regex) => {
    return count + (regex.test(text) ? 1 : 0);
  }, 0);
  
  qualityScore += Math.min(specificityMatches * 0.15, 0.4); // Increased from 0.1 and 0.3
  
  // Penalize buzzwords - ENHANCED
  const buzzwords = [
    /strategic advantage/i,
    /leverage synerg/i,
    /optimize|streamline|enhance/i,
    /solution|platform|ecosystem/i,
    /best-in-class|industry-leading/i,
    /innovative|cutting-edge/i,
    /game-changer|revolutionary/i,
    /seamless|intuitive|user-friendly/i,
    /robust|scalable|enterprise-grade/i
  ];
  
  const buzzwordCount = buzzwords.reduce((count, regex) => {
    return count + (regex.test(text) ? 1 : 0);
  }, 0);
  
  qualityScore -= buzzwordCount * 0.15; // Increased penalty from 0.1
  
  // Reward concrete examples and pain points - ENHANCED
  const concreteIndicators = [
    /the problem is|issue is|challenge is/i,
    /we struggle with|difficult to|hard to/i,
    /for instance|like when|such as/i,
    /I remember when|last time|recently/i,
    /paralegal.*manag|attorney.*handl|coordinator.*oversee/i, // Role-specific actions
    /we have|we use|we need|we want/i, // Action-oriented statements
    /because|since|when|if/i, // Causal/conditional statements
  ];
  
  const concreteMatches = concreteIndicators.reduce((count, regex) => {
    return count + (regex.test(text) ? 1 : 0);
  }, 0);
  
  qualityScore += concreteMatches * 0.2; // Increased from 0.15
  
  // Penalize generic satisfaction - ENHANCED
  const genericPatterns = [
    /we're happy|it's good|that's great/i,
    /pretty good|really nice|very helpful/i,
    /works fine|does the job/i,
    /thank you|thanks|appreciate/i,
    /no problem|no issues|everything is fine/i,
    /I don't know|not sure|maybe/i,
    /it depends|varies|different/i,
    /good question|interesting|that's a good point/i
  ];
  
  const genericMatches = genericPatterns.reduce((count, regex) => {
    return count + (regex.test(text) ? 1 : 0);
  }, 0);
  
  qualityScore -= genericMatches * 0.25; // Increased penalty from 0.2
  
  // NEW: Penalize filler words and vague statements
  const fillerPatterns = [
    /um|uh|you know|like|basically|actually/i,
    /kind of|sort of|pretty much/i,
    /I guess|I think|I feel/i,
    /whatever|anyway|so yeah/i
  ];
  
  const fillerMatches = fillerPatterns.reduce((count, regex) => {
    return count + (regex.test(text) ? 1 : 0);
  }, 0);
  
  qualityScore -= fillerMatches * 0.1;
  
  // NEW: Bonus for role/title insights (what you specifically want)
  const roleInsightPatterns = [
    /paralegal.*manag|paralegal.*handl|paralegal.*oversee/i,
    /attorney.*delegat|attorney.*assign/i,
    /coordinator.*responsib|coordinator.*task/i,
    /manager.*supervis|director.*oversee/i,
    /our.*paralegal|our.*attorney|our.*coordinator/i,
    /the.*paralegal|the.*attorney|the.*coordinator/i
  ];
  
  const roleInsightMatches = roleInsightPatterns.reduce((count, regex) => {
    return count + (regex.test(text) ? 1 : 0);
  }, 0);
  
  qualityScore += roleInsightMatches * 0.3; // Significant bonus for role insights
  
  return Math.max(0, Math.min(1, qualityScore));
}

/**
 * Calculate speaker diversity score for a set of quotes
 */
function calculateSpeakerDiversity(quotes: EnhancedQuote[]): number {
  const speakers = new Set(quotes.map(q => q.speaker).filter(Boolean));
  const totalQuotes = quotes.length;
  
  if (totalQuotes === 0) return 0;
  
  // Ideal: Each quote from different speaker = 1.0
  // Reality: Penalize duplicate speakers
  const uniqueSpeakerRatio = speakers.size / totalQuotes;
  
  // Also consider role diversity
  const roles = new Set(quotes.map(q => q.role).filter(Boolean));
  const roleDiversityBonus = Math.min(roles.size / 3, 0.2); // Bonus for role diversity
  
  return Math.min(1.0, uniqueSpeakerRatio + roleDiversityBonus);
}

/**
 * Calculate conversation coverage - how many different conversations mention this topic
 */
function calculateConversationCoverage(quotes: EnhancedQuote[]): number {
  const conversations = new Set(quotes.map(q => q.source).filter(Boolean));
  const totalQuotes = quotes.length;
  
  if (totalQuotes === 0) return 0;
  
  // This is the key metric: N unique conversations > N total quotes from 1 conversation
  const conversationCoverageRatio = conversations.size / Math.max(totalQuotes, 1);
  
  // Bonus for high conversation coverage (multiple people talking about the same thing)
  const coverageBonus = conversations.size >= 3 ? 0.2 : 0;
  
  return Math.min(1.0, conversationCoverageRatio + coverageBonus);
}

/**
 * Enhanced quote ranking that prioritizes quality, diversity, and conversation coverage
 */
function rankQuotesByEnhancedMetrics(quotes: EnhancedQuote[]): EnhancedQuote[] {
  // First, calculate individual quote quality
  const quotesWithQuality = quotes.map(quote => ({
    ...quote,
    qualityMetrics: {
      quoteScore: calculateQuoteQuality(quote),
      speakerDiversityScore: 0, // Will be calculated at group level
      conversationCoverageScore: 0, // Will be calculated at group level
      finalScore: 0
    }
  }));
  
  // Group quotes by speaker and source for diversity analysis
  const speakerQuoteCounts = new Map<string, number>();
  const sourceQuoteCounts = new Map<string, number>();
  
  quotesWithQuality.forEach(quote => {
    const speaker = quote.speaker || 'unknown';
    const source = quote.source || 'unknown';
    
    speakerQuoteCounts.set(speaker, (speakerQuoteCounts.get(speaker) || 0) + 1);
    sourceQuoteCounts.set(source, (sourceQuoteCounts.get(source) || 0) + 1);
  });
  
  // Apply diversity penalties and calculate final scores
  const rankedQuotes = quotesWithQuality.map((quote: EnhancedQuote) => {
    const speaker = quote.speaker || 'unknown';
    const source = quote.source || 'unknown';
    
    // Penalty for multiple quotes from same speaker (diminishing returns)
    const speakerCount = speakerQuoteCounts.get(speaker) || 1;
    const speakerPenalty = speakerCount > 1 ? 0.7 / speakerCount : 1.0;
    
    // Penalty for multiple quotes from same conversation
    const sourceCount = sourceQuoteCounts.get(source) || 1;
    const sourcePenalty = sourceCount > 2 ? 0.8 / Math.sqrt(sourceCount) : 1.0;
    
    // Calculate final score
    const baseQualityScore = quote.qualityMetrics?.quoteScore || 0;
    const diversityScore = speakerPenalty * sourcePenalty;
    const finalScore = baseQualityScore * diversityScore * (quote.score || 0.5);
    
    return {
      ...quote,
      qualityMetrics: {
        ...quote.qualityMetrics!,
        speakerDiversityScore: speakerPenalty,
        conversationCoverageScore: sourcePenalty,
        finalScore
      }
    };
  });
  
  // Sort by final score (descending)
  return rankedQuotes.sort((a, b) => 
    (b.qualityMetrics?.finalScore || 0) - (a.qualityMetrics?.finalScore || 0)
  );
}

/**
 * Fetch relevant quotes from Pinecone based on assumption ID
 * ✅ Enhanced with ALL attribute validation query and filtering
 * @param assumptionId - The ID of the assumption to find relevant quotes for
 * @param topK - Number of top results to return (default: 5)
 * @param attributeText - The assumption text for enhanced query formulation
 * @param attributeType - Optional specific attribute type for targeted filtering
 * @returns Array of quote metadata objects
 */
export async function fetchRelevantQuotes(assumptionId: number, topK = 5, attributeText?: string, attributeType?: string) {
  if (!openai) {
    console.warn('OpenAI client not initialized - skipping RAG retrieval');
    return [];
  }

  try {
    const index = getPineconeIndex();
    
    // ✅ 1️⃣ Enhanced query formulation for ALL attribute validation
    const queryText = attributeText 
      ? createBuyerValidationQuery(attributeText, attributeType)
      : `Insights for assumption #${assumptionId}`;
    
    // Create embedding for the enhanced query
    const queryEmbed = (await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: [queryText],
    })).data[0].embedding;

    // Get namespaced index for interviews
    const namespacedIndex = index.namespace('interviews');
    
    // Query Pinecone with filter for specific assumption
    const results = await namespacedIndex.query({
      vector: queryEmbed,
      topK: topK * 5, // Get more results for enhanced filtering
      includeMetadata: true,
      filter: { assumptionId: assumptionId.toString() },
    });

    // [DEBUG] Log RAG query results for fetchRelevantQuotes
    console.log(`🔍 [DEBUG] fetchRelevantQuotes for assumption ${assumptionId} with enhanced query:`);
    console.log(`   Query: "${queryText}"`);
    if (results.matches) {
      console.log(`   Raw matches: ${results.matches.length}`);
    } else {
      console.log('  No matches found');
      return [];
    }

    // ✅ 2️⃣ Filter post-RAG by ALL attribute relevance (enhanced)
    const attributeRelevantMatches = filterByAllAttributeRelevance(results.matches || [], attributeType);
    console.log(`🎯 Attribute relevance filter: ${results.matches?.length || 0} → ${attributeRelevantMatches.length}`);

    // ✅ 3️⃣ Use OpenAI assist for quote justification (if attributeText provided)
    let finalMatches = attributeRelevantMatches;
    if (attributeText && attributeRelevantMatches.length > 0) {
      finalMatches = await filterQuotesWithOpenAI(attributeText, attributeRelevantMatches, attributeType);
    }

    // Convert to enhanced quotes and apply quality ranking
    const enhancedQuotes: EnhancedQuote[] = finalMatches
      ?.map((m: any) => ({
        ...m.metadata,
        score: m.score
      }))
      .filter((quote: EnhancedQuote) => quote.text && quote.text.length > 15) || []; // Basic quality filter
    
    const rankedQuotes = rankQuotesByEnhancedMetrics(enhancedQuotes);
    
    console.log(`📊 Quality-ranked quotes for assumption ${assumptionId}:`);
    rankedQuotes.slice(0, topK).forEach((q, i) => {
      console.log(`   [${i}] final_score=${q.qualityMetrics?.finalScore?.toFixed(3)} speaker="${q.speaker}" diversity=${q.qualityMetrics?.speakerDiversityScore?.toFixed(2)}`);
    });
    
    // Return the metadata from top-ranked quotes
    return rankedQuotes.slice(0, topK).map(q => ({
      text: q.text,
      speaker: q.speaker,
      role: q.role,
      source: q.source,
      classification: q.classification,
      score: q.score,
      topic_relevance: q.topic_relevance,
      specificity_score: q.specificity_score,
      companySnapshot: q.companySnapshot
    }));
  } catch (error) {
    console.error('Error fetching relevant quotes:', error);
    return [];
  }
}

/**
 * Fetch relevant quotes based on free-text query
 * ✅ Enhanced with ALL attribute validation and filtering
 * @param query - Free text query to search for
 * @param topK - Number of top results to return (default: 5)
 * @param assumptionId - Optional filter by assumption ID
 * @param enableBuyerFiltering - Whether to apply attribute relevance filtering (default: true)
 * @param attributeType - Optional specific attribute type for targeted filtering
 * @returns Array of quote metadata objects
 */
export async function fetchQuotesByQuery(query: string, topK = 5, assumptionId?: number, enableBuyerFiltering = true, attributeType?: string) {
  if (!openai) {
    console.warn('OpenAI client not initialized - skipping RAG retrieval');
    return [];
  }

  try {
    const index = getPineconeIndex();
    
    // ✅ 1️⃣ Enhanced query formulation (if query looks like attribute validation)
    const enhancedQuery = query.toLowerCase().includes('buyer') || query.toLowerCase().includes('title') || query.toLowerCase().includes('role') ||
                          query.toLowerCase().includes('pain') || query.toLowerCase().includes('outcome') || query.toLowerCase().includes('trigger')
      ? createBuyerValidationQuery(query, attributeType)
      : query;
    
    // Create embedding for the enhanced query
    const queryEmbed = (await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: [enhancedQuery],
    })).data[0].embedding;

    // Get namespaced index for interviews
    const namespacedIndex = index.namespace('interviews');
    
    // Build query options
    const queryOptions: any = {
      vector: queryEmbed,
      topK: topK * 5, // Get more results for enhanced filtering
      includeMetadata: true,
    };

    // Add assumption filter if provided
    if (assumptionId) {
      queryOptions.filter = { assumptionId: assumptionId.toString() };
    }
    
    // Query Pinecone
    const results = await namespacedIndex.query(queryOptions);

    // [DEBUG] Log RAG query results for fetchQuotesByQuery
    console.log(`🔍 [DEBUG] fetchQuotesByQuery for "${query}" → "${enhancedQuery}"`);
    if (results.matches) {
      console.log(`   Raw matches: ${results.matches.length}`);
    } else {
      console.log('  No matches found');
      return [];
    }

    // ✅ 2️⃣ Filter post-RAG by ALL attribute relevance (enhanced) if enabled
    let filteredMatches = results.matches || [];
    if (enableBuyerFiltering) {
      filteredMatches = filterByAllAttributeRelevance(filteredMatches, attributeType);
      console.log(`🎯 Attribute relevance filter: ${results.matches?.length || 0} → ${filteredMatches.length}`);
    }

    // ✅ 3️⃣ Use OpenAI assist for quote justification (for attribute-related queries)
    if (enableBuyerFiltering && filteredMatches.length > 0 && (
      query.toLowerCase().includes('buyer') || 
      query.toLowerCase().includes('title') || 
      query.toLowerCase().includes('role') ||
      query.toLowerCase().includes('pain') ||
      query.toLowerCase().includes('outcome') ||
      query.toLowerCase().includes('trigger') ||
      attributeType
    )) {
      filteredMatches = await filterQuotesWithOpenAI(query, filteredMatches, attributeType);
    }

    // Convert to enhanced quotes and apply quality ranking
    const enhancedQuotes: EnhancedQuote[] = filteredMatches
      ?.map((m: any) => ({
        ...m.metadata,
        score: m.score,
        companySnapshot: m.metadata?.companySnapshot
      }))
      .filter((quote: EnhancedQuote) => quote.text && quote.text.length > 15) || [];
    
    const rankedQuotes = rankQuotesByEnhancedMetrics(enhancedQuotes);
    
    // Return the metadata from top-ranked quotes with company snapshots
    return rankedQuotes.slice(0, topK).map(q => ({
      text: q.text,
      speaker: q.speaker,
      role: q.role,
      source: q.source,
      classification: q.classification,
      score: q.score,
      topic_relevance: q.topic_relevance,
      specificity_score: q.specificity_score,
      companySnapshot: q.companySnapshot
    }));
  } catch (error) {
    console.error('Error fetching quotes by query:', error);
    return [];
  }
}

/**
 * Get high-quality quotes for synthesis based on assumption with enhanced quality metrics
 * ✅ Enhanced with ALL attribute validation and comprehensive filtering
 * @param assumptionText - The assumption text to find evidence for
 * @param assumptionId - The assumption ID for filtering
 * @param topK - Number of top results to return (default: 5)
 * @param attributeType - Optional specific attribute type for targeted filtering
 * @returns Array of high-quality quote metadata
 */
export async function getTopQuotesForSynthesis(assumptionText: string, assumptionId: number, topK = 5, attributeType?: string) {
  if (!openai) {
    console.warn('OpenAI client not initialized - returning empty quotes for synthesis');
    return [];
  }

  try {
    const index = getPineconeIndex();
    
    // ✅ 1️⃣ Enhanced query formulation for ALL attribute validation
    const enhancedQuery = createBuyerValidationQuery(assumptionText, attributeType);
    
    // Create embedding based on the enhanced assumption query for better semantic matching
    const queryEmbed = (await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: [enhancedQuery],
    })).data[0].embedding;

    // Get namespaced index for interviews
    const namespacedIndex = index.namespace('interviews');
    
    // Query for the most relevant quotes for this specific assumption
    const results = await namespacedIndex.query({
      vector: queryEmbed,
      topK: topK * 6, // Get even more results for comprehensive enhanced filtering
      includeMetadata: true,
      filter: { assumptionId: assumptionId.toString() },
    });

    // [DEBUG] Log raw RAG matches with enhanced query
    console.log(`🔍 [DEBUG] RAG matches for enhanced ${attributeType || 'general'} validation query:`, enhancedQuery);
    if (results.matches) {
      console.log(`   Raw matches: ${results.matches.length}`);
    } else {
      console.log('  No matches found');
      return [];
    }

    // ✅ 2️⃣ Filter post-RAG by ALL attribute relevance (enhanced)
    const attributeRelevantMatches = filterByAllAttributeRelevance(results.matches || [], attributeType);
    console.log(`🎯 Attribute relevance filter: ${results.matches?.length || 0} → ${attributeRelevantMatches.length}`);

    // ✅ 3️⃣ Use OpenAI assist for quote justification
    let aiFilteredMatches = attributeRelevantMatches;
    if (attributeRelevantMatches.length > 0) {
      aiFilteredMatches = await filterQuotesWithOpenAI(assumptionText, attributeRelevantMatches, attributeType);
    }

    // Convert to enhanced quotes with quality filtering
    const enhancedQuotes: EnhancedQuote[] = aiFilteredMatches
      ?.filter((m: any) => 
        m.metadata?.text && 
        m.metadata.text.length > 20 && 
        m.score && m.score > 0.60 // Slightly lower threshold after AI filtering
      )
      .map((m: any) => ({
        text: m.metadata?.text,
        speaker: m.metadata?.speaker,
        role: m.metadata?.role,
        source: m.metadata?.source,
        classification: m.metadata?.classification,
        score: m.score,
        topic_relevance: m.metadata?.topic_relevance,
        specificity_score: m.metadata?.specificity_score,
        companySnapshot: m.metadata?.companySnapshot
      })) || [];

    // Apply enhanced quality ranking
    const rankedQuotes = rankQuotesByEnhancedMetrics(enhancedQuotes);
    
    // Calculate conversation coverage metrics for logging
    const sources = new Set(rankedQuotes.map(q => q.source));
    const speakers = new Set(rankedQuotes.map(q => q.speaker));
    
    console.log(`📊 Enhanced quality analysis for assumption ${assumptionId} (${attributeType || 'general'}):`);
    console.log(`   Total RAG matches: ${results.matches?.length || 0}`);
    console.log(`   After attribute filter: ${attributeRelevantMatches.length}`);
    console.log(`   After AI justification: ${aiFilteredMatches.length}`);
    console.log(`   After quality filter: ${enhancedQuotes.length}`);
    console.log(`   Unique conversations: ${sources.size}`);
    console.log(`   Unique speakers: ${speakers.size}`);
    console.log(`   Final selection: ${Math.min(topK, rankedQuotes.length)}`);
    
    // Enhanced logging for top quotes
    rankedQuotes.slice(0, topK).forEach((q, i) => {
      console.log(`   Top Quote ${i + 1}: quality=${q.qualityMetrics?.quoteScore?.toFixed(2)} diversity=${q.qualityMetrics?.speakerDiversityScore?.toFixed(2)} final=${q.qualityMetrics?.finalScore?.toFixed(3)} speaker="${q.speaker}"`);
    });

    const finalQuotes = rankedQuotes.slice(0, topK);
    console.log(`✅ Retrieved ${finalQuotes.length} high-quality, ${attributeType || 'general'}-validated quotes for assumption ${assumptionId}`);
    
    return finalQuotes.map(q => ({
      text: q.text,
      speaker: q.speaker,
      role: q.role,
      source: q.source,
      classification: q.classification,
      score: q.score,
      topic_relevance: q.topic_relevance,
      specificity_score: q.specificity_score,
      companySnapshot: q.companySnapshot
    }));
  } catch (error) {
    console.error('Error getting top quotes for synthesis:', error);
    return [];
  }
}

/**
 * ✅ Shared BuyerMap Quote Validation Prompt Builder
 * 🌍 INDUSTRY-AGNOSTIC - Works across all business domains and client types
 * 
 * Single prompt builder for all 6 BuyerMap attributes with consistent validation logic
 */
export const buildBuyerMapValidationPrompt = (
  attributeName: string,
  assumption: string,
  quotes: { text: string; speaker: string; role: string }[]
): string => {
  const formattedQuotes = quotes.map((q, i) => 
    `${i + 1}. "${q.text}" — ${q.speaker} (${q.role})`
  ).join('\n');

  return `You are validating this BuyerMap attribute: ${attributeName}

Assumption:
"${assumption}"

Quotes:
${formattedQuotes}

Your task:
✅ Identify quotes that provide strong signal for this attribute. For example:
- For Buyer Titles: quotes that specify who buys, decides, or recommends.
- For Company Size: quotes that reference firm size, scale, or employee count in relation to the product.
- For Pain Points: quotes that clearly describe struggles, challenges, or problems the product addresses.
- For Desired Outcomes: quotes that express goals, improvements, or benefits sought.
- For Triggers: quotes that describe events, conditions, or timing that led to the need for the product.
- For Barriers: quotes that mention obstacles, hesitations, or reasons adoption might be difficult.

✅ Exclude quotes that simply describe usage, features, or generic positive sentiment without linking to this attribute.

✅ Identify gaps where the assumption isn't supported and summarize any alternative patterns found.

Respond in JSON:
{
  "supportsAssumption": true | false,
  "contradictsAssumption": true | false,
  "gapReasoning": "...",
  "foundInstead": "...",
  "summary": "...",
  "quoteAssessments": [
    {
      "quote": "...",
      "supports": true | false,
      "contradicts": true | false,
      "reason": "..."
    }
  ]
}`;
};

/**
 * ✅ TypeScript Types for BuyerMap Quote Validation
 */
export interface QuoteAssessment {
  quote: string;
  supports: boolean;
  contradicts: boolean;
  reason: string;
}

export interface BuyerMapValidationResponse {
  supportsAssumption: boolean;
  contradictsAssumption: boolean;
  gapReasoning: string;
  foundInstead: string;
  summary: string;
  quoteAssessments: QuoteAssessment[];
  // Optional legacy fields for backward compatibility
  recommendedAction?: string;
  evidenceQuality?: string;
  attributeType?: string;
}

/**
 * ✅ Helper function to map attribute types to display names
 */
export const getAttributeDisplayName = (attributeType?: string): string => {
  const attributeMap = {
    'buyer-titles': 'Buyer Titles',
    'company-size': 'Company Size', 
    'pain-points': 'Pain Points',
    'desired-outcomes': 'Desired Outcomes',
    'triggers': 'Triggers',
    'barriers': 'Barriers',
    'messaging-emphasis': 'Messaging Emphasis'
  };
  
  return attributeMap[attributeType as keyof typeof attributeMap] || 'BuyerMap Attribute';
};

/**
 * ✅ Legacy Gap Reasoning Prompt Builder (Buyer Identity Only)
 * 🔄 Maintained for backward compatibility - calls shared prompt builder
 */
export const buildGapReasoningPrompt = (assumption: string, quotes: any[]): string => {
  return buildBuyerMapValidationPrompt('Buyer Titles', assumption, quotes);
};

/**
 * ✅ Enhanced Gap Reasoning Prompt Builder (All Attributes)
 * 🔄 Updated to use shared prompt builder with attribute mapping
 */
export const buildEnhancedGapReasoningPrompt = (
  assumption: string, 
  quotes: any[], 
  attributeType?: string
): string => {
  const attributeName = getAttributeDisplayName(attributeType);
  return buildBuyerMapValidationPrompt(attributeName, assumption, quotes);
};

/**
 * ✅ Comprehensive Assumption Validation with Enhanced Gap Analysis
 * 🌍 INDUSTRY-AGNOSTIC - Works across all business domains and client types
 * 
 * Combines enhanced filtering + gap reasoning + relevance scoring for complete validation
 */
export const validateAssumptionWithGapAnalysis = async (
  assumptionText: string,
  assumptionId: number,
  attributeType?: string,
  topK: number = 10
) => {
  console.log(`\n🔍 === COMPREHENSIVE ASSUMPTION VALIDATION ===`);
  console.log(`📋 Assumption: "${assumptionText}"`);
  console.log(`🎯 Attribute Type: ${attributeType || 'general'}`);
  console.log(`📊 Analyzing top ${topK} quotes...\n`);

  try {
    // Step 1: Get relevant quotes using enhanced filtering
    console.log('🔍 Step 1: Enhanced Quote Retrieval...');
    const quotes = await fetchRelevantQuotes(
      assumptionId, 
      topK, 
      assumptionText, 
      attributeType
    );
    
    console.log(`   Found ${quotes.length} potentially relevant quotes`);

    if (quotes.length === 0) {
      return {
        status: 'no_quotes_found',
        assumption: assumptionText,
        attributeType: attributeType || 'general',
        totalQuotes: 0,
        relevantQuotes: 0,
        gapAnalysis: {
          supportsAssumption: false,
          contradictsAssumption: false,
          gapReasoning: "No quotes found matching the search criteria",
          foundInstead: "No relevant data available",
          summary: "Insufficient data to validate assumption",
          evidenceQuality: "low",
          recommendedAction: "expand data collection"
        }
      };
    }

    // Step 2: Apply enhanced relevance scoring
    console.log('📊 Step 2: Enhanced Relevance Scoring...');
    const scoredQuotes = quotes.map(quote => ({
      ...quote,
      relevanceScore: scoreQuoteRelevanceEnhanced(quote, attributeType)
    })).filter(q => q.relevanceScore >= 1) // Filter out low relevance
      .sort((a, b) => b.relevanceScore - a.relevanceScore); // Sort by relevance

    console.log(`   ${scoredQuotes.length} quotes passed relevance filtering`);
    
    if (scoredQuotes.length === 0) {
      return {
        status: 'no_relevant_quotes',
        assumption: assumptionText,
        attributeType: attributeType || 'general', 
        totalQuotes: quotes.length,
        relevantQuotes: 0,
        gapAnalysis: {
          supportsAssumption: false,
          contradictsAssumption: false,
          gapReasoning: "Quotes found but none are relevant to the assumption focus",
          foundInstead: "General content without specific validation evidence",
          summary: "No relevant evidence found for assumption validation",
          evidenceQuality: "low",
          recommendedAction: "refine search criteria or expand data sources"
        }
      };
    }

    // Step 3: Enhanced gap reasoning analysis using shared prompt builder
    console.log('🧠 Step 3: AI-Powered Gap Analysis...');
    const attributeName = getAttributeDisplayName(attributeType);
    // Convert quotes to the required format with default values for undefined fields
    const formattedQuotes = scoredQuotes.map(q => ({
      text: q.text,
      speaker: q.speaker || 'Unknown',
      role: q.role || 'Unknown'
    }));
    const prompt = buildBuyerMapValidationPrompt(attributeName, assumptionText, formattedQuotes);
    
    let gapAnalysis: BuyerMapValidationResponse;
    try {
      if (!openai) {
        throw new Error('OpenAI client not available');
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      gapAnalysis = JSON.parse(content) as BuyerMapValidationResponse;
      console.log(`   ✅ AI analysis completed`);

    } catch (error) {
      console.log(`   ⚠️ AI analysis failed, using fallback analysis`);
      // Fallback analysis with proper typing
      gapAnalysis = {
        supportsAssumption: false,
        contradictsAssumption: false,
        gapReasoning: "Unable to perform AI analysis - manual review required",
        foundInstead: "Analysis pending",
        summary: "AI validation unavailable",
        quoteAssessments: scoredQuotes.slice(0, 5).map(q => ({
          quote: q.text,
          supports: false,
          contradicts: false,
          reason: "AI analysis unavailable"
        }))
      };
    }

    // Step 4: Calculate filtering statistics
    const filteringStats = {
      originalQuoteCount: quotes.length,
      relevantQuoteCount: scoredQuotes.length,
      filteringEfficiency: quotes.length > 0 ? (scoredQuotes.length / quotes.length * 100).toFixed(1) + '%' : '0%',
      averageRelevanceScore: scoredQuotes.length > 0 
        ? (scoredQuotes.reduce((sum, q) => sum + q.relevanceScore, 0) / scoredQuotes.length).toFixed(1)
        : '0',
      attributeType: attributeType || 'general'
    };

    console.log('\n📊 === VALIDATION RESULTS ===');
    console.log(`✅ Status: Analysis Complete`);
    console.log(`📈 Filtering: ${filteringStats.originalQuoteCount} → ${filteringStats.relevantQuoteCount} quotes (${filteringStats.filteringEfficiency} efficiency)`);
    console.log(`🎯 Average Relevance: ${filteringStats.averageRelevanceScore}/3`);
    console.log(`🧠 Gap Analysis: ${gapAnalysis.supportsAssumption ? '✅ Supports' : '❌ No Support'} | ${gapAnalysis.contradictsAssumption ? '⚠️ Contradicts' : '✅ No Contradiction'}`);
    console.log(`💡 Recommendation: ${gapAnalysis.recommendedAction}`);

    return {
      status: 'validation_complete',
      assumption: assumptionText,
      attributeType: attributeType || 'general',
      totalQuotes: quotes.length,
      relevantQuotes: scoredQuotes.length,
      gapAnalysis,
      filteringStats,
      topQuotes: scoredQuotes.slice(0, 5).map(q => ({
        text: q.text,
        speaker: q.speaker,
        role: q.role,
        relevanceScore: q.relevanceScore,
        source: q.source || 'Interview'
      }))
    };

  } catch (error) {
    console.error('❌ Validation error:', error);
    return {
      status: 'validation_error',
      assumption: assumptionText,
      attributeType: attributeType || 'general',
      error: error instanceof Error ? error.message : 'Unknown error',
      recommendedAction: 'retry with different parameters'
    };
  }
};

/**
 * ✅ Enhanced Quote Relevance Scoring for ALL BuyerMap Attributes
 * Scores quotes based on content relevance to specific attribute types
 */
export const scoreQuoteRelevanceEnhanced = (
  quote: { text: string; role?: string; speaker?: string }, 
  attributeType?: string
): number => {
  const text = quote.text.toLowerCase();
  const role = (quote.role || '').toLowerCase();
  const speaker = (quote.speaker || '').toLowerCase();

  // Base scoring by attribute type
  const attributeScoring = {
    'buyer-titles': () => {
      // Role-based scoring (industry-agnostic) - ENHANCED
      let roleScore = 0;
      if (/owner|ceo|president|founder|partner|principal/.test(role)) {
        roleScore = 3; // Strong buyer signal (universal executive roles)
      } else if (/director|manager|decision|vp|vice president|chief|head of/.test(role)) {
        roleScore = 2; // Possible buyer signal (universal management roles)
      } else if (/assistant|coordinator|analyst|specialist|associate/.test(role)) {
        roleScore = 1; // User, not buyer (universal support roles)
      }

      // Content-based scoring for buyer identity (industry-neutral) - ENHANCED
      let contentScore = 0;
      if (/i decide|i choose|i approve|my decision|i purchase|i buy|i select/.test(text)) {
        contentScore += 2; // Strong decision-making language
      }
      if (/i evaluate|i recommend|i sign off|i authorize|my role is/.test(text)) {
        contentScore += 1; // Moderate decision involvement
      }
      
      // NEW: Role management and delegation insights
      if (/paralegal.*manag|paralegal.*handl|paralegal.*oversee|paralegal.*responsib/i.test(text)) {
        contentScore += 2; // Paralegal management insights
      }
      if (/attorney.*delegat|attorney.*assign|attorney.*supervis/i.test(text)) {
        contentScore += 2; // Attorney delegation insights
      }
      if (/coordinator.*manag|coordinator.*oversee|coordinator.*responsib/i.test(text)) {
        contentScore += 2; // Coordinator management insights
      }
      if (/our.*paralegal|our.*attorney|our.*coordinator|the.*paralegal|the.*attorney|the.*coordinator/i.test(text)) {
        contentScore += 1; // Organizational role references
      }
      if (/manag.*paralegal|supervis.*paralegal|oversee.*paralegal/i.test(text)) {
        contentScore += 2; // Management of paralegals
      }
      if (/delegat.*to|assign.*to|handl.*for/i.test(text)) {
        contentScore += 1; // Delegation language
      }

      return Math.min(3, roleScore + contentScore);
    },

    'company-size': () => {
      let score = 0;
      // Explicit size mentions (industry-neutral)
      if (/\d+\s*(employee|people|staff|person|worker|member)/.test(text)) {
        score += 3; // Specific numbers
      }
      if (/small company|large company|mid-size|enterprise|startup|boutique|solo business|one-person/.test(text)) {
        score += 2; // Size descriptors
      }
      if (/our company|our business|our organization|our office|our team|we are/.test(text)) {
        score += 1; // Organizational context
      }
      // Role relevance for size discussions (universal)
      if (/partner|owner|founder|director|manager|executive/.test(role)) {
        score += 1; // Likely to know company size
      }
      return Math.min(3, score);
    },

    'pain-points': () => {
      let score = 0;
      // Strong pain indicators
      if (/problem|issue|challenge|difficulty|struggle|frustration/.test(text)) {
        score += 2; // Direct pain language
      }
      if (/hard to|difficult to|can't|unable to|fails to|doesn't work/.test(text)) {
        score += 2; // Inability statements
      }
      if (/takes too long|too much time|expensive|costly|waste/.test(text)) {
        score += 2; // Resource drain
      }
      // Moderate pain indicators
      if (/slow|tedious|manual|time-consuming|overwhelming|confusing/.test(text)) {
        score += 1; // Process issues
      }
      // Role relevance (universal)
      if (/user|practitioner|specialist|professional|operator/.test(role)) {
        score += 1; // End users likely to express pain
      }
      return Math.min(3, score);
    },

    'desired-outcomes': () => {
      let score = 0;
      // Strong outcome language
      if (/goal|objective|want|need|looking for|trying to|hope/.test(text)) {
        score += 2; // Direct goal statements
      }
      if (/save time|reduce cost|improve|better|faster|easier/.test(text)) {
        score += 2; // Specific improvements
      }
      if (/success|roi|return on investment|competitive|advantage/.test(text)) {
        score += 2; // Business outcomes
      }
      // Moderate outcome indicators
      if (/efficient|effective|quality|professional|organized/.test(text)) {
        score += 1; // Quality improvements
      }
      // Role relevance
      if (/director|manager|partner|owner/.test(role)) {
        score += 1; // Decision makers set goals
      }
      return Math.min(3, score);
    },

    'triggers': () => {
      let score = 0;
      // Strong trigger language
      if (/when|timing|urgent|crisis|emergency|deadline|pressure/.test(text)) {
        score += 2; // Timing/urgency indicators
      }
      if (/growing|expanding|hiring|new cases|more clients|busy/.test(text)) {
        score += 2; // Growth triggers
      }
      if (/compliance|regulation|audit|requirement|mandate/.test(text)) {
        score += 2; // Regulatory triggers
      }
      // Moderate trigger indicators
      if (/change|transition|upgrade|implement|start|begin/.test(text)) {
        score += 1; // Change indicators
      }
      // Role relevance
      if (/manager|director|partner|compliance/.test(role)) {
        score += 1; // Likely to discuss triggers
      }
      return Math.min(3, score);
    },

    'barriers': () => {
      let score = 0;
      // Strong barrier language
      if (/barrier|obstacle|resistance|concern|worry|fear|risk/.test(text)) {
        score += 2; // Direct barrier terms
      }
      if (/budget|cost|expensive|afford|training|complex/.test(text)) {
        score += 2; // Common barrier types
      }
      if (/hesitation|doubt|skeptical|cautious|approval/.test(text)) {
        score += 2; // Resistance indicators
      }
      // Moderate barrier indicators
      if (/difficult|complicated|time|resources|priorities/.test(text)) {
        score += 1; // Resource constraints
      }
      // Role relevance
      if (/director|manager|admin/.test(role)) {
        score += 1; // Likely to face barriers
      }
      return Math.min(3, score);
    },

    'messaging-emphasis': () => {
      let score = 0;
      // Strong messaging indicators
      if (/important|matters|priority|focus|key|critical|essential/.test(text)) {
        score += 2; // Priority language
      }
      if (/value|benefit|advantage|unique|different|special/.test(text)) {
        score += 2; // Value proposition terms
      }
      if (/convince|persuade|demonstrate|prove|show|example/.test(text)) {
        score += 2; // Persuasion context
      }
      // Moderate messaging indicators
      if (/message|communication|explain|tell|inform/.test(text)) {
        score += 1; // Communication context
      }
      // Role relevance
      if (/marketing|sales|director|manager/.test(role)) {
        score += 1; // Likely to discuss messaging
      }
      return Math.min(3, score);
    }
  };

  // Get attribute-specific score or default to buyer-titles
  const scoringFunction = attributeType && attributeScoring[attributeType as keyof typeof attributeScoring]
    ? attributeScoring[attributeType as keyof typeof attributeScoring]
    : attributeScoring['buyer-titles'];

  return scoringFunction();
};

/**
 * ✅ Enhanced Quote Filtering with Attribute-Specific Relevance
 */
export const filterRelevantQuotesEnhanced = (
  quotes: { text: string; role?: string; speaker?: string }[], 
  minScore = 2,
  attributeType?: string
) => {
  return quotes
    .map(q => ({ 
      ...q, 
      relevanceScore: scoreQuoteRelevanceEnhanced(q, attributeType),
      attributeType: attributeType || 'buyer-titles'
    }))
    .filter(q => q.relevanceScore >= minScore)
    .sort((a, b) => b.relevanceScore - a.relevanceScore); // Sort by relevance
};

/**
 * Original functions (maintained for backward compatibility)
 */
export const scoreQuoteRelevance = (quote: { text: string; role: string }): number => {
  return scoreQuoteRelevanceEnhanced(quote, 'buyer-titles');
};

export const filterRelevantQuotes = (quotes: { text: string; role: string }[], minScore = 2) => {
  return filterRelevantQuotesEnhanced(quotes, minScore, 'buyer-titles');
};

/**
 * ✅ Enhanced Vector Similarity Filtering for ALL BuyerMap Attributes
 * Uses attribute-specific similarity thresholds and combines with relevance scoring
 */
export const getAttributeSpecificSimilarityThreshold = (attributeType?: string): number => {
  // Attribute-specific similarity thresholds based on content characteristics
  const thresholds = {
    'buyer-titles': 0.85,           // High threshold - titles should be precise
    'company-size': 0.75,           // Lower threshold - size can be expressed many ways
    'pain-points': 0.70,            // Lower threshold - pain expressed with varied language
    'desired-outcomes': 0.75,       // Medium threshold - goals have varied expressions
    'triggers': 0.70,               // Lower threshold - triggers have diverse contexts
    'barriers': 0.75,               // Medium threshold - barriers vary by situation
    'messaging-emphasis': 0.80      // Higher threshold - messaging should be more precise
  };

  return attributeType && thresholds[attributeType as keyof typeof thresholds]
    ? thresholds[attributeType as keyof typeof thresholds]
    : 0.80; // Default threshold
};

/**
 * ✅ Enhanced Pinecone Query with Attribute-Aware Filtering
 * Combines vector similarity with relevance scoring for optimal results
 */
export async function queryPineconeEnhanced(
  queryText: string,
  topK = 5,
  attributeType?: string,
  assumptionId?: number,
  enableRelevanceBoost = true
) {
  if (!openai) {
    console.warn('OpenAI client not initialized - skipping enhanced Pinecone query');
    return { matches: [], filteringStats: {} };
  }

  try {
    const index = getPineconeIndex();
    
    // Get attribute-specific similarity threshold
    const similarityThreshold = getAttributeSpecificSimilarityThreshold(attributeType);
    
    console.log(`🎯 [DEBUG] Enhanced Pinecone query for ${attributeType || 'general'}:`);
    console.log(`   Query: "${queryText}"`);
    console.log(`   Similarity threshold: ${similarityThreshold}`);
    console.log(`   TopK: ${topK}`);

    // Create embedding for the query
    const queryEmbed = (await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: [queryText],
    })).data[0].embedding;

    // Get namespaced index for interviews
    const namespacedIndex = index.namespace('interviews');
    
    // Build query options
    const queryOptions: any = {
      vector: queryEmbed,
      topK: topK * 3, // Get more results for enhanced filtering
      includeMetadata: true,
    };

    // Add assumption filter if provided
    if (assumptionId) {
      queryOptions.filter = { assumptionId: assumptionId.toString() };
    }

    // Query Pinecone
    const vectorResult = await namespacedIndex.query(queryOptions);

    console.log(`📊 [DEBUG] Raw Pinecone results: ${vectorResult.matches?.length || 0} matches`);

    // Step 1: Filter by similarity threshold
    const similarityFiltered = vectorResult.matches?.filter(m => 
      m.score !== undefined && m.score >= similarityThreshold
    ) || [];

    console.log(`🔍 [DEBUG] Similarity filtered (>=${similarityThreshold}): ${similarityFiltered.length} matches`);

    // Step 2: Apply attribute-specific relevance boost if enabled
    let finalMatches: any[] = similarityFiltered;
    if (enableRelevanceBoost && attributeType) {
      finalMatches = similarityFiltered.map(match => {
        // Calculate relevance score for the match
        const metadata = match.metadata as any;
        const quote = {
          text: String(metadata?.text || ''),
          role: String(metadata?.role || ''),
          speaker: String(metadata?.speaker || '')
        };
        
        const relevanceScore = scoreQuoteRelevanceEnhanced(quote, attributeType);
        
        // Combine vector similarity with relevance score
        // Vector similarity: 0.0-1.0, Relevance score: 0-3
        // Normalize relevance to 0.0-1.0 and create composite score
        const normalizedRelevance = relevanceScore / 3.0;
        const compositeScore = (match.score! * 0.7) + (normalizedRelevance * 0.3);
        
        return {
          ...match,
          originalScore: match.score,
          relevanceScore,
          compositeScore
        };
      }).sort((a: any, b: any) => b.compositeScore - a.compositeScore); // Sort by composite score
    }

    // Step 3: Apply final attribute filtering if specified
    if (attributeType) {
      const attributeFiltered = filterByAllAttributeRelevance(
        finalMatches.map(m => ({ metadata: m.metadata })), 
        attributeType
      );
      
      // Map back to original structure with scores preserved
      finalMatches = finalMatches.filter(match => 
        attributeFiltered.some(filtered => 
          filtered.metadata?.text === match.metadata?.text
        )
      );
    }

    console.log(`✅ [DEBUG] Final enhanced results: ${finalMatches.length} matches`);
    if (enableRelevanceBoost && finalMatches.length > 0) {
      console.log('📈 [DEBUG] Top matches with composite scoring:');
      finalMatches.slice(0, 3).forEach((match: any, i) => {
        console.log(`   [${i}] Vector: ${match.originalScore?.toFixed(3)}, Relevance: ${match.relevanceScore}/3, Composite: ${match.compositeScore?.toFixed(3)}`);
      });
    }

    return {
      matches: finalMatches.slice(0, topK), // Return requested number
      filteringStats: {
        originalCount: vectorResult.matches?.length || 0,
        similarityFiltered: similarityFiltered.length,
        finalCount: finalMatches.slice(0, topK).length,
        attributeType: attributeType || 'general',
        similarityThreshold,
        relevanceBoostEnabled: enableRelevanceBoost
      }
    };

  } catch (error) {
    console.error('Error in enhanced Pinecone query:', error);
    return { 
      matches: [], 
      filteringStats: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        attributeType: attributeType || 'general'
      } 
    };
  }
}

/**
 * ✅ Simplified Enhanced Query Function
 * Easy-to-use wrapper for the enhanced Pinecone querying
 */
export async function queryWithAttributeAwareness(
  queryText: string,
  attributeType?: string,
  options: {
    topK?: number;
    assumptionId?: number;
    enableRelevanceBoost?: boolean;
  } = {}
) {
  const { topK = 5, assumptionId, enableRelevanceBoost = true } = options;
  
  return await queryPineconeEnhanced(
    queryText,
    topK,
    attributeType,
    assumptionId,
    enableRelevanceBoost
  );
}

/**
 * Original similarity filtering function (maintained for backward compatibility)
 */
export const filterBySimilarityThreshold = (matches: any[], threshold = 0.8) => {
  const filteredMatches = matches.filter(m => m.score >= threshold);
  
  console.log("🔍 [DEBUG] Pinecone matches filtered:", filteredMatches.map(m => ({
    score: m.score,
    id: m.id,
    metadata: m.metadata
  })));
  
  return filteredMatches;
};

/**
 * ✅ Enhanced Pinecone Index Verification with Attribute Testing
 * Tests the enhanced vector similarity filtering across all BuyerMap attributes
 */
export const verifyPineconeIndexEnhanced = async () => {
  console.log('\n🔍 === ENHANCED PINECONE INDEX VERIFICATION ===\n');
  
  try {
    const index = getPineconeIndex();
    
    // Basic index stats
    const stats = await index.describeIndexStats();
    console.log("📊 Pinecone index stats:", JSON.stringify(stats, null, 2));
    
    // Test namespaced access
    const namespacedIndex = index.namespace('interviews');
    const namespaceStats = await namespacedIndex.describeIndexStats();
    console.log("🎯 Interviews namespace stats:", JSON.stringify(namespaceStats, null, 2));
    
    // Test attribute-specific threshold calculations
    console.log('\n📏 Attribute-Specific Similarity Thresholds:');
    const attributeTypes = ['buyer-titles', 'company-size', 'pain-points', 'desired-outcomes', 'triggers', 'barriers', 'messaging-emphasis'];
    
    attributeTypes.forEach(attributeType => {
      const threshold = getAttributeSpecificSimilarityThreshold(attributeType);
      console.log(`   ${attributeType}: ${threshold} (${threshold < 0.8 ? 'More inclusive' : 'More precise'} than default 0.8)`);
    });
    
    return {
      indexStats: stats,
      namespaceStats,
      attributeThresholds: Object.fromEntries(
        attributeTypes.map(attr => [attr, getAttributeSpecificSimilarityThreshold(attr)])
      ),
      status: 'verified'
    };
    
  } catch (error) {
    console.error('❌ Pinecone verification failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'failed'
    };
  }
};

/**
 * ✅ Test Enhanced Vector Querying with Sample Queries
 * Runs sample queries to test the enhanced filtering system
 */
export const testEnhancedVectorQueries = async () => {
  console.log('\n🧪 === TESTING ENHANCED VECTOR QUERIES ===\n');
  
  const testQueries = [
    {
      query: "Who are the decision makers in the organization",
      attributeType: 'buyer-titles',
      description: 'Testing buyer title identification'
    },
    {
      query: "What size companies are we targeting",
      attributeType: 'company-size',
      description: 'Testing company size detection'
    },
    {
      query: "What problems do customers face daily",
      attributeType: 'pain-points',
      description: 'Testing pain point discovery'
    },
    {
      query: "What goals do buyers want to achieve",
      attributeType: 'desired-outcomes',
      description: 'Testing outcome identification'
    },
    {
      query: "What triggers the need for our solution",
      attributeType: 'triggers',
      description: 'Testing trigger detection'
    }
  ];
  
  const results = [];
  
  for (const testCase of testQueries) {
    console.log(`\n🔍 ${testCase.description}`);
    console.log(`   Query: "${testCase.query}"`);
    console.log(`   Attribute: ${testCase.attributeType}`);
    
    try {
      const result = await queryWithAttributeAwareness(
        testCase.query,
        testCase.attributeType,
        { topK: 3, enableRelevanceBoost: true }
      );
      
      console.log(`   ✅ Results: ${result.matches.length} matches`);
      if (result.filteringStats) {
        console.log(`   📊 Filtering: ${result.filteringStats.originalCount} → ${result.filteringStats.finalCount} (${result.filteringStats.similarityThreshold} threshold)`);
      }
      
      // Show top match details
      if (result.matches.length > 0) {
        const topMatch = result.matches[0] as any;
        console.log(`   🥇 Top match score: ${topMatch.compositeScore?.toFixed(3) || topMatch.score?.toFixed(3)}`);
      }
      
      results.push({
        ...testCase,
        success: true,
        matchCount: result.matches.length,
        filteringStats: result.filteringStats
      });
      
    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
      results.push({
        ...testCase,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  // Summary
  const successful = results.filter(r => r.success).length;
  console.log(`\n📈 Test Summary: ${successful}/${results.length} queries successful`);
  
  return results;
};

/**
 * ✅ Comprehensive Pinecone Diagnostics
 * Full diagnostic suite for the enhanced RAG system
 */
export const runPineconeDiagnostics = async () => {
  console.log('\n🔬 === COMPREHENSIVE PINECONE DIAGNOSTICS ===\n');
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    indexVerification: null as any,
    queryTests: null as any,
    embeddingTest: null as any,
    filteringTest: null as any
  };
  
  // 1. Index verification
  console.log('1️⃣ Verifying Pinecone index...');
  diagnostics.indexVerification = await verifyPineconeIndexEnhanced();
  
  // 2. Query tests
  console.log('\n2️⃣ Testing enhanced vector queries...');
  diagnostics.queryTests = await testEnhancedVectorQueries();
  
  // 3. Embedding test
  console.log('\n3️⃣ Testing embedding generation...');
  try {
         if (openai) {
       const testText = "This is a test query for business professionals";
       const embedding = await openai.embeddings.create({
         model: 'text-embedding-ada-002',
         input: [testText]
       });
      
      diagnostics.embeddingTest = {
        success: true,
        embeddingLength: embedding.data[0].embedding.length,
        model: 'text-embedding-ada-002'
      };
      console.log(`   ✅ Embedding generated: ${embedding.data[0].embedding.length} dimensions`);
    } else {
      diagnostics.embeddingTest = {
        success: false,
        error: 'OpenAI client not initialized'
      };
      console.log('   ❌ OpenAI client not available');
    }
  } catch (error) {
    diagnostics.embeddingTest = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    console.log(`   ❌ Embedding test failed: ${error}`);
  }
  
  // 4. Filtering test
  console.log('\n4️⃣ Testing attribute filtering...');
  try {
         const mockQuotes = [
       { metadata: { text: "As a manager, I need better project management", role: "manager" } },
       { metadata: { text: "Our company has 5 employees and growing", role: "owner" } },
       { metadata: { text: "The biggest problem is time management", role: "coordinator" } },
       { metadata: { text: "We want to improve our efficiency", role: "director" } }
     ];
    
    const buyerTitleFiltered = filterByAllAttributeRelevance(mockQuotes, 'buyer-titles');
    const painPointFiltered = filterByAllAttributeRelevance(mockQuotes, 'pain-points');
    
    diagnostics.filteringTest = {
      success: true,
      originalCount: mockQuotes.length,
      buyerTitleMatches: buyerTitleFiltered.length,
      painPointMatches: painPointFiltered.length
    };
    
    console.log(`   ✅ Filtering test: ${mockQuotes.length} → ${buyerTitleFiltered.length} buyer titles, ${painPointFiltered.length} pain points`);
  } catch (error) {
    diagnostics.filteringTest = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    console.log(`   ❌ Filtering test failed: ${error}`);
  }
  
  // Final summary
  console.log('\n📋 === DIAGNOSTIC SUMMARY ===');
  console.log(`🗓️  Timestamp: ${diagnostics.timestamp}`);
  console.log(`🔍 Index Status: ${diagnostics.indexVerification?.status || 'unknown'}`);
  console.log(`🧪 Query Tests: ${diagnostics.queryTests?.filter((t: any) => t.success).length || 0}/${diagnostics.queryTests?.length || 0} passed`);
  console.log(`🎯 Embedding: ${diagnostics.embeddingTest?.success ? 'Working' : 'Failed'}`);
  console.log(`⚡ Filtering: ${diagnostics.filteringTest?.success ? 'Working' : 'Failed'}`);
  
  return diagnostics;
};

/**
 * Original verification function (maintained for backward compatibility)
 */
export const verifyPineconeIndex = async () => {
  const index = getPineconeIndex();
  const stats = await index.describeIndexStats();
  console.log("📊 Pinecone index stats:", JSON.stringify(stats, null, 2));
  return stats;
};

// Configuration for quote filtering thresholds
export const QUOTE_FILTERING_CONFIG = {
  // Minimum relevance score (0-3 scale) for quotes to be included
  MIN_RELEVANCE_SCORE: 1.0, // Loosened from 2.0 to capture more nuanced insights
  
  // Minimum quality score (0-1 scale) for quote quality
  MIN_QUALITY_SCORE: 0.7, // Increased from 0.6 to be stricter on quality
  
  // Minimum vector similarity score (0-1 scale) from Pinecone
  MIN_SIMILARITY_SCORE: 0.7,
  
  // Maximum quotes to show per assumption (after filtering)
  MAX_QUOTES_PER_ASSUMPTION: 5,
  
  // Whether to enable AI-powered filtering
  ENABLE_AI_FILTERING: true,
  
  // Whether to show relevance scores in UI
  SHOW_RELEVANCE_SCORES: true
};

// Enhanced quote filtering with configurable thresholds
export const filterQuotesByRelevance = (
  quotes: EnhancedQuote[], 
  attributeType?: string,
  config = QUOTE_FILTERING_CONFIG
): EnhancedQuote[] => {
  return quotes
    .map(quote => ({
      ...quote,
      relevanceScore: scoreQuoteRelevanceEnhanced(quote, attributeType),
      qualityScore: calculateQuoteQuality(quote)
    }))
    .filter(quote => 
      quote.relevanceScore >= config.MIN_RELEVANCE_SCORE &&
      quote.qualityScore >= config.MIN_QUALITY_SCORE &&
      (quote.score || 0) >= config.MIN_SIMILARITY_SCORE
    )
    .sort((a, b) => {
      // Sort by composite score: relevance + quality + diversity
      const aScore = (a.relevanceScore * 0.5) + (a.qualityScore * 0.3) + ((a.score || 0) * 0.2);
      const bScore = (b.relevanceScore * 0.5) + (b.qualityScore * 0.3) + ((b.score || 0) * 0.2);
      return bScore - aScore;
    })
    .slice(0, config.MAX_QUOTES_PER_ASSUMPTION);
}; 

// Relevance Filtering Configuration
export const RELEVANCE_FILTERING_CONFIG = {
  // Minimum relevance score to include a quote (0-3 scale) - LOOSENED
  MIN_RELEVANCE_SCORE: 0.8, // Loosened from 1.5 to capture more role/title insights
  
  // Maximum number of quotes to show per assumption after filtering
  MAX_QUOTES_PER_ASSUMPTION: 5,
  
  // Whether to show relevance scores in the UI
  SHOW_RELEVANCE_SCORES: true,
  
  // Whether to sort quotes by relevance score
  SORT_BY_RELEVANCE: true,
  
  // Attribute-specific relevance thresholds (0-3 scale) - LOOSENED for buyer-titles
  ATTRIBUTE_THRESHOLDS: {
    'buyer-titles': 0.5, // Loosened from 1.0 to capture more role insights
    'company-size': 1.0, // Loosened from 1.5
    'pain-points': 1.5, // Loosened from 2.0
    'desired-outcomes': 1.5, // Loosened from 2.0
    'triggers': 1.0, // Loosened from 1.5
    'barriers': 1.0, // Loosened from 1.5
    'messaging-emphasis': 1.0 // Loosened from 1.5
  }
};