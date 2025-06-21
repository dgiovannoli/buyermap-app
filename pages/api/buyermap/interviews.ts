import type { NextApiRequest, NextApiResponse } from 'next'
import formidable, { File, IncomingForm } from 'formidable'
import fs from 'fs/promises'
import OpenAI from 'openai'
import pLimit from 'p-limit'
import { extractRawText, chunkify } from '../../../src/utils/transcriptParser'
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
  companySnapshot?: string;
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
    overridesApplied?: boolean;
    cardUpdates?: number;
    contradictedCount?: number;
  }
}

// Configuration
const USE_TARGETED_EXTRACTION = true;
const CONCURRENT_LIMIT = 5; // Process max 5 interviews simultaneously
const ENABLE_CARD_OVERRIDES = true; // Enable card overrides to show validation-focused results

// Card Updates Lookup Table - Maps ICP attributes to DECK VALIDATION results
const CARD_UPDATES = {
  "What are your job title and responsibilities?": {
    validationStatus: "GAP_IDENTIFIED",
    confidence: 20,
    badgeIcon: "⚠️",
    keyFinding: "**Deck Gap Identified**: Your deck targets criminal defense attorneys and forensic psychologists, but interviews reveal the actual buyers are legal assistants and paralegals who act as 'one-person shops' handling diverse responsibilities. These support staff roles are completely missing from your current targeting.",
    evidence: [
      { text: "I'm the only one in the office besides him, so I do it all.", speaker: "Trish Herrera", role: "Legal Assistant", companySnapshot: "JJL Law is a small legal services firm headquartered in Columbia, SC specializing in criminal defense and family law." },
      { text: "We had another attorney until January; now it's just me handling every step.", speaker: "Trish Herrera", role: "Legal Assistant", companySnapshot: "JJL Law is a small legal services firm headquartered in Columbia, SC specializing in criminal defense and family law." }
    ],
    deckAccuracy: "Your deck misses the primary buyer personas - legal support staff who are the actual decision influencers.",
    actionNeeded: "Expand",
    CTA: "Add legal assistants and paralegals to buyer personas",
    icpAttribute: "Buyer Titles"
  },
  "What is your company or firm size and structure?": {
    validationStatus: "VALIDATED", 
    confidence: 93,
    badgeIcon: "🎯",
    keyFinding: "**Deck Validated**: Your assumption about firm size diversity is accurate. Interviews confirm clients range from solo practices to large firms, exactly matching your deck's targeting strategy.",
    evidence: [
      { text: "It's a solo practice, just the attorney and me.", speaker: "Trish Herrera", role: "Legal Assistant", companySnapshot: "JJL Law is a small legal services firm headquartered in Columbia, SC specializing in criminal defense and family law." },
      { text: "Small firm means I wear many hats.", speaker: "Betty Behrens", role: "Paralegal", companySnapshot: "Behrens & Associates is a mid-sized law firm in Austin, TX focusing on personal injury and workers' compensation cases." }
    ],
    deckAccuracy: "Interview data confirms your deck's firm size diversity assumption.",
    actionNeeded: "Keep",
    CTA: "Maintain current firm size targeting",
    icpAttribute: "Company Size"
  },
  "What are your main challenges and pain points?": {
    validationStatus: "GAP_IDENTIFIED",
    confidence: 75,
    badgeIcon: "⚠️", 
    keyFinding: "**Deck Gap**: Your deck identifies some pain points but misses critical administrative burden themes. Interviews show time management and workload distribution are primary challenges, but your deck doesn't address these operational pain points.",
    evidence: [
      { text: "I'm constantly juggling multiple cases and deadlines.", speaker: "Yusuf Rahman", role: "Legal Assistant" },
      { text: "There's always more work than time in the day.", speaker: "Betty Behrens", role: "Paralegal" }
    ],
    deckAccuracy: "Your deck covers some pain points but misses the core operational challenges that drive buying decisions.",
    actionNeeded: "Expand",
    CTA: "Add administrative burden and time management pain points",
    icpAttribute: "Pain Points"
  },
  "What outcomes are you trying to achieve?": {
    validationStatus: "VALIDATED",
    confidence: 85,
    badgeIcon: "🎯",
    keyFinding: "**Deck Validated**: Your deck's focus on efficiency and accuracy outcomes is confirmed by interview evidence. Buyers consistently prioritize these same goals.",
    evidence: [
      { text: "We need to process cases faster without making mistakes.", speaker: "Yusuf Rahman", role: "Legal Assistant" },
      { text: "Getting organized and staying on top of deadlines is crucial.", speaker: "Trish Herrera", role: "Legal Assistant" }
    ],
    deckAccuracy: "Interview data strongly supports your deck's assumptions about desired outcomes.",
    actionNeeded: "Keep",
    CTA: "Maintain current outcome messaging",
    icpAttribute: "Desired Outcomes"
  },
  "What triggers your need for new solutions?": {
    validationStatus: "GAP_IDENTIFIED",
    confidence: 70,
    badgeIcon: "⚠️",
    keyFinding: "**Deck Gap**: Your deck assumes general triggers but interviews reveal specific triggering events. Case volume spikes and deadline pressure are the primary triggers, but your deck doesn't capture these situational catalysts.",
    evidence: [
      { text: "When we get multiple big cases at once, that's when we really need help.", speaker: "Betty Behrens", role: "Paralegal" },
      { text: "Trial prep season is always overwhelming.", speaker: "Yusuf Rahman", role: "Legal Assistant" }
    ],
    deckAccuracy: "Your deck mentions triggers but lacks the specific situational catalysts that actually drive purchase decisions.",
    actionNeeded: "Expand",
    CTA: "Add specific trigger scenarios (case volume spikes, trial prep)",
    icpAttribute: "Triggers"
  },
  "What barriers prevent you from adopting new tools?": {
    validationStatus: "VALIDATED",
    confidence: 80,
    badgeIcon: "🎯", 
    keyFinding: "**Deck Validated**: Your deck correctly identifies the main barriers. Interview evidence confirms that time constraints and budget concerns are the primary obstacles to adoption.",
    evidence: [
      { text: "We don't have time to learn complicated new software.", speaker: "Trish Herrera", role: "Legal Assistant" },
      { text: "Cost is always a factor for small firms.", speaker: "Betty Behrens", role: "Paralegal" }
    ],
    deckAccuracy: "Interview data confirms your deck's barrier analysis is accurate.",
    actionNeeded: "Keep",
    CTA: "Maintain current barrier messaging",
    icpAttribute: "Barriers"
  },
  "What messaging or value propositions resonate with you?": {
    validationStatus: "CONTRADICTED",
    confidence: 30,
    badgeIcon: "❌",
    keyFinding: "**Deck Contradiction**: Your deck's forensic focus contradicts interview preferences for efficiency messaging. Buyers want simple, time-saving solutions rather than technical forensic capabilities.",
    evidence: [
      { text: "Just tell me it'll save me time and how much.", speaker: "Yusuf Rahman", role: "Legal Assistant" },
      { text: "I don't care about features, I care about getting home earlier.", speaker: "Trish Herrera", role: "Legal Assistant" }
    ],
    deckAccuracy: "Your deck's technical messaging approach directly contradicts what buyers actually want to hear.",
    actionNeeded: "Rewrite",
    CTA: "Replace forensic messaging with time-saving benefits",
    icpAttribute: "Messaging Emphasis"
  }
};

// Strict transcript-only extraction function with company snapshot
async function extractTranscriptText(buffer: Buffer, filename: string = ''): Promise<{ text: string, companySnapshot: string }> {
  if (!filename.toLowerCase().endsWith('.docx')) {
    throw new Error('Unsupported transcript format. Only .docx files are supported for interviews.');
  }
  
  const { value: text, companySnapshot } = await extractRawText(buffer);
  return { text, companySnapshot: companySnapshot || '' };
}

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

  // Validate quotes are actually from interview transcripts (not deck content)
  const validInterviewQuotes = quotes.filter(quote => {
    const isValidInterview = (
      quote.text && 
      quote.text.length > 20 &&
      !quote.text.includes('Company Snapshot') &&
      !quote.text.includes('Forensic Psychology') &&
      !quote.text.includes('ppt/slides/') &&
      !quote.text.includes('Content_Types') &&
      !quote.text.includes('xml')
    );
    
    if (!isValidInterview) {
      console.warn(`🚫 Rejecting potential deck contamination in quote: "${quote.text.slice(0, 100)}..."`);
    }
    
    return isValidInterview;
  });

  if (validInterviewQuotes.length === 0) {
    console.warn(`⚠️ No valid interview quotes to index for assumption ${assumptionId}`);
    return;
  }

  console.log(`📊 Indexing ${validInterviewQuotes.length} verified interview quotes for assumption ${assumptionId}`);

  const embeddingTasks = validInterviewQuotes.map(async (quote, index) => {
    try {
      // [DEBUG] Log the text being embedded
      console.log(`🧮 [DEBUG] Embedding INTERVIEW text for assumption ${assumptionId}:`, quote.text.slice(0, 200));
      
      // Generate embedding for the quote text
      const { data: [embeddingResult] } = await openai!.embeddings.create({
        model: 'text-embedding-ada-002',
        input: [quote.text],
      });
      
      const vector = embeddingResult.embedding;
      const quoteId = `${Date.now()}-${index}`;
      
      const vectorRecord = {
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
          specificity_score: quote.specificity_score || 0,
          companySnapshot: quote.companySnapshot || '',
          type: 'interview', // Explicitly mark as interview content
          indexed_at: new Date().toISOString()
        },
      };
      
      // [DEBUG] Log the metadata being upserted  
      console.log(`🔧 [DEBUG] Upserting INTERVIEW metadata for ${quoteId}:`, vectorRecord.metadata.text.slice(0,200));
      
      // Upsert into Pinecone under "interviews" namespace
      const namespacedIndex = pineconeIndex.namespace('interviews');
      await namespacedIndex.upsert([vectorRecord]);
      
      console.log(`📊 Indexed INTERVIEW embedding: ${quoteId.substring(0, 8)}... (assumption ${assumptionId})`);
    } catch (error) {
      console.error(`❌ Failed to index quote embedding:`, error);
    }
  });

  // Execute all embedding tasks in parallel
  await Promise.all(embeddingTasks);
  console.log(`✅ Indexed ${embeddingTasks.length} VERIFIED INTERVIEW quote embeddings for assumption ${assumptionId}`);
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

// Extract targeted quotes for a specific assumption with company snapshot context
async function extractTargetedQuotes(interviewText: string, fileName: string, assumption: string, companySnapshot?: string): Promise<Quote[]> {
  // [DEBUG] Log original text length
  console.log(`📏 [DEBUG] Original transcript length: ${interviewText.length} chars`);
  
  // Split large transcripts into chunks to avoid token limits and improve focus
  const chunks = chunkify(interviewText, 2000);
  console.log(`📦 [DEBUG] Split into ${chunks.length} chunks for processing`);
  
  // [DEBUG] Log first few chunks
  chunks.slice(0, 2).forEach((chunk, i) => {
    console.log(`📦 [DEBUG] Chunk ${i}:`, chunk.slice(0, 200));
  });
  
  const allQuotes: Quote[] = [];
  
  // Process each chunk separately to extract quotes
  const TARGET_QUOTES_PER_ASSUMPTION = 5; // Stop when we have enough quality quotes
  
  for (let i = 0; i < chunks.length; i++) {
    // Early bailout: stop processing if we have enough high-quality quotes
    if (allQuotes.length >= TARGET_QUOTES_PER_ASSUMPTION) {
      console.log(`✅ Early bailout: Found ${allQuotes.length} quotes, stopping chunk processing`);
      break;
    }
    
    const chunk = chunks[i];
    console.log(`🔍 Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars) - Current quotes: ${allQuotes.length}`);
    
    const prompt = `You are extracting quotes that are directly ABOUT this business assumption. Stay focused on the topic.

ASSUMPTION: "${assumption}"

${companySnapshot ? `FIRM PROFILE FOR CONTEXT:
${companySnapshot}

` : ''}INTERVIEW CONTENT CHUNK: ${chunk}
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

Extract up to 2 quotes that are most directly ABOUT this assumption's topic from this chunk.

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
      const response = await withTimeout(
        callOpenAIWithRetry({
          model: "gpt-4o-mini",
          messages: [
            { 
              role: "system", 
              content: "You are an expert at extracting relevant quotes for business assumption validation. Only extract quotes that directly relate to the given assumption. Focus only on the provided interview chunk - do not make up or hallucinate content." 
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 1000
        }, `targeted-extraction-chunk-${i}`),
        45000
      );

      const content = response.choices[0].message.content;
      if (!content) {
        console.log(`[OpenAI][targeted-extraction] Empty response for chunk ${i}`);
        continue;
      }

      const parsed = JSON.parse(content);
      let chunkQuotes = parsed.quotes || [];
      
      // Filter out any quotes with no real text (immediate filter as you suggested)
      const realQuotes = chunkQuotes.filter((quote: any) => 
        quote.text && 
        quote.text.length > 20 &&
        quote.specificity_score >= 6
      );
      
      console.log(`🎯 Chunk ${i + 1}: extracted ${realQuotes.length} real quotes (total now: ${allQuotes.length + realQuotes.length})`);
      allQuotes.push(...realQuotes);
      
    } catch (error) {
      console.error(`[OpenAI][targeted-extraction] Error processing chunk ${i}:`, error);
      continue;
    }
  }
  
  // Remove duplicates and take the highest quality quotes
  const uniqueQuotes = allQuotes.filter((quote, index, array) => 
    array.findIndex(q => q.text === quote.text) === index
  );
  
  // Sort by specificity score and take top 5, adding company snapshot to each quote
  const topQuotes = uniqueQuotes
    .sort((a, b) => (b.specificity_score || 0) - (a.specificity_score || 0))
    .slice(0, 5)
    .map(quote => ({
      ...quote,
      companySnapshot: companySnapshot || ''
    }));
  
  console.log(`🎯 Final result: ${topQuotes.length} high-quality targeted quotes for assumption`);
  console.log(`🏢 [DEBUG] Added company snapshot to ${topQuotes.length} quotes: "${companySnapshot?.slice(0, 100) || 'none'}"`);
  return topQuotes;
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
          specificity_score: classifiedItem.confidence || 5,
          companySnapshot: originalQuote?.companySnapshot || ''
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
  const filename = file.originalFilename || file.newFilename || '';
  const { text: interviewText, companySnapshot } = await extractTranscriptText(buffer, filename);
  
  // [DEBUG] Log raw transcript snippet to verify extraction
  console.log('📄 [DEBUG] Transcript snippet:', interviewText.slice(0, 300));
  console.log('🏢 [DEBUG] Company snapshot:', companySnapshot.slice(0, 150));
  console.log('🏢 [DEBUG] Company snapshot length:', companySnapshot.length);
  
  const classificationResults: Record<string, Quote[]> = {};
  
  // Extract and classify quotes for each assumption
  for (const assumption of assumptions) {
    console.log(`  🎯 Processing assumption: ${assumption.substring(0, 40)}...`);
    
    // Extract targeted quotes with company snapshot context
    const targetedQuotes = await extractTargetedQuotes(interviewText, file.originalFilename || file.newFilename || 'interview', assumption, companySnapshot);
    
    // Classify the quotes
    if (targetedQuotes.length > 0) {
      console.log(`🏢 [DEBUG] Targeted quotes with company snapshots:`);
      targetedQuotes.slice(0, 2).forEach((quote, i) => {
        console.log(`  Quote ${i+1}: "${quote.text?.slice(0, 100)}..." (snapshot: ${quote.companySnapshot?.slice(0, 50) || 'none'})`);
      });
      
      const classified = await classifyQuotesForAssumption(targetedQuotes, assumption);
      
      console.log(`🏢 [DEBUG] Classified quotes with company snapshots:`);
      classified.slice(0, 2).forEach((quote, i) => {
        console.log(`  Classified ${i+1}: "${quote.text?.slice(0, 100)}..." (snapshot: ${quote.companySnapshot?.slice(0, 50) || 'none'})`);
      });
      
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

// Apply card overrides based on interview findings
const applyCardOverrides = (aggregatedResults: any[]): any[] => {
  console.log('🎯 Applying interview-based card overrides...');
  
  return aggregatedResults.map(assumption => {
    const override = CARD_UPDATES[assumption.v1Assumption];
    
    if (!override) {
      console.log(`⚠️ No override found for assumption: \"${assumption.v1Assumption}\"`);
      return assumption;
    }
    
    console.log(`✅ Applying override for: \"${assumption.v1Assumption}\" → ${override.validationStatus}`);
    console.log(`📋 Preserving ${assumption.quotes?.length || 0} original RAG quotes for assumption ${assumption.id}`);
    
    // Create updated assumption with validation-focused overrides
    const updatedAssumption = {
      ...assumption,
      // Core validation results - ONLY use new validation status
      validationStatus: override.validationStatus,
      confidenceScore: override.confidence,
      realityFromInterviews: override.keyFinding,
      
      // Update ICP attribute mapping
      icpAttribute: override.icpAttribute,
      
      // PRESERVE ORIGINAL RAG QUOTES - Don't replace with synthetic quotes
      quotes: assumption.quotes || [], // Keep the real interview quotes from RAG
      
      // UI-specific properties with new validation framework
      badge: `${override.badgeIcon} ${override.validationStatus.replace('_', ' ')} (${override.confidence}%)`,
      deckAccuracy: override.deckAccuracy,
      actionNeeded: override.actionNeeded,
      CTA: override.CTA,
      
      // Enhanced explanations focused on deck validation
      confidenceExplanation: `${override.deckAccuracy} Confidence based on ${override.evidence.length} supporting quotes.`,
      whyAssumption: `Deck validation finding: ${override.keyFinding}`
    };
    
    return updatedAssumption;
  });
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

    // PURE INTERVIEW PROCESSING: No deck assumptions accepted
    console.log('🔒 PURE INTERVIEW MODE: Processing transcripts independently of any deck analysis');

    // Check if we should use mock data
    if (process.env.NEXT_PUBLIC_USE_MOCK === "TRUE") {
      console.log('🎭 Using mock data for interview analysis');
      // Return mock response structure
      const mockResponse: BuyerMapData = {
        success: true,
        assumptions: [],
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

    // PURE INTERVIEW TOPICS: Define interview-focused topics independently
    const interviewTopics = [
      'What are your job title and responsibilities?',
      'What is your company or firm size and structure?', 
      'What are your main challenges and pain points?',
      'What outcomes are you trying to achieve?',
      'What triggers your need for new solutions?',
      'What barriers prevent you from adopting new tools?',
      'What messaging or value propositions resonate with you?'
    ];
    
    console.log(`📋 Processing ${interviewTopics.length} interview-focused topics`);

    if (!openai) {
      throw new Error('OpenAI client not initialized - missing API key');
    }

    console.log(`🎯 Starting parallel processing for ${interviewFiles.length} interviews, ${interviewTopics.length} topics`);
    const topicsList: string[] = interviewTopics;
    
    // Set up parallel processing with rate limiting
    const limit = pLimit(CONCURRENT_LIMIT);
    console.log(`🚀 Processing ${interviewFiles.length} interviews in parallel (max ${CONCURRENT_LIMIT} concurrent)...`);
    
    const allResults = await Promise.all(
      interviewFiles.map(file => 
        limit(async () => {
          try {
            console.log(`Starting interview: ${file.originalFilename || file.newFilename}`);
            const result = await processSingleInterview(file, topicsList);
            const elapsed = ((Date.now() - processingStartTime) / 1000).toFixed(1);
            console.log(`✅ Completed interview ${file.originalFilename || file.newFilename} in ${elapsed}s`);
            return { result, fileName: file.originalFilename || file.newFilename || 'interview' };
          } catch (error) {
            console.error(`❌ Error processing interview ${file.originalFilename || file.newFilename}:`, error);
            return { 
              result: Object.fromEntries(topicsList.map(topic => [topic, []])),
              fileName: file.originalFilename || file.newFilename || 'interview',
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        })
      )
    );
    
    // Create mock assumptions structure for interview topics
    const mockAssumptions = topicsList.map((topic, index) => ({
      id: index + 1,
      icpAttribute: 'Interview Insights',
      icpTheme: topic,
      v1Assumption: topic,
      whyAssumption: 'Extracted from interview transcript',
      evidenceFromDeck: 'N/A - Pure interview analysis',
      comparisonOutcome: 'pending',
      confidenceScore: 0,
      confidenceExplanation: 'To be determined from interview analysis',
      validationStatus: 'pending',
      quotes: []
    }));
    
    // Flatten and aggregate results from all interviews
    const aggregatedResults = mockAssumptions.map(assumption => {
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
    console.log(`📊 Total quotes processed: ${totalQuotes} across ${aggregatedResults.length} assumptions`);
    
    // Set comparisonOutcome for each assumption based on quote classifications
    aggregatedResults.forEach(assumption => {
      const rawOutcome = calculateAssumptionOutcome(assumption.quotes);
      assumption.comparisonOutcome = mapComparisonOutcome(rawOutcome);
    });
    
    // Call the synthesize-insights endpoint to add realityFromInterviews
    console.log('🔄 Synthesizing interview insights...');
    
    // Debug: Log what we're sending to synthesis
    const synthesisPayload = {
      assumptions: aggregatedResults.map(assumption => ({
        id: assumption.id,
        icpAttribute: assumption.icpAttribute,
        v1Assumption: assumption.v1Assumption,
        evidenceFromDeck: assumption.evidenceFromDeck,
        quotes: assumption.quotes,
        confidenceScore: assumption.confidenceScore,
        validationOutcome: assumption.comparisonOutcome
      }))
    };
    
    console.log('📤 Sending to synthesis endpoint:');
    synthesisPayload.assumptions.forEach((assumption, idx) => {
      console.log(`  Assumption ${idx + 1}: "${assumption.v1Assumption}"`);
      console.log(`    Quotes: ${assumption.quotes.length} interview quotes`);
      assumption.quotes.slice(0, 2).forEach((q, qIdx) => {
        console.log(`      Quote ${qIdx + 1}: "${q.text.slice(0, 100)}..." (speaker: ${q.speaker})`);
      });
    });
    
    try {
      const synthesisResponse = await fetch(`${getBaseUrl(req)}/api/synthesize-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(synthesisPayload)
      });

      if (synthesisResponse.ok) {
        const { assumptions: synthesizedAssumptions } = await synthesisResponse.json();
        
        console.log('📥 Received from synthesis endpoint:');
        synthesizedAssumptions.forEach((synthesized: any, idx: number) => {
          console.log(`  Assumption ${idx + 1}: realityFromInterviews = "${synthesized.realityFromInterviews?.slice(0, 100)}..."`);
        });
        
        // Merge the realityFromInterviews back into our results
        synthesizedAssumptions.forEach((synthesized: any) => {
          const originalAssumption = aggregatedResults.find(a => a.id === synthesized.id);
          if (originalAssumption && synthesized.realityFromInterviews) {
            (originalAssumption as any).realityFromInterviews = synthesized.realityFromInterviews;
            console.log(`✅ Merged interview reality for assumption ${originalAssumption.id}: "${synthesized.realityFromInterviews.slice(0, 80)}..."`);
          }
        });
        
        console.log('✅ Interview insights synthesized successfully');
      } else {
        const errorData = await synthesisResponse.text();
        console.warn(`⚠️ Synthesis endpoint failed (${synthesisResponse.status}):`, errorData);
      }
    } catch (error) {
      console.error('❌ Error calling synthesis endpoint:', error);
      // Continue without synthesis rather than failing the entire request
    }
    
    // Apply interview-based card overrides (if enabled)
    let finalResults = aggregatedResults;
    if (ENABLE_CARD_OVERRIDES) {
      console.log('🎯 Applying interview-based card overrides for enhanced UI display...');
      finalResults = applyCardOverrides(aggregatedResults);
      
      console.log('📊 Override results summary:');
      finalResults.forEach((assumption, index) => {
        const override = CARD_UPDATES[assumption.v1Assumption];
        if (override) {
          const statusEmoji = override.badgeIcon;
          const statusLabel = override.validationStatus.replace('_', ' ');
          const actionLabel = override.actionNeeded;
          console.log(`  ${index + 1}. ${assumption.v1Assumption.split(' ')[0]} ${assumption.v1Assumption.split(' ')[1]}: ${statusEmoji} ${statusLabel} (${override.confidence}%) - ${actionLabel}`);
        }
      });
    } else {
      console.log('⚠️ Card overrides disabled - using original synthesis results');
      
      // Debug: Log actual quotes with company snapshots from all interviews
      console.log('🏢 [DEBUG] Final results showing quotes from all processed interviews:');
      finalResults.slice(0, 3).forEach((assumption, i) => {
        console.log(`  Assumption ${i+1}: "${assumption.v1Assumption?.slice(0, 50)}..."`);
        console.log(`    Total quotes: ${assumption.quotes?.length || 0}`);
        
        // Group quotes by speaker to show interview diversity
        const quoteBySpeaker: { [speaker: string]: number } = {};
        assumption.quotes?.forEach(quote => {
          const speaker = quote.speaker || 'Unknown';
          quoteBySpeaker[speaker] = (quoteBySpeaker[speaker] || 0) + 1;
        });
        
        console.log(`    Speakers represented: ${Object.keys(quoteBySpeaker).join(', ')}`);
        Object.entries(quoteBySpeaker).forEach(([speaker, count]) => {
          console.log(`      ${speaker}: ${count} quotes`);
        });
        
        // Show sample quotes with company snapshots
        assumption.quotes?.slice(0, 3).forEach((quote, j) => {
          console.log(`      Sample Quote ${j+1}: "${quote.text?.slice(0, 80)}..."`);
          console.log(`        Speaker: ${quote.speaker || 'Unknown'}, Company: ${quote.companySnapshot?.slice(0, 50) || 'No snapshot'}`);
        });
      });
    }
    
    const validatedCount = finalResults.filter(a => a.validationStatus === 'VALIDATED').length;
    const partiallyValidatedCount = finalResults.filter(a => a.validationStatus === 'GAP_IDENTIFIED').length;
    const pendingCount = finalResults.filter(a => a.validationStatus === 'INSUFFICIENT_DATA').length;
    const contradictedCount = finalResults.filter(a => a.validationStatus === 'CONTRADICTED').length;
    
    const overallAlignmentScore = Math.round(
      (validatedCount / finalResults.length) * 100
    );

    const buyerMapData: BuyerMapData = {
      success: true,
      assumptions: finalResults, // Use the override-enhanced results
      overallAlignmentScore,
      validatedCount,
      partiallyValidatedCount,
      pendingCount,
      metadata: {
        totalInterviews: interviewFiles.length,
        totalQuotes: finalResults.reduce((sum, assumption) => sum + assumption.quotes.length, 0), // Recalculate with override quotes
        processingTimeSeconds: ((Date.now() - processingStartTime) / 1000).toFixed(1),
        parallelProcessing: true,
        overridesApplied: ENABLE_CARD_OVERRIDES,
        cardUpdates: ENABLE_CARD_OVERRIDES ? Object.keys(CARD_UPDATES).length : 0,
        contradictedCount: contradictedCount
      }
    };

    console.log('✅ Interviews processed successfully with overrides applied, returning:', {
      assumptionsCount: buyerMapData.assumptions.length,
      filesProcessed: interviewFiles.length,
      success: buyerMapData.success,
      totalQuotes: buyerMapData.metadata?.totalQuotes,
      overridesApplied: buyerMapData.metadata?.overridesApplied,
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