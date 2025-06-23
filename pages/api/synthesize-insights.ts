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
  companySnapshot?: string;
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

// Helper function to generate fallback reality text from quotes
function generateFallbackReality(assumption: string, quotes: Quote[]): string {
  if (quotes.length === 0) {
    return 'No specific interview data available for this assumption. Consider conducting targeted interviews to validate this insight.';
  }
  
  const speakers = new Set(quotes.map(q => q.speaker || 'Anonymous').filter(s => s !== 'Anonymous'));
  const speakerCount = speakers.size;
  const quoteCount = quotes.length;
  
  if (quoteCount === 1) {
    return `Based on interview feedback: "${quotes[0].text.slice(0, 150)}..." This insight needs additional validation from more interviews.`;
  } else if (quoteCount <= 3) {
    return `Interview insights suggest: ${quotes.map(q => `"${q.text.slice(0, 100)}..."`).join(' | ')} (${quoteCount} quotes from ${speakerCount} speaker${speakerCount !== 1 ? 's' : ''})`;
  } else {
    const topQuotes = quotes.slice(0, 2);
    return `Interview analysis reveals: ${topQuotes.map(q => `"${q.text.slice(0, 80)}..."`).join(' | ')} and ${quoteCount - 2} additional supporting insights from ${speakerCount} speakers.`;
  }
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
        console.log(`🔍 Fetching top quotes via RAG for assumption ${assumption.id}: "${assumption.v1Assumption}"`);
        
        let ragQuotes: any[] = [];
        try {
          ragQuotes = await getTopQuotesForSynthesis(assumption.v1Assumption, assumption.id, 5);
        } catch (ragError) {
          console.warn(`⚠️ RAG system error for assumption ${assumption.id}:`, ragError);
          ragQuotes = [];
        }
        
        // Debug: Log what RAG returned
        console.log(`📋 RAG returned ${ragQuotes.length} quotes for assumption ${assumption.id}:`);
        ragQuotes.forEach((q, idx) => {
          console.log(`  RAG Quote ${idx + 1}: "${q.text?.slice(0, 100)}..." (score: ${q.score?.toFixed(3)}, speaker: ${q.speaker})`);
        });
        
        // Determine quotes to use (RAG first, then provided as fallback)
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
            specificity_score: typeof q.specificity_score === 'number' ? q.specificity_score : Number(q.specificity_score) || 0,
            companySnapshot: String(q.companySnapshot || '')
          }));
        } else {
          console.log(`⚠️ No RAG quotes found for assumption ${assumption.id}, using provided quotes`);
          console.log(`📋 Provided quotes count: ${assumption.quotes.length}`);
          assumption.quotes.slice(0, 2).forEach((q, idx) => {
            console.log(`  Provided Quote ${idx + 1}: "${q.text?.slice(0, 100)}..." (speaker: ${q.speaker})`);
          });
          
          // Map quotes to ensure they are plain objects with proper structure
          quotesToUse = assumption.quotes.map((quote) => ({
            text: quote.text ?? quote.quoteText ?? '',
            speaker: quote.speaker ?? quote.speakerName ?? '',
            role: quote.role ?? quote.speakerRole ?? '',
            source: quote.source ?? quote.sourceDocument ?? ''
          }));
        }
        
        let realityFromInterviews = '';
        
        // Try to synthesize reality using aggregate-validation-results if we have substantial quotes
        if (quotesToUse.length >= 2) {
          console.log(`📤 Sending ${quotesToUse.length} quotes to aggregate-validation-results for assumption ${assumption.id}`);
          
          try {
            const payload = {
              assumption: assumption.v1Assumption,
              quotes: quotesToUse
            };

            // Call the aggregate-validation-results endpoint
            const aggregateResponse = await fetch(`${getBaseUrl(req)}/api/aggregate-validation-results`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload)
            });

            if (aggregateResponse.ok) {
              const responseData = await aggregateResponse.json();
              realityFromInterviews = responseData.realityFromInterviews || '';
              console.log(`✅ Got synthesis for assumption ${assumption.id}: "${realityFromInterviews?.substring(0, 100)}..."`);
            } else {
              console.warn(`⚠️ Synthesis endpoint failed for assumption ${assumption.id}, using fallback`);
              realityFromInterviews = generateFallbackReality(assumption.v1Assumption, quotesToUse);
            }
          } catch (synthesisError) {
            console.warn(`⚠️ Synthesis request failed for assumption ${assumption.id}:`, synthesisError);
            realityFromInterviews = generateFallbackReality(assumption.v1Assumption, quotesToUse);
          }
        } else {
          // Use fallback for insufficient quotes
          realityFromInterviews = generateFallbackReality(assumption.v1Assumption, quotesToUse);
        }
        
        // Ensure we always have meaningful reality text
        if (!realityFromInterviews || realityFromInterviews.trim().length < 10) {
          realityFromInterviews = `Analysis of "${assumption.v1Assumption}" requires additional interview data. ${quotesToUse.length} quotes available but insufficient for comprehensive insights.`;
        }
        
        enhancedAssumptions.push({
          ...assumption,
          realityFromInterviews
        });

        console.log(`✅ Finalized reality for assumption ${assumption.id}: "${realityFromInterviews?.substring(0, 100)}..."`);

      } catch (error) {
        console.error(`❌ Error processing assumption ${assumption.id}:`, error);
        
        // Always provide fallback content rather than failing
        const fallbackReality = generateFallbackReality(assumption.v1Assumption, assumption.quotes);
        enhancedAssumptions.push({
          ...assumption,
          realityFromInterviews: fallbackReality
        });
      }
    }

    console.log(`🎉 Successfully processed ${enhancedAssumptions.length} assumptions with interview insights`);

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