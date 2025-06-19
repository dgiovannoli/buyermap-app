import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { parseFile } from '../../../utils/fileParser';
import { BuyerMapData, Quote } from '../../../types/buyermap';
import { createICPValidationData, createValidationData, getAssumptionSpecificInstructions, mapComparisonOutcome } from '../../../utils/dataMapping';
import pLimit from 'p-limit';

// Initialize OpenAI conditionally
let openai: OpenAI | null = null;
if (process.env.NEXT_PUBLIC_USE_MOCK !== "TRUE") {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// === FEATURE FLAG ===
const USE_TARGETED_EXTRACTION = true;
const CONCURRENT_LIMIT = 5; // Process max 5 interviews simultaneously

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

// Helper: Robust OpenAI call with retries, logging, and response_format enforcement
async function callOpenAIWithRetry(params: any, purpose: string, maxRetries = 2) {
  const apiKeyPresent = !!process.env.OPENAI_API_KEY;
  console.log(`[OpenAI][${purpose}] API key present:`, apiKeyPresent ? 'YES' : 'NO');
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const start = Date.now();
      if (!openai) {
        throw new Error('OpenAI client not initialized');
      }
      const response = await openai.chat.completions.create({
        ...params,
        response_format: { type: 'json_object' },
      });
      const duration = Date.now() - start;
      const choice = response.choices?.[0];
      const content = choice?.message?.content || '';
      console.log(`[OpenAI][${purpose}] Attempt ${attempt}: duration=${duration}ms, finish_reason=${choice?.finish_reason}, tokens=${response.usage?.total_tokens}`);
      console.log(`[OpenAI][${purpose}] Raw content length: ${content.length}`);
      console.log(`[OpenAI][${purpose}] Raw content preview:`, content.substring(0, 200));
      if (!content.trim()) {
        throw new Error('Empty content from OpenAI');
      }
      return response;
    } catch (err) {
      lastError = err;
      console.error(`[OpenAI][${purpose}] Error on attempt ${attempt}:`, (err as Error).message);
      if (attempt <= maxRetries) {
        await new Promise(res => setTimeout(res, 500 * attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// Helper: Fallback manual extraction for classifications
function extractClassificationsManually(content: string) {
  const classifications = [];
  // Pattern 1: JSON-like key-value
  const pattern1 = /"(.+?)"\s*:\s*"(ALIGNED|MISALIGNED|NEW_INSIGHT|IRRELEVANT)"/gi;
  let match;
  while ((match = pattern1.exec(content)) !== null) {
    classifications.push({ quote: match[1], classification: match[2] });
  }
  // Pattern 2: 1. "quote" - ALIGNED
  if (classifications.length === 0) {
    const pattern2 = /(\d+)\.\s*"(.+?)"\s*-\s*(ALIGNED|MISALIGNED|NEW_INSIGHT|IRRELEVANT)/gi;
    while ((match = pattern2.exec(content)) !== null) {
      classifications.push({ quote: match[2], classification: match[3] });
    }
  }
  // Pattern 3: JSON array objects
  if (classifications.length === 0) {
    const pattern3 = /"text"\s*:\s*"(.+?)".+?"classification"\s*:\s*"(ALIGNED|MISALIGNED|NEW_INSIGHT|IRRELEVANT)"/gi;
    while ((match = pattern3.exec(content)) !== null) {
      classifications.push({ quote: match[1], classification: match[2] });
    }
  }
  return classifications;
}

// Helper: Normalize quote extraction results
function normalizeQuoteExtractionResults(rawResults: any[]): Quote[] {
  const normalizedQuotes: Quote[] = [];
  rawResults.forEach((fileResult, fileIndex) => {
    let quotes: Quote[] = [];
    if (Array.isArray(fileResult)) {
      quotes = fileResult;
    } else if (fileResult?.quotes && Array.isArray(fileResult.quotes)) {
      quotes = fileResult.quotes;
    } else if (typeof fileResult === 'object' && fileResult.text) {
      quotes = [fileResult];
    }
    console.log(`📝 Found ${quotes.length} quotes in file ${fileIndex + 1}`);
    normalizedQuotes.push(...quotes);
  });
  return normalizedQuotes;
}

// Helper: Robust quote extraction from OpenAI response
function extractQuotesFromOpenAIResponse(content: string): Quote[] {
  console.log('🔧 Extracting quotes from content:', content.substring(0, 200));
  try {
    const parsed = JSON.parse(content);
    console.log('🔧 Parsed structure:', JSON.stringify(parsed, null, 2));
    console.log('🔧 Parsed type:', typeof parsed);
    let quotes: Quote[] = [];
    if (Array.isArray(parsed)) {
      quotes = parsed;
    } else if (parsed.quotes && Array.isArray(parsed.quotes)) {
      quotes = parsed.quotes;
    } else if (parsed.data && Array.isArray(parsed.data)) {
      quotes = parsed.data;
    }
    console.log('🔧 Extracted quotes count:', quotes.length);
    console.log('🔧 First quote preview:', quotes[0] ? JSON.stringify(quotes[0], null, 2) : 'No quotes');
    return quotes;
  } catch (error) {
    console.error('🔧 Parse error:', error);
    console.log('🔧 Raw content that failed to parse:', content);
    return [];
  }
}

// Helper: Robust batch classification parser
function parseBatchClassificationResponse(content: string): any[] {
  console.log('🔧 BATCH PARSING DEBUG:');
  console.log('🔧 Raw content:', content.substring(0, 200));
  try {
    const parsed = JSON.parse(content);
    console.log('🔧 Parsed structure keys:', Object.keys(parsed));
    let quotes: any[] = [];
    if (parsed.quotes && Array.isArray(parsed.quotes)) {
      quotes = parsed.quotes;
      console.log('🔧 Found quotes property with', quotes.length, 'items');
    } else if (parsed.result && Array.isArray(parsed.result)) {
      quotes = parsed.result;
      console.log('🔧 Found result property with', quotes.length, 'items');
    } else if (Array.isArray(parsed)) {
      quotes = parsed;
      console.log('🔧 Found direct array with', quotes.length, 'items');
    }
    console.log('🔧 Extracted', quotes.length, 'classified quotes');
    console.log('🔧 Sample:', quotes[0] ? JSON.stringify(quotes[0], null, 2) : 'None');
    return quotes;
  } catch (error) {
    console.error('🔧 Batch parsing error:', error);
    console.log('🔧 Failed content:', content);
    return [];
  }
}

// --- Simple Topic Focus Instructions ---
function getTopicFocusInstructions(assumption: string): string {
  const assumptionLower = assumption.toLowerCase();
  // Buyer titles / target customers
  if (assumptionLower.includes('buyer') || assumptionLower.includes('target') || 
      assumptionLower.includes('attorney') || assumptionLower.includes('customer')) {
    return `TOPIC: WHO buys, uses, or makes decisions about this service
    
    EXTRACT quotes about:
    - Job titles, roles, or professional backgrounds
    - Who makes purchasing decisions
    - Types of legal professionals or staff
    - User personas or target customers
    
    EXAMPLES of relevant quotes:
    "I'm a criminal defense attorney and..."
    "The paralegal usually handles..."
    "Our office manager decides on..."
    "Attorneys like me typically..."`;
  }
  // Company/firm size
  if (assumptionLower.includes('company') || assumptionLower.includes('firm') || 
      assumptionLower.includes('size') || assumptionLower.includes('small') || 
      assumptionLower.includes('large')) {
    return `TOPIC: Company or firm SIZE characteristics
    
    EXTRACT quotes about:
    - Firm size, employee count, or scale
    - Small vs large operations
    - Resource constraints based on size
    - Different needs by company size
    - Size-related pricing or affordability
    
    EXAMPLES of relevant quotes:
    "We're a small firm with..."
    "Large practices like ours..."
    "Solo attorneys don't have..."
    "Small firms can't afford..."
    "Enterprise pricing works for..."`;
  }
  // Pain points / problems
  if (assumptionLower.includes('pain') || assumptionLower.includes('problem') || 
      assumptionLower.includes('challenge') || assumptionLower.includes('difficult')) {
    return `TOPIC: PROBLEMS, challenges, or pain points
    
    EXTRACT quotes about:
    - Specific problems or frustrations
    - Time-consuming tasks
    - Inefficient processes
    - Challenges they face
    
    EXAMPLES of relevant quotes:
    "The problem is we spend..."
    "It's frustrating when..."
    "We waste so much time..."
    "The biggest challenge is..."`;
  }
  // Evidence processing / efficiency
  if (assumptionLower.includes('evidence') || assumptionLower.includes('processing') || 
      assumptionLower.includes('efficient') || assumptionLower.includes('review')) {
    return `TOPIC: EVIDENCE handling, processing, or review efficiency
    
    EXTRACT quotes about:
    - Evidence review processes
    - Efficiency in handling evidence
    - Time spent on evidence analysis
    - Evidence management workflows
    
    EXAMPLES of relevant quotes:
    "When we review evidence..."
    "Processing all this evidence takes..."
    "We need to go through..."
    "Evidence analysis usually..."`;
  }
  // Triggers / when they need service
  if (assumptionLower.includes('trigger') || assumptionLower.includes('when') || 
      assumptionLower.includes('need') || assumptionLower.includes('use')) {
    return `TOPIC: WHEN or WHY they need/use the service
    
    EXTRACT quotes about:
    - Specific situations that prompt use
    - Triggers or events that create need
    - Circumstances when service is valuable
    - Timing of service usage
    
    EXAMPLES of relevant quotes:
    "When we get a case with..."
    "If there's a deadline..."
    "During trial prep we..."
    "We typically use this when..."`;
  }
  // Barriers / concerns
  if (assumptionLower.includes('barrier') || assumptionLower.includes('concern') || 
      assumptionLower.includes('hesitant') || assumptionLower.includes('worry')) {
    return `TOPIC: CONCERNS, barriers, or hesitations about adoption
    
    EXTRACT quotes about:
    - Worries or concerns about the service
    - Barriers to adoption (including cost/pricing barriers)
    - Hesitations or resistance
    - Risk factors or objections
    - Budget or affordability concerns
    
    EXAMPLES of relevant quotes:
    "I'm concerned about..."
    "The worry is that..."
    "We're hesitant because..."
    "Cost is a major barrier..."
    "Can't afford the pricing..."`;
  }
  // Default for any other assumption
  return `TOPIC: The specific subject matter of this assumption
  
  EXTRACT quotes that directly discuss or provide evidence about this assumption's topic.
  Focus on quotes that contain specific, concrete information relevant to validating or challenging this assumption.
  
  Avoid generic business talk, satisfaction statements, or unrelated topics.`;
}

// --- Context-Aware Filtering ---
function isRelevantToAssumption(text: string, assumption: string): boolean {
  const textLower = text.toLowerCase();
  const assumptionLower = assumption.toLowerCase();
  if (/\b(price|cost|budget|expensive|cheap|afford)\b/i.test(text)) {
    if (assumptionLower.includes('small') || assumptionLower.includes('large') || 
        assumptionLower.includes('firm') || assumptionLower.includes('company')) {
      return /\b(small|large|big|solo|enterprise|firm|company|practice)\b/i.test(text);
    }
    if (assumptionLower.includes('barrier') || assumptionLower.includes('concern') || 
        assumptionLower.includes('hesitant')) {
      return true;
    }
    if (assumptionLower.includes('buyer') || assumptionLower.includes('target')) {
      return /\b(attorney|lawyer|firm|practice|legal)\b/i.test(text);
    }
    return false;
  }
  return true;
}

function filterHighQualityQuotes(quotes: any[]): any[] {
  return quotes.filter(quote => {
    const text = quote.text || quote.quote || '';
    const assumption = quote.assumption || '';
    if (text.length < 15) return false;
    const isGenericSatisfaction = /^(we're|it's|that's)\s+(happy|good|great|helpful|nice|useful)\b/i.test(text) ||
                                 /\b(pretty|really|very)\s+(happy|good|great|helpful|nice|useful)\b/i.test(text);
    const isOffTopicPricing = /\b(price|cost|budget)\b/i.test(text) && 
                             !isRelevantToAssumption(text, assumption) &&
                             !/\b(attorney|lawyer|firm|evidence|case|legal)\b/i.test(text);
    const isFragment = text.startsWith('So ') || 
                      text.startsWith('Like ') || 
                      text.startsWith('Um ') ||
                      text.includes('...') || 
                      text.split(' ').length < 8;
    const isOffTopic = isGenericSatisfaction || isOffTopicPricing || isFragment;
    if (isOffTopic) {
      console.log(`Filtering out off-topic quote: ${text.slice(0, 50)}...`);
      return false;
    }
    const specificityScore = quote.specificity_score || quote.relevance_score || 0;
    return specificityScore >= 6;
  });
}

// === TARGETED QUOTE EXTRACTION ===
async function extractTargetedQuotes(interviewText: string, fileName: string, assumption: string): Promise<Quote[]> {
  const prompt = `You are extracting quotes that are directly ABOUT this business assumption. Stay focused on the topic.

ASSUMPTION: "${assumption}"

INTERVIEW CONTENT: ${interviewText}
SOURCE: ${fileName}

TOPIC FOCUS RULES:
Extract quotes that are directly ABOUT the assumption's topic:

${getTopicFocusInstructions(assumption)}

CRITICAL: ONLY extract quotes that actually discuss the assumption's topic.

REJECT quotes about:
- General satisfaction ("we're happy", "it's helpful", "we like it")
- Pricing or costs ("price is always...", "expensive", "budget")
- Features or functionality (unless directly related to assumption topic)
- Process descriptions (unless directly related to assumption topic)
- Unrelated business topics

QUALITY REQUIREMENTS:
- Quote must contain specific, concrete information about the topic
- Avoid vague or generic statements
- Must be substantial (not conversation fragments)
- Speaker attribution helpful when available

Extract 2-3 quotes that are most directly ABOUT this assumption's topic.

Return in this exact JSON format:
{
  "quotes": [
    {
      "text": "quote that discusses the assumption topic with specific details",
      "speaker": "speaker name if identifiable",
      "role": "speaker role if mentioned", 
      "source": "${fileName}",
      "topic_relevance": "brief explanation of why this relates to the assumption topic",
      "specificity_score": 8
    }
  ]
}`;
  try {
    console.log(`[OpenAI][targeted-extraction] Starting for assumption: ${assumption.substring(0, 30)}...`);
    const startTime = Date.now();
    if (!openai) {
      throw new Error('OpenAI client not initialized');
    }
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are an expert at extracting relevant quotes for business assumption validation. Only extract quotes that directly relate to the given assumption." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
      max_tokens: 1500
    });
    const duration = Date.now() - startTime;
    console.log(`[OpenAI][targeted-extraction] Completed in ${duration}ms`);
    console.log(`[OpenAI][targeted-extraction] Raw response: ${response.choices[0].message.content?.substring(0, 200)}...`);
    const content = response.choices[0].message.content;
    if (!content) {
      console.log(`[OpenAI][targeted-extraction] Empty response for assumption`);
      return [];
    }
    const parsed = JSON.parse(content);
    let quotes = parsed.quotes || [];
    quotes = filterHighQualityQuotes(quotes);
    console.log(`🎯 Extracted ${quotes.length} high-quality targeted quotes for assumption`);
    if (quotes.length > 0) {
      console.log(`🎯 Sample quote: "${quotes[0].text?.substring(0, 50)}..."`);
    }
    return quotes;
  } catch (error) {
    console.error(`[OpenAI][targeted-extraction] Error:`, error);
    return [];
  }
}

// Helper: Classify quotes for a single assumption
async function classifyQuotesForAssumption(quotes: Quote[], assumption: string): Promise<Quote[]> {
  const BATCH_SIZE = 3;
  const allClassifiedQuotes: Quote[] = [];
  for (let i = 0; i < quotes.length; i += BATCH_SIZE) {
    const quoteBatch = quotes.slice(i, i + BATCH_SIZE);
    const classificationPrompt = `Classify these quotes based on how they relate to this business assumption.

ASSUMPTION: "${assumption}"

CLASSIFICATION PROCESS:
1. First verify: Is this quote actually ABOUT the assumption's topic?
2. If not about the topic → classify as IRRELEVANT
3. If about the topic → classify based on what evidence it provides

CLASSIFICATION RULES:
- ALIGNED: Quote is about the topic AND supports the assumption
- MISALIGNED: Quote is about the topic AND contradicts the assumption  
- NEW_INSIGHT: Quote is about the topic AND adds new perspective
- NEUTRAL: Quote is about the topic BUT doesn't clearly support or contradict
- IRRELEVANT: Quote is NOT about the assumption's topic (pricing, satisfaction, unrelated topics)

EXAMPLES:
Assumption: "Target buyers include criminal defense attorneys"
- Quote about job titles/roles → Classify based on evidence
- Quote about pricing/satisfaction → IRRELEVANT

Assumption: "Suitable for small and large law firms"  
- Quote about firm size → Classify based on evidence
- Quote about features/happiness → IRRELEVANT

Quotes to classify:
${quoteBatch.map((q, idx) => `${idx + 1}. "${q.text || (q as any).quote || ''}" \n   Speaker: ${q.speaker || 'Unknown'}`).join('\n\n')}

Return JSON with topic verification:
{
  "quotes": [
    {
      "quote": "exact text",
      "about_assumption_topic": true/false,
      "classification": "ALIGNED|MISALIGNED|NEW_INSIGHT|NEUTRAL|IRRELEVANT",
      "reasoning": "Brief explanation focusing on topic relevance and evidence provided",
      "confidence": 8
    }
  ]
}`;
    let batchResponse;
    try {
      batchResponse = await withTimeout(callOpenAIWithRetry({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert at classifying quotes for business assumption validation. Focus on logical relationships and contradictions.`
          },
          {
            role: "user",
            content: classificationPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      }, 'classification-batch'), 60000);
    } catch (error) {
      console.error('[OpenAI][classification-batch] API error:', (error as Error).message);
      continue;
    }
    let content = batchResponse.choices[0]?.message?.content || '';
    if (!content.trim()) {
      console.error('[OpenAI][classification-batch] Empty response from OpenAI');
      continue;
    }
    // Aggressive cleaning
    content = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*$/gi, '')
      .replace(/^[^{[]*/, '')
      .replace(/[^}\]]*$/, '')
      .trim()
      .replace(/^\s*["']/, '')
      .replace(/["']\s*$/, '')
      .replace(/\n\s*\n/g, '\n')
      .replace(/,\s*[}\]]/, '}')
                          .trim();
    // Parse and flatten
    let batchClassified = [];
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        batchClassified = parsed;
      } else if (parsed.quotes && Array.isArray(parsed.quotes)) {
        batchClassified = parsed.quotes;
      } else if (parsed.result && Array.isArray(parsed.result)) {
        batchClassified = parsed.result;
      }
    } catch (err) {
      console.error('Failed to parse classification batch:', err);
      batchClassified = [];
    }
    allClassifiedQuotes.push(...batchClassified.filter((item: Quote) => ((item as any).classification || '').toUpperCase() !== 'IRRELEVANT'));
    console.log('🔧 Batch result:', batchClassified.length, 'classified quotes');
    console.log('🔧 Total accumulated:', allClassifiedQuotes.length, 'quotes');
  }
  return allClassifiedQuotes;
}

// Process a single interview file
async function processSingleInterview(file: File, assumptions: string[]): Promise<Record<string, Quote[]>> {
  console.log(`📁 Processing interview: ${file.name}`);
  const parsed = await parseFile(file);
  if (parsed.error) {
    throw new Error(`Error parsing interview file ${file.name}: ${parsed.error}`);
  }
  
  const interviewText = parsed.text;
  const quotesPerAssumption: Record<string, Quote[]> = {};
  
  // Initialize quotes array for each assumption
  assumptions.forEach(assumption => {
    quotesPerAssumption[assumption] = [];
  });
  
  // Extract quotes for each assumption
  for (const assumption of assumptions) {
    console.log(`  🎯 Processing assumption: ${assumption.substring(0, 40)}...`);
    const targetedQuotes = await extractTargetedQuotes(interviewText, file.name, assumption);
    quotesPerAssumption[assumption] = targetedQuotes;
  }
  
  // Classify all quotes
  const classificationResults: Record<string, Quote[]> = {};
  for (const assumption of assumptions) {
    const quotesForAssumption = quotesPerAssumption[assumption] || [];
    if (quotesForAssumption.length > 0) {
      const classified = await classifyQuotesForAssumption(quotesForAssumption, assumption);
      classificationResults[assumption] = classified;
    } else {
      classificationResults[assumption] = [];
    }
  }
  
  return classificationResults;
}

// Helper: Log processing statistics
function logProcessingStats(results: any[], startTime: number) {
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const successfulInterviews = results.filter(r => !r.error).length;
  const failedInterviews = results.filter(r => r.error).length;
  
  console.log(`📈 Processing Summary:`);
  console.log(`   Total time: ${totalTime}s`);
  console.log(`   Successful interviews: ${successfulInterviews}`);
  console.log(`   Failed interviews: ${failedInterviews}`);
  
  if (failedInterviews > 0) {
    console.log(`   Failed files:`, results.filter(r => r.error).map(r => r.fileName));
  }
}

// Helper: Calculate overall outcome for an assumption based on quote classifications
function calculateAssumptionOutcome(quotes: any[]): string {
  if (!quotes || quotes.length === 0) return 'pending';
  let aligned = 0, misaligned = 0, newInsight = 0, neutral = 0;
  for (const q of quotes) {
    const c = (q.classification || '').toLowerCase();
    if (c === 'aligned') aligned++;
    else if (c === 'misaligned') misaligned++;
    else if (c === 'new_insight') newInsight++;
    else if (c === 'neutral') neutral++;
  }
  if (misaligned > aligned && misaligned > newInsight) return 'misaligned';
  if (aligned > misaligned && aligned > newInsight) return 'aligned';
  if (newInsight > 0 && misaligned <= aligned) return 'new_insight';
  if (aligned === 0 && misaligned === 0 && newInsight === 0) return 'pending';
  return 'neutral';
}

export async function POST(request: NextRequest) {
  const processingStartTime = Date.now();
  
  try {
    // Check if we should use mock data
    if (process.env.NEXT_PUBLIC_USE_MOCK === "TRUE") {
      console.log('🎭 Using mock data for interview analysis');
      const mock = await import("../../../mocks/fixtures/interview-results.json");
      return NextResponse.json(mock.default);
    }
    
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const assumptionsJson = formData.get('assumptions') as string;
    const existingAssumptions: BuyerMapData[] = JSON.parse(assumptionsJson);

    if (!files.length) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    console.log(`🎯 Starting parallel processing for ${files.length} interviews, ${existingAssumptions.length} assumptions`);
    const assumptionsList: string[] = existingAssumptions.map(a => a.v1Assumption);
    
    // Set up parallel processing with rate limiting
    const limit = pLimit(CONCURRENT_LIMIT);
    console.log(`🚀 Processing ${files.length} interviews in parallel (max ${CONCURRENT_LIMIT} concurrent)...`);
    
    const allResults = await Promise.all(
      files.map(file => 
        limit(async () => {
          try {
            console.log(`Starting interview: ${file.name}`);
            const result = await processSingleInterview(file, assumptionsList);
            const elapsed = ((Date.now() - processingStartTime) / 1000).toFixed(1);
            console.log(`✅ Completed interview ${file.name} in ${elapsed}s`);
            return { result, fileName: file.name };
        } catch (error) {
            console.error(`❌ Error processing interview ${file.name}:`, error);
            return { 
              result: Object.fromEntries(assumptionsList.map(a => [a, []])),
              fileName: file.name,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        })
      )
    );
    
    // Flatten and aggregate results from all interviews
    const aggregatedResults = existingAssumptions.map(assumption => {
      const allQuotesForAssumption = allResults.flatMap(result => 
        result.result[assumption.v1Assumption] || []
      );
      
      return {
        ...assumption,
        quotes: allQuotesForAssumption
      };
    });
    
    // Count total quotes processed
    const totalQuotes = aggregatedResults.reduce((sum, assumption) => sum + assumption.quotes.length, 0);
    console.log(`📊 Total quotes processed: ${totalQuotes} across ${existingAssumptions.length} assumptions`);
    
    // Log final stats
    logProcessingStats(allResults, processingStartTime);
    
    // Set comparisonOutcome for each assumption based on quote classifications
    aggregatedResults.forEach(assumption => {
      const rawOutcome = calculateAssumptionOutcome(assumption.quotes);
      assumption.comparisonOutcome = mapComparisonOutcome(rawOutcome);
    });
    
    // Transform to final format
    const icpValidation = createICPValidationData(aggregatedResults[0]);
    icpValidation.subtitle = 'Validated against customer interviews';
    icpValidation.totalInterviews = files.length;
    
    const validationAttributes = Object.values(createValidationData(aggregatedResults));
    
    const validatedCount = aggregatedResults.filter(a => a.comparisonOutcome === 'Aligned').length;
    const partiallyValidatedCount = aggregatedResults.filter(a => a.comparisonOutcome === 'New Data Added').length;
    const pendingCount = aggregatedResults.filter(a => !a.comparisonOutcome).length;
    
    const overallAlignmentScore = Math.round(
      (validatedCount / aggregatedResults.length) * 100
    );

    return NextResponse.json({
      success: true,
      assumptions: aggregatedResults,
      icpValidation,
      validationAttributes,
      overallAlignmentScore,
      validatedCount,
      partiallyValidatedCount,
      pendingCount,
      metadata: {
        totalInterviews: files.length,
        totalQuotes,
        processingTimeSeconds: ((Date.now() - processingStartTime) / 1000).toFixed(1),
        parallelProcessing: true
      }
    });
    
  } catch (error: unknown) {
    const totalTime = ((Date.now() - processingStartTime) / 1000).toFixed(1);
    console.error(`❌ Processing failed after ${totalTime}s:`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      processingTimeSeconds: totalTime
    }, { status: 500 });
  }
} 