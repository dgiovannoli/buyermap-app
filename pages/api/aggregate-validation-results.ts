import type { NextApiRequest, NextApiResponse } from 'next'
import OpenAI from 'openai'

// Initialize OpenAI
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Types
interface Quote {
  text: string;
  speaker?: string;
  role?: string;
  source: string;
  relevanceScore?: number;
}

// Support wrapped quotes like { quote: { text, speaker, ... } }
interface WrappedQuote {
  quote: Quote;
}

interface RequestBody {
  assumption: string;
  quotes: (Quote | WrappedQuote)[];
}

interface ResponseBody {
  realityFromInterviews: string;
  conversationStats?: {
    totalQuotes: number;
    uniqueConversations: number;
    uniqueSpeakers: number;
    conversationCoverage: string;
    speakerDiversity: string;
  };
}

/**
 * Calculate conversation coverage statistics for product marketers
 */
function calculateConversationStats(quotes: Quote[]): NonNullable<ResponseBody['conversationStats']> {
  const sources = new Set(quotes.map(q => q.source).filter(Boolean));
  const speakers = new Set(quotes.map(q => q.speaker).filter(Boolean));
  
  const totalQuotes = quotes.length;
  const uniqueConversations = sources.size;
  const uniqueSpeakers = speakers.size;
  
  // Generate human-readable coverage description
  let conversationCoverage = '';
  if (uniqueConversations === 0) {
    conversationCoverage = 'No conversations available';
  } else if (uniqueConversations === 1) {
    conversationCoverage = '1 conversation only';
  } else if (uniqueConversations <= 3) {
    conversationCoverage = `${uniqueConversations} conversations`;
  } else {
    conversationCoverage = `${uniqueConversations} conversations (strong coverage)`;
  }
  
  // Generate speaker diversity description
  let speakerDiversity = '';
  if (uniqueSpeakers === 0) {
    speakerDiversity = 'No speakers identified';
  } else if (uniqueSpeakers === 1) {
    speakerDiversity = '1 speaker only';
  } else if (uniqueSpeakers === totalQuotes) {
    speakerDiversity = `${uniqueSpeakers} different speakers (high diversity)`;
  } else {
    speakerDiversity = `${uniqueSpeakers} different speakers`;
  }
  
  return {
    totalQuotes,
    uniqueConversations,
    uniqueSpeakers,
    conversationCoverage,
    speakerDiversity
  };
}

// Timeout wrapper
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Request timed out')), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate request body
    const { assumption, quotes }: RequestBody = req.body;

    if (!assumption || typeof assumption !== 'string') {
      return res.status(400).json({ error: 'Invalid assumption: must be a non-empty string' });
    }

    if (!Array.isArray(quotes)) {
      return res.status(400).json({ error: 'Invalid quotes: must be an array' });
    }

    // Flatten quotes - handle both direct quotes and wrapped quotes
    const flattenedQuotes: Quote[] = quotes.map((item) => {
      // Check if quote is wrapped in a quote property
      if (item && typeof item === 'object' && 'quote' in item) {
        return item.quote;
      }
      // Otherwise treat as direct quote
      return item as Quote;
    });

    // Validate flattened quotes structure
    for (const quote of flattenedQuotes) {
      if (!quote || typeof quote !== 'object') {
        return res.status(400).json({ error: 'Invalid quote: must be an object' });
      }
      if (!quote.text || typeof quote.text !== 'string') {
        return res.status(400).json({ error: 'Invalid quote: text field is required and must be a string' });
      }
      // Source is optional after flattening, but if present must be a string
      if (quote.source !== undefined && typeof quote.source !== 'string') {
        return res.status(400).json({ error: 'Invalid quote: source field must be a string if provided' });
      }
    }

    if (!openai) {
      return res.status(500).json({ error: 'OpenAI client not initialized - missing API key' });
    }

    // If no quotes provided, return empty reality
    if (flattenedQuotes.length === 0) {
      console.log('⚠️ No quotes provided for synthesis');
      return res.status(200).json({ 
        realityFromInterviews: 'No interview data available for this assumption.',
        conversationStats: {
          totalQuotes: 0,
          uniqueConversations: 0,
          uniqueSpeakers: 0,
          conversationCoverage: 'No conversations available',
          speakerDiversity: 'No speakers identified'
        }
      });
    }

    // Calculate conversation statistics before synthesis
    const conversationStats = calculateConversationStats(flattenedQuotes);
    
    // Debug: Log what quotes we received for synthesis
    console.log(`📋 Synthesizing for assumption: "${assumption}"`);
    console.log(`📋 Received ${flattenedQuotes.length} quotes for synthesis (relevance-filtered):`);
    console.log(`📊 Conversation Stats: ${conversationStats.uniqueConversations} conversations, ${conversationStats.uniqueSpeakers} speakers`);
    flattenedQuotes.forEach((quote, idx) => {
      const relevanceInfo = quote.relevanceScore ? ` (relevance: ${quote.relevanceScore.toFixed(1)}/3.0)` : '';
      console.log(`  Quote ${idx + 1}: "${quote.text.slice(0, 100)}..." (speaker: ${quote.speaker || 'Unknown'})${relevanceInfo}`);
    });

    // Concise synthesis prompt optimized for efficiency while maintaining accuracy
    const synthesisPrompt = `Analyze customer interview insights for this assumption:

ASSUMPTION: "${assumption}"

CONTEXT: ${conversationStats.totalQuotes} quotes from ${conversationStats.uniqueConversations} conversations, ${conversationStats.uniqueSpeakers} speakers (quotes have been filtered for relevance to this assumption)

ACTUAL INTERVIEW QUOTES PROVIDED:
${flattenedQuotes.map((quote, index) => `${index + 1}. "${quote.text}" - ${quote.speaker || 'Unknown'} (${quote.role || 'Unknown role'})${quote.relevanceScore ? ` [relevance: ${quote.relevanceScore.toFixed(1)}/3.0]` : ''}`).join('\n')}

CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE EXACTLY:
- ONLY use information EXPLICITLY stated in the PROVIDED QUOTES above
- Do NOT generate any new quotes, examples, or hypothetical scenarios
- Do NOT mention ANY buyer categories (like "forensic psychologists", "criminal defense attorneys", etc.) unless those exact terms appear in the quotes
- Do NOT infer speaker roles beyond what they explicitly state about themselves
- Do NOT make assumptions about what types of professionals the speakers represent
- If a speaker doesn't explicitly state their role, refer to them by name only
- Synthesize ONLY from the actual interview content provided
- If quotes don't directly address the assumption, acknowledge this limitation

TASK: Write ONE concise paragraph (2-3 sentences) that states HOW the interview evidence relates to the assumption.

Your response should DIRECTLY indicate whether the quotes:
- VALIDATE the assumption (confirm what the deck claims)
- CONTRADICT the assumption (challenge what the deck claims) 
- IDENTIFY A GAP (reveal information missing from the deck)

REQUIREMENTS:
- Reference ONLY the speakers and content from provided quotes
- Be concise - NO explanatory examples or "for instance" text
- Professional, analytical tone
- ${conversationStats.uniqueConversations > 2 ? 'Multiple conversations = strong validation' : conversationStats.uniqueConversations === 2 ? 'Two conversations = initial validation' : 'Single source = limited insight'}
- NO preambles, NO confidence scores, NO recommendations
- Focus on the relationship between quotes and assumption

Return only the concise analysis paragraph based on the PROVIDED quotes.`;

    // Call OpenAI for synthesis
    const response = await withTimeout(
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert business analyst who synthesizes customer interview insights into clear, actionable summaries. CRITICAL: You must ONLY use information from the provided interview quotes. Do NOT create new quotes, examples, or mention content not explicitly in the provided quotes. Provide only the requested synthesis without additional commentary.'
          },
          {
            role: 'user',
            content: synthesisPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 300
      }),
      30000 // 30 second timeout
    );

    const realityFromInterviews = response.choices[0]?.message?.content?.trim();

    if (!realityFromInterviews) {
      console.error('❌ OpenAI returned empty response for synthesis');
      return res.status(500).json({ error: 'OpenAI returned empty response' });
    }

    console.log(`✅ Generated synthesis: "${realityFromInterviews.slice(0, 150)}..."`);
    console.log(`📊 Including conversation stats: ${conversationStats.conversationCoverage}, ${conversationStats.speakerDiversity}`);
    
    return res.status(200).json({ 
      realityFromInterviews,
      conversationStats 
    });

  } catch (error: unknown) {
    console.error('Error in aggregate-validation-results:', error);
    
    // Handle specific error types
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('timeout')) {
      return res.status(408).json({ 
        error: 'Request timed out. Please try again.' 
      });
    }
    
    if (errorMessage.includes('OpenAI')) {
      return res.status(500).json({ 
        error: 'OpenAI API error: ' + errorMessage 
      });
    }
    
    return res.status(500).json({ 
      error: errorMessage 
    });
  }
} 