import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { parseFile } from '../../../utils/fileParser';
import { BuyerMapData } from '../../../types/buyermap';
import { createICPValidationData, createValidationData, transformBuyerMapDataArray } from '../../../utils/dataMapping';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: NextRequest) {
  try {
    console.log('=== SALES DECK ANALYSIS PHASE ===');
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
    console.log('Extracted deck text:', parsedResult.text);

    if (!parsedResult.text) {
      console.error('No text extracted from deck');
      return NextResponse.json({ error: 'Could not extract text from deck' }, { status: 400 });
    }

    // 2. Analyze the deck content with AI
    console.log('Step 2: Analyzing deck content with AI...');
    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Analyze this pitch deck and extract ICP assumptions. Return a JSON object with:
{
  "assumptions": [
    {
      "icpAttribute": "Buyer Titles" | "Company Size" | "Pain Points" | "Desired Outcomes" | "Triggers" | "Barriers" | "Messaging Emphasis",
      "v1Assumption": "specific assumption from deck",
      "confidenceScore": 0-100,
      "confidenceExplanation": "brief explanation"
    }
  ]
}

Rules:
1. Extract from ALL deck sections
2. Use ONLY the 7 standard attributes listed above
3. Make assumptions specific and testable
4. Include confidence scores (0-100)
5. Cover all 7 attributes
6. Return valid JSON only`
          },
          {
            role: 'user',
            content: `Analyze this deck content and extract ICP assumptions:\n\n${parsedResult.text}`
          }
        ],
        temperature: 0.3
      })
    });

    if (!analysisResponse.ok) {
      console.error('AI analysis failed:', await analysisResponse.text());
      throw new Error('Failed to analyze deck content');
    }

    const analysisData = await analysisResponse.json();
    console.log('AI analysis response:', analysisData.choices[0].message.content);

    // 3. Parse the AI response into structured assumptions
    console.log('Step 3: Parsing AI response into structured assumptions...');
    let parsedAssumptions;
    try {
      const aiResponse = analysisData.choices[0].message.content;
      console.log('Raw AI response:', aiResponse);

      // Extract JSON content from markdown code block if present
      let jsonContent = aiResponse;
      if (aiResponse.includes('```json')) {
        const match = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonContent = match[1].trim();
          console.log('Extracted JSON content from markdown:', jsonContent);
        } else {
          console.warn('Found ```json marker but could not extract content');
        }
      }

      // Parse the JSON content
      parsedAssumptions = JSON.parse(jsonContent);
      console.log('Parsed JSON response:', parsedAssumptions);

      // Validate the response format
      if (!parsedAssumptions.assumptions || !Array.isArray(parsedAssumptions.assumptions)) {
        throw new Error('Invalid response format: missing assumptions array');
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
        console.log(`Creating BuyerMapData for assumption ${index}:`, assumption);
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

      console.log('Created BuyerMapData array:', assumptions);

      // 4. Transform the assumptions into the standard format
      console.log('Step 4: Transforming assumptions into standard format...');
      const transformedData = transformBuyerMapDataArray(assumptions);
      console.log('Transformed data:', transformedData);

      // Validate the transformed data
      if (!transformedData || transformedData.length === 0) {
        throw new Error('Transformation resulted in empty data');
      }

      // Log the final response data
      console.log('Final API response data:', {
        assumptions: transformedData,
        overallAlignmentScore: calculateOverallAlignmentScore(transformedData),
        validatedCount: countValidationStatus(transformedData, 'validated'),
        partiallyValidatedCount: countValidationStatus(transformedData, 'partial'),
        pendingCount: countValidationStatus(transformedData, 'pending')
      });

      return NextResponse.json({
        success: true,
        assumptions: transformedData,
        overallAlignmentScore: calculateOverallAlignmentScore(transformedData),
        validatedCount: countValidationStatus(transformedData, 'validated'),
        partiallyValidatedCount: countValidationStatus(transformedData, 'partial'),
        pendingCount: countValidationStatus(transformedData, 'pending')
      });
    } catch (error: any) {
      console.error('Error parsing AI response:', error);
      throw new Error('Failed to parse AI response: ' + error.message);
    }
  } catch (error: any) {
    console.error('Error in deck analysis:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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