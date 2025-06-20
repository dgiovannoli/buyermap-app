import { getPineconeIndex } from './pinecone';
import OpenAI from 'openai';

// Initialize OpenAI client
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
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
      topK,
      includeMetadata: true,
      filter: { assumptionId: assumptionId.toString() },
    });

    // Return the metadata from matching quotes
    return results.matches?.map(m => m.metadata) || [];
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
      topK,
      includeMetadata: true,
    };

    // Add assumption filter if provided
    if (assumptionId) {
      queryOptions.filter = { assumptionId: assumptionId.toString() };
    }
    
    // Query Pinecone
    const results = await namespacedIndex.query(queryOptions);

    // Return the metadata from matching quotes
    return results.matches?.map(m => ({
      ...m.metadata,
      score: m.score
    })) || [];
  } catch (error) {
    console.error('Error fetching quotes by query:', error);
    return [];
  }
}

/**
 * Get high-quality quotes for synthesis based on assumption
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
      topK: topK * 2, // Get more results to filter for quality
      includeMetadata: true,
      filter: { assumptionId: assumptionId.toString() },
    });

    // Filter and rank results by quality
    const qualityQuotes = results.matches
      ?.filter(m => 
        m.metadata?.text && 
        m.metadata.text.length > 20 && 
        m.score && m.score > 0.7 // Only high-confidence matches
      )
      .slice(0, topK) // Take top K after filtering
      .map(m => ({
        text: m.metadata?.text,
        speaker: m.metadata?.speaker,
        role: m.metadata?.role,
        source: m.metadata?.source,
        classification: m.metadata?.classification,
        score: m.score,
        topic_relevance: m.metadata?.topic_relevance,
        specificity_score: m.metadata?.specificity_score
      })) || [];

    console.log(`✅ Retrieved ${qualityQuotes.length} high-quality quotes for assumption ${assumptionId}`);
    return qualityQuotes;
  } catch (error) {
    console.error('Error getting top quotes for synthesis:', error);
    return [];
  }
} 