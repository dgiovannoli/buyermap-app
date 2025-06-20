import type { NextApiRequest, NextApiResponse } from 'next'
import { getTopQuotesForSynthesis } from '../../src/lib/rag'

// Types
interface Quote {
  text: string;
  speaker?: string;
  role?: string;
  source: string;
  // Alternative property names that might be used
  quoteText?: string;
  speakerName?: string;
  speakerRole?: string;
  sourceDocument?: string;
  // RAG-specific fields
  score?: number;
  classification?: string;
  topic_relevance?: string;
  specificity_score?: number;
}

interface Assumption {
  id: number;
  icpAttribute: string;
  v1Assumption: string;
  evidenceFromDeck: string;
  quotes: Quote[];
  confidenceScore: number;
  validationOutcome: string;
  realityFromInterviews?: string;
}

interface RequestBody {
  assumptions: Assumption[];
}

interface ResponseBody {
  assumptions: Assumption[];
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
    const { assumptions }: RequestBody = req.body;

    if (!Array.isArray(assumptions)) {
      return res.status(400).json({ error: 'Invalid assumptions: must be an array' });
    }

    // Validate assumptions structure
    for (const assumption of assumptions) {
      if (!assumption.id || !assumption.icpAttribute || !assumption.v1Assumption) {
        return res.status(400).json({ error: 'Invalid assumption: missing required fields (id, icpAttribute, v1Assumption)' });
      }
      if (!Array.isArray(assumption.quotes)) {
        return res.status(400).json({ error: 'Invalid assumption: quotes must be an array' });
      }
    }

    console.log(`🔄 Processing ${assumptions.length} assumptions for RAG-powered reality synthesis...`);

    // Process each assumption to get realityFromInterviews using RAG
    const enhancedAssumptions: Assumption[] = [];

    for (const assumption of assumptions) {
      console.log(`📝 Processing assumption ${assumption.id}: ${assumption.icpAttribute}`);
      
      try {
        // Use RAG to get the most relevant quotes for this assumption
        console.log(`🔍 Fetching top quotes via RAG for assumption ${assumption.id}...`);
        const ragQuotes = await getTopQuotesForSynthesis(assumption.v1Assumption, assumption.id, 5);
        
        // Fallback to provided quotes if RAG returns nothing (for compatibility)
        let quotesToUse: Quote[] = [];
        
        if (ragQuotes.length > 0) {
          console.log(`✅ Using ${ragQuotes.length} RAG-retrieved quotes for assumption ${assumption.id}`);
          // Convert RAG quotes to proper Quote format
          quotesToUse = ragQuotes.map(q => ({
            text: String(q.text || ''),
            speaker: String(q.speaker || ''),
            role: String(q.role || ''),
            source: String(q.source || ''),
            score: q.score,
            classification: String(q.classification || ''),
            topic_relevance: String(q.topic_relevance || ''),
            specificity_score: typeof q.specificity_score === 'number' ? q.specificity_score : Number(q.specificity_score) || 0
          }));
        } else {
          console.log(`⚠️ No RAG quotes found for assumption ${assumption.id}, falling back to provided quotes`);
          // Map quotes to ensure they are plain objects with proper structure
          quotesToUse = assumption.quotes.map((quote) => ({
            text: quote.text ?? quote.quoteText ?? '',
            speaker: quote.speaker ?? quote.speakerName ?? '',
            role: quote.role ?? quote.speakerRole ?? '',
            source: quote.source ?? quote.sourceDocument ?? ''
          }));
        }

        // Prepare the payload for aggregate-validation-results with high-quality quotes
        const payload = {
          assumption: assumption.v1Assumption,
          quotes: quotesToUse
        };

        // Enhanced logging to verify quote data
        console.log(`📤 Sending to aggregate-validation-results for assumption ${assumption.id}:`);
        console.log(`   Assumption: "${assumption.v1Assumption}"`);
        console.log(`   High-quality quotes count: ${quotesToUse.length}`);
        quotesToUse.slice(0, 3).forEach((q, idx) => {
          console.log(`   Quote ${idx + 1}: text="${q.text?.substring(0, 60)}...", speaker="${q.speaker}", score=${q.score || 'N/A'}`);
        });

        // Call the aggregate-validation-results endpoint with curated quotes
        const aggregateResponse = await fetch(`${getBaseUrl(req)}/api/aggregate-validation-results`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        if (!aggregateResponse.ok) {
          const errorData = await aggregateResponse.json();
          console.error(`❌ Error from aggregate-validation-results for assumption ${assumption.id} (${aggregateResponse.status}):`, errorData);
          
          // Continue with empty reality rather than failing the entire request
          enhancedAssumptions.push({
            ...assumption,
            realityFromInterviews: 'Unable to synthesize interview insights at this time.'
          });
          continue;
        }

        const responseData = await aggregateResponse.json();
        console.log(`📥 Response from aggregate-validation-results for assumption ${assumption.id}:`, responseData);
        
        const { realityFromInterviews } = responseData;
        
        enhancedAssumptions.push({
          ...assumption,
          realityFromInterviews
        });

        console.log(`✅ Successfully synthesized RAG-powered reality for assumption ${assumption.id}: "${realityFromInterviews?.substring(0, 100)}..."`);

      } catch (error) {
        console.error(`❌ Error processing assumption ${assumption.id}:`, error);
        
        // Continue with empty reality rather than failing the entire request
        enhancedAssumptions.push({
          ...assumption,
          realityFromInterviews: 'Unable to synthesize interview insights at this time.'
        });
      }
    }

    console.log(`🎉 Successfully processed ${enhancedAssumptions.length} assumptions with RAG-powered insights`);

    return res.status(200).json({ assumptions: enhancedAssumptions });

  } catch (error: unknown) {
    console.error('Error in synthesize-insights:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ 
      error: errorMessage 
    });
  }
}

// Helper function to get the base URL for internal API calls
function getBaseUrl(req: NextApiRequest): string {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host;
  return `${protocol}://${host}`;
} 