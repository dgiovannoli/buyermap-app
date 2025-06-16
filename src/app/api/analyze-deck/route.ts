import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { parseFile } from '../../../utils/fileParser';
import { BuyerMapData } from '../../../types/buyermap';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    console.log('=== SALES DECK ANALYSIS PHASE ===');
    const formData = await request.formData();
    const deckFile = formData.get('deck') as File;

    if (!deckFile) {
      return NextResponse.json({ success: false, error: 'No deck file provided' }, { status: 400 });
    }

    console.log('1. Processing sales deck:', deckFile.name);
    const parsedContent = await parseFile(deckFile);
    console.log('2. Deck parsed successfully');

    // Extract assumptions from deck
    console.log('3. Extracting assumptions from deck...');
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert at analyzing sales decks and extracting buyer assumptions.
          Extract 5-8 key buyer assumptions from the sales deck.
          Each assumption must be buyer-focused and include specific metrics or behavioral patterns.
          
          Rules for valid assumptions:
          1. ICP attributes must be one of: "Pain Points", "Desired Outcomes", "Buyer Titles", "Buying Process", "Decision Criteria"
          2. Each assumption must reference specific slides (e.g., "Slide 4: '87 workdays wasted annually'")
          3. Assumptions must be specific and measurable
          4. Focus on buyer needs, not product features
          
          Return a JSON object with an "assumptions" array. Example format:
          {
            "assumptions": [
              {
                "icpAttribute": "Pain Points",
                "icpTheme": "Evidence Review Burden",
                "v1Assumption": "Attorneys spend 87+ workdays/year on manual evidence review",
                "whyAssumption": "Market research indicated high time investment in evidence processing",
                "evidenceFromDeck": "Slide 4: '87 workdays wasted annually'",
                "confidenceScore": 85,
                "confidenceExplanation": "Based on deck content and market research"
              }
            ]
          }`
        },
        {
          role: "user",
          content: `SALES DECK CONTENT:\n${parsedContent.text}\n\nExtract buyer assumptions in the exact JSON format specified.`
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    let content = response.choices[0]?.message?.content;
    if (typeof content === 'string') {
      // Remove markdown code blocks and clean the content
      content = content.replace(/```json\s*/, '').replace(/```\s*$/, '').trim();
      console.log('Cleaned response:', content.slice(0, 200) + '...');

      try {
        const parsed = JSON.parse(content);
        if (!parsed.assumptions || !Array.isArray(parsed.assumptions)) {
          throw new Error('Invalid response format: missing assumptions array');
        }

        // Transform assumptions to match our data structure
        const assumptions: BuyerMapData[] = parsed.assumptions.map((assumption: any, index: number) => ({
          id: index + 1,
          icpAttribute: assumption.icpAttribute,
          icpTheme: assumption.icpTheme,
          v1Assumption: assumption.v1Assumption,
          whyAssumption: assumption.whyAssumption,
          evidenceFromDeck: assumption.evidenceFromDeck,
          comparisonOutcome: 'new_insight', // Default for initial assumptions
          confidenceScore: assumption.confidenceScore,
          confidenceExplanation: assumption.confidenceExplanation,
          quotes: [] // Empty quotes array for now
        }));

        console.log(`4. Successfully extracted ${assumptions.length} assumptions`);
        return NextResponse.json({ success: true, assumptions });
      } catch (parseError) {
        console.error('Error parsing assumptions:', parseError);
        return NextResponse.json({ success: false, error: 'Failed to parse assumptions' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: false, error: 'No content in response' }, { status: 500 });
  } catch (error) {
    console.error('Error in analyze-deck route:', error);
    return NextResponse.json({ success: false, error: 'Error processing deck: ' + (error as Error).message }, { status: 500 });
  }
} 