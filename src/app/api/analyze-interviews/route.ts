import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { parseFile } from '../../../utils/fileParser';
import { BuyerMapData, Quote, StoredInterview } from '../../../types/buyermap';
import { createICPValidationData, createValidationData, getAssumptionSpecificInstructions, mapComparisonOutcome } from '../../../utils/dataMapping';
import pLimit from 'p-limit';
import { createInterview, createInterviewWithHash, createQuote, getCurrentUserServer } from '../../../lib/database-server';
// RAG system imports for chunk-based processing
import { getPineconeIndex } from '../../../lib/pinecone';
import { 
  fetchRelevantQuotes, 
  getTopQuotesForSynthesis,
  scoreQuoteRelevanceEnhanced, 
  filterRelevantQuotesEnhanced,
  RELEVANCE_FILTERING_CONFIG,
  filterQuotesByRelevance
} from '../../../lib/rag';
// Content hashing for duplicate detection
import { generateContentHash } from '../../../lib/deduplication-server';
import { saveFileRecord } from '../../../lib/simple-duplicate-store';
import crypto from 'crypto';
import { createServerClient } from '../../../lib/supabase-server';

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

// === FEATURE FLAGS ===
const USE_RAG_FIRST = true; // Enable RAG-first processing with clean data
const USE_TARGETED_EXTRACTION = true;
const CONCURRENT_LIMIT = 3; // Process max 3 interviews simultaneously

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

// Helper: Robust OpenAI call with retries, logging, and response_format enforcement (reduced retries for faster processing)
async function callOpenAIWithRetry(params: any, purpose: string, maxRetries = 1) {
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
        await new Promise(res => setTimeout(res, 200 * attempt)); // Reduced retry delay
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

// Helper: Extract attribute type from assumption text
function getAttributeType(assumptionText: string): string {
  const text = assumptionText.toLowerCase();
  
  // Map assumption text to attribute types
  if (text.includes('buyer') || text.includes('title') || text.includes('role') || text.includes('decision') || text.includes('executive')) {
    return 'buyer-titles';
  }
  if (text.includes('size') || text.includes('employee') || text.includes('company') || text.includes('firm') || text.includes('team')) {
    return 'company-size';
  }
  if (text.includes('pain') || text.includes('problem') || text.includes('challenge') || text.includes('struggle') || text.includes('difficult')) {
    return 'pain-points';
  }
  if (text.includes('outcome') || text.includes('goal') || text.includes('improve') || text.includes('achieve') || text.includes('success')) {
    return 'desired-outcomes';
  }
  if (text.includes('trigger') || text.includes('when') || text.includes('timing') || text.includes('urgent') || text.includes('deadline')) {
    return 'triggers';
  }
  if (text.includes('barrier') || text.includes('objection') || text.includes('concern') || text.includes('resistance') || text.includes('obstacle')) {
    return 'barriers';
  }
  if (text.includes('message') || text.includes('value') || text.includes('priority') || text.includes('important') || text.includes('focus')) {
    return 'messaging-emphasis';
  }
  
  // Default to buyer-titles for backward compatibility
  return 'buyer-titles';
}

// --- Simple Topic Focus Instructions ---
function getTopicFocusInstructions(assumption: string): string {
  const assumptionLower = assumption.toLowerCase();
  
  // Buyer titles / who buys
  if (assumptionLower.includes('buyer') || assumptionLower.includes('title') || 
      assumptionLower.includes('who') || assumptionLower.includes('attorney') || 
      assumptionLower.includes('paralegal') || assumptionLower.includes('psychologist')) {
    return `TOPIC: WHO buys, uses, or decides about the service (BUYER TITLES)
    
    EXTRACT quotes that VALIDATE, CONTRADICT, or IDENTIFY GAPS about buyer titles:
    - Exact job titles mentioned ("criminal defense attorney", "legal assistant", "paralegal", "forensic psychologist")
    - Role descriptions with decision-making power ("I'm the one who decides", "our IT director makes those calls")
    - Purchasing authority ("I handle all technology purchases", "partners approve software")
    - User personas explicitly mentioned ("attorneys like me", "paralegals in our office")
    
    VALIDATION FOCUS: Do the quotes confirm the deck's buyer title assumptions?
    CONTRADICTION FOCUS: Do speakers have different titles than assumed?
    GAP FOCUS: Are there buyer roles mentioned that aren't in the deck?
    
    REJECT: General service satisfaction without role clarity`;
  }
  
  // Company/firm size 
  if (assumptionLower.includes('company') || assumptionLower.includes('firm') || 
      assumptionLower.includes('size') || assumptionLower.includes('structure')) {
    return `TOPIC: COMPANY/FIRM size and structure
    
    EXTRACT quotes that VALIDATE, CONTRADICT, or IDENTIFY GAPS about firm size:
    - Specific size indicators ("solo practice", "200+ attorney firm", "small firm", "enterprise-level")
    - Employee counts ("we have 12 people", "just me and the attorney")
    - Scale descriptors with business impact ("limited staff", "large corporation")
    - Resource constraints related to size ("small firm budget", "can't afford enterprise solutions")
    
    VALIDATION FOCUS: Do quotes confirm the deck's target firm size?
    CONTRADICTION FOCUS: Are speakers from different sized firms than targeted?
    GAP FOCUS: Are there firm sizes mentioned not covered in the deck?
    
    REJECT: General business processes without size context`;
  }
  
  // Pain points / problems
  if (assumptionLower.includes('pain') || assumptionLower.includes('problem') || 
      assumptionLower.includes('challenge') || assumptionLower.includes('difficult')) {
    return `TOPIC: PROBLEMS, challenges, or pain points
    
    EXTRACT quotes that VALIDATE, CONTRADICT, or IDENTIFY GAPS about pain points:
    - Explicit problem statements ("the biggest issue is...", "we struggle with...")
    - Quantified frustrations ("takes 40 hours", "wastes 3 days", "costs us $X")
    - Process breakdowns ("when this happens we can't...", "it's impossible to...")
    - Time/efficiency problems ("too time-consuming", "manual process is killing us")
    
    VALIDATION FOCUS: Do quotes confirm the deck's pain point assumptions?
    CONTRADICTION FOCUS: Do speakers mention different problems than assumed?
    GAP FOCUS: Are there pain points mentioned not addressed in the deck?
    
    REJECT: General satisfaction or solution descriptions`;
  }
  
  // Evidence processing / efficiency
  if (assumptionLower.includes('evidence') || assumptionLower.includes('processing') || 
      assumptionLower.includes('efficient') || assumptionLower.includes('review')) {
    return `TOPIC: EVIDENCE handling, processing, or review efficiency
    
    EXTRACT quotes that VALIDATE, CONTRADICT, or IDENTIFY GAPS about evidence needs:
    - Evidence workflow descriptions ("when we review evidence...", "processing all this takes...")
    - Efficiency pain points ("evidence analysis usually takes...", "manual review is...")
    - Volume/scale challenges ("hundreds of files", "massive amounts of evidence")
    - Quality/accuracy needs ("need to catch every detail", "can't miss anything important")
    
    VALIDATION FOCUS: Do quotes confirm deck assumptions about evidence processing needs?
    CONTRADICTION FOCUS: Do speakers have different evidence workflows than assumed?
    GAP FOCUS: Are there evidence processing aspects not covered in the deck?
    
    REJECT: General technology preferences without evidence context`;
  }
  
  // Triggers / when they need service
  if (assumptionLower.includes('trigger') || assumptionLower.includes('when') || 
      assumptionLower.includes('need') || assumptionLower.includes('use')) {
    return `TOPIC: WHEN or WHY they need/use the service (TRIGGERS)
    
    EXTRACT quotes that VALIDATE, CONTRADICT, or IDENTIFY GAPS about trigger events:
    - Specific triggering situations ("when we get multiple big cases", "during trial prep")
    - Timing of needs ("last-minute files", "urgent deadlines", "emergency situations")
    - Decision-making moments ("that's when we realized we needed...", "the breaking point was...")
    - Seasonal or cyclical patterns ("busy season", "trial prep time", "discovery phase")
    
    VALIDATION FOCUS: Do quotes confirm the deck's trigger assumptions?
    CONTRADICTION FOCUS: Do speakers mention different triggers than assumed?
    GAP FOCUS: Are there triggering situations not anticipated in the deck?
    
    REJECT: General usage patterns without specific trigger context`;
  }
  
  // Barriers / concerns
  if (assumptionLower.includes('barrier') || assumptionLower.includes('concern') || 
      assumptionLower.includes('hesitant') || assumptionLower.includes('worry')) {
    return `TOPIC: BARRIERS, concerns, or hesitations about adoption
    
    EXTRACT quotes that VALIDATE, CONTRADICT, or IDENTIFY GAPS about barriers:
    - Specific adoption concerns ("worried about data security", "concerned about cost")
    - Implementation barriers ("don't have time to learn", "too complicated to set up")
    - Budget/cost objections ("can't afford the pricing", "budget is tight")
    - Trust/reliability concerns ("need to be sure it works", "what if it fails during trial")
    
    VALIDATION FOCUS: Do quotes confirm the deck's barrier assumptions?
    CONTRADICTION FOCUS: Do speakers mention different barriers than assumed?
    GAP FOCUS: Are there barriers not addressed in the deck?
    
    REJECT: General preferences without barrier-specific context`;
  }
  
  // Messaging / value propositions
  if (assumptionLower.includes('messag') || assumptionLower.includes('value') || 
      assumptionLower.includes('resonat') || assumptionLower.includes('benefit')) {
    return `TOPIC: MESSAGING, value propositions, or what resonates
    
    EXTRACT quotes that VALIDATE, CONTRADICT, or IDENTIFY GAPS about messaging preferences:
    - Value priorities explicitly stated ("most important feature is...", "what matters most is...")
    - Persuasion factors ("what convinced me was...", "the key selling point...")
    - Communication preferences ("just tell me...", "I want to hear about...", "focus on...")
    - Feature priorities ("love the...", "really need the...", "don't care about...")
    
    VALIDATION FOCUS: Do quotes confirm the deck's messaging assumptions?
    CONTRADICTION FOCUS: Do speakers respond to different messaging than assumed?
    GAP FOCUS: Are there messaging angles not covered in the deck?
    
    REJECT: General feature descriptions without preference indication`;
  }
  
  // Default for any other assumption
  return `TOPIC: The specific subject matter of this assumption
  
  EXTRACT quotes that VALIDATE, CONTRADICT, or IDENTIFY GAPS about this assumption:
  - Direct statements that confirm or challenge the assumption
  - Specific examples that support or contradict the deck's claims
  - New information that reveals gaps in the deck's understanding
  
  VALIDATION FOCUS: Do quotes confirm what the deck assumes?
  CONTRADICTION FOCUS: Do quotes challenge the deck's assumptions?
  GAP FOCUS: Do quotes reveal missing information in the deck?
  
  Focus on quotes that contain specific, concrete information relevant to validating, contradicting, or identifying gaps in this assumption.
  
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
    // Basic validation
    if (!quote || typeof quote !== 'object') {
      console.warn('⚠️ Filtering out invalid quote object:', quote);
      return false;
    }
    
    // Text validation
    if (!quote.text || typeof quote.text !== 'string' || quote.text.trim().length === 0) {
      console.warn('⚠️ Filtering out quote with invalid text:', quote);
      return false;
    }
    
    // Length validation
    if (quote.text.trim().length < 10) {
      console.warn('⚠️ Filtering out quote too short (< 10 chars):', quote.text.substring(0, 50));
      return false;
    }
    
    // Remove quotes that are just punctuation or filler
    const cleanText = quote.text.trim().replace(/[.,!?;:"'-]/g, '');
    if (cleanText.length < 5) {
      console.warn('⚠️ Filtering out quote with only punctuation:', quote.text);
      return false;
    }
    
    return true;
  });
}

// === TARGETED QUOTE EXTRACTION ===
async function extractTargetedQuotes(interviewText: string, fileName: string, assumption: string): Promise<Quote[]> {
  // First, extract company snapshot from the interview content
  let companySnapshot = '';
  try {
    if (openai) {
      const snapshotResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Extract a 1-2 sentence company snapshot: company name, size, industry only."
          },
          {
            role: "user",
            content: `Extract company details from: ${interviewText.substring(0, 800)}\n\nFormat: [Company] is a [size] [industry] firm.`
          }
        ],
        temperature: 0.1,
        max_tokens: 100
      });
      companySnapshot = snapshotResponse.choices[0]?.message?.content?.trim() || '';
    }
  } catch (error) {
    console.warn('Failed to generate company snapshot:', error);
    companySnapshot = `Professional services firm (${fileName})`;
  }

  const prompt = `Extract 2-3 quotes that directly discuss this assumption:

ASSUMPTION: "${assumption}"

INTERVIEW: ${interviewText}
SOURCE: ${fileName}

RULES:
✅ EXTRACT quotes that discuss the assumption's topic with specific details
✅ Include speaker role/title when mentioned
❌ SKIP generic satisfaction, pricing, or unrelated topics

Return JSON:
{
  "quotes": [
    {
      "text": "specific quote about the assumption topic",
      "speaker": "name if available",
      "role": "title if mentioned", 
      "source": "${fileName}",
      "classification": "RELEVANT"
    }
  ]
}`;

  try {
    console.log(`[OpenAI][extract] Processing: ${assumption.substring(0, 30)}...`);
    const startTime = Date.now();
    
    if (!openai) {
      throw new Error('OpenAI client not initialized');
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "Extract relevant quotes for business validation. Focus on substance over quantity." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
      max_tokens: 1200
    });
    
    const duration = Date.now() - startTime;
    console.log(`[OpenAI][extract] Completed in ${duration}ms`);
    
    const content = response.choices[0].message.content;
    if (!content) return [];
    
    const parsed = JSON.parse(content);
    let quotes = parsed.quotes || [];
    
    // Filter for quality and attach metadata
    quotes = quotes
      .filter((q: any) => q.text && q.text.length > 20) // Basic quality filter
      .map((quote: any) => ({
        id: crypto.randomUUID(),
        text: quote.text,
        speaker: quote.speaker || 'Unknown',
        role: quote.role || '',
        source: quote.source || fileName,
        classification: 'RELEVANT' as Quote['classification'],
        companySnapshot: companySnapshot,
        rejected: false
      }));
    
    console.log(`🎯 Extracted ${quotes.length} quotes for: ${assumption.substring(0, 50)}...`);
    return quotes;
    
  } catch (error) {
    console.error(`[OpenAI][extract] Error:`, error);
    return [];
  }
}

// Enhanced metadata extraction function
async function extractInterviewMetadata(interviewText: string, fileName: string): Promise<Partial<StoredInterview>> {
  console.log(`🔍 Extracting metadata from ${fileName}`);
  
  if (!openai) {
    return {
      companySize: 'medium', // Default fallback
      role: 'Unknown',
      industry: 'Unknown'
    };
  }

  try {
    const response = await callOpenAIWithRetry({
      model: "gpt-4o-mini", // Using mini for efficiency
      messages: [
        {
          role: "system",
          content: "Extract minimal company metadata: size, industry, role. Be concise."
        },
        {
          role: "user", 
          content: `Extract from interview:\n${interviewText.substring(0, 1000)}\n\nReturn JSON: {"companySize": "solo|small|medium|large", "role": "title", "industry": "field", "uniqueSpeakers": ["name1"]}`
        }
      ],
      temperature: 0.1,
      max_tokens: 200
    }, "metadata-extraction");

    const content = response.choices[0]?.message?.content;
    if (content) {
      const metadata = JSON.parse(content);
      console.log(`✅ Extracted metadata for ${fileName}:`, metadata);
      return metadata;
    }
  } catch (error) {
    console.warn(`⚠️ Failed to extract metadata for ${fileName}:`, error);
  }

  // Fallback metadata extraction using simple text analysis
  const lowerText = interviewText.toLowerCase();
  let companySize: StoredInterview['companySize'] = 'medium';
  
  if (lowerText.includes('solo') || lowerText.includes('just me') || lowerText.includes('one person')) {
    companySize = 'solo';
  } else if (lowerText.includes('small firm') || lowerText.includes('few employees') || lowerText.includes('small team')) {
    companySize = 'small';
  } else if (lowerText.includes('large firm') || lowerText.includes('big company') || lowerText.includes('large organization')) {
    companySize = 'large';
  } else if (lowerText.includes('enterprise') || lowerText.includes('fortune') || lowerText.includes('corporation')) {
    companySize = 'enterprise';
  }

  return {
    companySize,
    role: 'Unknown',
    industry: 'Unknown',
    uniqueSpeakers: [fileName.replace(/\.(docx?|pdf|txt)$/i, '').replace(/_/g, ' ')]
  };
}

// Store interview metadata in Supabase database
async function saveStoredInterview(interview: StoredInterview): Promise<string> {
  try {
    const interviewData = await createInterview({
      filename: interview.filename,
      upload_date: interview.uploadDate.toISOString(),
      status: interview.status,
      company_size: interview.companySize,
      role: interview.role,
      industry: interview.industry,
      region: interview.region,
      quotes_extracted: interview.quotesExtracted,
      processing_time: interview.processingTime,
      unique_speakers: interview.uniqueSpeakers,
      vectors_stored: interview.vectorsStored,
      tags: interview.tags || []
    });

    console.log(`✅ Saved interview to database with ID: ${interviewData.id}`);
    return interviewData.id;
  } catch (error) {
    console.error('❌ Failed to save interview to database:', error);
    throw error;
  }
}

// Enhanced function to store interview with content hash
async function saveStoredInterviewWithHash(interview: StoredInterview, userId: string): Promise<string> {
  try {
    const interviewData = await createInterviewWithHash({
      filename: interview.filename,
      upload_date: interview.uploadDate.toISOString(),
      status: interview.status,
      company_size: interview.companySize,
      role: interview.role,
      industry: interview.industry,
      region: interview.region,
      quotes_extracted: interview.quotesExtracted,
      processing_time: interview.processingTime,
      unique_speakers: interview.uniqueSpeakers,
      vectors_stored: interview.vectorsStored,
      tags: interview.tags || [],
      content_hash: interview.contentHash,
      file_size: interview.fileSize,
      blob_url: interview.blobUrl,
      user_id: userId
    });

    console.log(`✅ Saved interview with content hash to database with ID: ${interviewData.id}`);
    return interviewData.id;
  } catch (error) {
    console.error('❌ Failed to save interview with hash to database:', error);
    throw error;
  }
}

// Save quotes to database
async function saveQuotesToDatabase(interviewId: string, quotes: Quote[], assumption: string): Promise<void> {
  try {
    for (const quote of quotes) {
      // Validate quote has required text field
      if (!quote.text || quote.text.trim() === '') {
        console.warn(`⚠️ Skipping quote with empty text for assumption: ${assumption}`);
        continue;
      }
      
      await createQuote({
        interview_id: interviewId,
        text: quote.text.trim(),
        speaker: quote.speaker || 'Unknown',
        role: quote.role,
        source: quote.source || 'Interview',
        assumption_category: assumption,
        rejected: quote.rejected || false
      });
    }

    const validQuotes = quotes.filter(q => q.text && q.text.trim() !== '');
    console.log(`✅ Saved ${validQuotes.length} valid quotes to database for interview ${interviewId}`);
    if (validQuotes.length !== quotes.length) {
      console.log(`⚠️ Skipped ${quotes.length - validQuotes.length} quotes with empty text`);
    }
  } catch (error) {
    console.error('❌ Failed to save quotes to database:', error);
    throw error;
  }
}

// RAG-first processing: Check for existing quotes before full processing
async function processAssumptionWithRAG(assumption: string, assumptionId: number, interviewText?: string, fileName?: string): Promise<Quote[]> {
  // Extract attribute type from assumption text or use default
  const attributeType = getAttributeType(assumption);
  console.log(`🎯 [RAG] Processing assumption ${assumptionId} with attribute type: ${attributeType}`);

  // If we have interview text, try targeted extraction first
  if (interviewText && fileName) {
    console.log(`🔍 [RAG] Attempting targeted extraction for ${attributeType} assumption`);
    return interviewText ? await extractTargetedQuotes(interviewText, fileName, assumption) : [];
  }

  console.log(`🔍 [RAG] Checking for existing quotes for assumption ${assumptionId} (${attributeType})`);
  
  try {
    // First, try to get quotes from RAG system with attribute-specific filtering
    const ragQuotes = await getTopQuotesForSynthesis(assumption, assumptionId, 5, attributeType);
    
    if (ragQuotes.length > 0) {
      console.log(`✅ [RAG] Hit: Found ${ragQuotes.length} existing quotes for ${attributeType} assumption ${assumptionId}`);
      
      // Convert RAG quotes to Quote format
      const quotes: Quote[] = ragQuotes.map((q, index) => ({
        id: `rag-${assumptionId}-${index}`,
        text: q.text || '',
        speaker: q.speaker || 'Unknown',
        role: q.role || '',
        source: q.source || 'RAG System',
        classification: 'RELEVANT' as Quote['classification'],
        companySnapshot: q.companySnapshot || '',
        rejected: false
      }));
      
      return quotes;
    }
  } catch (error) {
    console.warn(`⚠️ [RAG] Lookup failed for ${attributeType} assumption ${assumptionId}:`, error);
  }
  
  // Fallback: Process interview if text provided
  if (interviewText && fileName) {
    console.log(`🔄 [RAG] Miss: Processing interview text for ${attributeType} assumption ${assumptionId}`);
    return await extractTargetedQuotes(interviewText, fileName, assumption);
  }
  
  return [];
}

// NEW: Optimized function to extract quotes for all assumptions in a single pass
async function extractAllQuotesForAssumptions(interviewText: string, fileName: string, assumptions: string[]): Promise<Record<string, Quote[]>> {
  console.log(`🚀 [OPTIMIZED] Extracting quotes for all ${assumptions.length} assumptions in single pass`);
  
  // First, extract company snapshot from the interview content
  let companySnapshot = '';
  try {
    if (openai) {
      const snapshotResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Extract a 1-2 sentence company snapshot: company name, size, industry only."
          },
          {
            role: "user",
            content: `Extract company details from: ${interviewText.substring(0, 800)}\n\nFormat: [Company] is a [size] [industry] firm.`
          }
        ],
        temperature: 0.1,
        max_tokens: 100
      });
      companySnapshot = snapshotResponse.choices[0]?.message?.content?.trim() || '';
    }
  } catch (error) {
    console.warn('Failed to generate company snapshot:', error);
    companySnapshot = `Professional services firm (${fileName})`;
  }

  // Create a comprehensive prompt for all assumptions
  const assumptionsList = assumptions.map((assumption, index) => 
    `${index + 1}. "${assumption}"`
  ).join('\n');

  const prompt = `Extract 2-3 relevant quotes for each assumption from this interview:

ASSUMPTIONS TO VALIDATE:
${assumptionsList}

INTERVIEW: ${interviewText}
SOURCE: ${fileName}

RULES:
✅ EXTRACT quotes that discuss each assumption's topic with specific details
✅ Include speaker role/title when mentioned
✅ Focus on substance over quantity
❌ SKIP generic satisfaction, pricing, or unrelated topics

Return JSON:
{
  "assumptions": [
    {
      "assumptionIndex": 1,
      "assumptionText": "exact assumption text",
      "quotes": [
        {
          "text": "specific quote about this assumption",
          "speaker": "name if available",
          "role": "title if mentioned",
          "source": "${fileName}",
          "classification": "RELEVANT"
        }
      ]
    }
  ]
}`;

  try {
    console.log(`[OpenAI][batch-extract] Processing ${assumptions.length} assumptions in single call`);
    const startTime = Date.now();
    
    if (!openai) {
      throw new Error('OpenAI client not initialized');
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "Extract relevant quotes for business validation across multiple assumptions. Focus on substance over quantity." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
      max_tokens: 2000 // Increased for multiple assumptions
    });
    
    const duration = Date.now() - startTime;
    console.log(`[OpenAI][batch-extract] Completed in ${duration}ms`);
    
    const content = response.choices[0].message.content;
    if (!content) return {};
    
    const parsed = JSON.parse(content);
    const results: Record<string, Quote[]> = {};
    
    // Process results for each assumption
    if (parsed.assumptions && Array.isArray(parsed.assumptions)) {
      parsed.assumptions.forEach((assumptionResult: any) => {
        const assumptionIndex = assumptionResult.assumptionIndex - 1; // Convert to 0-based
        const assumptionText = assumptionResult.assumptionText || assumptions[assumptionIndex];
        
        if (assumptionText && assumptionResult.quotes) {
          const quotes = assumptionResult.quotes
            .filter((q: any) => q.text && q.text.length > 20) // Basic quality filter
            .map((quote: any) => ({
              id: crypto.randomUUID(),
              text: quote.text,
              speaker: quote.speaker || 'Unknown',
              role: quote.role || '',
              source: quote.source || fileName,
              classification: 'RELEVANT' as Quote['classification'],
              companySnapshot: companySnapshot,
              rejected: false
            }));
          
          // Apply relevance filtering
          const attributeType = getAttributeType(assumptionText);
          console.log(`🔍 [RELEVANCE] Processing ${quotes.length} quotes for attribute: ${attributeType}`);
          
          // Score quotes for relevance and filter
          const quotesWithScores = quotes
            .map((quote: Quote) => {
              const relevanceScore = scoreQuoteRelevanceEnhanced(quote, attributeType);
              console.log(`📊 [RELEVANCE] Quote: "${quote.text.substring(0, 50)}..." → Score: ${relevanceScore.toFixed(2)}`);
              return {
                ...quote,
                relevanceScore
              };
            })
            .filter((quote: Quote & { relevanceScore: number }) => {
              const passes = quote.relevanceScore >= RELEVANCE_FILTERING_CONFIG.MIN_RELEVANCE_SCORE;
              console.log(`🎯 [RELEVANCE] Quote score ${quote.relevanceScore.toFixed(2)} ${passes ? 'PASSES' : 'FAILS'} threshold ${RELEVANCE_FILTERING_CONFIG.MIN_RELEVANCE_SCORE}`);
              return passes;
            })
            .sort((a: Quote & { relevanceScore: number }, b: Quote & { relevanceScore: number }) => b.relevanceScore - a.relevanceScore);
          
          console.log(`✅ [RELEVANCE] Filtered ${quotes.length} → ${quotesWithScores.length} quotes for assumption: ${assumptionText.substring(0, 50)}...`);
          results[assumptionText] = quotesWithScores;
        }
      });
    }
    
    // Ensure all assumptions have an entry (even if empty)
    assumptions.forEach(assumption => {
      if (!results[assumption]) {
        results[assumption] = [];
        console.log(`🎯 [BATCH] No quotes found for: ${assumption.substring(0, 50)}...`);
      }
    });
    
    const totalQuotes = Object.values(results).flat().length;
    console.log(`✅ [BATCH] Total quotes extracted: ${totalQuotes} across ${assumptions.length} assumptions`);
    
    return results;
    
  } catch (error) {
    console.error(`[OpenAI][batch-extract] Error:`, error);
    
    // Fallback: return empty results for all assumptions
    const fallbackResults: Record<string, Quote[]> = {};
    assumptions.forEach(assumption => {
      fallbackResults[assumption] = [];
    });
    return fallbackResults;
  }
}

async function processSingleInterviewWithStorage(file: File, assumptions: string[], blobUrl: string = '', userId: string = '00000000-0000-0000-0000-000000000000'): Promise<{
  quotes: Record<string, Quote[]>;
  metadata: StoredInterview;
  databaseId: string;
}> {
  console.log(`📁 Processing interview with OPTIMIZED batch architecture: ${file.name}`);
  const processingStartTime = Date.now();
  
  // Note: Duplicate detection is now handled at the client upload level via /api/check-duplicates
  
  const parsed = await parseFile(file);
  if (parsed.error) {
    throw new Error(`Error parsing interview file ${file.name}: ${parsed.error}`);
  }
  
  const interviewText = parsed.text;
  
  // Extract metadata
  const extractedMetadata = await extractInterviewMetadata(interviewText, file.name);
  
  // Generate content hash for storage
  const contentHash = generateContentHash(interviewText);
  
  // OPTIMIZED: Process all assumptions in a single batch call
  console.log(`🚀 [OPTIMIZED] Processing all ${assumptions.length} assumptions in single batch`);
  const quotesPerAssumption = await extractAllQuotesForAssumptions(interviewText, file.name, assumptions);
  
  // Use processed quotes directly (no separate classification needed with RAG-first)
  const classificationResults: Record<string, Quote[]> = {};
  for (const assumption of assumptions) {
    const quotesForAssumption = quotesPerAssumption[assumption] || [];
    console.log(`  🎯 [OPTIMIZED] Using ${quotesForAssumption.length} batch-extracted quotes for assumption: ${assumption.substring(0, 40)}`);
    classificationResults[assumption] = quotesForAssumption; // Already classified during extraction
  }
  
  const processingTime = Date.now() - processingStartTime;
  const totalQuotes = Object.values(classificationResults).flat().length;
  
  // Create stored interview record with content hash
  const storedInterview: StoredInterview = {
    id: crypto.randomUUID(),
    filename: file.name,
    uploadDate: new Date(),
    status: 'processing',
    companySize: extractedMetadata.companySize || 'medium',
    role: extractedMetadata.role || 'Unknown',
    industry: extractedMetadata.industry || 'Unknown',
    region: extractedMetadata.region || 'Unknown',
    quotesExtracted: totalQuotes,
    processingTime: processingTime,
    uniqueSpeakers: extractedMetadata.uniqueSpeakers || [],
    vectorsStored: totalQuotes * 3, // Estimate: each quote generates ~3 vectors
    tags: [], // Will be populated by user later
    contentHash: contentHash, // Add content hash
    fileSize: file.size, // Add file size
    blobUrl: blobUrl, // Set from caller
  };
  
  console.log(`✅ Created stored interview record with OPTIMIZED batch processing:`, storedInterview);
  
  // Save file record to in-memory store for duplicate detection
  saveFileRecord({
    contentHash: contentHash,
    filename: file.name,
    fileSize: file.size,
    contentType: 'interview'
  });
  
  // Save to database with enhanced data (temporarily disabled for duplicate detection testing)
  let databaseId;
  try {
    databaseId = await saveStoredInterviewWithHash(storedInterview, userId);
  } catch (error) {
    console.warn('⚠️ Database save failed, continuing without persistence:', error);
    databaseId = 'temp-' + crypto.randomUUID();
  }
  
  // Save all quotes to database
  for (const [assumption, quotes] of Object.entries(classificationResults)) {
    if (quotes.length > 0 && databaseId.startsWith('temp-') === false) {
      try {
        await saveQuotesToDatabase(databaseId, quotes, assumption);
        console.log(`💾 Saved ${quotes.length} quotes to database for assumption: ${assumption.substring(0, 40)}`);
      } catch (error) {
        console.warn(`⚠️ Failed to save quotes for assumption: ${assumption.substring(0, 40)}:`, error);
      }
    }
  }
   
   return {
    quotes: classificationResults,
    metadata: storedInterview,
    databaseId
  };
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

// Calculate comprehensive alignment score with transparent breakdown
function calculateOverallAlignmentScore(assumptions: any[]): { 
  overallScore: number; 
  breakdown: Record<string, { score: number; outcome: string; weight: number }>;
  outcomeWeights: Record<string, number>;
  summary: { validated: number; contradicted: number; gapIdentified: number; insufficientData: number };
} {
  const outcomeWeights = {
    'Validated': 1.0,           // 100% contribution - deck messaging aligns with customer reality
    'Gap Identified': 0.75,     // 75% contribution - valuable insights for deck improvement
    'Insufficient Data': 0.2,   // 20% contribution - need more interviews
    'Contradicted': 0.0         // 0% contribution - deck messaging conflicts with customer reality
  };

  const scoreBreakdown: Record<string, { score: number; outcome: string; weight: number }> = {};
  const summary = { validated: 0, contradicted: 0, gapIdentified: 0, insufficientData: 0 };
  let totalWeightedScore = 0;

  assumptions.forEach(assumption => {
    const rawOutcome = calculateAssumptionOutcome(assumption.quotes);
    const mappedOutcome = mapComparisonOutcome(rawOutcome);
    assumption.comparisonOutcome = mappedOutcome;
    
    // Get weight for this outcome
    const weight = outcomeWeights[mappedOutcome] || 0;
    
    // Base confidence score (from deck analysis) adjusted by interview validation
    const baseConfidence = assumption.confidenceScore || 85;
    const adjustedScore = Math.round(baseConfidence * weight);
    
    scoreBreakdown[assumption.icpAttribute || `Assumption ${assumption.id}`] = {
      score: adjustedScore,
      outcome: mappedOutcome,
      weight: weight
    };
    
    totalWeightedScore += adjustedScore;
    
    // Update summary counts
    switch (mappedOutcome) {
      case 'Validated': summary.validated++; break;
      case 'Contradicted': summary.contradicted++; break;
      case 'Gap Identified': summary.gapIdentified++; break;
      case 'Insufficient Data': summary.insufficientData++; break;
      default: summary.insufficientData++; break;
    }
  });

  const overallScore = Math.round(totalWeightedScore / assumptions.length);
  
  return {
    overallScore,
    breakdown: scoreBreakdown,
    outcomeWeights,
    summary
  };
}

// NEW: Optimized function to synthesize multiple assumptions in a single call
async function synthesizeAllAssumptions(assumptionsWithQuotes: Array<{
  assumption: string;
  quotes: Quote[];
  index: number;
}>): Promise<Record<string, string>> {
  console.log(`🚀 [OPTIMIZED] Synthesizing ${assumptionsWithQuotes.length} assumptions in single batch`);
  
  // Filter out assumptions with no quotes
  const assumptionsToSynthesize = assumptionsWithQuotes.filter(item => item.quotes.length > 0);
  
  if (assumptionsToSynthesize.length === 0) {
    console.log(`⚠️ [OPTIMIZED] No assumptions have quotes to synthesize`);
    return {};
  }
  
  // Create a comprehensive prompt for all assumptions
  const synthesisPrompts = assumptionsToSynthesize.map(item => {
    const quotesText = item.quotes.map((quote, qIndex) => 
      `Quote ${qIndex + 1}: "${quote.text}" (speaker: ${quote.speaker})`
    ).join('\n');
    
    return `ASSUMPTION ${item.index + 1}: "${item.assumption}"
QUOTES:
${quotesText}
---
`;
  }).join('\n');

  const prompt = `Analyze each assumption against its supporting quotes and provide a synthesis:

${synthesisPrompts}

For each assumption, provide a 2-3 sentence synthesis that:
1. Summarizes the key insights from the quotes
2. Indicates whether the assumption is validated, contradicted, or if gaps are identified
3. Highlights actionable insights for product marketing

Return JSON:
{
  "syntheses": [
    {
      "assumptionIndex": 1,
      "synthesis": "2-3 sentence synthesis of the evidence and insights"
    }
  ]
}`;

  try {
    console.log(`[OpenAI][batch-synthesis] Processing ${assumptionsToSynthesize.length} assumptions`);
    const startTime = Date.now();
    
    if (!openai) {
      throw new Error('OpenAI client not initialized');
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "Synthesize interview evidence against business assumptions. Focus on actionable insights for product marketing." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
      max_tokens: 2000
    });
    
    const duration = Date.now() - startTime;
    console.log(`[OpenAI][batch-synthesis] Completed in ${duration}ms`);
    
    const content = response.choices[0].message.content;
    if (!content) return {};
    
    const parsed = JSON.parse(content);
    const results: Record<string, string> = {};
    
    // Process synthesis results
    if (parsed.syntheses && Array.isArray(parsed.syntheses)) {
      parsed.syntheses.forEach((synthesisResult: any) => {
        const assumptionIndex = synthesisResult.assumptionIndex - 1; // Convert to 0-based
        const originalItem = assumptionsToSynthesize.find(item => item.index === assumptionIndex);
        
        if (originalItem && synthesisResult.synthesis) {
          results[originalItem.assumption] = synthesisResult.synthesis;
          console.log(`✅ [BATCH] Generated synthesis for assumption ${assumptionIndex + 1}: "${synthesisResult.synthesis.slice(0, 80)}..."`);
        }
      });
    }
    
    return results;
    
  } catch (error) {
    console.error(`[OpenAI][batch-synthesis] Error:`, error);
    return {};
  }
}

// Timeout wrapper for OpenAI calls

export async function POST(request: NextRequest) {
  const processingStartTime = Date.now();
  
  // Mock mode control
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
  
  if (useMock) {
    console.log("⚠️ analyze-interviews running in mock mode (NEXT_PUBLIC_USE_MOCK=true)");
  } else {
    console.log("✅ analyze-interviews running with live API + DB + vector storage");
  }
  
  try {
    // Check authentication first (bypassed for testing)
    const user = await getCurrentUserServer().catch(() => ({ id: '00000000-0000-0000-0000-000000000000' }));
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if we should use mock data
    if (process.env.NEXT_PUBLIC_USE_MOCK === "TRUE") {
      console.log('🎭 Using mock data for interview analysis');
      const mock = await import("../../../mocks/fixtures/interview-results.json");
      return NextResponse.json(mock.default);
    }
    
    // Support both FormData (legacy) and JSON (new blob URLs)
    const contentType = request.headers.get('content-type');
    
    let files: File[] = [];
    let existingAssumptions: BuyerMapData[] = [];
    let blobUrls: string[] = [];
    
    if (contentType?.includes('application/json')) {
      // New: JSON payload with blob URLs
      const body = await request.json();
      blobUrls = body.blobUrls || [];
      const assumptionsJson = body.assumptions;
      existingAssumptions = JSON.parse(assumptionsJson);
      
      console.log(`📦 [BLOB] Received ${blobUrls.length} blob URLs for interview analysis`);
      
      // Download files from blob URLs
      files = await Promise.all(
        blobUrls.map(async (url, index) => {
          console.log(`📥 [BLOB] Downloading file ${index + 1} from: ${url}`);
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to download file from ${url}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const filename = url.split('/').pop() || `interview-${index + 1}.pdf`;
          return new File([arrayBuffer], filename, {
            type: response.headers.get('content-type') || 'application/pdf'
          });
        })
      );
      
      console.log(`✅ [BLOB] Successfully downloaded ${files.length} files from blob storage`);
    } else {
      // Legacy: FormData with direct file uploads
      console.log(`📁 [LEGACY] Processing direct file uploads`);
      const formData = await request.formData();
      files = formData.getAll('files') as File[];
      const assumptionsJson = formData.get('assumptions') as string;
      existingAssumptions = JSON.parse(assumptionsJson);
    }

    if (!files.length) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    console.log(`🎯 Starting parallel processing for ${files.length} interviews, ${existingAssumptions.length} assumptions for user ${user.id}`);
    const assumptionsList = existingAssumptions.map(a => a.v1Assumption);
    
         // Set up parallel processing with rate limiting and timeout protection
     const limit = pLimit(CONCURRENT_LIMIT);
     console.log(`🚀 Processing ${files.length} interviews in parallel (max ${CONCURRENT_LIMIT} concurrent)...`);
     
     // Add overall timeout protection (4.5 minutes for Vercel Pro)
     const timeoutPromise = new Promise((_, reject) => {
       setTimeout(() => reject(new Error('Overall processing timeout after 270 seconds')), 270000);
     });
     
     const processingPromise = Promise.all(
       files.map((file, index) => 
         limit(async () => {
           try {
             console.log(`Starting interview: ${file.name}`);
             // Get corresponding blob URL if available
             const blobUrl = contentType?.includes('application/json') ? (blobUrls[index] || '') : '';
             // Add per-file timeout (60 seconds - reduced due to optimized batch processing)
             const result = await withTimeout(
               processSingleInterviewWithStorage(file, assumptionsList, blobUrl, user.id),
               60000  // Reduced from 120s to 60s due to batch optimization
             );
             const elapsed = ((Date.now() - processingStartTime) / 1000).toFixed(1);
             console.log(`✅ Completed interview ${file.name} in ${elapsed}s with OPTIMIZED batch architecture`);
             return { result, fileName: file.name };
           } catch (error) {
             console.error(`❌ Error processing interview ${file.name}:`, error);
             return { 
               result: { quotes: Object.fromEntries(assumptionsList.map(a => [a, []])), metadata: {} as StoredInterview, databaseId: 'error' },
               fileName: file.name,
               error: error instanceof Error ? error.message : 'Unknown error'
             };
           }
         })
       )
     );
     
     const completedProcessing = await Promise.race([processingPromise, timeoutPromise]) as Array<{
       result: { quotes: Record<string, Quote[]>; metadata: StoredInterview; databaseId: string };
       fileName: string;
       error?: string;
     }>;
     
     logProcessingStats(completedProcessing, processingStartTime);
     
     // Aggregate results from all interviews
     const successfulResults = completedProcessing.filter((r: any) => !r.error);
     const aggregatedQuotes: Record<string, Quote[]> = {};
     
     // Initialize all assumptions with empty arrays
     assumptionsList.forEach(assumption => {
       aggregatedQuotes[assumption] = [];
     });
     
     // Aggregate quotes from all successful interviews
     successfulResults.forEach((interviewResult: any) => {
       const { quotes } = interviewResult.result;
       Object.entries(quotes).forEach(([assumption, quoteList]) => {
         if (aggregatedQuotes[assumption]) {
           aggregatedQuotes[assumption].push(...(quoteList as Quote[]));
         }
       });
     });
     
     console.log('📊 Starting OPTIMIZED batch synthesis for assumptions with quotes...');
     
     // OPTIMIZED: Generate synthesis for all assumptions in a single batch call
     const assumptionsWithQuotes = existingAssumptions.map((assumption, index) => ({
       assumption: assumption.v1Assumption,
       quotes: aggregatedQuotes[assumption.v1Assumption] || [],
       index
     }));
     
     const batchSyntheses = await synthesizeAllAssumptions(assumptionsWithQuotes);
     
     // Generate synthesis for each assumption with quotes
     const synthesizedAssumptions = existingAssumptions.map((assumption, index) => {
       const quotes = aggregatedQuotes[assumption.v1Assumption] || [];
       const outcome = calculateAssumptionOutcome(quotes);
       const mappedOutcome = mapComparisonOutcome(outcome);
       
       // Use batch synthesis result or fallback
       let realityFromInterviews = 'No interview data available for this assumption.';
       if (quotes.length > 0) {
         realityFromInterviews = batchSyntheses[assumption.v1Assumption] || 
           `Analysis completed with ${quotes.length} supporting quotes. See evidence below for insights.`;
       }
       
       return {
         ...assumption,
         quotes,
         comparisonOutcome: mappedOutcome,
         realityFromInterviews
       };
     });
     
     console.log('✅ OPTIMIZED batch synthesis completed for all assumptions');
           
     // Calculate overall scores using synthesized assumptions
     const { overallScore, breakdown, summary } = calculateOverallAlignmentScore(synthesizedAssumptions);
     
     const response = {
       success: true,
       assumptions: synthesizedAssumptions,
       overallAlignmentScore: overallScore,
       validatedCount: summary.validated,
       partiallyValidatedCount: summary.gapIdentified,
       pendingCount: summary.insufficientData,
       metadata: {
         totalInterviews: files.length,
         totalQuotes: Object.values(aggregatedQuotes).flat().length,
         processingTimeSeconds: ((Date.now() - processingStartTime) / 1000).toFixed(1),
         parallelProcessing: true,
         optimizedBatchProcessing: true,
         batchQuoteExtraction: true,
         batchSynthesis: true,
         apiCallsReduced: true
       }
     };
     
     console.log('✅ OPTIMIZED batch interview analysis completed:', {
       assumptionsProcessed: synthesizedAssumptions.length,
       filesProcessed: files.length,
       totalQuotes: response.metadata.totalQuotes,
       overallScore: response.overallAlignmentScore,
       processingTime: response.metadata.processingTimeSeconds,
       optimization: 'Batch quote extraction + Batch synthesis'
     });
     
     return NextResponse.json(response);
     
   } catch (error) {
     const totalTime = ((Date.now() - processingStartTime) / 1000).toFixed(1);
     console.error(`❌ Processing failed after ${totalTime}s:`, error);
     
     return NextResponse.json(
       { 
         success: false,
         error: error instanceof Error ? error.message : 'Unknown error occurred during interview analysis'
       },
       { status: 500 }
     );
   }
}