import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { parseFile } from '../../../utils/fileParser';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const APPROVED_ICP_ATTRIBUTES = [
  "Buyer Titles",
  "Company Size",
  "Pain Points",
  "Desired Outcomes",
  "Triggers",
  "Barriers",
  "Messaging Emphasis"
] as const;

interface Assumption {
  icpAttribute: string;
  icpTheme: string;
  v1Assumption: string;
  whyAssumption: string;
  evidenceFromDeck: string;
  realityFromInterviews: string;
  comparisonOutcome: 'Aligned' | 'Misaligned' | 'New Data Added';
  waysToAdjustMessaging: string;
  confidenceScore: number;
  confidenceExplanation: string;
  quotes: Quote[];
}

interface Quote {
  id: string;
  text: string;
  speaker: string;
  role: string;
  source: string;
  rejected: boolean;
}

function isBuyerFocused(assumption: Assumption): boolean {
  // Simple heuristic: avoid product/feature words
  const productWords = ["our", "we", "platform", "solution", "feature", "AI", "software", "tool", "app"];
  const text = (assumption.v1Assumption || "").toLowerCase();
  return !productWords.some(word => text.includes(word));
}

function hasSlideReference(evidence: string): boolean {
  return /slide|page|section|figure|table/i.test(evidence || "");
}

function isSpecificAndTestable(statement: string): boolean {
  // Heuristic: look for numbers, time, frequency, or clear buyer action
  return /\d|hour|day|week|month|year|percent|%|per|each|every|always|never|often|rarely|sometimes|usually|struggle|lack|handle|spend|waste|save|increase|decrease|reduce|improve/i.test(statement || "");
}

function validateAssumption(assumption: Assumption): string[] {
  const errors: string[] = [];
  if (!APPROVED_ICP_ATTRIBUTES.includes(assumption.icpAttribute as typeof APPROVED_ICP_ATTRIBUTES[number])) {
    errors.push(`Invalid icpAttribute: ${assumption.icpAttribute}`);
  }
  if (!isBuyerFocused(assumption)) {
    errors.push('Assumption is not buyer-focused');
  }
  if (!hasSlideReference(assumption.evidenceFromDeck)) {
    errors.push('evidenceFromDeck missing slide/page reference');
  }
  if (!isSpecificAndTestable(assumption.v1Assumption)) {
    errors.push('v1Assumption is not specific/testable');
  }
  return errors;
}

async function processInterviewFiles(interviewFiles: File[]): Promise<Quote[]> {
  const allQuotes: Quote[] = [];
  
  for (const file of interviewFiles) {
    try {
      const parsedContent = await parseFile(file);
      if (parsedContent.error) {
        console.error(`Error parsing interview file ${file.name}:`, parsedContent.error);
        continue;
      }

      // Extract quotes from interview transcript
      const quoteResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert at analyzing customer interview transcripts and extracting meaningful quotes.
            Extract quotes that reveal customer needs, pain points, behaviors, or outcomes.
            Each quote should be attributed to a speaker with their role.
            
            Return a JSON array of quotes in this format:
            [
              {
                "text": "The actual quote from the interview",
                "speaker": "Speaker's name",
                "role": "Speaker's role/title",
                "source": "Interview transcript name"
              }
            ]`
          },
          {
            role: "user",
            content: `INTERVIEW TRANSCRIPT:\n${parsedContent.text}\n\nExtract meaningful quotes that reveal customer needs, pain points, behaviors, or outcomes.`
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });

      let content = quoteResponse.choices[0]?.message?.content;
      if (typeof content === 'string') {
        // Remove markdown code blocks
        content = content.replace(/```json\s*/, '').replace(/```\s*$/, '').trim();
        console.log('Cleaned quote response:', content.slice(0, 200) + '...');
        
        try {
          const quotes = JSON.parse(content);
          if (Array.isArray(quotes)) {
            const processedQuotes = quotes.map((quote, index) => ({
              id: `${file.name}-${index}`,
              text: quote.text,
              speaker: quote.speaker,
              role: quote.role,
              source: file.name,
              rejected: false
            }));
            allQuotes.push(...processedQuotes);
            console.log(`Successfully processed ${processedQuotes.length} quotes from ${file.name}`);
          } else {
            console.warn(`Invalid quotes format from ${file.name}: not an array`);
          }
        } catch (parseError) {
          console.error(`Error parsing quotes from ${file.name}:`, parseError);
        }
      }
    } catch (error) {
      console.error(`Error processing interview file ${file.name}:`, error);
    }
  }
  
  console.log(`Total quotes extracted: ${allQuotes.length}`);
  return allQuotes;
}

async function classifyQuotesAgainstAssumptions(quotes: Quote[], assumptions: Assumption[]): Promise<Assumption[]> {
  const updatedAssumptions = [...assumptions];
  
  for (const assumption of updatedAssumptions) {
    const relevantQuotes: Quote[] = [];
    let alignedCount = 0;
    let misalignedCount = 0;
    let newDataCount = 0;
    
    for (const quote of quotes) {
      try {
        const classificationResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an expert at analyzing customer quotes against sales assumptions.
              Classify how this quote relates to the assumption:
              - "Aligned": Quote directly supports the assumption
              - "Misaligned": Quote contradicts the assumption
              - "New Data": Quote provides new relevant information
              - "Irrelevant": Quote is not related to the assumption
              
              Return a JSON object with:
              {
                "classification": "Aligned" | "Misaligned" | "New Data" | "Irrelevant",
                "explanation": "Brief explanation of the classification"
              }`
            },
            {
              role: "user",
              content: `ASSUMPTION: ${assumption.v1Assumption}
              
              QUOTE: ${quote.text}
              Speaker: ${quote.speaker}
              Role: ${quote.role}
              
              How does this quote relate to the assumption?`
            }
          ],
          temperature: 0.1,
          max_tokens: 500
        });

        const content = classificationResponse.choices[0]?.message?.content;
        if (typeof content === 'string') {
          const classification = JSON.parse(content);
          if (classification.classification !== 'Irrelevant') {
            relevantQuotes.push(quote);
            switch (classification.classification) {
              case 'Aligned': alignedCount++; break;
              case 'Misaligned': misalignedCount++; break;
              case 'New Data': newDataCount++; break;
            }
          }
        }
      } catch (error) {
        console.error('Error classifying quote:', error);
      }
    }

    // Update assumption based on quote analysis
    assumption.quotes = relevantQuotes;
    
    // Determine comparison outcome
    if (alignedCount > misalignedCount && alignedCount > newDataCount) {
      assumption.comparisonOutcome = 'Aligned';
    } else if (misalignedCount > alignedCount && misalignedCount > newDataCount) {
      assumption.comparisonOutcome = 'Misaligned';
    } else {
      assumption.comparisonOutcome = 'New Data Added';
    }

    // Calculate confidence score based on quote support
    const totalRelevant = alignedCount + misalignedCount + newDataCount;
    if (totalRelevant > 0) {
      const baseConfidence = 85; // Base confidence from deck analysis
      const quoteMultiplier = Math.min(totalRelevant / 3, 1); // Cap at 3 quotes
      assumption.confidenceScore = Math.round(baseConfidence * (0.7 + (0.3 * quoteMultiplier)));
      assumption.confidenceExplanation = `${totalRelevant} relevant quotes found: ${alignedCount} aligned, ${misalignedCount} misaligned, ${newDataCount} new data`;
    }

    // Generate messaging adjustment based on quote analysis
    if (assumption.comparisonOutcome === 'Misaligned') {
      assumption.waysToAdjustMessaging = `Adjust messaging to address ${misalignedCount} contradicting quotes. Focus on actual customer needs revealed in interviews.`;
    } else if (assumption.comparisonOutcome === 'New Data Added') {
      assumption.waysToAdjustMessaging = `Incorporate ${newDataCount} new insights from interviews into messaging.`;
    } else {
      assumption.waysToAdjustMessaging = `Continue emphasizing points validated by ${alignedCount} supporting quotes.`;
    }
  }
  
  return updatedAssumptions;
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== FILE PROCESSING STEPS ===');
    const formData = await request.formData();
    const deckFile = formData.get('deck') as File;
    const interviewFiles = formData.getAll('interviews') as File[];

    console.log('1. Files received:', {
      deck: !!deckFile,
      interviews: interviewFiles.length
    });

    if (!deckFile) {
      return NextResponse.json({ success: false, error: 'No deck file provided' }, { status: 400 });
    }

    // Process sales deck
    let parsedContent;
    try {
      console.log('2. Starting deck parsing...');
      parsedContent = await parseFile(deckFile);
      if (parsedContent.error) {
        console.error('Parsing error:', parsedContent.error);
        return NextResponse.json({ success: false, error: parsedContent.error }, { status: 400 });
      }
      console.log('3. Deck parsing completed, content length:', parsedContent.text.length);
    } catch (parseErr) {
      console.error('Error during deck parsing:', parseErr);
      return NextResponse.json({ success: false, error: 'Deck parsing failed: ' + (parseErr as Error).message }, { status: 500 });
    }

    // Extract assumptions from deck
    let openaiResponse;
    try {
      console.log('4. Sending deck to OpenAI...');
      openaiResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert at analyzing sales content and extracting buyer assumptions.
            You MUST return a JSON object with an "assumptions" array containing 5-8 extracted assumptions.
            DO NOT wrap the response in markdown code blocks.

            IMPORTANT RULES:
            1. ICP Attributes MUST be one of: "Buyer Titles", "Company Size", "Pain Points", "Desired Outcomes", "Triggers", "Barriers", "Messaging Emphasis"
            2. Evidence MUST include slide references in format "Slide X: [evidence]"
            3. Assumptions MUST be specific and testable with metrics or behaviors
            4. Each assumption MUST be buyer-focused (not product-focused)

            Example format:
            {
              "assumptions": [
                {
                  "icpAttribute": "Buyer Titles",
                  "icpTheme": "VP of Revenue Operations",
                  "v1Assumption": "VP of Revenue Ops spend 40% of their time on data reconciliation between systems",
                  "whyAssumption": "Manual data reconciliation is a major pain point for revenue teams",
                  "evidenceFromDeck": "Slide 3: 'Teams spend 15+ hours weekly on data reconciliation'",
                  "realityFromInterviews": "Interview findings",
                  "comparisonOutcome": "Aligned",
                  "waysToAdjustMessaging": "Focus on time savings and data accuracy metrics",
                  "confidenceScore": 85,
                  "confidenceExplanation": "Multiple data points support this assumption",
                  "quotes": []
                }
              ]
            }`
          },
          {
            role: "user",
            content: `SALES DECK CONTENT:\n${parsedContent.text}\n\nExtract 5-8 buyer assumptions from this content. Each assumption must:
1. Use only approved ICP attributes
2. Include slide references in evidence
3. Be specific and testable
4. Focus on buyer needs, not product features

Return the assumptions in the exact JSON format shown above. DO NOT wrap the response in markdown code blocks.`
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });
      console.log('5. OpenAI response received for deck analysis');
    } catch (openaiErr: any) {
      console.error('Error during OpenAI call:', openaiErr);
      return NextResponse.json({ success: false, error: 'OpenAI call failed: ' + openaiErr.message }, { status: 500 });
    }

    // Parse deck analysis response
    let content = openaiResponse.choices[0]?.message?.content;
    let parsed;
    try {
      if (typeof content === 'string') {
        content = content.replace(/```json\s*/, '').replace(/```\s*$/, '').trim();
      }
      parsed = typeof content === 'string' ? JSON.parse(content) : content;
      if (Array.isArray(parsed)) {
        parsed = { assumptions: parsed };
      }
      if (!parsed || !parsed.assumptions || !Array.isArray(parsed.assumptions)) {
        throw new Error('Invalid response structure');
      }
    } catch (err) {
      console.error('Error parsing OpenAI response:', err);
      return NextResponse.json({ success: false, error: 'Failed to parse OpenAI response' }, { status: 500 });
    }

    // Process interview files
    console.log('6. Processing interview files...');
    const quotes = await processInterviewFiles(interviewFiles);
    console.log(`7. Extracted ${quotes.length} quotes from interviews`);

    // Classify quotes against assumptions
    console.log('8. Classifying quotes against assumptions...');
    const updatedAssumptions = await classifyQuotesAgainstAssumptions(quotes, parsed.assumptions);
    console.log('9. Quote classification complete');

    // Quality checks and field validation
    const validated = updatedAssumptions.map((a: Assumption, idx: number) => {
      const errors = validateAssumption(a);
      return { ...a, _validationErrors: errors, _index: idx };
    });

    // Log warnings for quality issues
    validated.forEach((a: Assumption & { _validationErrors: string[], _index: number }) => {
      if (a._validationErrors.length > 0) {
        console.warn(`Assumption ${a._index + 1} validation errors:`, a._validationErrors);
      }
    });

    // Remove helper fields before returning
    const cleanAssumptions = validated.map(({ _validationErrors, _index, ...rest }: Assumption & { _validationErrors: string[], _index: number }) => rest);

    return NextResponse.json({
      success: true,
      assumptions: cleanAssumptions
    });
  } catch (err) {
    console.error('General error in analyze-files route:', err);
    return NextResponse.json({ success: false, error: 'Error processing files: ' + (err as Error).message }, { status: 500 });
  }
} 