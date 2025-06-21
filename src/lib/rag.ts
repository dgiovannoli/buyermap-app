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
 * Enhanced quote quality scoring based on product marketing principles
 */
function calculateQuoteQuality(quote: EnhancedQuote): number {
  const text = quote.text || '';
  const wordCount = text.split(' ').length;
  
  let qualityScore = 0;
  
  // Length quality (sweet spot 15-40 words)
  if (wordCount >= 15 && wordCount <= 40) {
    qualityScore += 0.3;
  } else if (wordCount >= 8 && wordCount <= 60) {
    qualityScore += 0.15;
  }
  
  // Specificity indicators
  const specificityIndicators = [
    /\d+/, // Numbers
    /\$\d+/, // Money amounts
    /\d+%/, // Percentages
    /hours?|days?|weeks?|months?|years?/i, // Time references
    /we spend|costs us|takes|saves|reduces/i, // Quantified actions
    /for example|specifically|exactly|precisely/i, // Specificity words
  ];
  
  const specificityMatches = specificityIndicators.reduce((count, regex) => {
    return count + (regex.test(text) ? 1 : 0);
  }, 0);
  
  qualityScore += Math.min(specificityMatches * 0.1, 0.3);
  
  // Penalize buzzwords
  const buzzwords = [
    /strategic advantage/i,
    /leverage synerg/i,
    /optimize|streamline|enhance/i,
    /solution|platform|ecosystem/i,
    /best-in-class|industry-leading/i,
    /innovative|cutting-edge/i
  ];
  
  const buzzwordCount = buzzwords.reduce((count, regex) => {
    return count + (regex.test(text) ? 1 : 0);
  }, 0);
  
  qualityScore -= buzzwordCount * 0.1;
  
  // Reward concrete examples and pain points
  const concreteIndicators = [
    /the problem is|issue is|challenge is/i,
    /we struggle with|difficult to|hard to/i,
    /for instance|like when|such as/i,
    /I remember when|last time|recently/i
  ];
  
  const concreteMatches = concreteIndicators.reduce((count, regex) => {
    return count + (regex.test(text) ? 1 : 0);
  }, 0);
  
  qualityScore += concreteMatches * 0.15;
  
  // Penalize generic satisfaction
  const genericPatterns = [
    /we're happy|it's good|that's great/i,
    /pretty good|really nice|very helpful/i,
    /works fine|does the job/i
  ];
  
  const genericMatches = genericPatterns.reduce((count, regex) => {
    return count + (regex.test(text) ? 1 : 0);
  }, 0);
  
  qualityScore -= genericMatches * 0.2;
  
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
 * @param assumptionId - The ID of the assumption to find relevant quotes for
 * @param topK - Number of top results to return (default: 5)
 * @returns Array of quote metadata objects
 */
export async function fetchRelevantQuotes(assumptionId: number, topK = 5) {
  if (!openai) {
    console.warn('OpenAI client not initialized - skipping RAG retrieval');
    return [];
  }

  try {
    const index = getPineconeIndex();
    
    // Create embedding for the assumption query
    const queryEmbed = (await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: [`Insights for assumption #${assumptionId}`],
    })).data[0].embedding;

    // Get namespaced index for interviews
    const namespacedIndex = index.namespace('interviews');
    
    // Query Pinecone with filter for specific assumption
    const results = await namespacedIndex.query({
      vector: queryEmbed,
      topK: topK * 3, // Get more results for better filtering
      includeMetadata: true,
      filter: { assumptionId: assumptionId.toString() },
    });

    // [DEBUG] Log RAG query results for fetchRelevantQuotes
    console.log(`🔍 [DEBUG] fetchRelevantQuotes for assumption ${assumptionId}:`);
    if (results.matches) {
      results.matches.forEach((m: any, i: number) => {
        console.log(`   [${i}] score=${m.score?.toFixed(3)} text="${m.metadata?.text?.slice(0,200)}"`);
      });
    } else {
      console.log('  No matches found');
    }

    // Convert to enhanced quotes and apply quality ranking
    const enhancedQuotes: EnhancedQuote[] = results.matches
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
 * @param query - Free text query to search for
 * @param topK - Number of top results to return (default: 5)
 * @param assumptionId - Optional filter by assumption ID
 * @returns Array of quote metadata objects
 */
export async function fetchQuotesByQuery(query: string, topK = 5, assumptionId?: number) {
  if (!openai) {
    console.warn('OpenAI client not initialized - skipping RAG retrieval');
    return [];
  }

  try {
    const index = getPineconeIndex();
    
    // Create embedding for the text query
    const queryEmbed = (await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: [query],
    })).data[0].embedding;

    // Get namespaced index for interviews
    const namespacedIndex = index.namespace('interviews');
    
    // Build query options
    const queryOptions: any = {
      vector: queryEmbed,
      topK: topK * 3, // Get more results for quality filtering
      includeMetadata: true,
    };

    // Add assumption filter if provided
    if (assumptionId) {
      queryOptions.filter = { assumptionId: assumptionId.toString() };
    }
    
    // Query Pinecone
    const results = await namespacedIndex.query(queryOptions);

    // [DEBUG] Log RAG query results for fetchQuotesByQuery
    console.log(`🔍 [DEBUG] fetchQuotesByQuery for "${query}" (interviews namespace only):`);
    if (results.matches) {
      results.matches.forEach((m: any, i: number) => {
        const isInterview = m.metadata?.type === 'interview' || m.id?.startsWith('interview-');
        console.log(`   [${i}] score=${m.score?.toFixed(3)} type=${isInterview ? 'INTERVIEW' : 'UNKNOWN'} text="${m.metadata?.text?.slice(0,200)}"`);
      });
    } else {
      console.log('  No matches found');
    }

    // Convert to enhanced quotes and apply quality ranking
    const enhancedQuotes: EnhancedQuote[] = results.matches
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
 * @param assumptionText - The assumption text to find evidence for
 * @param assumptionId - The assumption ID for filtering
 * @param topK - Number of top results to return (default: 5)
 * @returns Array of high-quality quote metadata
 */
export async function getTopQuotesForSynthesis(assumptionText: string, assumptionId: number, topK = 5) {
  if (!openai) {
    console.warn('OpenAI client not initialized - returning empty quotes for synthesis');
    return [];
  }

  try {
    const index = getPineconeIndex();
    
    // Create embedding based on the assumption text for better semantic matching
    const queryEmbed = (await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: [assumptionText],
    })).data[0].embedding;

    // Get namespaced index for interviews
    const namespacedIndex = index.namespace('interviews');
    
    // Query for the most relevant quotes for this specific assumption
    const results = await namespacedIndex.query({
      vector: queryEmbed,
      topK: topK * 4, // Get many more results for comprehensive quality filtering
      includeMetadata: true,
      filter: { assumptionId: assumptionId.toString() },
    });

    // [DEBUG] Log raw RAG matches verbatim before filtering
    console.log('🔍 [DEBUG] RAG matches for assumption:', assumptionText);
    if (results.matches) {
      results.matches.forEach((m: any, i: number) => {
        console.log(`   [${i}] score=${m.score?.toFixed(3)} text="${m.metadata?.text?.slice(0,200)}"`);
      });
    } else {
      console.log('  No matches found');
    }

    // Convert to enhanced quotes with quality filtering
    const enhancedQuotes: EnhancedQuote[] = results.matches
      ?.filter((m: any) => 
        m.metadata?.text && 
        m.metadata.text.length > 20 && 
        m.score && m.score > 0.65 // Slightly lower threshold for more diversity
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
    
    console.log(`📊 Enhanced quality analysis for assumption ${assumptionId}:`);
    console.log(`   Total RAG matches: ${results.matches?.length || 0}`);
    console.log(`   After quality filter: ${enhancedQuotes.length}`);
    console.log(`   Unique conversations: ${sources.size}`);
    console.log(`   Unique speakers: ${speakers.size}`);
    console.log(`   Final selection: ${Math.min(topK, rankedQuotes.length)}`);
    
    // Enhanced logging for top quotes
    rankedQuotes.slice(0, topK).forEach((q, i) => {
      console.log(`   Top Quote ${i + 1}: quality=${q.qualityMetrics?.quoteScore?.toFixed(2)} diversity=${q.qualityMetrics?.speakerDiversityScore?.toFixed(2)} final=${q.qualityMetrics?.finalScore?.toFixed(3)} speaker="${q.speaker}"`);
    });

    const finalQuotes = rankedQuotes.slice(0, topK);
    console.log(`✅ Retrieved ${finalQuotes.length} high-quality quotes for assumption ${assumptionId}`);
    
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