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
      return res.status(200).json({ realityFromInterviews: 'No interview data available for this assumption.' });
    }

    // Create synthesis prompt
    const synthesisPrompt = `You are an expert business analyst synthesizing customer interview insights. Your task is to analyze quotes from customer interviews and create a single, coherent summary of what the interviews reveal about a specific business assumption.

ASSUMPTION TO ANALYZE:
"${assumption}"

INTERVIEW QUOTES:
${flattenedQuotes.map((quote, index) => `
${index + 1}. "${quote.text}"
   Speaker: ${quote.speaker || 'Unknown'}
   Role: ${quote.role || 'Unknown'}
   Source: ${quote.source || 'Unknown'}
`).join('\n')}

INSTRUCTIONS:
1. Synthesize ALL the quotes into ONE coherent paragraph that captures what the interviews collectively reveal about this assumption
2. Focus on PATTERNS and THEMES across multiple quotes, not individual responses
3. Include specific details and examples from the quotes when relevant
4. Write in a professional, analytical tone
5. Do NOT include confidence scores, validation outcomes, or recommendations
6. Do NOT mention individual speakers by name
7. Keep the synthesis focused on factual observations from the interviews

Write a single paragraph (3-5 sentences) that synthesizes what the interview data reveals about this assumption. Start directly with the insights - no preamble like "The interviews show..." or "Based on the data...".

Return only the synthesis paragraph as plain text.`;

    // Call OpenAI for synthesis
    const response = await withTimeout(
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert business analyst who synthesizes customer interview insights into clear, actionable summaries. Provide only the requested synthesis without additional commentary.'
          },
          {
            role: 'user',
            content: synthesisPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 500
      }),
      30000 // 30 second timeout
    );

    const realityFromInterviews = response.choices[0]?.message?.content?.trim();

    if (!realityFromInterviews) {
      return res.status(500).json({ error: 'OpenAI returned empty response' });
    }

    return res.status(200).json({ realityFromInterviews });

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