import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { parseFile } from '@/utils/fileParser';
import { BuyerMapData, Quote } from '@/types/buyermap';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

async function classifyQuotesAgainstAssumptions(quotes: Quote[], assumptions: BuyerMapData[]): Promise<BuyerMapData[]> {
  const updatedAssumptions = [...assumptions];
  
  for (const assumption of updatedAssumptions) {
    const relevantQuotes: Quote[] = [];
    let alignedCount = 0;
    let misalignedCount = 0;
    let newDataCount = 0;
    
    for (const quote of quotes) {
      try {
        const classificationResponse = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are an expert at analyzing customer quotes against sales assumptions.
              Classify how this quote relates to the assumption:
              - "aligned": Quote directly supports the assumption
              - "misaligned": Quote contradicts the assumption
              - "new_insight": Quote provides new relevant information
              - "irrelevant": Quote is not related to the assumption
              
              Return a JSON object with:
              {
                "classification": "aligned" | "misaligned" | "new_insight" | "irrelevant",
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

        let content = classificationResponse.choices[0]?.message?.content;
        if (typeof content === 'string') {
          // Remove markdown code blocks and clean the content
          content = content.replace(/```json\s*/g, '')
                          .replace(/```\s*$/g, '')
                          .replace(/```\s*$/g, '') // Double check for any remaining backticks
                          .trim();
          console.log('Cleaned classification response:', content);
          
          try {
            const classification = JSON.parse(content);
            if (classification.classification !== 'irrelevant') {
              relevantQuotes.push(quote);
              switch (classification.classification.toLowerCase()) { // Normalize to lowercase
                case 'aligned': alignedCount++; break;
                case 'misaligned': misalignedCount++; break;
                case 'new_insight': newDataCount++; break;
              }
            }
          } catch (parseError) {
            console.error('Error parsing classification JSON:', parseError);
            console.error('Raw content:', content);
            // Try one more time with additional cleaning
            try {
              content = content.replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters
              const classification = JSON.parse(content);
              if (classification.classification !== 'irrelevant') {
                relevantQuotes.push(quote);
                switch (classification.classification.toLowerCase()) {
                  case 'aligned': alignedCount++; break;
                  case 'misaligned': misalignedCount++; break;
                  case 'new_insight': newDataCount++; break;
                }
              }
            } catch (secondParseError) {
              console.error('Second attempt at parsing failed:', secondParseError);
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
      assumption.comparisonOutcome = 'aligned';
    } else if (misalignedCount > alignedCount && misalignedCount > newDataCount) {
      assumption.comparisonOutcome = 'misaligned';
    } else {
      assumption.comparisonOutcome = 'new_insight';
    }

    // Calculate confidence score based on quote support
    const totalRelevant = alignedCount + misalignedCount + newDataCount;
    if (totalRelevant > 0) {
      const baseConfidence = 85; // Base confidence from deck analysis
      const quoteMultiplier = Math.min(totalRelevant / 3, 1); // Cap at 3 quotes
      assumption.confidenceScore = Math.round(baseConfidence * (0.7 + (0.3 * quoteMultiplier)));
      assumption.confidenceExplanation = `${totalRelevant} relevant quotes found: ${alignedCount} aligned, ${misalignedCount} misaligned, ${newDataCount} new insights`;
    }

    // Generate messaging adjustment based on quote analysis
    if (assumption.comparisonOutcome === 'misaligned') {
      assumption.waysToAdjustMessaging = `Adjust messaging to address ${misalignedCount} contradicting quotes. Focus on actual customer needs revealed in interviews.`;
    } else if (assumption.comparisonOutcome === 'new_insight') {
      assumption.waysToAdjustMessaging = `Incorporate ${newDataCount} new insights from interviews into messaging.`;
    } else {
      assumption.waysToAdjustMessaging = `Continue emphasizing points validated by ${alignedCount} supporting quotes.`;
    }
  }
  
  return updatedAssumptions;
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== INTERVIEW ANALYSIS PHASE ===');
    const formData = await request.formData();
    const interviewFiles = formData.getAll('interviews') as File[];
    const assumptionsJson = formData.get('assumptions') as string;

    console.log('1. Files received:', {
      interviews: interviewFiles.length,
      assumptions: !!assumptionsJson
    });

    if (!interviewFiles.length) {
      return NextResponse.json({ success: false, error: 'No interview files provided' }, { status: 400 });
    }

    if (!assumptionsJson) {
      return NextResponse.json({ success: false, error: 'No assumptions provided' }, { status: 400 });
    }

    // Parse assumptions
    let assumptions: BuyerMapData[];
    try {
      assumptions = JSON.parse(assumptionsJson);
      if (!Array.isArray(assumptions)) {
        throw new Error('Assumptions must be an array');
      }
    } catch (error) {
      console.error('Error parsing assumptions:', error);
      return NextResponse.json({ success: false, error: 'Invalid assumptions format' }, { status: 400 });
    }

    // Process interview files
    console.log('2. Processing interview files...');
    const quotes = await processInterviewFiles(interviewFiles);
    console.log(`3. Extracted ${quotes.length} quotes from interviews`);

    // Classify quotes against assumptions
    console.log('4. Classifying quotes against assumptions...');
    const updatedAssumptions = await classifyQuotesAgainstAssumptions(quotes, assumptions);
    console.log('5. Quote classification complete');

    return NextResponse.json({
      success: true,
      updatedAssumptions
    });
  } catch (err) {
    console.error('General error in analyze-interviews route:', err);
    return NextResponse.json({ success: false, error: 'Error processing interviews: ' + (err as Error).message }, { status: 500 });
  }
} 