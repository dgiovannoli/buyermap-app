import type { NextApiRequest, NextApiResponse } from 'next'

// Types
interface Quote {
  text: string;
  speaker?: string;
  role?: string;
  source: string;
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

    console.log(`🔄 Processing ${assumptions.length} assumptions for reality synthesis...`);

    // Process each assumption to get realityFromInterviews
    const enhancedAssumptions: Assumption[] = [];

    for (const assumption of assumptions) {
      console.log(`📝 Processing assumption ${assumption.id}: ${assumption.icpAttribute}`);
      
      try {
        // Call the aggregate-validation-results endpoint
        const aggregateResponse = await fetch(`${getBaseUrl(req)}/api/aggregate-validation-results`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assumption: assumption.v1Assumption,
            quotes: assumption.quotes
          })
        });

        if (!aggregateResponse.ok) {
          const errorData = await aggregateResponse.json();
          console.error(`❌ Error from aggregate-validation-results for assumption ${assumption.id}:`, errorData);
          
          // Continue with empty reality rather than failing the entire request
          enhancedAssumptions.push({
            ...assumption,
            realityFromInterviews: 'Unable to synthesize interview insights at this time.'
          });
          continue;
        }

        const { realityFromInterviews } = await aggregateResponse.json();
        
        enhancedAssumptions.push({
          ...assumption,
          realityFromInterviews
        });

        console.log(`✅ Successfully synthesized reality for assumption ${assumption.id}`);

      } catch (error) {
        console.error(`❌ Error processing assumption ${assumption.id}:`, error);
        
        // Continue with empty reality rather than failing the entire request
        enhancedAssumptions.push({
          ...assumption,
          realityFromInterviews: 'Unable to synthesize interview insights at this time.'
        });
      }
    }

    console.log(`🎉 Successfully processed ${enhancedAssumptions.length} assumptions`);

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