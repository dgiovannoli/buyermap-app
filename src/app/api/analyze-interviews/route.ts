import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { parseFile } from '../../../utils/fileParser';
import { BuyerMapData, Quote, StoredInterview } from '../../../types/buyermap';
import { mapComparisonOutcome } from '../../../utils/dataMapping';
import pLimit from 'p-limit';
import { createInterviewWithHash, createQuote, getCurrentUserServer, createInterview, handle_file_upload, saveInterviewWithTracking, updateInterviewStatus, getUserQuotes } from '../../../lib/database-server';
// RAG system imports for chunk-based processing
import { 
  getTopQuotesForSynthesis,
  scoreQuoteRelevanceEnhanced, 
  RELEVANCE_FILTERING_CONFIG
} from '../../../lib/rag';
import crypto from 'crypto';
import { 
  scoreQuotesForAssumption, 
  sortQuotesByScore, 
  getQuoteQualitySummary,
  ScoredQuote 
} from '../../../utils/quoteScoring';
import { 
  selectOptimalQuotes, 
  calculateDiversityMetrics, 
  getDiversitySummary 
} from '../../../utils/diversitySelection';
import { createClient } from '@supabase/supabase-js';

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

// Helper function to convert database quotes to Quote format
function convertDatabaseQuotesToQuoteFormat(dbQuotes: any[]): Quote[] {
  return dbQuotes.map((dbQuote, index) => ({
    id: dbQuote.id || `db-${index}`,
    text: dbQuote.text || '',
    speaker: dbQuote.speaker || 'Unknown',
    role: dbQuote.role || '',
    source: dbQuote.source || 'Interview',
    classification: 'RELEVANT' as Quote['classification'],
    companySnapshot: '', // Not stored in database, will be empty
    rejected: dbQuote.rejected || false
  }));
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
  console.log(`🚀 [PER-ASSUMPTION] Processing ${assumptions.length} assumptions individually for better quality`);
  
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

  // PHASE 1.2: Process 3-5 assumptions in parallel per interview
  const BATCH_SIZE = 3; // Process 3 assumptions at a time for optimal quality
  const results: Record<string, Quote[]> = {};
  
  // Initialize all assumptions with empty arrays
  assumptions.forEach(assumption => {
    results[assumption] = [];
  });

  // Process assumptions in batches of 3
  for (let i = 0; i < assumptions.length; i += BATCH_SIZE) {
    const batch = assumptions.slice(i, i + BATCH_SIZE);
    console.log(`📦 [PER-ASSUMPTION] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} assumptions`);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (assumption) => {
      try {
        console.log(`🎯 [PER-ASSUMPTION] Processing assumption: ${assumption.substring(0, 50)}...`);
        const quotes = await extractTargetedQuotesEnhanced(interviewText, fileName, assumption, companySnapshot);
        
        // Apply relevance filtering
        const attributeType = getAttributeType(assumption);
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
        
        console.log(`✅ [RELEVANCE] Filtered ${quotes.length} → ${quotesWithScores.length} quotes for assumption: ${assumption.substring(0, 50)}...`);
        return { assumption, quotes: quotesWithScores };
      } catch (error) {
        console.error(`❌ [PER-ASSUMPTION] Error processing assumption "${assumption.substring(0, 30)}...":`, error);
        return { assumption, quotes: [] };
      }
    });
    
    // Wait for batch to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Store results
    batchResults.forEach(({ assumption, quotes }) => {
      results[assumption] = quotes;
    });
    
    console.log(`✅ [PER-ASSUMPTION] Completed batch ${Math.floor(i / BATCH_SIZE) + 1}`);
  }
  
  const totalQuotes = Object.values(results).flat().length;
  console.log(`✅ [PER-ASSUMPTION] Total quotes extracted: ${totalQuotes} across ${assumptions.length} assumptions`);
  
  return results;
}

// PHASE 1.2: Enhanced targeted quote extraction with attribute-specific prompts
async function extractTargetedQuotesEnhanced(interviewText: string, fileName: string, assumption: string, companySnapshot: string): Promise<Quote[]> {
  const attributeType = getAttributeType(assumption);
  const topicFocus = getTopicFocusInstructions(assumption);
  
  // PHASE 1.3: Enhanced prompt with fallback guidance and priority marking
  const prompt = `Extract 2-3 highly relevant quotes that directly discuss this assumption:

ASSUMPTION: "${assumption}"
ATTRIBUTE TYPE: ${attributeType}
FOCUS AREA: ${topicFocus}

INTERVIEW: ${interviewText}
SOURCE: ${fileName}

EXTRACTION GUIDELINES:
✅ EXTRACT quotes that discuss the assumption's topic with specific details
✅ Include speaker role/title when mentioned
✅ Focus on decision-making language for buyer titles
✅ Look for pain points and challenges for pain-points
✅ Identify triggers and timing for trigger attributes
✅ Find barriers and objections for barrier attributes
❌ SKIP generic satisfaction, pricing, or unrelated topics

FALLBACK GUIDANCE:
• If you can't find strong quotes, find weaker but relevant ones
• Look for indirect mentions or related topics
• Consider context and implications even if not explicitly stated
• Prioritize substance over perfect keyword matches

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
    console.log(`[OpenAI][per-assumption] Processing: ${assumption.substring(0, 30)}... (${attributeType})`);
    const startTime = Date.now();
    
    if (!openai) {
      throw new Error('OpenAI client not initialized');
    }
    
    // PHASE 1.3: Enhanced system prompt with attribute-specific guidance
    const systemPrompt = `You are a senior business analyst specializing in customer research and ICP validation. Generate specific, actionable insights that sales teams can use to adjust their messaging and targeting strategies.

For ${attributeType} attributes, focus on:
${getAttributeSpecificGuidance(attributeType)}

Extract relevant quotes with high precision. If strong quotes aren't available, find weaker but relevant ones that provide context or implications.`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: systemPrompt
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
      max_tokens: 1200
    });
    
    const duration = Date.now() - startTime;
    console.log(`[OpenAI][per-assumption] Completed in ${duration}ms`);
    
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
    
    console.log(`🎯 [PER-ASSUMPTION] Extracted ${quotes.length} quotes for: ${assumption.substring(0, 50)}...`);
    return quotes;
    
  } catch (error) {
    console.error(`[OpenAI][per-assumption] Error:`, error);
    return [];
  }
}

// PHASE 1.3: Enhanced attribute-specific guidance function
function getAttributeSpecificGuidance(attributeType: string): string {
  switch (attributeType.toLowerCase()) {
    case 'buyer-titles':
      return `• Decision-making language and authority indicators
• Role titles and responsibilities
• Who makes purchasing decisions
• Organizational hierarchy mentions
• Leadership and management references`;
      
    case 'pain-points':
      return `• Challenges, frustrations, and problems
• Inefficiencies and bottlenecks
• Cost concerns and budget pressures
• Time constraints and deadlines
• Quality issues and reliability problems`;
      
    case 'triggers':
      return `• Timing and urgency indicators
• Event-driven decision making
• Seasonal or cyclical patterns
• External pressures and deadlines
• Change catalysts and motivators`;
      
    case 'barriers':
      return `• Objections and concerns
• Risk factors and hesitations
• Budget constraints and approvals
• Technical limitations
• Competitive considerations`;
      
    case 'messaging':
      return `• Communication preferences
• Value proposition responses
• Feature importance indicators
• Brand perception mentions
• Marketing message reactions`;
      
    default:
      return `• General business insights and observations
• Strategic considerations and priorities
• Market dynamics and competitive factors
• Operational challenges and opportunities`;
  }
}

async function processSingleInterviewWithStorage(file: File, assumptions: string[], blobUrl: string = '', userId: string = '00000000-0000-0000-0000-000000000000'): Promise<{
  quotes: Record<string, Quote[]>;
  metadata: StoredInterview;
  databaseId: string;
}> {
  console.log(`📁 [PER-ASSUMPTION] Processing interview with enhanced per-assumption architecture: ${file.name}`);
  const processingStartTime = Date.now();
  
  // Enhanced file handling with duplicate detection
  console.log(`🔍 [FILE_TRACKING] Checking for duplicates before processing: ${file.name}`);
  
  // Convert file to buffer for content hash generation
  const fileBuffer = await file.arrayBuffer();
  const fileContent = Buffer.from(fileBuffer);
  
  // Check for duplicates using enhanced handler
  const uploadResult = await handle_file_upload(file, fileContent, userId, {
    allowOverwrite: false,
    checkGlobalDuplicates: false
  });
  
  console.log(`🔍 [FILE_TRACKING] Upload check result for ${file.name}:`, {
    isDuplicate: uploadResult.isDuplicate,
    isConflict: uploadResult.isConflict,
    action: uploadResult.action
  });
  
  // Handle duplicate detection
  if (uploadResult.isDuplicate) {
    console.log(`🔄 [FILE_TRACKING] Duplicate detected for ${file.name}, checking for existing quotes`);
    const existingFile = uploadResult.existingFile;
    
    // Try to fetch quotes from DB for this interview and user
    let dbQuotes: any[] = [];
    let hasValidQuotes = false;
    
    try {
      dbQuotes = await getUserQuotes(userId, existingFile.id);
      console.log(`📥 [DB] Loaded ${dbQuotes.length} quotes from DB for interview ${existingFile.id}`);
      
      // Check if we have meaningful quotes (not just empty records)
      hasValidQuotes = dbQuotes.length > 0 && dbQuotes.some(q => q.text && q.text.trim().length > 0);
      
      if (hasValidQuotes) {
        console.log(`✅ [DB] Found valid quotes for duplicate, using existing analysis`);
        
        // Debug: Show what assumption categories are stored in the database
        const uniqueCategories = [...new Set(dbQuotes.map(q => q.assumption_category))];
        console.log(`🔍 [DB] Unique assumption categories in database:`, uniqueCategories);
        
        // Debug: Show current assumptions being processed
        console.log(`🔍 [DB] Current assumptions being processed:`, assumptions.map(a => a.substring(0, 50)));
        
        // Group quotes by assumption_category
        const quotesByAssumption: Record<string, Quote[]> = {};
        for (const assumption of assumptions) {
          // First try exact match
          let matchingQuotes = dbQuotes.filter(q => q.assumption_category === assumption);
          
          // If no exact match, try partial matching
          if (matchingQuotes.length === 0) {
            console.log(`🔍 [DB] No exact match for assumption: ${assumption.substring(0, 50)}`);
            console.log(`🔍 [DB] Trying partial matching...`);
            
            // Try to find quotes that match the key parts of the assumption
            const assumptionKeyWords = assumption.toLowerCase().split(' ').filter((word: string) => word.length > 3);
            matchingQuotes = dbQuotes.filter(q => {
              if (!q.assumption_category) return false;
              const categoryKeyWords = q.assumption_category.toLowerCase().split(' ').filter((word: string) => word.length > 3);
              // Check if at least 60% of key words match
              const matchingWords = assumptionKeyWords.filter((word: string) => 
                categoryKeyWords.some((catWord: string) => catWord.includes(word) || word.includes(catWord))
              );
              return matchingWords.length >= Math.max(1, assumptionKeyWords.length * 0.6);
            });
            
            if (matchingQuotes.length > 0) {
              console.log(`🔍 [DB] Found ${matchingQuotes.length} quotes using partial matching for: ${assumption.substring(0, 50)}`);
            }
          }
          
          console.log(`🔍 [DB] Final: Found ${matchingQuotes.length} quotes for assumption: ${assumption.substring(0, 50)}`);
          // Convert database quotes to Quote format
          quotesByAssumption[assumption] = convertDatabaseQuotesToQuoteFormat(matchingQuotes);
        }
        
        return {
          quotes: quotesByAssumption,
          metadata: {
            id: existingFile.id,
            filename: existingFile.filename,
            uploadDate: new Date(existingFile.upload_date),
            status: existingFile.status as any,
            companySize: 'medium',
            role: 'Unknown',
            industry: 'Unknown',
            region: 'Unknown',
            quotesExtracted: existingFile.quotes_extracted || 0,
            processingTime: existingFile.processing_time || 0,
            uniqueSpeakers: existingFile.unique_speakers || [],
            vectorsStored: existingFile.vectors_stored || 0,
            tags: [],
            fileSize: existingFile.file_size || file.size,
            blobUrl: existingFile.blob_url || blobUrl,
          },
          databaseId: existingFile.id
        };
      } else {
        console.log(`⚠️ [DB] Duplicate detected but no valid quotes found. Re-analyzing file to ensure quality.`);
      }
      
    } catch (err) {
      console.warn('⚠️ [DB] Failed to load quotes from DB for duplicate interview:', err);
      console.log(`🔄 [DB] Will re-analyze file due to database error`);
    }
    
    // If we reach here, either no quotes were found or there was a database error
    // Continue with re-analysis to ensure we have valid quotes
    console.log(`🔄 [DUPLICATE] Re-analyzing duplicate file to ensure quote quality: ${file.name}`);
    console.log(`📊 [DUPLICATE] Re-analysis reason: ${hasValidQuotes ? 'Database error' : 'No valid quotes found'}`);
    console.log(`📊 [DUPLICATE] Database quotes count: ${dbQuotes.length}`);
    console.log(`📊 [DUPLICATE] Valid quotes count: ${dbQuotes.filter(q => q.text && q.text.trim().length > 0).length}`);
  }
  
  // Handle filename conflicts
  if (uploadResult.isConflict) {
    console.log(`⚠️ [FILE_TRACKING] Filename conflict for ${file.name}, but proceeding with processing`);
    // Continue processing but note the conflict
  }
  
  const parsed = await parseFile(file);
  if (parsed.error) {
    throw new Error(`Error parsing interview file ${file.name}: ${parsed.error}`);
  }
  
  const interviewText = parsed.text;
  
  // Extract metadata
  const extractedMetadata = await extractInterviewMetadata(interviewText, file.name);
  
  // PHASE 1.2: Process all assumptions individually for better quality
  console.log(`🚀 [PER-ASSUMPTION] Processing all ${assumptions.length} assumptions individually`);
  const quotesPerAssumption = await extractAllQuotesForAssumptions(interviewText, file.name, assumptions);
  
  // Use processed quotes directly (no separate classification needed with per-assumption processing)
  const classificationResults: Record<string, Quote[]> = {};
  for (const assumption of assumptions) {
    const quotesForAssumption = quotesPerAssumption[assumption] || [];
    console.log(`  🎯 [PER-ASSUMPTION] Using ${quotesForAssumption.length} individually-extracted quotes for assumption: ${assumption.substring(0, 40)}`);
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
    fileSize: file.size, // Add file size
    blobUrl: blobUrl, // Set from caller
  };
  
  console.log(`✅ Created stored interview record with OPTIMIZED batch processing:`, storedInterview);
  
  // Save to database with enhanced tracking
  let databaseId;
  try {
    // Use enhanced save function with file tracking
    const savedInterview = await saveInterviewWithTracking({
      filename: file.name,
      content_hash: uploadResult.contentHash,
      file_size: file.size,
      blob_url: blobUrl,
      user_id: userId,
      upload_date: new Date().toISOString(),
      status: 'processing',
      quotes_extracted: totalQuotes,
      processing_time: processingTime,
      unique_speakers: extractedMetadata.uniqueSpeakers || [],
      vectors_stored: totalQuotes * 3,
    });
    
    databaseId = savedInterview.id;
    
    // Update interview status to 'completed' after successful save
    if (databaseId) {
      try {
        await updateInterviewStatus(databaseId, 'completed', {
          quotes_extracted: totalQuotes,
          processing_time: processingTime,
          unique_speakers: extractedMetadata.uniqueSpeakers || [],
          vectors_stored: totalQuotes * 3,
        });
        console.log(`✅ Interview status updated to 'completed' for ID: ${databaseId}`);
      } catch (err) {
        console.warn('⚠️ Exception updating interview status:', err);
      }
    }
  } catch (error) {
    console.warn('⚠️ Database save failed, continuing without persistence:', error);
    databaseId = 'temp-' + crypto.randomUUID();
  }
  
  // Save all quotes to database
  for (const [assumption, quotes] of Object.entries(classificationResults)) {
    if (quotes.length > 0 && databaseId && !databaseId.startsWith('temp-')) {
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

  const prompt = `You are a senior business analyst specializing in customer research and ICP validation. Analyze each assumption against its supporting quotes and provide SPECIFIC, ACTIONABLE key findings.

${synthesisPrompts}

ANALYSIS REQUIREMENTS FOR EACH ASSUMPTION:
1. **Be Specific**: Name exact roles, processes, or behaviors mentioned
2. **Identify Patterns**: Look for recurring themes across multiple speakers
3. **Understand Workflows**: Describe how decisions are made and who does what
4. **Find Actionable Insights**: What should the business do differently?

EXAMPLES OF GOOD KEY FINDINGS:
✅ "Paralegals are the primary evaluators of transcription tools, despite attorneys being the formal buyers. They handle research, testing, and implementation, then present recommendations to attorneys for approval."

✅ "While our deck targets criminal defense attorneys, interviews reveal that paralegals handle 80% of transcription tasks and are the actual decision-makers for Rev adoption."

❌ AVOID: "Target buyers include criminal defense attorneys and forensic psychologists, as evidenced by quotes from professionals in these roles discussing the use of Rev."

For each assumption, provide a specific, actionable synthesis that a sales team could use to adjust their messaging or targeting strategy.

Return JSON:
{
  "syntheses": [
    {
      "assumptionIndex": 1,
      "synthesis": "[LABEL]: [Specific, actionable insight with concrete details]"
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
          content: "You are a senior business analyst specializing in customer research and ICP validation. Generate specific, actionable key findings that sales teams can use to adjust their messaging and targeting strategies. Focus on concrete insights about roles, decision-making processes, and behavioral patterns." 
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

// Helper: Filter quotes relevant to an assumption (same logic as aggregate-validation-results)
function filterQuotesForAssumption(quotes: Quote[], assumption: string): Quote[] {
  return quotes
    .filter(q => q.text && q.text.length > 20 && assumption && q.text.toLowerCase().includes(assumption.split(' ')[0].toLowerCase()))
    .slice(0, 10);
}

// === EMBEDDED VALIDATION FUNCTIONS ===
// These replace the HTTP calls to /api/aggregate-validation-results

function buildSynthesisPrompt(assumption: string, quotes: any[]) {
  return `
You are a senior business analyst specializing in customer research and ICP validation. Your task is to analyze interview quotes against a business assumption and provide a SPECIFIC, ACTIONABLE key finding.

ASSUMPTION: "${assumption}"

QUOTES:
${quotes.map((q, i) => `${i + 1}. "${q.text}" - ${q.speaker} (${q.role})`).join('\n')}

ANALYSIS REQUIREMENTS:
1. **Be Specific**: Name exact roles, processes, or behaviors mentioned
2. **Identify Patterns**: Look for recurring themes across multiple speakers
3. **Understand Workflows**: Describe how decisions are made and who does what
4. **Find Actionable Insights**: What should the business do differently?

RESPONSE FORMAT:
[LABEL]: [Specific, actionable insight with concrete details]

Where LABEL must be one of:
- VALIDATED: Interviews directly support the assumption with specific evidence
- GAP IDENTIFIED: Interviews reveal missing elements, broader scope, or different patterns than assumed
- CONTRADICTED: Interviews directly contradict the assumption with specific evidence
- INSUFFICIENT DATA: Not enough interview data to assess

EXAMPLES OF GOOD KEY FINDINGS:
✅ "Paralegals are the primary evaluators of transcription tools, despite attorneys being the formal buyers. They handle research, testing, and implementation, then present recommendations to attorneys for approval."

✅ "While our deck targets criminal defense attorneys, interviews reveal that paralegals handle 80% of transcription tasks and are the actual decision-makers for Rev adoption."

✅ "Target buyers include criminal defense attorneys and forensic psychologists, with paralegals emerging as key influencers who manage daily transcription workflows and often make tool recommendations to attorneys."

❌ AVOID: "Target buyers include criminal defense attorneys and forensic psychologists, as evidenced by quotes from professionals in these roles discussing the use of Rev."

CRITICAL: Your key finding should be specific enough that a sales team could use it to adjust their messaging or targeting strategy.
`;
}

function calculateConfidence(quotes: any[], hasGaps: boolean) {
  const baseConfidence = Math.min(100, quotes.length * 15);
  return hasGaps ? Math.max(baseConfidence - 30, 30) : baseConfidence;
}

function determineValidationLabel(synthesis: string, quotes: any[]): 'Validated' | 'Contradicted' | 'Gap Identified' | 'Insufficient Data' {
  if (quotes.length === 0) return 'Insufficient Data';

  // Debug: Log the full synthesis and first line
  console.log('🔍 [DEBUG] Full synthesis text:', synthesis);
  const firstLine = synthesis.split('\n')[0].trim().toUpperCase();
  console.log('🔍 [DEBUG] First line:', firstLine);

  // Handle the new enhanced format: "[LABEL]: [Detailed insight]"
  const labelMatch = firstLine.match(/^(VALIDATED|GAP IDENTIFIED|CONTRADICTED|INSUFFICIENT DATA):/);
  if (labelMatch) {
    const label = labelMatch[1];
    console.log(`🔍 [DEBUG] Found explicit label: ${label}`);
    return label as 'Validated' | 'Contradicted' | 'Gap Identified' | 'Insufficient Data';
  }

  // Fallback to old format detection
  if (firstLine.startsWith('GAP IDENTIFIED')) {
    console.log('🔍 [DEBUG] Found GAP IDENTIFIED label');
    return 'Gap Identified';
  }
  if (firstLine.startsWith('CONTRADICTED')) {
    console.log('🔍 [DEBUG] Found CONTRADICTED label');
    return 'Contradicted';
  }
  if (firstLine.startsWith('VALIDATED')) {
    console.log('🔍 [DEBUG] Found VALIDATED label');
    return 'Validated';
  }
  if (firstLine.startsWith('INSUFFICIENT DATA')) {
    console.log('🔍 [DEBUG] Found INSUFFICIENT DATA label');
    return 'Insufficient Data';
  }

  // Fallback: If no explicit label, default to 'Gap Identified' for safety
  console.log('🔍 [DEBUG] No explicit label found, defaulting to Gap Identified');
  return 'Gap Identified';
}

async function validateAssumptionDirectly(assumption: string, quotes: Quote[]): Promise<{
  keyFinding: string;
  label: 'Validated' | 'Contradicted' | 'Gap Identified' | 'Insufficient Data';
  confidence: number;
  supportingQuotes: Quote[];
}> {
  try {
    console.log(`🔍 [validateAssumptionDirectly] Starting validation for assumption: "${assumption.slice(0, 50)}..."`);
    console.log(`📊 [validateAssumptionDirectly] Input quotes count: ${quotes.length}`);
    
    if (quotes.length === 0) {
      console.log(`⚠️ [validateAssumptionDirectly] No quotes provided, returning insufficient data`);
      return {
        keyFinding: 'No interview data available for this assumption.',
        label: 'Insufficient Data',
        confidence: 0,
        supportingQuotes: []
      };
    }
    
    if (!openai) {
      throw new Error('OpenAI client not initialized');
    }
    
    const prompt = buildSynthesisPrompt(assumption, quotes);
    
    console.log(`🚀 [validateAssumptionDirectly] Making OpenAI call for validation`);
    console.log(`📤 [validateAssumptionDirectly] Prompt preview:`, prompt.substring(0, 200) + '...');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: prompt }],
      max_tokens: 300,
      temperature: 0.2,
    });
    
    const synthesis = completion.choices[0]?.message?.content?.trim() || '';
    const label = determineValidationLabel(synthesis, quotes);
    const hasGaps = label === 'Gap Identified' || label === 'Contradicted';
    const confidence = calculateConfidence(quotes, hasGaps);
    
    console.log(`✅ [validateAssumptionDirectly] Validation completed:`, {
      keyFinding: synthesis.substring(0, 100) + '...',
      label,
      confidence,
      supportingQuotesCount: quotes.length
    });
    
    return {
      keyFinding: synthesis,
      label,
      confidence,
      supportingQuotes: quotes
    };
    
  } catch (error) {
    console.error(`❌ [validateAssumptionDirectly] Failed to validate assumption "${assumption.slice(0, 50)}...":`, error);
    // Return fallback data if validation fails
    return {
      keyFinding: quotes.length > 0 ? `Analysis completed with ${quotes.length} supporting quotes.` : 'No interview data available for this assumption.',
      label: quotes.length > 0 ? 'Gap Identified' : 'Insufficient Data',
      confidence: Math.min(100, quotes.length * 10),
      supportingQuotes: quotes.slice(0, 5)
    };
  }
}

// Timeout wrapper for OpenAI calls

export async function POST(request: NextRequest) {
  try {
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

      console.log(`🎯 Starting per-assumption processing for ${files.length} interviews, ${existingAssumptions.length} assumptions for user ${user.id}`);
      const assumptionsList = existingAssumptions.map(a => a.v1Assumption);
      
           // Set up parallel processing with rate limiting and timeout protection
       const limit = pLimit(CONCURRENT_LIMIT);
       console.log(`🚀 [PER-ASSUMPTION] Processing ${files.length} interviews in parallel (max ${CONCURRENT_LIMIT} concurrent)...`);
       
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
               // Add per-file timeout (60 seconds - optimized for per-assumption processing)
               const result = await withTimeout(
                 processSingleInterviewWithStorage(file, assumptionsList, blobUrl, user.id),
                 60000  // Optimized for per-assumption processing
               );
               const elapsed = ((Date.now() - processingStartTime) / 1000).toFixed(1);
               console.log(`✅ Completed interview ${file.name} in ${elapsed}s with PER-ASSUMPTION architecture`);
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
       
       // PHASE 1.4: Apply quote scoring and diversity selection
       console.log('🎯 [QUOTE SCORING] Starting intelligent quote selection with diversity optimization...');
       
       const optimizedQuotes: Record<string, Quote[]> = {};
       const quoteQualityMetrics: Record<string, any> = {};
       const diversityMetrics: Record<string, any> = {};
       
       // Process each assumption with quote scoring and diversity selection
       for (const assumption of assumptionsList) {
         const allQuotes = aggregatedQuotes[assumption] || [];
         
         if (allQuotes.length > 0) {
           console.log(`📊 [QUOTE SCORING] Processing ${allQuotes.length} quotes for assumption: "${assumption.substring(0, 50)}..."`);
           
           // Step 1: Score all quotes for this assumption
           const scoredQuotes = scoreQuotesForAssumption(allQuotes, assumption);
           
           // Step 2: Get quality metrics for debugging
           const qualitySummary = getQuoteQualitySummary(scoredQuotes);
           quoteQualityMetrics[assumption] = qualitySummary;
           
           console.log(`📈 [QUOTE SCORING] Quality metrics for "${assumption.substring(0, 30)}...":`, {
             averageScore: qualitySummary.averageScore,
             highQuality: qualitySummary.highQualityCount,
             mediumQuality: qualitySummary.mediumQualityCount,
             lowQuality: qualitySummary.lowQualityCount,
             roleDistribution: qualitySummary.roleDistribution
           });
           
           // Step 3: Select optimal quotes with diversity constraint
           const maxQuotesPerAssumption = 5; // Limit to 5 best quotes per assumption
           const selectedQuotes = selectOptimalQuotes(scoredQuotes, maxQuotesPerAssumption);
           
           // Step 4: Calculate diversity metrics
           const diversity = calculateDiversityMetrics(selectedQuotes);
           diversityMetrics[assumption] = diversity;
           
           console.log(`🎯 [DIVERSITY] Selected ${selectedQuotes.length} quotes for "${assumption.substring(0, 30)}...":`, {
             uniqueSpeakers: diversity.uniqueSpeakers,
             speakerRoles: diversity.speakerRoles,
             diversityScore: diversity.diversityScore,
             quoteVariety: diversity.quoteVariety
           });
           
           optimizedQuotes[assumption] = selectedQuotes;
         } else {
           optimizedQuotes[assumption] = [];
           quoteQualityMetrics[assumption] = { averageScore: 0, highQualityCount: 0, mediumQualityCount: 0, lowQualityCount: 0 };
           diversityMetrics[assumption] = { uniqueSpeakers: 0, diversityScore: 0 };
         }
       }
       
       console.log('✅ [QUOTE SCORING] Quote optimization completed with diversity selection');
       
       // Use optimized quotes instead of raw aggregated quotes
       const finalQuotes = optimizedQuotes;
       
       console.log('📊 Starting PER-ASSUMPTION synthesis for assumptions with quotes...');
       
       // PER-ASSUMPTION: Generate synthesis for all assumptions in a single batch call
       const assumptionsWithQuotes = existingAssumptions.map((assumption, index) => ({
         assumption: assumption.v1Assumption,
         quotes: finalQuotes[assumption.v1Assumption] || [],
         index
       }));
       
       const batchSyntheses = await synthesizeAllAssumptions(assumptionsWithQuotes);
       
       // Generate synthesis for each assumption with quotes
       const synthesizedAssumptions = existingAssumptions.map((assumption, index) => {
         const quotes = finalQuotes[assumption.v1Assumption] || [];
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
       
       console.log('✅ PER-ASSUMPTION synthesis completed for all assumptions');
             
       // Calculate overall scores using synthesized assumptions
       const { overallScore, breakdown, summary } = calculateOverallAlignmentScore(synthesizedAssumptions);
       
       // CRITICAL FIX: Call aggregate-validation-results API for each assumption
       console.log('🔍 Starting assumption validation with embedded validation logic');
       
       // Validate each assumption against interview quotes
       for (let i = 0; i < synthesizedAssumptions.length; i++) {
         const assumption = synthesizedAssumptions[i];
         
         try {
           console.log(`🎯 Validating assumption ${i + 1}: "${assumption.v1Assumption?.substring(0, 50)}..."`);
           
           // Get quotes for this assumption
           const relevantQuotes = assumption.quotes || [];
           console.log(`📊 Found ${relevantQuotes.length} quotes for assumption ${i + 1}`);
           
           if (relevantQuotes.length > 0) {
             // Use embedded validation instead of HTTP call
             const validationResult = await validateAssumptionDirectly(assumption.v1Assumption, relevantQuotes);
             console.log(`✅ Validation completed for assumption ${i + 1}:`, validationResult.keyFinding?.substring(0, 100) + '...');
             
             // Update with ACTUAL validation results
             assumption.realityFromInterviews = validationResult.keyFinding;
             const finalQuotes = validationResult.supportingQuotes && validationResult.supportingQuotes.length > 0 
               ? validationResult.supportingQuotes 
               : relevantQuotes; // Fallback to all relevant quotes if no supporting quotes
             
             console.log(`📊 [API_QUOTES_DEBUG] Assumption ${i + 1} quote assignment:`, {
               assumptionText: assumption.v1Assumption?.substring(0, 50),
               relevantQuotesCount: relevantQuotes.length,
               supportingQuotesCount: validationResult.supportingQuotes?.length || 0,
               finalQuotesCount: finalQuotes.length,
               usingSupportingQuotes: !!(validationResult.supportingQuotes && validationResult.supportingQuotes.length > 0)
             });
             
             assumption.validationAttributes = [{
               assumption: assumption.v1Assumption,
               reality: validationResult.keyFinding,
               outcome: validationResult.label,
               confidence: validationResult.confidence,
               quotes: finalQuotes,
               confidence_explanation: `Based on ${validationResult.supportingQuotes?.length || relevantQuotes.length} relevant interview quotes`
             }];
           } else {
             console.log(`⚠️ No quotes found for assumption ${i + 1}, keeping placeholder`);
             assumption.validationAttributes = [{
               assumption: assumption.v1Assumption,
               reality: "No interview data available for this assumption.",
               outcome: "Insufficient Data",
               confidence: 0,
               quotes: [],
               confidence_explanation: "No relevant quotes found"
             }];
           }
           
         } catch (error) {
           console.error(`❌ Validation error for assumption ${i + 1}:`, error);
           // Keep original assumption if validation fails, but preserve quotes
           const relevantQuotes = assumption.quotes || [];
           assumption.validationAttributes = [{
             assumption: assumption.v1Assumption,
             reality: assumption.realityFromInterviews || "Pending validation...",
             outcome: "Insufficient Data",
             confidence: 0,
             quotes: relevantQuotes, // Use original quotes even if validation failed
             confidence_explanation: "Validation error, but quotes are available"
           }];
         }
       }
       
       console.log('🎉 All assumptions validated, returning results');
       
       const response = {
         success: true,
         assumptions: synthesizedAssumptions,
         overallAlignmentScore: overallScore,
         validatedCount: summary.validated,
         partiallyValidatedCount: summary.gapIdentified,
         pendingCount: summary.insufficientData,
         metadata: {
           totalInterviews: files.length,
           totalQuotes: Object.values(finalQuotes).flat().length,
           processingTimeSeconds: ((Date.now() - processingStartTime) / 1000).toFixed(1),
           parallelProcessing: true,
           optimizedBatchProcessing: true,
           batchQuoteExtraction: true,
           batchSynthesis: true,
           apiCallsReduced: true,
           // PHASE 1.4: Add quote scoring and diversity metrics
           quoteScoringEnabled: true,
           diversityOptimization: true,
           quoteQualityMetrics,
           diversityMetrics,
           averageQuoteScore: Object.values(quoteQualityMetrics).reduce((sum: number, metrics: any) => sum + metrics.averageScore, 0) / Object.keys(quoteQualityMetrics).length || 0,
           averageDiversityScore: Object.values(diversityMetrics).reduce((sum: number, metrics: any) => sum + metrics.diversityScore, 0) / Object.keys(diversityMetrics).length || 0
         },
         validationResults: synthesizedAssumptions.map(a => ({
           keyFinding: a.realityFromInterviews,
           label: a.comparisonOutcome,
           confidence: a.confidenceScore || 0,
           supportingQuotes: a.quotes
         }))
       };
       
       console.log('✅ PER-ASSUMPTION batch interview analysis completed:', {
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
  } catch (error) {
    console.error('Analysis API Error:', {
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      cause: (error as any)?.cause,
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}