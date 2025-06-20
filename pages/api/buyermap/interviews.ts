import type { NextApiRequest, NextApiResponse } from 'next'
import formidable, { File, IncomingForm } from 'formidable'
import fs from 'fs/promises'
import OpenAI from 'openai'
import pLimit from 'p-limit'
import { getPineconeIndex } from '../../../src/lib/pinecone'

// Disable Next's default body parsing
export const config = { api: { bodyParser: false } }

// Initialize OpenAI
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Initialize Pinecone
let pineconeIndex: any = null;
try {
  pineconeIndex = getPineconeIndex();
} catch (error) {
  console.warn('Pinecone initialization failed:', error);
}

// Types
interface Quote {
  text: string;
  speaker?: string;
  role?: string;
  source: string;
  classification?: 'ALIGNED' | 'MISALIGNED' | 'NEW_INSIGHT' | 'NEUTRAL' | 'IRRELEVANT';
  topic_relevance?: string;
  specificity_score?: number;
}

interface BuyerMapAssumption {
  id: number;
  icpAttribute: string;
  icpTheme: string;
  v1Assumption: string;
  whyAssumption: string;
  evidenceFromDeck: string;
  comparisonOutcome: string;
  confidenceScore: number;
  confidenceExplanation: string;
  validationStatus: string;
  quotes: Quote[];
  realityFromInterviews?: string;
}

type BuyerMapData = {
  success: boolean
  assumptions: BuyerMapAssumption[]
  overallAlignmentScore: number
  validatedCount: number
  partiallyValidatedCount: number
  pendingCount: number
  metadata?: {
    totalInterviews: number;
    totalQuotes: number;
    processingTimeSeconds: string;
    parallelProcessing: boolean;
  }
}

// Configuration
const USE_TARGETED_EXTRACTION = true;
const CONCURRENT_LIMIT = 5; // Process max 5 interviews simultaneously

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

// Robust OpenAI call with retries
async function callOpenAIWithRetry(params: any, purpose: string, maxRetries = 2) {
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
      console.log(`[OpenAI][${purpose}] Attempt ${attempt}: duration=${duration}ms, tokens=${response.usage?.total_tokens}`);
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

// Index quote embeddings into Pinecone
async function indexQuoteEmbeddings(quotes: Quote[], assumptionId: number): Promise<void> {
  // Skip if in mock mode or Pinecone not available
  if (process.env.NEXT_PUBLIC_USE_MOCK === "TRUE" || !pineconeIndex || !openai) {
    console.log('🎭 Skipping Pinecone indexing: mock mode or Pinecone/OpenAI not available');
    return;
  }

  const embeddingTasks = quotes
    .filter(quote => quote.text && quote.text.length > 20)
    .map(async (quote, index) => {
      try {
        // Generate embedding for the quote text
        const { data: [embeddingResult] } = await openai!.embeddings.create({
          model: 'text-embedding-ada-002',
          input: [quote.text],
        });
        
        const vector = embeddingResult.embedding;
        const quoteId = `${Date.now()}-${index}`;
        
        // Upsert into Pinecone under "interviews" namespace
        const namespacedIndex = pineconeIndex.namespace('interviews');
        await namespacedIndex.upsert([{
          id: `intv-${assumptionId}-${quoteId}`,
          values: vector,
          metadata: {
            assumptionId: assumptionId.toString(),
            quoteId,
            text: quote.text,
            speaker: quote.speaker || '',
            role: quote.role || '',
            source: quote.source || '',
            classification: quote.classification || '',
            topic_relevance: quote.topic_relevance || '',
            specificity_score: quote.specificity_score || 0
          },
        }]);
        
        console.log(`📊 Indexed quote embedding: ${quoteId.substring(0, 8)}... (assumption ${assumptionId})`);
      } catch (error) {
        console.error(`❌ Failed to index quote embedding:`, error);
      }
    });

  // Execute all embedding tasks in parallel
  await Promise.all(embeddingTasks);
  console.log(`✅ Indexed ${embeddingTasks.length} quote embeddings for assumption ${assumptionId}`);
}

// Get topic-specific instructions for each ICP attribute
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
    - Triggering events or situations
    - When they seek solutions
    - Decision-making moments
    - Timing of needs
    
    EXAMPLES of relevant quotes:
    "We started looking when..."
    "The trigger was..."
    "We need this most when..."
    "It becomes urgent during..."`;
  }
  
  // Barriers / obstacles
  if (assumptionLower.includes('barrier') || assumptionLower.includes('obstacle') || 
      assumptionLower.includes('concern') || assumptionLower.includes('challenge')) {
    return `TOPIC: BARRIERS, obstacles, or concerns about adoption
    
    EXTRACT quotes about:
    - Reasons for hesitation
    - Implementation concerns
    - Budget or resource constraints
    - Technical or operational barriers
    
    EXAMPLES of relevant quotes:
    "Our concern is..."
    "The barrier for us is..."
    "We worry about..."
    "The obstacle would be..."`;
  }
  
  // Messaging / value proposition
  if (assumptionLower.includes('message') || assumptionLower.includes('value') || 
      assumptionLower.includes('benefit') || assumptionLower.includes('emphasis')) {
    return `TOPIC: What VALUE or BENEFITS resonate most
    
    EXTRACT quotes about:
    - What they find most valuable
    - Key benefits they mention
    - What messaging resonates
    - Value propositions they care about
    
    EXAMPLES of relevant quotes:
    "What we really value is..."
    "The biggest benefit is..."
    "What matters most to us..."
    "The key advantage is..."`;
  }
  
  // Default case
  return `TOPIC: General insights about this assumption
  
  EXTRACT quotes that provide specific insights about:
  - Concrete behaviors or preferences
  - Specific metrics or quantifiable statements
  - Detailed processes or workflows
  - Clear opinions or decisions`;
}

// Extract targeted quotes for a specific assumption
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
    const response = await withTimeout(
      callOpenAIWithRetry({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: "You are an expert at extracting relevant quotes for business assumption validation. Only extract quotes that directly relate to the given assumption." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1500
      }, 'targeted-extraction'),
      60000
    );

    const content = response.choices[0].message.content;
    if (!content) {
      console.log(`[OpenAI][targeted-extraction] Empty response for assumption`);
      return [];
    }

    const parsed = JSON.parse(content);
    let quotes = parsed.quotes || [];
    
    // Filter high-quality quotes
    quotes = quotes.filter((quote: any) => 
      quote.text && 
      quote.text.length > 20 && 
      quote.specificity_score >= 6
    );

    console.log(`🎯 Extracted ${quotes.length} high-quality targeted quotes for assumption`);
    return quotes;
  } catch (error) {
    console.error(`[OpenAI][targeted-extraction] Error:`, error);
    return [];
  }
}

// Classify quotes for a single assumption
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

Quotes to classify:
${quoteBatch.map((q, idx) => `${idx + 1}. "${q.text}" \n   Speaker: ${q.speaker || 'Unknown'}`).join('\n\n')}

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

    try {
      const batchResponse = await withTimeout(
        callOpenAIWithRetry({
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
        }, 'classification-batch'),
        60000
      );

      let content = batchResponse.choices[0]?.message?.content || '';
      if (!content.trim()) {
        console.error('[OpenAI][classification-batch] Empty response from OpenAI');
        continue;
      }

      // Parse and add to results
      const parsed = JSON.parse(content);
      let batchClassified = parsed.quotes || [];
      
      // Filter out irrelevant quotes
      batchClassified = batchClassified.filter((item: any) => 
        item.classification?.toUpperCase() !== 'IRRELEVANT'
      );
      
      // Map the classified results back to the original quote structure
      // The OpenAI response has 'quote' property, but we need 'text' property
      const mappedQuotes = batchClassified.map((classifiedItem: any, index: number) => {
        // Find the original quote from the batch that matches this classified result
        const originalQuote = quoteBatch[index] || quoteBatch.find(q => q.text === classifiedItem.quote);
        
        return {
          text: classifiedItem.quote || originalQuote?.text || '',
          speaker: originalQuote?.speaker || '',
          role: originalQuote?.role || '',
          source: originalQuote?.source || '',
          classification: classifiedItem.classification,
          topic_relevance: classifiedItem.reasoning,
          specificity_score: classifiedItem.confidence || 5
        };
      });
      
      allClassifiedQuotes.push(...mappedQuotes);
      console.log('🔧 Batch result:', mappedQuotes.length, 'classified quotes');
    } catch (error) {
      console.error('Failed to classify quote batch:', error);
    }
  }
  
  return allClassifiedQuotes;
}

// Process a single interview file
async function processSingleInterview(file: File, assumptions: string[]): Promise<Record<string, Quote[]>> {
  console.log(`📁 Processing interview: ${file.originalFilename || file.newFilename}`);
  
  // Read file content
  const buffer = await fs.readFile((file as any).filepath);
  const interviewText = buffer.toString('utf8');
  
  const classificationResults: Record<string, Quote[]> = {};
  
  // Extract and classify quotes for each assumption
  for (const assumption of assumptions) {
    console.log(`  🎯 Processing assumption: ${assumption.substring(0, 40)}...`);
    
    // Extract targeted quotes
    const targetedQuotes = await extractTargetedQuotes(interviewText, file.originalFilename || file.newFilename || 'interview', assumption);
    
    // Classify the quotes
    if (targetedQuotes.length > 0) {
      const classified = await classifyQuotesForAssumption(targetedQuotes, assumption);
      classificationResults[assumption] = classified;
    } else {
      classificationResults[assumption] = [];
    }
  }
  
  return classificationResults;
}

// Calculate overall outcome for an assumption based on quote classifications
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

// Map outcomes to comparison results
function mapComparisonOutcome(rawOutcome: string): string {
  const outcomeMap: { [key: string]: string } = {
    'aligned': 'Aligned',
    'misaligned': 'Misaligned', 
    'new_insight': 'New Data Added',
    'neutral': 'New Data Added',
    'pending': 'New Data Added'
  };
  return outcomeMap[rawOutcome] || 'New Data Added';
}

// Helper function to get the base URL for internal API calls
function getBaseUrl(req: NextApiRequest): string {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host;
  return `${protocol}://${host}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BuyerMapData | { error: string }>
) {
  const processingStartTime = Date.now();
  
  console.log('▶️ [Interview API] route start')
  console.log('🚀 Interview API route called with method:', req.method)
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('📋 Request headers:', req.headers['content-type'])

    // Parse the incoming FormData using Promise-based approach
    const form = new IncomingForm({ multiples: true })
    
    const data = await new Promise<{ fields: any; files: any }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err)
        resolve({ fields, files })
      })
    })

    console.log('📄 Parsed fields:', Object.keys(data.fields))
    console.log('📁 Parsed files object keys:', Object.keys(data.files))

    // Get interview files
    const transcriptFiles = data.files.transcripts || data.files.interviews || data.files.files || []
    const interviewFiles: File[] = Array.isArray(transcriptFiles)
      ? transcriptFiles
      : transcriptFiles ? [transcriptFiles] : []

    console.log(`🗂️ Received ${interviewFiles.length} interview files`)

    if (interviewFiles.length === 0) {
      return res.status(400).json({ error: 'No interview files provided' })
    }

    // Get assumptions from the form data
    const assumptionsJson = data.fields.assumptions;
    let existingAssumptions: BuyerMapAssumption[] = [];
    
    if (assumptionsJson) {
      try {
        const parsed = Array.isArray(assumptionsJson) ? assumptionsJson[0] : assumptionsJson;
        existingAssumptions = JSON.parse(parsed);
        console.log(`📋 Received ${existingAssumptions.length} existing assumptions`);
      } catch (error) {
        console.error('Error parsing assumptions:', error);
        return res.status(400).json({ error: 'Invalid assumptions format' })
      }
    }

    // Check if we should use mock data
    if (process.env.NEXT_PUBLIC_USE_MOCK === "TRUE") {
      console.log('🎭 Using mock data for interview analysis');
      // Return mock response structure
      const mockResponse: BuyerMapData = {
        success: true,
        assumptions: existingAssumptions.length > 0 ? existingAssumptions : [],
        overallAlignmentScore: 85,
        validatedCount: 2,
        partiallyValidatedCount: 3,
        pendingCount: 2,
        metadata: {
          totalInterviews: interviewFiles.length,
          totalQuotes: 12,
          processingTimeSeconds: "2.5",
          parallelProcessing: true
        }
      };
      return res.status(200).json(mockResponse);
    }

    // If no assumptions provided, use default ICP attributes
    if (existingAssumptions.length === 0) {
      const defaultAttributes = [
        'Buyer Titles', 'Company Size', 'Pain Points', 'Desired Outcomes', 
        'Triggers', 'Barriers', 'Messaging Emphasis'
      ];
      existingAssumptions = defaultAttributes.map((attr, index) => ({
        id: index + 1,
        icpAttribute: attr,
        icpTheme: attr.toLowerCase().replace(/\s+/g, '-'),
        v1Assumption: `Default assumption for ${attr}`,
        whyAssumption: 'Default assumption for interview validation',
        evidenceFromDeck: 'No deck analysis available',
        comparisonOutcome: 'New Data Added',
        confidenceScore: 50,
        confidenceExplanation: 'Default assumption pending validation',
        validationStatus: 'pending',
        quotes: []
      }));
      console.log(`📋 Using ${existingAssumptions.length} default assumptions`);
    }

    if (!openai) {
      throw new Error('OpenAI client not initialized - missing API key');
    }

    console.log(`🎯 Starting parallel processing for ${interviewFiles.length} interviews, ${existingAssumptions.length} assumptions`);
    const assumptionsList: string[] = existingAssumptions.map(a => a.v1Assumption);
    
    // Set up parallel processing with rate limiting
    const limit = pLimit(CONCURRENT_LIMIT);
    console.log(`🚀 Processing ${interviewFiles.length} interviews in parallel (max ${CONCURRENT_LIMIT} concurrent)...`);
    
    const allResults = await Promise.all(
      interviewFiles.map(file => 
        limit(async () => {
          try {
            console.log(`Starting interview: ${file.originalFilename || file.newFilename}`);
            const result = await processSingleInterview(file, assumptionsList);
            const elapsed = ((Date.now() - processingStartTime) / 1000).toFixed(1);
            console.log(`✅ Completed interview ${file.originalFilename || file.newFilename} in ${elapsed}s`);
            return { result, fileName: file.originalFilename || file.newFilename || 'interview' };
          } catch (error) {
            console.error(`❌ Error processing interview ${file.originalFilename || file.newFilename}:`, error);
            return { 
              result: Object.fromEntries(assumptionsList.map(a => [a, []])),
              fileName: file.originalFilename || file.newFilename || 'interview',
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
    
    // Index quote embeddings into Pinecone
    console.log('📊 Indexing quote embeddings into Pinecone...');
    const indexingTasks = aggregatedResults
      .filter(assumption => assumption.quotes.length > 0)
      .map(assumption => indexQuoteEmbeddings(assumption.quotes, assumption.id));
    
    await Promise.all(indexingTasks);
    console.log('✅ All quote embeddings indexed successfully');
    
    // Count total quotes processed
    const totalQuotes = aggregatedResults.reduce((sum, assumption) => sum + assumption.quotes.length, 0);
    console.log(`📊 Total quotes processed: ${totalQuotes} across ${existingAssumptions.length} assumptions`);
    
    // Set comparisonOutcome for each assumption based on quote classifications
    aggregatedResults.forEach(assumption => {
      const rawOutcome = calculateAssumptionOutcome(assumption.quotes);
      assumption.comparisonOutcome = mapComparisonOutcome(rawOutcome);
    });
    
    // Call the synthesize-insights endpoint to add realityFromInterviews
    console.log('🔄 Synthesizing interview insights...');
    try {
      const synthesisResponse = await fetch(`${getBaseUrl(req)}/api/synthesize-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assumptions: aggregatedResults.map(assumption => ({
            id: assumption.id,
            icpAttribute: assumption.icpAttribute,
            v1Assumption: assumption.v1Assumption,
            evidenceFromDeck: assumption.evidenceFromDeck,
            quotes: assumption.quotes,
            confidenceScore: assumption.confidenceScore,
            validationOutcome: assumption.comparisonOutcome
          }))
        })
      });

      if (synthesisResponse.ok) {
        const { assumptions: synthesizedAssumptions } = await synthesisResponse.json();
        
        // Merge the realityFromInterviews back into our results
        synthesizedAssumptions.forEach((synthesized: any) => {
          const originalAssumption = aggregatedResults.find(a => a.id === synthesized.id);
          if (originalAssumption && synthesized.realityFromInterviews) {
            (originalAssumption as any).realityFromInterviews = synthesized.realityFromInterviews;
          }
        });
        
        console.log('✅ Interview insights synthesized successfully');
      } else {
        console.warn('⚠️ Synthesis endpoint failed, continuing without realityFromInterviews');
      }
    } catch (error) {
      console.error('❌ Error calling synthesis endpoint:', error);
      // Continue without synthesis rather than failing the entire request
    }
    
    const validatedCount = aggregatedResults.filter(a => a.comparisonOutcome === 'Aligned').length;
    const partiallyValidatedCount = aggregatedResults.filter(a => a.comparisonOutcome === 'New Data Added').length;
    const pendingCount = aggregatedResults.filter(a => !a.comparisonOutcome || a.comparisonOutcome === 'pending').length;
    
    const overallAlignmentScore = Math.round(
      (validatedCount / aggregatedResults.length) * 100
    );

    const buyerMapData: BuyerMapData = {
      success: true,
      assumptions: aggregatedResults,
      overallAlignmentScore,
      validatedCount,
      partiallyValidatedCount,
      pendingCount,
      metadata: {
        totalInterviews: interviewFiles.length,
        totalQuotes,
        processingTimeSeconds: ((Date.now() - processingStartTime) / 1000).toFixed(1),
        parallelProcessing: true
      }
    };

    console.log('✅ Interviews processed successfully, returning:', {
      assumptionsCount: buyerMapData.assumptions.length,
      filesProcessed: interviewFiles.length,
      success: buyerMapData.success,
      totalQuotes,
      processingTime: buyerMapData.metadata?.processingTimeSeconds
    })
    
    return res.status(200).json(buyerMapData)

  } catch (error) {
    const totalTime = ((Date.now() - processingStartTime) / 1000).toFixed(1);
    console.error(`❌ Interview API error after ${totalTime}s:`, error)
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return res.status(408).json({ 
          error: 'Interview analysis timed out. Please try again with fewer or smaller files.' 
        });
      }
      
      if (error.message.includes('OpenAI')) {
        return res.status(500).json({ 
          error: 'OpenAI API error: ' + error.message 
        });
      }
    }
    
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    })
  }
} 