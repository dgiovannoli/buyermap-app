import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { parseFile } from '../../../utils/fileParser';
import { BuyerMapData } from '../../../types/buyermap';
import { transformBuyerMapDataArray } from '../../../utils/dataMapping';
import { isMockMode, logMockUsage } from '../../../utils/mockHelper';
import { getPineconeIndex } from '../../../lib/pinecone';

// Initialize OpenAI with proper error handling (only if not using mocks)
let openai: OpenAI | null = null;
if (!isMockMode()) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

// Timeout wrapper for OpenAI calls
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

export async function POST(req: NextRequest) {
  try {
    console.log('=== SALES DECK ANALYSIS PHASE ===');
    
    // Check if we should use mock data
    if (isMockMode()) {
      logMockUsage('deck analysis');
      const mock = await import("../../../mocks/fixtures/deck-analysis.json");
      return NextResponse.json(mock.default);
    }
    
    const formData = await req.formData();
    const deckFile = formData.get('deck') as File;

    if (!deckFile) {
      console.error('No file provided in request');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('Starting deck analysis for file:', deckFile.name);

    // 1. Parse the deck file
    console.log('Step 1: Parsing deck file...');
    const parsedResult = await parseFile(deckFile);
    console.log('Extracted deck text length:', parsedResult.text?.length || 0);

    if (!parsedResult.text) {
      console.error('No text extracted from deck');
      return NextResponse.json({ error: 'Could not extract text from deck' }, { status: 400 });
    }

    // 2. Analyze the deck content with AI
    console.log('Step 2: Analyzing deck content with AI...');
    if (!openai) {
      throw new Error('OpenAI client not initialized');
    }

    const systemPrompt = `You are an expert business analyst specializing in B2B buyer personas and Ideal Customer Profiles (ICPs). Your task is to analyze sales/marketing materials and extract specific, testable assumptions about the target buyer.

CRITICAL INSTRUCTIONS:
1. Extract assumptions for ALL 7 ICP attributes: Buyer Titles, Company Size, Pain Points, Desired Outcomes, Triggers, Barriers, Messaging Emphasis
2. Make assumptions SPECIFIC and TESTABLE (avoid vague statements)
3. Base assumptions on EXPLICIT evidence from the content
4. Include confidence scores (0-100) based on strength of evidence
5. Return ONLY valid JSON in the exact format specified

RESPONSE FORMAT:
{
  "assumptions": [
    {
      "icpAttribute": "Buyer Titles|Company Size|Pain Points|Desired Outcomes|Triggers|Barriers|Messaging Emphasis",
      "v1Assumption": "Specific, testable assumption with metrics/behaviors when possible",
      "confidenceScore": 0-100,
      "confidenceExplanation": "Brief explanation of evidence strength and source"
    }
  ]
}

QUALITY STANDARDS:
- Buyer Titles: Specific job titles/roles, not generic terms
- Company Size: Include quantitative ranges when possible
- Pain Points: Specific problems with business impact
- Desired Outcomes: Measurable business results
- Triggers: Specific events/situations that drive need
- Barriers: Concrete obstacles to adoption
- Messaging Emphasis: Key value propositions and positioning

AVOID:
- Generic or obvious statements
- Assumptions without clear evidence
- Vague language ("some", "many", "often")
- Product features instead of buyer needs`;

    const analysisResponse = await withTimeout(
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Analyze this sales deck/pitch material and extract ICP assumptions for all 7 attributes. Focus on what the content reveals about the TARGET BUYER, not the product features.\n\nDECK CONTENT:\n${parsedResult.text}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
      30000 // 30 second timeout
    );

    if (!analysisResponse.choices?.[0]?.message?.content) {
      throw new Error('No content in AI response');
    }

    console.log('AI analysis response received, length:', analysisResponse.choices[0].message.content.length);

    // 3. Parse the AI response into structured assumptions
    console.log('Step 3: Parsing AI response into structured assumptions...');
    let parsedAssumptions;
    try {
      const aiResponse = analysisResponse.choices[0].message.content;

      // Extract JSON content from markdown code block if present
      let jsonContent = aiResponse;
      if (aiResponse.includes('```json')) {
        const match = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonContent = match[1].trim();
        } else {
          console.warn('Found ```json marker but could not extract content');
        }
      }

      // Clean the JSON content
      jsonContent = jsonContent
        .replace(/^[^{[]*/, '')
        .replace(/[^}\]]*$/, '')
        .trim();

      // Parse the JSON content
      parsedAssumptions = JSON.parse(jsonContent);
      console.log('Parsed assumptions count:', parsedAssumptions.assumptions?.length || 0);

      // Validate the response format
      if (!parsedAssumptions.assumptions || !Array.isArray(parsedAssumptions.assumptions)) {
        throw new Error('Invalid response format: missing assumptions array');
      }

      // Validate we have all 7 ICP attributes
      const requiredAttributes = [
        'Buyer Titles', 'Company Size', 'Pain Points', 'Desired Outcomes', 
        'Triggers', 'Barriers', 'Messaging Emphasis'
      ];
      
      const foundAttributes = parsedAssumptions.assumptions.map((a: any) => a.icpAttribute);
      const missingAttributes = requiredAttributes.filter(attr => !foundAttributes.includes(attr));
      
      if (missingAttributes.length > 0) {
        console.warn('Missing ICP attributes:', missingAttributes);
        // Continue anyway, but log the warning
      }

      // Validate each assumption has required fields
      parsedAssumptions.assumptions.forEach((assumption: any, index: number) => {
        const requiredFields = ['icpAttribute', 'v1Assumption', 'confidenceScore', 'confidenceExplanation'];
        const missingFields = requiredFields.filter(field => !assumption[field]);
        if (missingFields.length > 0) {
          throw new Error(`Invalid assumption at index ${index}: missing fields ${missingFields.join(', ')}`);
        }
      });

      // Create assumption objects with proper typing
      const assumptions: BuyerMapData[] = parsedAssumptions.assumptions.map((assumption: any, index: number) => {
        return {
          id: index + 1,
          icpAttribute: assumption.icpAttribute,
          icpTheme: mapICPAttributeToKey(assumption.icpAttribute),
          v1Assumption: assumption.v1Assumption,
          whyAssumption: 'Extracted from deck analysis',
          evidenceFromDeck: assumption.v1Assumption,
          comparisonOutcome: 'New Data Added',
          confidenceScore: assumption.confidenceScore,
          confidenceExplanation: assumption.confidenceExplanation,
          validationStatus: 'pending',
          quotes: []
        };
      });

      console.log('Created BuyerMapData array with', assumptions.length, 'assumptions');

      // Step 4: Wrap your embedding logic
      console.log('Step 4: Generating and storing embeddings...');
      
      // Generate embeddings for each assumption
      const assumptionsText = assumptions.map(assumption => assumption.v1Assumption);
      
      if (!isMockMode() && assumptionsText.length > 0) {
        try {
          const pineconeIndex = getPineconeIndex();
          
          const embedRes = await openai!.embeddings.create({
            model: 'text-embedding-ada-002',
            input: assumptionsText
          });

          const vectors = embedRes.data.map((item, idx) => ({
            id: `deck-assumption-${idx}`,
            values: item.embedding,
            metadata: { text: assumptionsText[idx] }
          }));

          await pineconeIndex.upsert({
            upsertRequest: {
              vectors,
              namespace: 'analyze-deck'
            }
          });

          console.log(`✅ Upserted ${vectors.length} assumption embeddings into Pinecone.`);
        } catch (embeddingError: any) {
          console.error('Error creating embeddings:', embeddingError);
          // Continue anyway - embeddings are not critical for the response
        }
      } else if (isMockMode()) {
        console.log('🎭 Mock mode: Skipping embedding generation');
      }

      // 5. Transform the assumptions into the standard format
      console.log('Step 5: Transforming assumptions into standard format...');
      const transformedData = transformBuyerMapDataArray(assumptions);

      // Validate the transformed data
      if (!transformedData || transformedData.length === 0) {
        throw new Error('Transformation resulted in empty data');
      }

      // Calculate final metrics
      const overallAlignmentScore = calculateOverallAlignmentScore(transformedData);
      const validatedCount = countValidationStatus(transformedData, 'validated');
      const partiallyValidatedCount = countValidationStatus(transformedData, 'partial');
      const pendingCount = countValidationStatus(transformedData, 'pending');

      console.log('Final response metrics:', {
        assumptionsCount: transformedData.length,
        overallAlignmentScore,
        validatedCount,
        partiallyValidatedCount,
        pendingCount
      });

      return NextResponse.json({
        success: true,
        assumptions: transformedData,
        overallAlignmentScore,
        validatedCount,
        partiallyValidatedCount,
        pendingCount
      });

    } catch (parseError: any) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw AI response:', analysisResponse.choices[0].message.content?.substring(0, 500));
      return NextResponse.json({ 
        error: 'Failed to parse AI response: ' + parseError.message,
        details: 'Invalid JSON format from AI'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error in deck analysis:', error);
    
    // Handle specific error types
    if (error.message?.includes('timeout')) {
      return NextResponse.json({ 
        error: 'Analysis timed out. Please try again with a smaller file.',
        details: 'OpenAI request timeout'
      }, { status: 408 });
    }
    
    if (error.message?.includes('OPENAI_API_KEY')) {
      return NextResponse.json({ 
        error: 'OpenAI API configuration error',
        details: 'Missing or invalid API key'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      details: error.stack
    }, { status: 500 });
  }
}

function mapICPAttributeToKey(attribute: string): string {
  const attributeMap: { [key: string]: string } = {
    'Buyer Titles': 'buyer-titles',
    'Company Size': 'company-size',
    'Pain Points': 'pain-points',
    'Desired Outcomes': 'desired-outcomes',
    'Triggers': 'triggers',
    'Barriers': 'barriers',
    'Messaging Emphasis': 'messaging-emphasis'
  };
  
  return attributeMap[attribute] || attribute.toLowerCase().replace(/\s+/g, '-');
}

// Helper function to calculate overall alignment score
function calculateOverallAlignmentScore(data: BuyerMapData[]): number {
  const validAssumptions = data.filter(a => a.confidenceScore > 0);
  if (validAssumptions.length === 0) return 0;
  return Math.round(validAssumptions.reduce((sum, a) => sum + a.confidenceScore, 0) / validAssumptions.length);
}

// Helper function to count validation status
function countValidationStatus(data: BuyerMapData[], status: 'validated' | 'partial' | 'pending'): number {
  return data.filter(a => a.validationStatus === status).length;
} 